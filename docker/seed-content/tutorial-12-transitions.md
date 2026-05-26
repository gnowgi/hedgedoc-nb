---
title: "Tutorial 12 · Transitions"
description: "nodeBook Tutorial, Level 6 — model a process that turns inputs into outputs"
tags:
  - nodebook
  - tutorial
---

# Lesson 12 · Transitions

Everything so far has been about *things* and how they relate. But knowledge is
also about **change** — processes that turn some things into others. A tadpole
*becomes* a frog; food *becomes* nutrients. nodeBook models change with a special
node kind: the `[Transition]`.

A transition has **prior states** (what goes in / what's true before) and **post
states** (what comes out / what's true after):

```nodeBook
# Metamorphosis [Transition]
<has prior_state> Tadpole;
<has post_state> Frog;
```

nodeBook draws this as a small **Petri net**: input places on one side, the
transition as a bar in the middle, output places on the other. A process has a
direction — *before → after*.

Transitions can have several inputs and outputs:

```nodeBook
# Digestion [Transition]
<has prior_state> Food;
<has post_state> Nutrients;
<has post_state> Waste;
```

> Tip: `<input>` and `<output>` are shorthand for `<has prior_state>` and
> `<has post_state>` — handy for data-flow style graphs (next lesson but one).

So: **nodes are things, transitions are the changes between them.** And because a
transition has a real before/after, nodeBook can actually *run* it —

> 🧪 **See it in chemistry:** [Chemical equations as transitions](/n/chemistry-equations) models balanced reactions (with stoichiometry as arc weights).

---

← [Lesson 11](/n/tutorial-11-schemas) · [Tutorial home](/n/tutorial) · [Lesson 13: Simulation →](/n/tutorial-13-simulation)
