---
name: news-sentiment
description: "Analyze financial news sentiment and market implications. Determines bullish/bearish direction, impact scope, and transmission effects for news, policy announcements, earnings reports, and market commentary. Use when user wants to interpret financial news, judge market sentiment, or assess if news is positive or negative. Triggers on: this news bullish or bearish, interpret this announcement, sentiment analysis, market sentiment, news impact, what does this mean for stocks, 这条新闻怎么看, 利好还是利空, 解读一下, 消息面分析, 这个政策什么影响, 偏多还是偏空, 情绪分析."
---

# Financial News Sentiment Analysis

## Analysis Framework

For each piece of financial text, perform two layers of analysis:

### Layer 1: Direction and Magnitude

Determine bullish/bearish/neutral and assign a score (-1.0 to +1.0):

| Score Range | Verdict | Typical Scenarios |
|------------|---------|-------------------|
| +0.6 to +1.0 | Strong bullish | Earnings beat, major policy pivot, breakthrough deal |
| +0.2 to +0.5 | Lean bullish | Moderate growth, policy tailwind, sector recovery |
| -0.1 to +0.1 | Neutral | Factual reporting, in-line with expectations, mixed signals |
| -0.5 to -0.2 | Lean bearish | Growth slowdown, regulatory tightening, minor guidance cut |
| -1.0 to -0.6 | Strong bearish | Blowup, major sanctions, earnings collapse, debt crisis |

### Layer 2: Impact Assessment

- **Direct impact**: Which sectors, assets, or companies are immediately affected
- **Transmission effects**: What related areas may be dragged or lifted
- **Time horizon**: Short-term sentiment shock vs medium/long-term fundamental shift

## Analytical Checklist

Think through these before making a judgment (not all need to appear in output, but all must be considered):

1. Is this genuinely new information, or already priced in?
2. What is the underlying intent? Who benefits, who loses?
3. Are there second-order effects? (e.g., a rate cut may squeeze bank margins, so bank stocks are not necessarily bullish)
4. Could the same event have opposite impacts on different sectors?
5. Are there offsetting factors or material uncertainties?
6. How did markets react to similar events historically?

## Output Format

Respond in the user's language.

### Single Text

```
[Verdict] Bullish / Bearish / Neutral (Score: +0.6, lean bullish)

[Key Logic]
1-3 sentences on why, cut to the core driver

[Impact Map]
- Direct: XX sector/asset
- Transmission: XX to XX (if applicable)
- Horizon: short-term / medium-long term

[Risk Flags]
Offsetting factors or uncertainties (omit if none)
```

### Multiple Texts

After individual analysis, append a synthesis:

```
[Overview] X bullish / Y bearish / Z neutral
[Core Tension] The key bull-bear debate across these items
[Top Signal] Which item carries the highest signal value, and why
```
