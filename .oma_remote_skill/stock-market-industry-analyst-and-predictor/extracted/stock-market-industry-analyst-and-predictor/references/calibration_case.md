# ISQ Scoring Calibration Case

This is a complete worked example showing how to go from raw search results to final ISQ scores. Use it to calibrate your scoring — if your scores diverge significantly from this example on similar-quality signals, recalibrate.

## Case: NVIDIA GTC 2026 — Vera Rubin Platform Launch

### Raw Data Collected

**From web_search:**
- NVDA price: $165.17 (Mar 27, 2026), down from $194.67 peak on Mar 20
- 52-week range: $86.62 – $212.19
- GTC keynote on Mar 16: CEO Jensen Huang announced Vera Rubin platform, raised cumulative revenue forecast to $1 trillion through 2027 (up from $500B)
- Rubin: 7 chips in full production, 10x inference throughput per watt vs Blackwell, shipping H2 2026
- Major cloud providers (AWS, Google, Microsoft, Oracle) confirmed as first deployment partners
- Stock rose ~2% on keynote day, then gave it all back in subsequent week due to broader market selloff (oil prices, geopolitical tension)

**From compute_technicals:**
- RSI(14): 52.1 (neutral zone)
- MACD: positive but weak (0.100)
- Trend: neutral (MA5 ≈ MA20, price oscillating around both)
- Support: $160 (recent low), Resistance: $175 (recent bounce high)
- 20-day change: -10.3%

**From analyst search:**
- 4 analysts: Buy. 1 analyst: Sell.
- Target price consensus: $220 (range $180–$275)
- Morningstar fair value: $592 (though flagged as "very high uncertainty")
- Multiple analysts said GTC "largely met expectations" — meaning the market had already anticipated a strong product launch

### Signal: "Vera Rubin platform launch with $1T revenue forecast"

### Scoring Walkthrough

**Sentiment: +0.6**
- Clearly bullish fundamentals (10x performance, $1T forecast, major partner lineup)
- But not +0.8 or +1.0 because: stock is down 15% from recent peak, broader market headwinds are real, the actual product ships in 6 months not now
- The positive signal is partially offset by macro negatives

**Confidence: 0.85**
- Source: CEO keynote at official conference, confirmed by NVIDIA press releases, covered by CNBC/Reuters/Bloomberg
- Specific data points: $1T forecast with named partners and shipping timeline
- This is about as authoritative as it gets short of an SEC filing
- Not 0.9+ because: the $1T figure is a forward projection, not booked revenue

**Intensity: 4/5**
- A full platform generation launch affecting the entire AI compute ecosystem is major
- Multiple cloud hyperscalers committing to deploy = industry-wide impact
- Not 5/5 because: this is an expected product cycle (Nvidia does this annually), not a surprise disruption like a trade ban would be

**Expectation Gap: 0.3**
- Key evidence: analysts said "largely met expectations" — this is the strongest signal for low expectation gap
- The stock rose only 2% on keynote day — if this were a surprise, it would have moved 5-10%
- The $1T forecast was an increase from $500B, but the market had already been pricing in strong Rubin demand since CES in January
- Additional calibration search: `"NVIDIA GTC expectations"` returned articles saying Wall Street expected a strong showing → confirms low gap
- Not 0.1 because: the specific Groq integration and Kyber architecture were new details that some analysts found noteworthy

**Timeliness: 0.5**
- Rubin ships H2 2026 — that's 3-6 months out
- The GTC event itself was 2 weeks ago — immediate reaction is over
- The next catalyst is Q1 earnings on May 28
- This is a medium-term signal, not urgent

### Overall Score

= 0.85 × 0.35 + (4/5) × 0.30 + 0.3 × 0.20 + 0.5 × 0.15
= 0.298 + 0.24 + 0.06 + 0.075
= **0.673** (Good — worth following, but not a high-conviction trade)

### Interpretation

The signal quality is good but not excellent. The fundamentals are strong (high confidence, high intensity) but the market already knew most of this (low expectation gap). The best trade here isn't "buy now on the GTC news" — it's "watch for the H2 shipping confirmation and Q1 earnings as the next catalysts that could close the gap between current price ($165) and analyst targets ($220+)."

### Forecast Anchoring (for this example)

- Center: $165 (current close)
- Support: $160 (computed), Resistance: $175 (computed)
- Average daily range: $5.50 (computed from last 20 days)
- Net sentiment: +0.6 → shift center slightly toward resistance → $167
- Expectation gap: 0.3 → range multiplier: 1.3 → adjusted daily range: $7.15
- Bull target: $175 + ($5.50 × 4/5) = $179.40
- Bear target: $160 - ($5.50 × 4/5) = $155.60
- Base target: $167 (sentiment-adjusted center)
