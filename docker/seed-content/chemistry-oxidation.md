---
title: "Oxidation States & Reactions"
description: "Combine morphs and transitions — an element's oxidation states as morphs, with the reactions that change them as transitions"
tags:
  - nodebook
  - nodebook/morphs
  - nodebook/petri-net
  - chemistry
  - science-education
---

# Oxidation States & Reactions

Two nodeBook features come together nicely in chemistry:

- a single species exists in several **states** — model them as **morphs**;
- the **reactions** that move between or involve those states are **transitions**.

## Iron, in three oxidation states (morphs)

Iron is one element, but it shows up as the metal and as two common ions. That's
one concept with three states — a job for morphs:

```nodeBook
# Iron [Element]
symbol: Fe;
oxidation_state: 0;
colour: silvery;

## ferrous
oxidation_state: 2;
colour: pale green;

## ferric
oxidation_state: 3;
colour: yellow-brown;
```

Select the **Iron** node and use the **Current State** selector to switch between
*basic* (the metal), *ferrous*, and *ferric* — watch `oxidation_state` and
`colour` change inside the node box. One node, three states.

## Rusting, the reaction (transition)

Oxidation is the *process* that changes those states — a transition. Rusting is
**4 Fe + 3 O₂ → 2 Fe₂O₃**:

```nodeBook
# Rusting [Transition]
<has prior_state> 4 Iron;
<has prior_state> 3 Oxygen;
<has post_state> 2 Iron Oxide;
```

The same `Iron` that carried the oxidation-state morphs above is here a reactant
in a balanced, simulatable reaction (arc weights = coefficients).

## Bonus — autoionization of water

Even water reacts with itself: **2 H₂O ⇌ H₃O⁺ + OH⁻**.

```nodeBook
# Autoionization of Water [Transition]
<has prior_state> 2 H2O;
<has post_state> Hydronium;
<has post_state> Hydroxide;
```

> Together: **morphs** capture *what something can be*, **transitions** capture
> *what happens to it* — and in chemistry you almost always need both.

---

*See [Lesson 10 · Morphs](/n/tutorial-10-morphs), [Lesson 12 · Transitions](/n/tutorial-12-transitions), and [Chemical equations as transitions](/n/chemistry-equations).*
