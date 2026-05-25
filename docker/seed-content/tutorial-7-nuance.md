---
title: "Tutorial 7 · Adding nuance"
description: "nodeBook Tutorial, Level 3 — quantifiers, adverbs and modalities"
tags:
  - nodebook
  - tutorial
---

# Lesson 7 · Adding nuance

Real statements aren't all-or-nothing. *All* mammals are animals; a cheetah runs
*rapidly*; a dog *usually* has four legs. nodeBook captures this with three light
**modifiers**.

### Quantifiers — on a concept
Put a quantifier in `*single asterisks*` before the name. It shows as a logic
symbol (∀ for *all*/*every*, ∃ for *some*/*exists*):

```nodeBook
# *all* Mammal [class]
<is_a> Animal;
```

### Adverbs and modalities — on an attribute
On a property, add an **adverb** with `++double plus++` (manner) or a **modality**
with `[square brackets]` (certainty / possibility):

```nodeBook
# Cheetah [class]
<is_a> Mammal;
speed: 110 *km/h* ++rapidly++;
legs: 4 [usually];
```

In the node box you'll see the adverb and modality rendered in *italic*, set
apart from the plain property name and value — so `speed: 110 km/h rapidly` and
`legs: usually 4` read at a glance.

> 🏁 **Milestone — your statements now carry nuance:** quantity (∀/∃), manner
> (adverbs), and certainty (modalities). The graph records not just *what* is
> true, but *how* and *how much*.

### Try it
Mark `# *some* Bird [class]` as able to fly, and give `Cheetah` a `diet: meat
[strictly];`.

---

← [Lesson 6](/n/tutorial-6-classify) · [Tutorial home](/n/tutorial) · *Level 4 (reasoning) coming soon*
