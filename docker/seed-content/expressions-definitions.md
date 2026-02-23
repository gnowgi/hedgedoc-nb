---
title: Function Transitions & Expressions
description: Computable Petri net transitions — evaluate definitions, chain functions, and auto-generate data-flow networks from expressions
tags:
  - nodebook
  - tutorial
  - functions
  - petri-net
  - expressions
---

# Function Transitions & Expressions

nodeBook extends the Petri net model with **computable transitions**. A `[Function]` is a transition that carries a `definition:` attribute — when fired, it reads numeric values from its input places, evaluates the definition using [math.js](https://mathjs.org/), and writes the result to its output places.

This turns a knowledge graph into a **semantic computer**: the graph doesn't just *describe* relationships, it *computes* through them.

[TOC]

---

## 1. Basic Function: Sum of Two Values

The simplest case — two input places, one Function transition, one output place.

```nodeBook
# protons
value: 1;

# neutrons
value: 0;

# computeMass [Function]
<input> protons;
<input> neutrons;
<output> mass_number;
definition: protons + neutrons;

# mass_number
```

**What you see:**
- `protons` and `neutrons` are **circles** (places) showing their values
- `computeMass` is a **purple rounded bar** (Function transition) labeled `f(x) = protons + neutrons`
- `mass_number` is an empty output place
- Click the transition or press **Evaluate All** to fire it
- The output place shows `= 1`

**How it works:**
1. `value:` attributes give places their initial numeric values
2. `<input>` connects a place as an input arc (alias for `<has prior_state>`)
3. `<output>` connects a place as an output arc (alias for `<has post_state>`)
4. `definition:` tells the Function what to compute — variable names match the `# heading` names of input places

---

## 2. Division and Other Operators

All standard arithmetic operators work in definitions.

```nodeBook
# distance
value: 100;

# time
value: 10;

# computeSpeed [Function]
<input> distance;
<input> time;
<output> speed;
definition: distance / time;

# speed
```

Fire the transition → `speed = 10`.

---

## 3. Built-in Math Functions

Definitions support `sqrt()`, `abs()`, `log()`, `exp()`, `sin()`, `cos()`, `tan()`, `pow()`, and constants `pi` and `e`.

```nodeBook
# radius
value: 5;

# computeArea [Function]
<input> radius;
<output> area;
definition: pi * radius ^ 2;

# area
```

Fire → `area = 78.5398` (i.e. $\pi \times 25$).

---

## 4. Chaining Functions

When one Function's output feeds into another Function's input, **Evaluate All** fires them in the correct order using topological sorting.

```nodeBook
# a
value: 3;

# b
value: 4;

# sumAB [Function]
<input> a;
<input> b;
<output> sum_ab;
definition: a + b;

# sum_ab

# c
value: 2;

# multiply [Function]
<input> sum_ab;
<input> c;
<output> result;
definition: sum_ab * c;

# result
```

**Evaluate All** fires `sumAB` first (producing `sum_ab = 7`), then `multiply` (producing `result = 14`).

This is equivalent to the expression $(a + b) \times c = (3 + 4) \times 2 = 14$.

---

## 5. Attribute Abbreviations `{x}`

When input places have long attribute names, use `{abbrev}` to create short aliases for definitions.

```nodeBook
# Hydrogen [Element]
number of protons {p}: 1;
number of neutrons {n}: 0;

# atomicMass [Function]
<input> Hydrogen;
<output> mass;
definition: p + n;

# mass
```

The definition `p + n` resolves the abbreviations:
- `p` → value of "number of protons" on Hydrogen → `1`
- `n` → value of "number of neutrons" on Hydrogen → `0`

Result: `mass = 1`.

---

## 6. Expression Directive (Auto-Generated Petri Net)

The `expression:` directive automatically decomposes a math expression into a full Petri net — each operator becomes a Function transition, each variable becomes an input place, and intermediate results get their own places.

```nodeBook
expression: (a + b) * c;
```

This auto-generates:
- **3 input places**: `a`, `b`, `c`
- **2 Function transitions**: `+` (adds `a` and `b`) and `*` (multiplies the sum by `c`)
- **2 result places**: an intermediate result from `+`, and the final result from `*`
- All the `<input>`/`<output>` arcs connecting them

Set values on `a`, `b`, `c` and click **Evaluate All** to watch computation flow through the network.

### A more complex equation

```nodeBook
expression: sqrt(x^2 + y^2);
```

This decomposes the Pythagorean distance formula into:
- Input places `x` and `y`
- `^` transitions for squaring
- `+` transition for summing squares
- `sqrt` transition for the final result

---

## 7. Physics Example: Kinetic Energy

A real-world formula combining multiple operators: $KE = \frac{1}{2} m v^2$.

```nodeBook
# mass
value: 10;

# velocity
value: 3;

# squareV [Function]
<input> velocity;
<output> v_squared;
definition: velocity ^ 2;

# v_squared

# kineticEnergy [Function]
<input> mass;
<input> v_squared;
<output> KE;
definition: 0.5 * mass * v_squared;

# KE
```

**Evaluate All** fires in order:
1. `squareV` → `v_squared = 9`
2. `kineticEnergy` → `KE = 0.5 * 10 * 9 = 45`

---

## 8. Mixing Knowledge Graph and Computation

Functions integrate with the rest of nodeBook's knowledge graph features. You can combine typed nodes, relations, and computations in one graph.

```nodeBook
# Earth [Planet]
<is a> Terrestrial Planet;
orbital radius {r}: 149.6;
orbital period {T}: 365.25;

# computeSpeed [Function]
<input> Earth;
<output> orbital_speed;
definition: 2 * pi * r / T;

# orbital_speed

# Terrestrial Planet [Class]
```

The Function reads abbreviated attributes `r` and `T` from the typed `Earth` node and computes the orbital speed ($2\pi r / T$).

---

## Syntax Reference

### Function Transition

```
# functionName [Function]
<input> inputPlace;
<output> outputPlace;
definition: math expression;
```

- `[Function]` is a subtype of `[Transition]` — it renders as a purple rounded bar
- Variable names in the definition must match the `# heading` names of input places, or abbreviations defined with `{x}` syntax
- Multiple inputs and outputs are supported

### Place Values

```
# placeName
value: 42;
```

- `value:` sets the initial numeric value of a place
- Places with `value:` start with 1 token; places without start with 0

### Abbreviations

```
# nodeName [Type]
long attribute name {x}: 42;
```

- `{x}` after the attribute name creates a short alias
- Definitions can reference `x` instead of the full attribute name
- Abbreviations are scoped to the nodeBook block

### Expression Directive

```
expression: mathematical expression;
```

- Placed at the top level of a nodeBook block (not under any `# heading`)
- Auto-generates the full Petri net decomposition
- Supported operators: `+`, `-`, `*`, `/`, `^`
- Supported functions: `sqrt()`, `abs()`, `log()`, `exp()`, `sin()`, `cos()`, `tan()`

### Relation Aliases

| Alias | Expands to | Meaning |
|-------|-----------|---------|
| `<input>` | `<has prior_state>` | Input arc: place feeds into transition |
| `<output>` | `<has post_state>` | Output arc: transition produces into place |
| `<debit>` | `<has post_state>` | Accounting: debit an account |
| `<credit>` | `<has prior_state>` | Accounting: credit an account |

---

*See also: [nodeBook overview](/n/nodeBook) | [Transitions](/n/transitions) | [Transactions](/n/nodeBook_transactions) | [Features](/n/features) | [Create a new note](/new)*
