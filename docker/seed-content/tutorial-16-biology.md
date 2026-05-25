---
title: "Tutorial 16 · A metabolic pathway"
description: "nodeBook Tutorial, Level 7 — a real-world capstone in biology"
tags:
  - nodebook
  - tutorial
---

# Lesson 16 · Capstone — a metabolic pathway

Time to see everything working together on something real. A **metabolic
pathway** is a chain of biochemical steps — exactly the kind of process nodeBook
was built for. Each step is a `[Transition]` with reactants as prior states and
products as post states; enzymes, cofactors, and quantities ride along as
relations and attributes; and you can *simulate* the flow.

You've already met every ingredient:

- **nodes & types** (Lessons 1, 6) — molecules and enzymes,
- **relations & attributes** (Lessons 2, 3) — what acts on what, and how much,
- **transitions & simulation** (Lessons 12, 13) — each enzymatic step, fired in turn,
- **expressions** (Lesson 14) — yields and balances.

Explore the full worked graphs:

- 🧬 **[Glycolysis](/n/Glycolysis)** — glucose broken down step by step.
- 🔁 **[Krebs cycle](/n/Krebs-Cycle)** — the citric-acid cycle as a Petri net.
- ♻️ **[Urea cycle](/n/Urea-Cycle)** — another classic pathway.

Open one, hit **Show CNL source** to read how it's written, and notice it's all
the same CNL you've been writing — just more of it.

---

← [Lesson 15](/n/tutorial-15-analyze) · [Tutorial home](/n/tutorial) · [Lesson 17: Personal accounting →](/n/tutorial-17-accounting)
