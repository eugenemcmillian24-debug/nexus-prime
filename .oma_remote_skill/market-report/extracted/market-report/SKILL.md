---
name: market-report
description: 'Generate professional financial analysis reports from raw news, market observations, or a given topic. Supports morning briefs, weekly reports, deep dives, and strategy notes. Use when user asks to 写个周报, 整理市场分析, write a market report, summarize this week market, or any request to produce structured financial analysis writing.'
---

# Market Report

Generate professional-grade financial analysis reports. The core value is not formatting — it is the analytical rigor applied before writing.

## Step 1: Gather Material

If the user provides raw material (news, articles, notes), use that directly.

If the user only provides a topic (e.g., "本周A股周报"), search for recent relevant news and market data before proceeding.

## Step 2: Signal Filtering — DO NOT SKIP

Before writing anything, evaluate every piece of source material. For each item, answer these four questions:

1. **Novelty** — Is this new information, or already priced in / widely known?
2. **Expectation gap** — Does reality differ from market consensus? (This is where alpha lives)
3. **Source reliability** — Official data (central bank, earnings) > mainstream financial media > social media / rumors
4. **Reaction potential** — Is capital already moving on this, or is it noise?

**Action:** Discard items that fail on 3+ questions. Prioritize items with clear expectation gaps — these drive the strongest report sections.

Show the filtering result to the user as a brief table before writing:

| Signal | Novelty | Exp. Gap | Source | Keep/Drop |
|--------|---------|----------|--------|-----------|

This forces transparency and lets the user override your judgment.

## Step 3: Thematic Clustering

Group the surviving signals into **3-5 investment themes**.

Rules:
- Cluster by **causal relationship**, not by sector label
- Theme titles MUST be directional and narrative-driven:
  - GOOD: "Rate cut cycle fueling liquidity rotation into growth"
  - BAD: "Macro economy"
- Each theme needs 2+ signals to justify its existence
- Order themes by market impact significance (highest first)
- If a signal doesn't fit any theme, it's either a standalone highlight or should be dropped

## Step 4: Write Each Theme Section

Every theme section follows this three-layer structure:

### Layer 1: Macro Context
Why does this theme matter right now? What is the broader environment?

### Layer 2: Transmission Mechanism
How does the trigger event propagate through the market? Be specific about the causal chain — do not hand-wave.

### Layer 3: Investment Impact
Which specific sectors, tickers, or asset classes are affected? State the direction (bullish/bearish) and the reasoning.

**Critical rule: The same event affects different assets differently.** A rate hike is bearish for growth stocks but bullish for banks. Never paint an entire theme with one color.

Writing quality standards:
- Every claim needs evidence ("PBOC data shows..." not "the market believes...")
- Distinguish fact from opinion explicitly ("we expect..." vs "data confirms...")
- Every paragraph must pass the "so what" test — if a reader asks "what does this mean for my portfolio?", the paragraph should answer it
- Include counter-arguments. A report that only presents the bull case is not professional — it's marketing
- Be specific: "semiconductor equipment names like ASML, AMAT" not "some tech stocks"

## Step 5: Assemble the Report

Choose the report type based on user intent, then read `references/templates.md` for the matching skeleton structure.

| Type | When | Length | Key Feature |
|------|------|--------|-------------|
| Morning Brief | Daily quick update | 500-800 words | Time-sensitive, 3-5 bullet points, no deep analysis |
| Weekly Report | Weekly market review | 1500-3000 words | Thematic structure, backward + forward looking |
| Deep Dive | Single topic analysis | 2000-5000 words | Exhaustive analysis of one theme, full evidence chain |
| Strategy Note | Forward-looking allocation | 1500-3000 words | Asset allocation recommendations, risk scenarios |

Assembly checklist:
- Executive summary that stands alone (reader grasps key insights without reading full report)
- Risk factors section with at least 3 distinct risks and counter-arguments
- Clear heading hierarchy (H1 title, H2 themes, H3 sub-sections)
- Follow user's language (Chinese input produces Chinese report)

## Step 6: Output

Choose the output format based on report type:

| Report Type | Output Format | Source |
|-------------|---------------|--------|
| Weekly Report | **HTML** (multi-page, styled) | `assets/template.html` |
| Deep Dive | **HTML** (adapted from template) | `assets/template.html` |
| Morning Brief | **Markdown** (lightweight, single page) | `references/templates.md` |
| Strategy Note | **Markdown** (unique structure) | `references/templates.md` |

### For HTML output (Weekly / Deep Dive):

Read `assets/template.html`, then replace all `{{PLACEHOLDER}}` variables with report content from Steps 2-5. The template provides:
- Cover page with headline, summary box, and key data
- Table of contents (colored background)
- Signal filtering table (Step 2 output)
- Theme sections with data cards, three-layer analysis, and counter-argument boxes
- Risk grid + data calendar + scenario analysis
- References page with disclaimer

Generate one `<div class="page">` per logical section. Typical report has 7-9 pages:
1. Cover → 2. TOC → 3. Signal filtering → 4-6. Themes → 7. Risk & Outlook → 8. References

**Theme colors** — The template uses CSS variables. Pick one that matches the report tone:

| Theme | `--c-primary` | Best For |
|-------|---------------|----------|
| Ember (default) | `#ea4821` | General market reports, high-energy topics |
| Ocean | `#1a56db` | Corporate strategy, fixed income, institutional |
| Forest | `#0d7c3e` | ESG, wealth management, positive outlook |
| Amethyst | `#7c3aed` | Fintech, AI/tech, innovation themes |
| Slate | `#334155` | Neutral/bearish tone, risk-heavy reports |

To switch: uncomment the desired `:root` block in CSS, comment out the others.

### For Markdown output (Morning Brief / Strategy Note):

Read `references/templates.md` for the matching skeleton structure. Output Markdown directly in conversation. These report types have distinct structures that don't fit the multi-page HTML layout.

### Format conversion

If the user needs docx/pdf from any output, suggest the `skywork-doc` skill.

## Quality Self-Check Before Delivery

- [ ] Signal filtering was performed and shown to user (Step 2 not skipped)
- [ ] 3-5 themes, each with directional title
- [ ] Every theme has all three layers (macro, transmission, impact)
- [ ] Mixed impact directions across themes (not all bullish or all bearish)
- [ ] Specific tickers/sectors named, not vague references
- [ ] Counter-arguments and risks included
- [ ] Evidence cited for key claims
- [ ] Report type matches user intent
