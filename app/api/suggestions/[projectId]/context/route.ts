import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { errorResponse } from "@/lib/apiError";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = params;

  // Fetch project files to compute context
  const { data: files, error } = await supabase
    .from("project_files")
    .select("path, content")
    .eq("project_id", projectId);

  if (error) return errorResponse(error, '/api/suggestions/[projectId]/context');

  const components = files.filter(f => f.path.includes("components/")).map(f => f.path);
  const routes = files.filter(f => f.path.includes("app/") || f.path.includes("pages/")).map(f => f.path);
  
  // Try to find package.json for dependencies
  const packageJson = files.find(f => f.path === "package.json");
  let dependencies: string[] = [];
  if (packageJson) {
    try {
      const parsed = JSON.parse(packageJson.content);
      dependencies = Object.keys(parsed.dependencies || {});
    } catch (e) {}
  }

  return NextResponse.json({
    fileCount: files.length,
    components,
    routes,
    dependencies,
    framework: "Next.js",
    recentChanges: [], // Mocked for now
  });
}
