---
name: causal-chain
description: 'Visualize financial causal chains and market transmission flows as interactive diagrams. Primarily for finance - how policy changes, macro events, or market signals ripple through sectors, asset classes, and stock prices. Also supports general cause-effect analysis. Triggers include 画个传导链, 因果关系图, 市场传导, 政策影响链, 理清逻辑, impact chain, causal diagram, or any request to diagram how financial events lead to market outcomes.'
---

# Causal Chain — 因果传导链可视化

## Step 1: Analyze — 拆解因果结构

This is the core of the skill. Do NOT skip to drawing.

### 1.1 Identify the trigger event

Classify the trigger:
- **货币政策**: 加息/降息/QE/缩表
- **财政政策**: 减税/基建/补贴/监管
- **贸易事件**: 关税/制裁/贸易协定
- **供给冲击**: 能源中断/自然灾害/产能事故
- **信用事件**: 违约/评级下调/流动性危机
- **地缘政治**: 冲突/选举/政权更迭

### 1.2 Trace the transmission layers

Every chain must follow this层级结构:

```
触发事件 → 一阶直接影响 → 二阶间接传导 → 终端资产定价
```

- **一阶**: 事件直接改变的经济变量（利率、汇率、商品价格、信用利差）
- **二阶**: 经济变量变化引发的行业/企业层面影响（成本、需求、估值）
- **终端**: 具体到可交易资产的涨跌判断（个股、板块、债券、商品）

### 1.3 Determine impact direction per asset

**同一事件对不同资产影响方向不同。** 这是最关键的分析步骤。

Example — 美联储加息:
| 资产 | 方向 | 传导机制 |
|------|------|----------|
| 成长股 | 利空 | 折现率上升 → 估值压缩 |
| 银行股 | 利好 | 净息差扩大 |
| 美元 | 利好 | 利差吸引资本流入 |
| 黄金 | 利空 | 持有成本上升（无息资产） |
| 新兴市场 | 利空 | 资本外流 + 美元债务压力 |

**Rule: Never color an entire chain the same color.** A real transmission chain always has mixed impacts.

### 1.4 Check for branching and feedback loops

Real chains are NOT linear. Always look for:
- **分叉**: 一个事件影响多个路径（加息 → 汇率路径 + 利率路径）
- **汇聚**: 多个路径影响同一个终端（多因一果）
- **反馈**: A影响B，B又反过来影响A（股价下跌 → 质押爆仓 → 更多抛售 → 股价继续跌）

### 1.5 Consult pattern library

Read `references/patterns.md` to find matching skeleton for the trigger type. Adapt the skeleton to the user's specific scenario — do not copy blindly.

## Step 2: Generate Mermaid Code

### Node types

| Type | Shape | Use For |
|------|-------|---------|
| Trigger | `(["text"])` stadium | 触发事件 |
| Mechanism | `["text"]` rectangle | 中间传导 |
| Outcome | `[["text"]]` subroutine | 终端结果 |
| Uncertain | `{"text"}` diamond | 不确定路径 |

### Color classes — append `:::className` to each node

```
classDef positive fill:#d5e8d4,stroke:#82b366,stroke-width:2px,color:#2d5a1e
classDef negative fill:#f8cecc,stroke:#b85450,stroke-width:2px,color:#7a2020
classDef neutral fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px,color:#1a3a5c
classDef uncertain fill:#fff2cc,stroke:#d6b656,stroke-width:2px,color:#6b5a1e,stroke-dasharray:5
```

### Edge labels — always describe the mechanism

```
A -->|传导机制| B
```

Common labels by category:
- **利率类**: 利率传导, DCF传导, 融资成本, 息差变化
- **汇率类**: 汇率机制, 资本流动, 计价效应, 出口竞争力
- **情绪类**: 避险情绪, 风险偏好, 预期修正, 恐慌传染
- **供需类**: 成本传导, 成本转嫁, 需求替代, 供需缺口
- **政策类**: 政策驱动, 倒逼效应, 监管约束, 补贴拉动

### ⚠ Mermaid Syntax Traps — MUST follow

1. **No `\n`** → use `<br/>` for line breaks
2. **No Chinese quotes** `""` → rephrase to remove inner quotes
3. **No raw parentheses** `()` in text → use `+` or `、` to list items
4. **No** `{}[]<>#&` in text → these conflict with Mermaid shape syntax
5. **Max 10 Chinese chars per line**, max 2 lines per node
6. Use `graph LR` for transmission chains, `graph TD` for thesis maps

## Step 3: Render to HTML

Run `scripts/render.py` to wrap Mermaid code into a styled HTML file:

```python
from scripts.render import render
render(mermaid_code, title="图表标题", output_path="output.html")
```

Or via command line:
```bash
python scripts/render.py input.mmd "图表标题" output.html
```

Also show the Mermaid source in a fenced code block so users can copy it.

## Output Checklist

Before delivering, verify:
- [ ] Chain has 3+ layers (trigger → intermediate → terminal)
- [ ] Mixed colors (not all same impact direction)
- [ ] Every edge has a mechanism label
- [ ] Node text passes all 5 syntax rules
- [ ] File saved to disk
- [ ] Follow user's language (Chinese input → Chinese output)
