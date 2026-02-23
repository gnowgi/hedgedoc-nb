---
title: Functions & Equations
description: How to use Function transitions and the equation directive in nodeBook
tags:
  - nodebook
  - tutorial
  - functions
  - petri-net
---

# Functions & Equations

nodeBook can **evaluate mathematical expressions** using `[Function]` transitions. A Function is a special Petri net transition with an `expression:` attribute — it reads values from input places, evaluates the expression, and writes the result to output places.

[TOC]

## Simple Function: Atomic Mass

The simplest example: compute atomic mass from protons and neutrons.

```nodeBook
# protons
value: 1;

# neutrons
value: 0;

# atomicMass [Function]
<input> protons;
<input> neutrons;
<output> atomic_mass;
expression: protons + neutrons;

# atomic_mass
```

**How it works:**
1. `protons` and `neutrons` are **input places** with `value:` attributes
2. `atomicMass` is a **Function transition** — the purple bar with `f(x) = protons + neutrons`
3. `atomic_mass` is the **output place** that receives the computed result
4. Click **Evaluate All** (or click the transition) to fire it
5. The output place shows `= 1` (1 + 0)

## Attribute Abbreviations

Long attribute names can have short aliases using `{abbrev}` syntax:

```nodeBook
# Hydrogen [Element]
number of protons {p}: 1;
number of neutrons {n}: 0;

# computeMass [Function]
<input> Hydrogen;
<output> mass;
expression: p + n;

# mass
```

The expression `p + n` resolves `p` → "number of protons" (value 1) and `n` → "number of neutrons" (value 0).

## Physics Example: Distance, Speed, Time

```nodeBook
# distance
value: 100;

# time
value: 10;

# computeSpeed [Function]
<input> distance;
<input> time;
<output> speed;
expression: distance / time;

# speed
```

Click **Evaluate All** → speed shows `= 10` (100 / 10).

## Equation Directive

The `equation:` directive auto-generates a Petri net from a math expression. Each operator becomes a Function transition, and variables become input places.

```nodeBook
equation: (a + b) * c;
```

This creates:
- 3 input places: `a`, `b`, `c`
- 2 Function transitions: one for `+`, one for `*`
- Intermediate result places connecting them
- Set values on `a`, `b`, `c` and click **Evaluate All** to compute the result

## Supported Math Functions

Expressions use [math.js](https://mathjs.org/) under the hood, so you can use:

- **Arithmetic:** `+`, `-`, `*`, `/`, `^` (power)
- **Functions:** `sqrt()`, `abs()`, `log()`, `exp()`, `sin()`, `cos()`, `tan()`
- **Constants:** `pi`, `e`

```nodeBook
# radius
value: 5;

# computeArea [Function]
<input> radius;
<output> area;
expression: pi * radius ^ 2;

# area
```

## Tips

- **`<input>` and `<output>`** are friendly aliases for `<has prior_state>` and `<has post_state>`
- **`[Function]`** is a subtype of `[Transition]` — all Petri net simulation rules apply
- **Variable names in expressions** match input place names (the `base_name` from `# headings`)
- **Abbreviations `{x}`** create aliases that expressions can reference
- **Evaluate All** fires all Function transitions in topological order (dependencies first)
- Existing Petri net examples (Glycolysis, double-entry accounting) work unchanged
