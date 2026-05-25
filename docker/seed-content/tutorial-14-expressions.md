---
title: "Tutorial 14 · Expressions"
description: "nodeBook Tutorial, Level 6 — computable transitions that calculate values"
tags:
  - nodebook
  - tutorial
---

# Lesson 14 · Expressions

A plain transition moves tokens around. A `[Function]` transition goes further —
it **computes**. It carries a `definition:` (a formula), reads numeric values
from its input places, evaluates the formula, and writes the result to its
output place.

Give input places a `value:`, name them in the definition, and connect them with
`<input>` / `<output>`:

```nodeBook
# herd
value: 12;

# legsPerAnimal
value: 4;

# countLegs [Function]
<input> herd;
<input> legsPerAnimal;
<output> totalLegs;
definition: herd * legsPerAnimal;

# totalLegs
```

`countLegs` shows as a purple bar labelled `f(x) = herd * legsPerAnimal`. Press
**Evaluate All** on the canvas and the `totalLegs` place fills in: **48**.

- `value:` sets a place's number.
- variable names in `definition:` match the **input place headings**.
- All the usual math works (`+ - * /`, parentheses, functions) — via math.js.

Chain functions together — one Function's output is another's input — and you've
built a little **data-flow network** that recomputes itself.

> 🏁 **Milestone — your graph can calculate.** Knowledge isn't only facts and
> processes; sometimes it's arithmetic. Function transitions turn a nodeBook note
> into a live, self-updating model.

### Try it
Add `# costPerLeg` `value: 5;` and a Function `boneCost` that computes
`totalLegs * costPerLeg`.

---

← [Lesson 13](/n/tutorial-13-simulation) · [Tutorial home](/n/tutorial) · *Level 7 (real-world) coming soon*
