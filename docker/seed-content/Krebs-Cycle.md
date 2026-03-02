---
title: Krebs Cycle — Chained Petri Net
tags:
  - biology/metabolism
  - biology/krebs-cycle
  - nodebook/petri-net
  - tutorial
---

# Krebs Cycle — Chained Petri Net

The citric acid cycle (Krebs cycle, TCA cycle) is the central metabolic hub of aerobic respiration. It takes place in the mitochondrial matrix and oxidises acetyl-CoA derived from carbohydrates, fats, and proteins. Each turn produces 3 NADH, 1 FADH₂, 1 GTP, and 2 CO₂.

This note demonstrates **reaction chaining** in Petri nets: the product of one enzymatic reaction becomes the reactant of the next. In nodeBook, chaining happens automatically when two transitions in the same code block reference the same node — one as `<product>`, the other as `<reactant>`. The shared node is where the chain links.

nodeBook supports domain-appropriate synonyms for Petri net arcs. In chemistry, `<reactant>` and `<product>` map to the canonical `<has prior_state>` and `<has post_state>`. Other domains can use `<input>`/`<output>`, `<LHS>`/`<RHS>`, `<in>`/`<out>`, `<in-flow>`/`<out-flow>`, or `<credit>`/`<debit>`.

## Schema

```nodeBook-schema
# Enzyme [class]
# Metabolite [class]
# Cofactor [class]
# Coenzyme [class]
```

## Chaining Principle — A Two-Step Example

Before showing the full cycle, here is the simplest chain: two consecutive reactions sharing a metabolite. Step 1 (Citrate Synthase) **produces** Citrate; Step 2 (Aconitase) **consumes** Citrate. Because both transitions reference the same `Citrate` node, the graph connects them through it.

```nodeBook
# Acetyl-CoA [Metabolite]
# Oxaloacetate [Metabolite]
# H2O [Metabolite]
# Citrate [Metabolite]
# CoA-SH [Cofactor]
# Isocitrate [Metabolite]

# Citrate Synthase [Transition]
<reactant> Acetyl-CoA;
<reactant> Oxaloacetate;
<reactant> H2O;
<product> Citrate;
<product> CoA-SH;

# Aconitase [Transition]
<reactant> Citrate;
<product> Isocitrate;
```

Notice: `Citrate` has an incoming arc from Citrate Synthase and an outgoing arc to Aconitase. That is the chain. Click the Citrate Synthase transition bar to fire it — tokens appear in Citrate. Then click Aconitase — the tokens move from Citrate to Isocitrate. Products flow into the next reaction.

## The Complete Krebs Cycle — All Eight Steps Chained

All eight enzymatic steps are declared in a single block. Every cycle intermediate (Citrate, Isocitrate, α-Ketoglutarate, Succinyl-CoA, Succinate, Fumarate, Malate, Oxaloacetate) appears as `post_state` of one enzyme and `prior_state` of the next, forming an unbroken chain. The cycle closes because Oxaloacetate — produced by Step 8 — is consumed by Step 1.

Cofactors and coenzymes (NAD⁺, FAD, CoA-SH, GDP, Pi) are also shared nodes: NAD⁺ feeds into three different dehydrogenases; CoA-SH is released by Steps 1 and 5, then consumed again by Step 4.

```nodeBook
# Acetyl-CoA [Metabolite]
# Oxaloacetate [Metabolite]
# H2O [Metabolite]
# Citrate [Metabolite]
# CoA-SH [Cofactor]
# Isocitrate [Metabolite]
# NAD+ [Coenzyme]
# alpha-Ketoglutarate [Metabolite]
# CO2 [Metabolite]
# NADH [Coenzyme]
# Succinyl-CoA [Metabolite]
# GDP [Metabolite]
# Pi [Metabolite]
# Succinate [Metabolite]
# GTP [Metabolite]
# FAD [Coenzyme]
# Fumarate [Metabolite]
# FADH2 [Coenzyme]
# Malate [Metabolite]

# Citrate Synthase [Transition]
<reactant> Acetyl-CoA;
<reactant> Oxaloacetate;
<reactant> H2O;
<product> Citrate;
<product> CoA-SH;

# Aconitase [Transition]
<reactant> Citrate;
<product> Isocitrate;

# Isocitrate Dehydrogenase [Transition]
<reactant> Isocitrate;
<reactant> NAD+;
<product> alpha-Ketoglutarate;
<product> CO2;
<product> NADH;

# aKG Dehydrogenase [Transition]
<reactant> alpha-Ketoglutarate;
<reactant> NAD+;
<reactant> CoA-SH;
<product> Succinyl-CoA;
<product> CO2;
<product> NADH;

# Succinyl-CoA Synthetase [Transition]
<reactant> Succinyl-CoA;
<reactant> GDP;
<reactant> Pi;
<product> Succinate;
<product> GTP;
<product> CoA-SH;

# Succinate Dehydrogenase [Transition]
<reactant> Succinate;
<reactant> FAD;
<product> Fumarate;
<product> FADH2;

# Fumarase [Transition]
<reactant> Fumarate;
<reactant> H2O;
<product> Malate;

# Malate Dehydrogenase [Transition]
<reactant> Malate;
<reactant> NAD+;
<product> Oxaloacetate;
<product> NADH;
```

## Reading the Chain

Follow the eight cycle intermediates through the graph:

| Step | Enzyme | Consumes → Produces | Chain link |
|------|--------|---------------------|------------|
| 1 | Citrate Synthase | Acetyl-CoA + Oxaloacetate + H₂O → **Citrate** + CoA-SH | **Citrate** → Step 2 |
| 2 | Aconitase | **Citrate** → **Isocitrate** | **Isocitrate** → Step 3 |
| 3 | Isocitrate Dehydrogenase | **Isocitrate** + NAD⁺ → **α-KG** + CO₂ + NADH | **α-KG** → Step 4 |
| 4 | α-KG Dehydrogenase | **α-KG** + NAD⁺ + CoA-SH → **Succinyl-CoA** + CO₂ + NADH | **Succinyl-CoA** → Step 5 |
| 5 | Succinyl-CoA Synthetase | **Succinyl-CoA** + GDP + Pi → **Succinate** + GTP + CoA-SH | **Succinate** → Step 6 |
| 6 | Succinate Dehydrogenase | **Succinate** + FAD → **Fumarate** + FADH₂ | **Fumarate** → Step 7 |
| 7 | Fumarase | **Fumarate** + H₂O → **Malate** | **Malate** → Step 8 |
| 8 | Malate Dehydrogenase | **Malate** + NAD⁺ → **Oxaloacetate** + NADH | **Oxaloacetate** → Step 1 ♻️ |

The cycle closes at Oxaloacetate: Step 8 produces it, Step 1 consumes it. Fire the transitions in sequence (1 → 2 → 3 → ... → 8 → 1) to watch tokens circulate through the cycle.

Notice the cross-links beyond the main chain:
- **CoA-SH** is released by Steps 1 and 5, consumed by Step 4 — an internal recycling loop
- **NAD⁺** feeds into three dehydrogenases (Steps 3, 4, 8), producing three NADH per turn
- **H₂O** is consumed by Steps 1 and 7
- **CO₂** is produced by Steps 3 and 4 — the two oxidative decarboxylations

## Net Equation

One full turn of the Krebs cycle:

**Acetyl-CoA + 3 NAD⁺ + FAD + GDP + Pi + 2 H₂O → 2 CO₂ + 3 NADH + FADH₂ + GTP + CoA-SH**

```nodeBook
# Acetyl-CoA [Metabolite]
# NAD+ [Coenzyme]
# FAD [Coenzyme]
# GDP [Metabolite]
# Pi [Metabolite]
# H2O [Metabolite]
# CO2 [Metabolite]
# NADH [Coenzyme]
# FADH2 [Coenzyme]
# GTP [Metabolite]
# CoA-SH [Cofactor]

# Krebs Cycle Net [Transition]
<reactant> Acetyl-CoA;
<reactant> 3 NAD+;
<reactant> FAD;
<reactant> GDP;
<reactant> Pi;
<reactant> 2 H2O;
<product> 2 CO2;
<product> 3 NADH;
<product> FADH2;
<product> GTP;
<product> CoA-SH;
```
