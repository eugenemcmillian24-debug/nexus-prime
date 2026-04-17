import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "@/components/layout/AppLayout";
import ProjectHub from "@/components/features/ProjectHub";

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

  const projectId = searchParams.project;

  // If no project ID is provided, show the Project Hub
  if (!projectId) {
    return <ProjectHub />;
  }

  // Fetch project details for the editor
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, current_version")
    .eq("id", projectId)
    .single();

  if (!project) {
    return <ProjectHub />;
  }

  return (
    <AppLayout
      userId={user.id}
      projectId={project.id}
      projectName={project.name}
      initialVersion={project.current_version || 1}
    />
  );
}
