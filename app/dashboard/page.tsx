import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "@/components/layout/AppLayout";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { project?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get the active project (from URL param or most recent)
  let projectId = searchParams.project;
  let projectName = "Untitled Project";
  let currentVersion = 1;

  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, current_version")
      .eq("id", projectId)
      .single();

    if (project) {
      projectName = project.name;
      currentVersion = project.current_version || 1;
    } else {
      projectId = undefined;
    }
  }

  if (!projectId) {
    // Get user's most recent project or create one
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, current_version")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (projects && projects.length > 0) {
      projectId = projects[0].id;
      projectName = projects[0].name;
      currentVersion = projects[0].current_version || 1;
    } else {
      // Create a default project
      const { data: newProject } = await supabase
        .from("projects")
        .insert({
          name: "My First Project",
          user_id: user.id,
          description: "Welcome to Nexus Prime!",
        })
        .select()
        .single();

      if (newProject) {
        projectId = newProject.id;
        projectName = newProject.name;
        currentVersion = newProject.current_version || 1;
      }
    }
  }

  return (
    <AppLayout
      userId={user.id}
      projectId={projectId || ""}
      projectName={projectName}
      initialVersion={currentVersion}
    />
  );
}
