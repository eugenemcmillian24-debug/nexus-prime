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

  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .single();

    if (project) {
      projectName = project.name;
    } else {
      projectId = undefined;
    }
  }

  if (!projectId) {
    // Get user's most recent project or create one
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (projects && projects.length > 0) {
      projectId = projects[0].id;
      projectName = projects[0].name;
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
      }
    }
  }

  return (
    <AppLayout
      userId={user.id}
      projectId={projectId || ""}
      projectName={projectName}
    />
  );
}
