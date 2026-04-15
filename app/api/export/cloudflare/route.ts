import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

const DeploySchema = z.object({
  projectName: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
    })
  ),
});

export async function POST(req: Request) {
  try {
    if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
      return NextResponse.json(
        {
          error:
            "Cloudflare not configured. Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID to env vars.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { projectName, files } = DeploySchema.parse(body);

    // 1. Ensure project exists (create if not)
    const projectRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${projectName}`,
      {
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
        },
      }
    );

    if (!projectRes.ok) {
      // Create the project
      const createRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CF_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: projectName,
            production_branch: "main",
          }),
        }
      );

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(
          err.errors?.[0]?.message || "Failed to create Cloudflare Pages project"
        );
      }
    }

    // 2. Deploy via Direct Upload API
    // Build FormData with files
    const formData = new FormData();

    // Build deployable files (wrap in index.html if needed)
    const deployFiles = buildDeployableFiles(files);

    for (const file of deployFiles) {
      const blob = new Blob([file.content], { type: "text/plain" });
      formData.append(file.path, blob, file.path);
    }

    // Create deployment
    const deployRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
        },
        body: formData,
      }
    );

    if (!deployRes.ok) {
      const err = await deployRes.json();
      throw new Error(
        err.errors?.[0]?.message || "Failed to deploy to Cloudflare Pages"
      );
    }

    const deployment = await deployRes.json();
    const result = deployment.result;

    return NextResponse.json({
      url: result.url || `https://${projectName}.pages.dev`,
      deploymentId: result.id,
      projectName,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Cloudflare Deploy Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

function buildDeployableFiles(
  files: { path: string; content: string }[]
): { path: string; content: string }[] {
  if (files.some((f) => f.path === "index.html")) return files;

  const allCode = files
    .map((f) => `// --- ${f.path} ---\n${f.content}`)
    .join("\n\n");

  const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NEXUS PRIME Build</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #050505; color: #888; font-family: 'JetBrains Mono', monospace; }
    pre { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 2rem; overflow-x: auto; }
    code { color: #00ff88; font-size: 13px; line-height: 1.6; }
  </style>
</head>
<body class="p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-xl font-bold text-white mb-2 tracking-widest uppercase">NEXUS PRIME BUILD</h1>
    <p class="text-sm text-gray-500 mb-6">Static preview — run <code class="text-green-400">npm install && npm run dev</code> locally for full interactivity.</p>
    <pre><code>${escapeHtml(allCode)}</code></pre>
  </div>
</body>
</html>`;

  return [{ path: "index.html", content: previewHtml }, ...files];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
