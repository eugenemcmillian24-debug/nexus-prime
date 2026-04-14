---
name: retrieval-practice-generator
description: "Generate retrieval practice questions that force genuine reconstruction from memory rather than recognition. Use when the user asks to create a quiz, exam, test, revision questions, practice questions, or any kind of question set for learning or assessment."
---

# Retrieval Practice Question Generator

Help create retrieval practice questions grounded in the testing effect literature. The goal is questions that force students to **reconstruct knowledge from memory**, not just recognise familiar-looking information.

## Why retrieval practice

Rowland's (2014) meta-analysis of 159 studies found a mean effect size of 0.50 for testing versus restudy — retrieval practice is one of the most robust findings in cognitive psychology (Roediger & Butler, 2011; Karpicke & Roediger, 2008). The act of reconstruction itself strengthens memory through a distinct mechanism from encoding. Most teacher-made quiz questions inadvertently test recognition rather than reconstruction, which is why deliberate design matters.

## Three retrieval types

When generating questions, distinguish and balance these three types:

- **Free recall** (no cues) — *"Explain the process of..."* / *"List the factors that..."* — strongest learning effect, hardest for students. Weight toward this for older or more confident learners.
- **Cued recall** (partial cues) — *"The three main causes were ___, ___, and ___"* / *"Complete this diagram..."* — moderate difficulty, good scaffolding. Use scenario-based prompts as cues.
- **Recognition** (select from options) — multiple choice — weakest retrieval effect but useful warm-ups for novices or for confidence building.

Default mix: lean toward free and cued recall. Only include recognition questions for novices or as warm-up.

## Design principles

1. **Genuine reconstruction, not pattern matching.** Every question must require reconstructing knowledge from memory, not surface-level pattern matching against the question text itself.
2. **Target meaningful knowledge.** Questions should target core concepts, relationships, and procedures — not trivial details, dates, or definitions unless those are genuinely important to understanding.
3. **Calibrate by time since learning.** If material is recent (< 1 week), include more cued recall. If longer (> 2 weeks), free recall becomes more valuable as it provides stronger retrieval practice during the forgetting phase.
4. **Target known misconceptions.** If you know what students typically get wrong, include questions specifically designed to surface those misconceptions. If unknown, infer the most common misconceptions for the topic and target them.
5. **Error-correction as a question type.** *"A student writes: 'X is when Y happens.' What is wrong with this statement?"* — this is a powerful cued recall format that surfaces misconceptions directly.

## What to include in the output

For each question, provide the question text plus a brief note on the retrieval type and what knowledge it targets. After the question set, also include:

- **Answer notes** — key points for correct answers and common errors to watch for
- **Spacing recommendation** — when to use these questions for optimal effect (3-7 days post-learning is the sweet spot; re-use a subset 2-4 weeks later)
- **Implementation note** — retrieval practice should be **low-stakes / not graded**. The learning happens in the retrieval attempt itself. No notes, no textbooks.

The exact structure can flex based on what the user asked for — these are the elements that matter, not a rigid template.

## Hard constraints (non-negotiable)

These are not suggestions. Apply them on every generation:

1. **Label every question** with its retrieval type (Free Recall / Cued Recall / Recognition) and what knowledge it targets. Do not output bare questions without labels.
2. **At least 60% of questions must be free recall or cued recall.** Recognition (multiple choice) caps at 40% and only for novices or warm-ups.
3. **Include at least 2 questions targeting common misconceptions** for the topic. If the user did not specify misconceptions, infer the most likely ones and target them anyway.
4. **Always provide answer notes** alongside the questions, including common errors to watch for. Never output questions without answer notes.
5. **Before returning, self-check:** (a) does every question require genuine reconstruction, not pattern matching against the question text? (b) is the retrieval type mix appropriate for the stated learner level? (c) do the questions target meaningful knowledge, not trivia?

## Example

**Topic:** Causes and process of erosion (Year 7 Geography, covered 10 days ago, 8 questions)

1. **Without looking at any notes, explain the difference between erosion and weathering. Why are they not the same thing?**
   *Free recall — distinction between two commonly conflated processes; understanding that erosion involves transport.*

2. **Name the four main types of river erosion. For each, describe what physically happens to the rock or riverbed.**
   *Free recall — hydraulic action, abrasion, attrition, solution — and the mechanism, not just the label.*

3. **A farmer notices that the soil on a hillside field is thinner every year. The field has no trees or hedgerows. Explain why the soil is disappearing, using correct geographical terms.**
   *Cued recall (scenario) — soil erosion process, role of vegetation, surface runoff.*

4. **Complete this sequence:** Rock is broken down by weathering → loose material is __________ by erosion → carried by a river, called __________ → dropped when the river slows, called __________.
   *Cued recall — full erosion-transport-deposition cycle.*

5. **A student writes: "Erosion is when rocks get broken into smaller pieces by the weather." What is wrong? Write a more accurate version.**
   *Cued recall (error correction) — directly targets the weathering/erosion confusion.*

**Answer notes (selected):**
- Q1: Weathering breaks down rock *in situ*; erosion involves the *transport* of material. Common error: conflating with weathering.
- Q5: Better answer: "Erosion is the process by which weathered material is picked up and transported by agents such as rivers, waves, wind, or ice."

**Spacing:** 10 days post-learning is in the optimal window. Re-use a subset of the harder questions in 2-3 weeks for a second retrieval opportunity.

## Limitations to flag

- The questions are generated from general subject knowledge and cannot verify accuracy against a specific textbook or syllabus. Recommend the user check terminology matches what was actually taught.
- Free recall may overwhelm learners with very low prior knowledge or limited language proficiency — for those cases, shift the balance toward cued recall and recognition.
