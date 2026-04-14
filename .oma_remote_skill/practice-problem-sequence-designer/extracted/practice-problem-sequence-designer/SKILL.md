---
name: practice-problem-sequence-designer
description: "Generate a sequenced set of practice problems with progressive difficulty, surface-feature variation, and error-targeting. Use when the user asks for practice problems, exercise sets, worksheets, homework, or any set of problems to practise a learned skill."
---

# Practice Problem Sequence Designer

Help design a sequenced set of practice problems that follows principles of **near-to-far transfer**, **surface feature variation**, and **error-targeting**. Most LLM-generated practice sets are uniformly difficult and uniformly worded — this skill exists to do better.

## Why sequencing matters

Rosenshine (2012) identified guided and independent practice as core teaching principles, requiring scaffolded progression and high success rates (~80%) before scaffolds are removed. Sweller et al.'s (2019) **variability effect** shows that practising with varied problem types promotes schema abstraction and transfer, while practising with identical problems produces rigid, context-bound knowledge. Atkinson et al. (2000) demonstrated that surface-feature variation is critical: students who only practise problems that look like the taught example fail when problems look different. Bjork & Bjork (2011) frame this as "desirable difficulty" — practice that feels harder produces better long-term learning.

## The progression

A good practice sequence moves through four zones:

1. **Near transfer (first ~20% of problems)** — Nearly identical to the taught example. Same structure, similar numbers, same context. Target ~90% success rate. These build confidence and confirm basic understanding.

2. **Surface variation (next ~30%)** — Same underlying skill, **different** context, numbers, format, or presentation. The learner must recognise the same skill in a new wrapper. *If the example used apples, switch to temperatures, distances, money — never just "more apple problems."*

3. **Increased complexity (next ~30%)** — Additional steps, missing information to infer, or combining this skill with a previously learned one.

4. **Far transfer (final ~20%)** — Looks substantially different from the taught example but requires the same underlying skill. May be embedded in a larger problem or a novel context.

## Non-negotiable design elements

For any practice set, include:

- **At least 2 error-targeting problems.** Specifically designed to surface known common errors. If you don't know the common errors, infer the 2-3 most likely ones for this skill and design problems where the wrong approach gives a plausible-looking answer.

- **At least 1 "twist" problem.** A problem that *looks* like it requires this skill but actually doesn't — or that requires the learner to explain why the skill doesn't apply. This tests whether the learner is thinking or just applying a procedure mechanically. Critical for preventing rote pattern matching.

- **Scaffold reduction.** Early problems may include partial scaffolds (a hint, a first step, a formula reminder). Middle problems remove these. Later problems require the learner to determine the method independently.

## What to include in the output

For each problem, provide:
- The problem itself
- A brief **design intent** note (why this problem at this position — what it tests that previous problems didn't)
- Difficulty zone (near transfer / surface variation / complexity / far transfer)
- Common error to watch for, where applicable

After the sequence, also provide:
- **Scaffold reduction summary** — how scaffolding decreases across the sequence
- **Differentiation note** — how to support struggling learners (which problems to prioritise) and how to extend confident ones (which to add)

The exact structure can flex based on what the user asked for — these are the elements that matter, not a rigid template.

## Hard constraints (non-negotiable)

These are not suggestions. Apply them on every generation:

1. **Label every problem** with its difficulty zone (Near transfer / Surface variation / Complexity / Far transfer). Do not output bare problems without labels.
2. **Surface features must actually vary across the sequence.** If the worked example was about apples, do not output 10 apple problems. Switch contexts: temperature, distance, money, recipes, populations. A sequence where every problem has the same context is a failure of this skill.
3. **Include at least 2 error-targeting problems.** These must be designed so that the most likely wrong approach gives a plausible-looking answer, forcing the learner to think carefully. If common errors weren't provided, infer the 2-3 most likely ones for the skill.
4. **Include at least 1 twist problem.** A problem that looks like it requires this skill but actually doesn't, or that requires the learner to recognise why the skill doesn't apply. This is the single most important defence against rote pattern matching.
5. **Before returning, self-check:** (a) do problems progress from near to far transfer? (b) do surface features actually vary, or did I just change numbers? (c) are at least 2 problems error-targeting and is at least 1 a twist? (d) is the first problem accessible enough for ~90% success?

## Example

**Skill:** Calculating percentage increase and decrease (Year 9, just saw worked example "find 15% of £240 and add it to the original", 10 problems, common errors: forgetting to add/subtract the percentage; calculating percentage of new amount instead of original)

1. **Increase £80 by 25%.** *Near transfer — almost identical to the example. Method reminder provided. Targets ~90% success.*
2. **A £150 jacket is increased by 10%. What is the new price?** *Near transfer — same context (money), slightly different surface.*
3. **The temperature was 40°C. It dropped by 15%. What is the new temperature?** *Surface variation — switches from money to temperature. Same underlying calculation. **Common error to watch:** forgetting to subtract.*
4. **A car drove 200 km. The distance increased by 35% the next day. How far did it drive on day two?** *Surface variation — distance context.*
5. **A shop has 80 items in stock. After a delivery, stock increases by 45%. After a sale, stock decreases by 20%. How many items are in stock now?** *Increased complexity — two-step. **Common error:** applying the second percentage to the original 80 instead of the new total.*
6. **A coat costs £60 after a 25% discount. What was the original price?** *Increased complexity — reverse percentage. Most learners will instinctively add 25% of £60, which is wrong.*
7. **Population grew from 12,000 to 15,000. By what percentage did it increase?** *Far transfer — finding the percentage rather than applying one.*
8. **(Twist problem)** **A shop offers "20% off, then an extra 10% off the discounted price." A customer claims this is the same as 30% off. Are they correct? Explain.** *Twist — looks like compound percentage but the real task is to recognise that successive discounts ≠ summed discounts.*
9. **A house was bought for £200,000 and sold three years later for £230,000. What was the percentage profit?** *Far transfer — finding percentage in a real-world context.*
10. **A recipe for 4 people uses 600g of flour. To serve 6 people, how much flour is needed? Express the increase as a percentage.** *Far transfer — combines proportional reasoning with percentage calculation.*

**Scaffold reduction:** Problems 1-2 include the "find the percentage, then add/subtract" method reminder. Problems 3-5 remove the reminder. Problems 6+ require the learner to identify the method themselves.

**Differentiation:**
- **Support:** Struggling learners do problems 1, 2, 3, 5 only — these cover the core skill without the reverse-percentage trap.
- **Extension:** Confident learners skip 1-2 and add a compound interest problem after #10.

## Limitations to flag

- The problems are generated from general subject knowledge — verify they match the curriculum the learner is studying.
- The 90% success rate for near-transfer problems is a target, not a guarantee — adjust difficulty based on actual learner performance.
