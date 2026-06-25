---
title: "Tutorial 7 · Adding nuance"
description: "nodeBook Tutorial, Level 3 — quantifiers, adverbs, modalities and negation"
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

### Negation — flip any statement
Sometimes the important fact is what *isn't* true: a snake has **no** external
ear; a pig does **not** have scales. Saying nothing leaves it unknown — but you
can state the negative **explicitly**. Put a `!` in front of any relation or
attribute line and it asserts that the statement does **not** hold:

```nodeBook
# Snake [class]
<is_a> Reptile;
!<has> external ear;
!color: green;
```

A negated relation is drawn as a **dashed red edge with a barred arrowhead**, and
a negated attribute appears **struck through** with a small `not` tag — so a
negative reads as clearly different from a positive. The `has` prefix and the
other modifiers still work (`!has length: 2 *m*;`).

A negative fact is genuine knowledge, not a blank: *"a snake does not have an
external ear"* says more than simply omitting ears.

> 🏁 **Milestone — your statements now carry nuance:** quantity (∀/∃), manner
> (adverbs), certainty (modalities), and **polarity** (negation). The graph
> records not just *what* is true, but *how*, *how much*, and *what is not*.

### Try it
Mark `# *some* Bird [class]` as able to fly, give `Cheetah` a `diet: meat
[strictly];`, and state that a `# Penguin [Bird]` does not fly with
`!<can> fly;`.

---

← [Lesson 6](/n/tutorial-6-classify) · [Tutorial home](/n/tutorial) · [Lesson 8: Inference →](/n/tutorial-8-inference)
