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

  let project = null;
  if (projectId) {
    const { data } = await supabase
      .from("projects")
      .select("id, name, current_version")
      .eq("id", projectId)
      .single();
    project = data;
  }

  return (
    <AppLayout
      userId={user.id}
      projectId={project?.id || undefined}
      projectName={project?.name || undefined}
      initialVersion={project?.current_version || 1}
      initialView={projectId ? "editor" : "home"}
    />
  );
}
