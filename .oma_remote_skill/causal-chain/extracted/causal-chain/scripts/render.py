#!/usr/bin/env python3
"""Render Mermaid code into a standalone HTML file. Zero external dependencies."""

import sys
import os
from datetime import date

TEMPLATE = """<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>{title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    body {{
      margin: 0; padding: 40px 20px;
      background: #fafafa; font-family: -apple-system, "PingFang SC", sans-serif;
      text-align: center;
    }}
    h1 {{ font-size: 1.4rem; color: #333; margin-bottom: 6px; }}
    .sub {{ font-size: 0.82rem; color: #aaa; margin-bottom: 28px; }}
    .diagram-wrap {{ width: 100%; overflow-x: auto; padding: 20px 0; }}
    .mermaid {{ display: inline-block; min-width: 900px; }}
    .mermaid svg {{ min-width: 900px; height: auto; }}
    .legend {{ display: flex; gap: 18px; margin-top: 20px; font-size: 0.78rem; color: #777; flex-wrap: wrap; justify-content: center; }}
    .leg {{ display: flex; align-items: center; gap: 5px; }}
    .dot {{ width: 13px; height: 13px; border-radius: 3px; border: 2px solid; }}
  </style>
</head>
<body>
  <h1>{title}</h1>
  <p class="sub">Causal Chain &middot; {date}</p>
  <div class="diagram-wrap">
    <pre class="mermaid">
{mermaid_code}
    </pre>
  </div>
  <div class="legend">
    <div class="leg"><div class="dot" style="background:#d5e8d4;border-color:#82b366"></div>利好</div>
    <div class="leg"><div class="dot" style="background:#f8cecc;border-color:#b85450"></div>利空</div>
    <div class="leg"><div class="dot" style="background:#dae8fc;border-color:#6c8ebf"></div>中性</div>
    <div class="leg"><div class="dot" style="background:#fff2cc;border-color:#d6b656"></div>不确定</div>
  </div>
  <script>
    mermaid.initialize({{
      startOnLoad: true,
      theme: 'base',
      themeVariables: {{ fontSize: '14px' }},
      flowchart: {{ useMaxWidth: false, htmlLabels: true, curve: 'basis' }}
    }});
  </script>
</body>
</html>"""


def render(mermaid_code: str, title: str, output_path: str) -> str:
    """Render Mermaid code to an HTML file. Returns the output path."""
    html = TEMPLATE.format(
        title=title,
        date=date.today().isoformat(),
        mermaid_code=mermaid_code,
    )
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)
    return os.path.abspath(output_path)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python render.py <mermaid_file> <title> <output.html>")
        sys.exit(1)
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        code = f.read()
    path = render(code, sys.argv[2], sys.argv[3])
    print(f"Saved to: {path}")
