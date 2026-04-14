"use client";

import { SandpackProvider, SandpackLayout, SandpackPreview, SandpackThemeProp } from "@codesandbox/sandpack-react";
import { BuildResult } from "@/lib/export";

const NEXUS_PRIME_THEME: SandpackThemeProp = {
  colors: {
    surface1: "#050505",
    surface2: "#0a0a0a",
    surface3: "#1a1a1a",
    clickable: "#888888",
    base: "#888888",
    disabled: "#444444",
    hover: "#ffffff",
    accent: "#00ff88",
    error: "#ff4444",
    errorSurface: "#ff444411",
  },
  syntax: {
    plain: "#ffffff",
    comment: { color: "#444444", fontStyle: "italic" },
    keyword: "#00ff88",
    tag: "#00ff88",
    punctuation: "#444444",
    definition: "#ffffff",
    property: "#00ff88",
    string: "#888888",
    number: "#00ff88",
  },
  font: {
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    mono: '"JetBrains Mono", "Space Mono", monospace',
    size: "12px",
    lineHeight: "1.5",
  },
};

export default function PreviewSandbox({ result }: { result: BuildResult }) {
  // Convert our file structure to Sandpack's expected format
  const files: Record<string, string> = {};
  
  result.files.forEach((file) => {
    // Sandpack expects files to be relative to the root or specified in a template
    // We'll normalize the path for the React template
    let path = file.path;
    if (path.startsWith("app/")) {
      path = path.replace("app/", "/");
    }
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    files[path] = file.content;
  });

  // Ensure a minimal entry point exists if the model missed it
  if (!files["/App.js"] && !files["/App.tsx"] && !files["/page.tsx"]) {
    files["/App.tsx"] = `
export default function App() {
  return <div className="p-8 text-[#00ff88] font-mono">Build complete. Entry point missing.</div>;
}
    `.trim();
  }

  return (
    <div className="h-full w-full bg-[#050505] animate-in fade-in duration-700">
      <SandpackProvider
        template="nextjs"
        theme={NEXUS_PRIME_THEME}
        files={files}
        options={{
          recompileMode: "immediate",
          recompileDelay: 300,
        }}
      >
        <SandpackLayout style={{ border: "none", height: "100%" }}>
          <SandpackPreview 
            showNavigator={true} 
            showRefreshButton={true}
            style={{ height: "100%", background: "#050505" }}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
