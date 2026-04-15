#!/usr/bin/env python3
"""
NEXUS PRIME — Full End-to-End Audit & Fix Script
Identifies and documents all bugs found across the codebase.
"""

bugs = []

# Bug 1: Terminal.tsx — event.agent_name can be undefined
bugs.append({
    "file": "components/Terminal.tsx",
    "line": 68,
    "issue": "event.agent_name.split('-')[0] crashes if agent_name is null/undefined",
    "fix": "Add optional chaining: (event.agent_name || 'system').split('-')[0]"
})

# Bug 2: CodePreview.tsx — result.files could be undefined
bugs.append({
    "file": "components/CodePreview.tsx",
    "line": 9,
    "issue": "result.files[0]?.path — if result itself is malformed or files is undefined, this crashes. Also result.files.find() and result.files.map() would crash.",
    "fix": "Guard result.files with fallback: const files = result?.files || []"
})

# Bug 3: lib/ai.ts — JSON regex is double-escaped (string literal, not regex)
bugs.append({
    "file": "lib/ai.ts",
    "line": "111, 127",
    "issue": r"Regex /\{[\\s\\S]*\}/ uses double-escaped \\s\\S which matches literal backslash-s, NOT whitespace. Should be /\{[\s\S]*\}/",
    "fix": "Fix regex to /\\{[\\s\\S]*\\}/ (single escape for regex character classes)"
})

# Bug 4: lib/ai.ts — Gemini Vision response not guarded
bugs.append({
    "file": "lib/ai.ts",
    "line": 160,
    "issue": "data.candidates[0].content.parts[0].text — no optional chaining; crashes if Gemini returns empty/error",
    "fix": "Add optional chaining: data.candidates?.[0]?.content?.parts?.[0]?.text || ''"
})

# Bug 5: CodePreview — BuildResult type imported from export.ts but usage is inconsistent
bugs.append({
    "file": "components/CodePreview.tsx",
    "line": 9,
    "issue": "CodePreview receives result typed as BuildResult but the parent passes jobResult.code which may not match BuildResult interface",
    "fix": "Add defensive guard and normalize the data"
})

# Bug 6: page.tsx — jobResult shape assumption
bugs.append({
    "file": "app/page.tsx",
    "line": "various",
    "issue": "jobResult.code passed to CodePreview — if AI returns unexpected shape, .code is undefined, causing cascading [0] errors",
    "fix": "Normalize jobResult.code before passing to child components"
})

# Bug 7: Dashboard — lifetime_credits may not exist in user_credits table
bugs.append({
    "file": "app/dashboard/page.tsx",
    "line": 90,
    "issue": "creditsRes.data?.lifetime_credits referenced but original schema may not have this column",
    "fix": "Use optional chaining and fallback"
})

# Bug 8: Gallery — build.tags can be null (JSON default)
bugs.append({
    "file": "app/gallery/page.tsx",
    "line": "various",
    "issue": "build.tags.some() and build.tags.map() crash if tags is null (DB default may be null not [])",
    "fix": "Guard with (build.tags || [])"
})

# Bug 9: ProjectHistory — build.version and agent_jobs table may not have is_starred/version columns
bugs.append({
    "file": "components/ProjectHistory.tsx",
    "line": "various",
    "issue": "Queries is_starred and version columns that only exist after migration 002. If migration not run, queries fail.",
    "fix": "Add fallback handling for missing columns"
})

# Bug 10: Dashboard supabase client — missing conditional check
bugs.append({
    "file": "app/dashboard/page.tsx",
    "line": 22,
    "issue": "Supabase client created without typeof window check (unlike other files), can fail during SSR",
    "fix": "Add same guard as other files"
})

print(f"\n{'='*60}")
print(f"NEXUS PRIME AUDIT REPORT — {len(bugs)} issues found")
print(f"{'='*60}\n")

for i, bug in enumerate(bugs, 1):
    print(f"Bug #{i}: {bug['file']} (line {bug['line']})")
    print(f"  Issue: {bug['issue']}")
    print(f"  Fix:   {bug['fix']}")
    print()

print(f"ROOT CAUSE of 'Cannot read properties of undefined (reading 0)'):")
print(f"  Most likely: lib/ai.ts line 111/127 — broken regex returns null match,")
print(f"  causing JSON.parse to fail, returning malformed code object to CodePreview,")
print(f"  which then crashes on result.files[0] or result.files.map().")
print(f"  Secondary: Gemini Vision response at line 160 with no null guards.")
