---
title: nodeBook Analyze — Test Passage
description: A science paragraph for exercising the nodeBook-analyze text decomposition feature across all annotation categories
tags:
  - nodebook/analyze
  - science-education
  - testing
---

# nodeBook Analyze — Test Passage

Open the toolbar below and toggle 1–3 annotation categories. Each one should
highlight/report the matching spans and offer a **+Add** button that inserts CNL
into the empty `nodeBook` block at the bottom.

## The passage to analyze

```nodeBook-analyze
Photosynthesis is the fundamental process by which green plants convert light
energy into chemical energy. Inside the chloroplasts, chlorophyll rapidly absorbs
sunlight and drives the reaction. Carbon dioxide and water are the main reactants,
while glucose and oxygen are the principal products. Most plants can perform
photosynthesis only when sunlight is available. If the temperature rises above
40 degrees, the rate of photosynthesis decreases sharply. Each mature leaf
typically contains about 500000 chloroplasts. Charles Darwin studied how such
adaptations might evolve in tropical forests near the Amazon.
```

## What each category should surface

| Category | Expected hits (examples) |
|----------|--------------------------|
| **nodes** | plants, chloroplasts, chlorophyll, glucose, oxygen, leaf; Darwin/Amazon (named entities) |
| **process** | photosynthesis → `# Photosynthesis [Transition]` (nominalized-process dictionary) |
| **relations** | convert, absorbs, drives, contains, perform |
| **adjectives** | green, chemical, main, principal, mature, tropical |
| **adverbs** | rapidly, sharply, typically |
| **quantifiers** | most, each, about |
| **modalities** | can, only, might |
| **conditions** | when, if, above |
| **inputOutput** | reactants, products |
| **attributes** | 40 degrees, 500000 |

> `process`, `attributes`, `conditions`, `operations`, and `inputOutput` require
> the **full pipeline** (spaCy `/extract` + Qwen2.5, or the LLM API). The other
> six work via spaCy `/extract/fast`. If the backend reports "not configured",
> the client-side fallback runs instead.

## Insert target — test the +Add flow here

```nodeBook
# Photosynthesis [Transition]
```
