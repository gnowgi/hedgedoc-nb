---
title: "Chemical Equations as Transitions"
description: "Model balanced chemical equations as nodeBook transitions — stoichiometry as arc weights, with live simulation and reaction networks"
tags:
  - nodebook
  - nodebook/petri-net
  - chemistry
  - science-education
---

# Chemical Equations as Transitions

A chemical equation *is* a transformation: reactants on the left become products
on the right. That maps perfectly onto a nodeBook **transition** — reactants are
**prior states**, products are **post states**, and the **stoichiometric
coefficients** become **arc weights** (a leading number on the target).

## Synthesis of water — 2 H₂ + O₂ → 2 H₂O

```nodeBook
# Synthesis of Water [Transition]
<has prior_state> 2 H2;
<has prior_state> O2;
<has post_state> 2 H2O;
```

The `2` in `2 H2` and `2 H2O` is the arc weight — exactly the coefficient in the
balanced equation. The molecules (`H2`, `O2`, `H2O`) are **places**; the reaction
is the transition between them.

## Combustion of methane — CH₄ + 2 O₂ → CO₂ + 2 H₂O

```nodeBook
# Combustion of Methane [Transition]
<has prior_state> CH4;
<has prior_state> 2 O2;
<has post_state> CO2;
<has post_state> 2 H2O;
```

## Why model equations this way?

Because the graph is **live**, not just a picture:

- **Run the reaction.** Put tokens on the reactant places, fire the transition,
  and watch tokens flow to the products in the right proportions — a visual,
  mass-conserving simulation. (See [Simulation](/n/tutorial-13-simulation).)
- **Stoichiometry is explicit.** Arc weights *are* the coefficients, so the model
  and the balanced equation are the same thing.
- **Reaction networks emerge.** Put several reactions in one block and shared
  species (a product of one reaction that's a reactant of another) automatically
  link up into a pathway — which is exactly how the
  [Glycolysis](/n/Glycolysis) and [Krebs cycle](/n/Krebs-Cycle) notes are built.

That combination — readable equations, real stoichiometry, and runnable
simulation in one collaborative note — is hard to get from a static textbook
diagram.

---

*New to transitions? Start with [Lesson 12 · Transitions](/n/tutorial-12-transitions). See also [Oxidation & oxidation states](/n/chemistry-oxidation).*
