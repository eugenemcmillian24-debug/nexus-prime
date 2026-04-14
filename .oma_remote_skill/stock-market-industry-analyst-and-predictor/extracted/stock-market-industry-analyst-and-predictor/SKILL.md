---
name: stock-market-industry-analyst-and-predictor
description: Financial market analysis skill. Trigger when the user asks about any stock, sector, industry, market event, or macro trend — in any language or market. This includes single stock lookups ("how's NVDA doing"), sector analysis ("半导体板块趋势"), event impact analysis ("how do tariffs affect chip stocks"), and macro research ("is the AI capex cycle slowing"). Works for A-shares, Hong Kong, US, Japan, Europe, crypto, commodities. Even casual one-line questions should trigger this skill.
---

# stock-market-industry-analyst-and-predictor

Analyze and predict stocks, sectors, events, and macro trends across global markets. Collects real market data, scores signal quality, and produces forecasts and reports.

## Dependencies

```bash
pip install akshare yfinance pandas numpy
```

- A-shares + HK: `akshare` | US / JP / EU / Crypto: `yfinance` | Both free, no API key.

## Step 0: Classify the Request

Before doing anything, determine what the user is asking:

| Type | Example | What to do |
|------|---------|-----------|
| **Single Stock** | "NVDA怎么样", "analyze Tesla" | Resolve ticker → fetch OHLCV → compute technicals → search news → score signals → forecast → output |
| **Sector / Industry** | "半导体板块趋势", "EU luxury sector outlook" | Search sector dynamics → identify 3–5 representative tickers → fetch OHLCV for each → comparative analysis → output |
| **Event Impact** | "中美关税对芯片股的影响", "how does the oil shock affect tech" | Analyze the event → build transmission chain → identify affected tickers → fetch data for top impacted names → score + forecast → output |
| **Macro Trend** | "AI基础设施投资还能持续吗", "is the rate cycle turning" | Search macro data + policy signals → identify sectors and bellwether stocks → lighter per-stock analysis → research-style output |

Also determine:
- The user's language — respond and search in that language
- Complexity: **Quick** (casual question, single stock) or **Deep** (multi-stock, event analysis, full report requested)
- **Output form** — decide how to deliver the final result:

| Form | User signals | Final deliverable |
|------|-------------|-------------------|
| **Conversational** (default) | Casual question, quick opinion, specific aspect inquiry. No explicit report request. E.g. "英伟达怎么样", "值得买吗", "analyze sentiment on NVDA", "期权值得入吗" | Text / Markdown reply in chat. No HTML artifact. |
| **Report** | User explicitly requests a report or formal deliverable. E.g. "出个报告", "详细分析报告", "full report", "deep dive report", "做一个分析报告" | HTML artifact(s) as defined in Step 6 Report Mode. |

**Default is Conversational.** Only use Report when the user's wording clearly asks for a formal deliverable. When in doubt, use Conversational.

## Step 1: Collect Data

### 1a. For Single Stock

1. Check `scripts/utils/ticker_resolver.py` for alias match. If no match, `web_search` to find ticker + market.
2. Fetch OHLCV via `scripts/utils/stock_data.py`:
   ```python
   from scripts.utils.stock_data import fetch_ohlcv, compute_technicals, format_technicals
   df = fetch_ohlcv(ticker="NVDA", market="NASDAQ", days=90)
   t = compute_technicals(df)  # returns MA, RSI, MACD, support/resistance, trend
   ```
   If fetch fails (network), fall back to `web_search` and note "limited data" in output.
3. Search news (adapt language to market):
   - `"{company} latest news"` — recent events
   - `"{company} analyst rating target price"` — institutional views
   - `"{company} industry trend"` — sector context

### 1b. For Sector / Industry

1. Search: `"{sector} sector trend {year}"`, `"{sector} top companies performance"`
2. Identify 3–5 representative tickers from search results
3. Fetch OHLCV + compute technicals for each
4. Search: `"{sector} policy regulation"`, `"{sector} analyst outlook"`

### 1c. For Event Impact

1. Search the event itself: `"{event} details"`, `"{event} market reaction"`
2. Search transmission: `"{event} supply chain impact"`, `"{event} affected companies"`
3. Identify affected tickers from search results
4. Fetch OHLCV + compute technicals for top 3–5 affected names
5. Search: `"{event} analyst expectations"` — for expectation gap calibration

### 1d. For Macro Trend

1. Search: `"{trend} latest data"`, `"{trend} outlook {year}"`
2. Search: `"{trend} impact on sectors"`, `"{trend} bellwether stocks"`
3. Optionally fetch OHLCV for 2–3 bellwether names
4. Search: `"{trend} risks"`, `"{trend} bull bear case"`

## Step 1.5: Quick Feedback (immediately after data collection)

**Do this BEFORE continuing to Step 2.** The user should not wait for the full analysis to see initial results.

As soon as Step 1 data collection is complete, output a brief summary to the user:

```
📊 **{Stock/Topic} — 数据收集完成，先看速览：**

**行情**: {current price} | {change %} | {trend direction}（一句话）
**近期要点**:
• {key news/event 1}
• {key news/event 2}
• {key news/event 3 — if notable}
**初步情绪**: 偏多 / 偏空 / 中性（based on raw news tone, one sentence why）

> 正在进行深度分析，稍后给出完整结论...
```

Adapt language to the user's language. Keep it under 150 words. This is a **raw summary from collected data**, not a scored analysis — do not include ISQ scores or forecasts here.

For Sector / Event / Macro types, adjust accordingly:
- Sector: list key names + sector direction
- Event: summarize the event + initial impact assessment
- Macro: key data points + directional tone

Then continue to Step 2.

## Step 2: Filter Signals

Apply to all collected news/data. Keep only items that pass at least 2 of these 4 tests:

1. **Transmission Logic** — implies a clear cause → effect chain
2. **Alpha Potential** — contains info NOT yet priced in
3. **Source Confidence** — authoritative source, cites specific data
4. **Noise Rejection** — not gossip, not vague, not "slogan-style"

If user specified a focus topic, keep all related items even if they only pass 1 test.

## Step 3: ISQ Signal Scoring

Score each valid signal on 5 dimensions. Use these exact scales.

**Sentiment** (-1.0 to +1.0):

| Score | When to use |
|-------|------------|
| -1.0 | Fraud, delisting risk, existential threat |
| -0.5 | Earnings miss, guidance cut, major negative surprise |
| 0.0 | Routine, no clear direction |
| +0.5 | Earnings beat, raised guidance, positive catalyst |
| +1.0 | Transformative event, monopoly, paradigm shift |

**Confidence** (0.0 to 1.0):

| Score | When to use |
|-------|------------|
| 0.0–0.3 | Forum post, unverified leak, rumor |
| 0.3–0.6 | Credible media citing unnamed sources |
| 0.6–0.8 | Official filing, central bank statement, named executives |
| 0.8–1.0 | Published financials, signed contracts, regulatory filings |

**Intensity** (1 to 5):

| Score | When to use |
|-------|------------|
| 1 | Minor subsidiary news, will be forgotten in a day |
| 2 | Small product update, routine partnership |
| 3 | Meaningful product launch, notable contract |
| 4 | Major strategic shift, large M&A, sector-level policy |
| 5 | Industry regulation overhaul, trade ban, paradigm shift |

**Expectation Gap** (0.0 to 1.0) — the hardest to score. Use these concrete tests:

| Score | How to judge |
|-------|-------------|
| 0.0–0.2 | Stock already moved on the news; analysts say "in line" or "as expected" |
| 0.2–0.4 | Analysts say "largely met expectations"; direction was known, magnitude slightly different |
| 0.4–0.6 | Mixed reactions; some say expected, others surprised; stock hasn't clearly moved |
| 0.6–0.8 | Few analyst reports on this angle; stock hasn't reacted; requires connecting dots |
| 0.8–1.0 | Breaking / sudden; zero prior coverage; market hasn't had time to react |

**Calibration method**: search `"{company} + {event} + analyst reaction"`. If analysts say "priced in" → 0.0–0.3. If no coverage → 0.6+. If stock already moved big → reduce by 0.2–0.3.

**Timeliness** (0.0 to 1.0):

| Score | When to use |
|-------|------------|
| 0.0–0.2 | Demographic trend, multi-year capex cycle |
| 0.2–0.5 | Earnings in 6 weeks, policy review in 2 months |
| 0.5–0.8 | Product launch next week, upcoming catalyst within a month |
| 0.8–1.0 | Breaking news, policy effective tomorrow |

**Overall** = Confidence × 0.35 + (Intensity / 5) × 0.30 + Gap × 0.20 + Timeliness × 0.15

Read `references/calibration_case.md` for a complete worked example (NVIDIA GTC) showing how to go from raw search results to final scores.

## Step 4: Transmission Chains (Event and Sector types only)

Skip for single stock Quick analysis — chains add no value for "how's AAPL doing".

Use for: event impact, sector analysis, policy changes, supply chain disruptions.

Format:
```
Event → First-order impact (bullish/bearish/neutral: why)
      → Second-order impact (bullish/bearish/neutral: why)
      → Affected ticker
```

Keep to 3–5 nodes. Can branch.

## Step 5: Forecast (when a specific ticker is involved)

Forecasts must be anchored to computed data, not intuition.

### 5a. Establish Base Range

From technicals:
- **Center**: current close price
- **Floor**: computed 20-day support
- **Ceiling**: computed 20-day resistance
- **Daily volatility**: average daily (high - low) over last 20 days

### 5b. Adjust for Signals

- **Direction**: if net sentiment is positive, shift center toward resistance; if negative, toward support
- **Width**: multiply daily volatility by (1 + expectation_gap). High gap = wider range.
- **Confidence discount**: if average confidence < 0.5, widen range by 20% and mark as "low confidence"

### 5c. Scenarios

- **Bull**: resistance + (daily_vol × intensity/5). What catalyst makes this happen?
- **Base**: sentiment-adjusted center. Nothing surprising happens.
- **Bear**: support - (daily_vol × intensity/5). What risk triggers this?
- Probabilities sum to 1.0. Default: 25/50/25. Adjust if signals are strongly directional.

### 5d. Per-Day Output

5 trading days, each with: low, high, most_likely, confidence level, key driver.

Risks: top 3–5, must be specific ("oil above $90 compressing tech multiples", not "market risk").

## Step 6: Output

The output form was determined in Step 0. By this point the user has already seen the Step 1.5 quick feedback.

---

### Conversational Mode (DEFAULT)

Respond directly in the conversation as text / Markdown. **No HTML artifact.**

Build the response on top of the Step 1.5 quick feedback — do not repeat basic price info the user already saw. Focus on the **analytical conclusions** from Steps 2–5:

**For Single Stock:**
```
## {Stock} 分析结论

**技术面**: 趋势 + 关键支撑/阻力位 + RSI/MACD 要点（2-3 句）

**核心信号**（按 Overall 分值排序，取 top 3）:
| 信号 | 情绪 | 置信度 | Overall | 要点 |
|------|------|--------|---------|------|
| ...  | ...  | ...    | ...     | ...  |

**预测观点**: 方向性判断 + Bull/Base/Bear 三场景一句话 + 关键价位

**主要风险**: 2-3 条具体风险

> ⚠️ 以上分析基于公开信息，不构成投资建议。市场有风险，投资需谨慎。
```

**For Sector / Event / Macro:** adapt the structure — use narrative paragraphs instead of single-stock tables. Include transmission chains as inline text if relevant. List affected names with directional view.

Guidelines:
- Total length: 300–800 words depending on complexity
- Use Markdown tables only when comparing multiple items
- Include ISQ Overall scores but don't need to break down all 5 dimensions in text
- The 5-day per-day forecast table is NOT needed — give directional view + key levels instead
- If the user asked about a specific aspect (e.g. sentiment, options), prioritize that in the response

---

### Report Mode (user explicitly requested a report)

#### Single Stock Report
One `.html` artifact combining everything in one page:
- Market snapshot (price, change, volume, 52-week range)
- Technical summary (trend, MA, RSI, MACD, support/resistance — from computed data)
- Top signals with ISQ scores (compact table)
- 5-day forecast range (compact table)
- Scenario summary (one-liner each)
- One Chart.js chart: price history + forecast overlay
- Risk warnings + disclaimer

#### Full Report (sector, event, macro, or multi-stock deep dive)

Two `.html` artifacts:

**Artifact 1 — Report**: static, printable, shareable. Full analysis with all sections, transmission chains as narrative, detailed ISQ rationale per signal. Style: #1e293b text, #3b82f6 accent, #ef4444 bearish, #22c55e bullish.

**Artifact 2 — Dashboard**: interactive, Chart.js visualizations:
- Price chart (line, from OHLCV data)
- ISQ radar (5-axis)
- Forecast range (bar with error bars)
- Scenario donut
- Transmission chain diagram (node-edge, color-coded)

Chart.js CDN: `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js`

#### Macro / Sector without specific tickers

Output a single `.html` research report — no forecast tables, no price charts. Focus on narrative analysis, ISQ-scored signals, risk assessment, and sector/macro outlook.

Give a brief inline summary before producing HTML artifacts.

---

### Rules

- **Default is Conversational Mode.** Only use Report Mode when the user explicitly requests a report or formal deliverable.
- If user requests Markdown / docx / pdf, respect that format.
- Always end with disclaimer: *"以上分析基于公开信息，不构成投资建议。市场有风险，投资需谨慎。"* (or equivalent in user's language)
- Respond in the user's language.

## Files

```
stock-analyst/
├── SKILL.md                          # This file — all methodology
├── references/
│   └── calibration_case.md           # Worked example: NVIDIA GTC ISQ scoring
└── scripts/
    └── utils/
        ├── stock_data.py             # fetch_ohlcv() + compute_technicals()
        ├── ticker_resolver.py        # 80+ ticker aliases, multilingual search queries
        └── json_utils.py             # Robust JSON extraction from LLM output
```

## Configuration

None. No API keys, no database.
