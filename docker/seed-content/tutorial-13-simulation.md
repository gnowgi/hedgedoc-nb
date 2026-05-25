---
title: "Tutorial 13 · Simulation"
description: "nodeBook Tutorial, Level 6 — run a process by firing transitions"
tags:
  - nodebook
  - tutorial
---

# Lesson 13 · Simulation

A transition isn't just a picture of a process — you can **run** it. In a Petri
net, **tokens** sit on places to mark "this is present / true right now". Firing
a transition consumes tokens from its prior states and produces tokens on its
post states. That's a tiny simulation of cause and effect.

```nodeBook
# Hatching [Transition]
<has prior_state> Egg;
<has post_state> Tadpole;

# Metamorphosis [Transition]
<has prior_state> Tadpole;
<has post_state> Frog;
```

### Run it
1. The canvas shows tokens on the starting place(s). Use the **token multiplier**
   control to set how many (see [Reading the canvas](/n/tutorial-canvas)).
2. **Click an enabled transition** (it lights up when it has enough input tokens)
   to fire it — the token moves from `Egg` to `Tadpole`.
3. Fire `Metamorphosis` next — the token flows on to `Frog`.
4. **Reset** returns everything to the starting marking.

You've just watched a life-cycle *happen*: `Egg → Tadpole → Frog`.

> 🏁 **Milestone — your knowledge graph can model *and run* processes.** Most
> note tools can only describe a process; nodeBook lets you step through it and
> watch the consequences flow. Great for pathways, workflows, and "what happens
> if…" questions.

### Try it
Add a `# Death [Transition]` with `<has prior_state> Frog;` and fire the whole
chain end to end.

---

← [Lesson 12](/n/tutorial-12-transitions) · [Tutorial home](/n/tutorial) · [Lesson 14: Expressions →](/n/tutorial-14-expressions)
