import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/api";
import { decrypt } from "@/lib/crypto";
import { errorResponse } from "@/lib/apiError";

const DeploySchema = z.object({
  siteName: z
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("netlify_token_encrypted")
      .eq("id", user.id)
      .single();

    let netlifyToken = decrypt(profile?.netlify_token_encrypted);
    
    // SECURITY GATE: Prevent using admin token for user exports unless user is admin
    if (!netlifyToken) {
        const { data: credits } = await supabase.from('user_credits').select('tier').eq('user_id', user.id).single();
        if (credits?.tier === 'admin') {
            netlifyToken = process.env.NETLIFY_PERSONAL_TOKEN ?? null;
        }
    }

    if (!netlifyToken) {
      return NextResponse.json(
        { error: "Netlify account not linked. Please add your Personal Access Token in Settings." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { siteName, files } = DeploySchema.parse(body);

    // 1. Create a new site (or use existing)
    let siteId: string;
    let siteUrl: string;

    const createSiteRes = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: siteName,
        custom_domain: null,
      }),
    });

    if (createSiteRes.ok) {
      const site = await createSiteRes.json();
      siteId = site.id;
      siteUrl = site.ssl_url || site.url;
    } else {
      const err = await createSiteRes.json();
      if (err.errors?.includes("Name already taken")) {
        // Fetch existing site
        const listRes = await fetch(
          `https://api.netlify.com/api/v1/sites?name=${siteName}`,
          {
            headers: { Authorization: `Bearer ${netlifyToken}` },
          }
        );
        const sites = await listRes.json();
        const existing = sites.find((s: any) => s.name === siteName);
        if (!existing) {
          return NextResponse.json({ error: "Site name taken by another account" }, { status: 409 });
        }
        siteId = existing.id;
        siteUrl = existing.ssl_url || existing.url;
      } else {
        throw new Error(err.message || "Failed to create Netlify site");
      }
    }

    // 2. Build file digest (sha1 hash → path mapping)
    const fileDigest: Record<string, string> = {};
    const fileContents: Record<string, string> = {};

    // Wrap files in a basic index.html if needed
    const deployFiles = buildDeployableFiles(files);

    for (const file of deployFiles) {
      const hash = crypto
        .createHash("sha1")
        .update(file.content)
        .digest("hex");
      const deployPath = "/" + file.path.replace(/^\//, "");
      fileDigest[deployPath] = hash;
      fileContents[hash] = file.content;
    }

    // 3. Create deploy
    const deployRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${netlifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: fileDigest,
          draft: false,
        }),
      }
    );

    if (!deployRes.ok) {
      const err = await deployRes.json();
      throw new Error(err.message || "Failed to create deploy");
    }

    const deploy = await deployRes.json();

    // 4. Upload required files
    const requiredHashes: string[] = deploy.required || [];

    await Promise.all(
      requiredHashes.map(async (hash: string) => {
        const content = fileContents[hash];
        if (!content) return;

        await fetch(
          `https://api.netlify.com/api/v1/deploys/${deploy.id}/files/${hash}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${netlifyToken}`,
              "Content-Type": "application/octet-stream",
            },
            body: content,
          }
        );
      })
    );

    return NextResponse.json({
      url: deploy.ssl_url || deploy.deploy_ssl_url || siteUrl,
      deployId: deploy.id,
      siteId,
      siteName,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return errorResponse(error, "Netlify Deploy Error:");
  }
}

/**
 * Convert Next.js-style files into static-deployable files.
 * For a proper build you'd need `next build && next export`, but for preview
 * purposes we create an index.html that loads the component tree client-side.
 */
function buildDeployableFiles(
  files: { path: string; content: string }[]
): { path: string; content: string }[] {
  // If there's already an index.html, return as-is
  if (files.some((f) => f.path === "index.html")) return files;

  // Generate a simple preview HTML wrapping the code
  const allCode = files.map((f) => `// --- ${f.path} ---\n${f.content}`).join("\n\n");

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

  return [
    { path: "index.html", content: previewHtml },
    ...files,
  ];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
