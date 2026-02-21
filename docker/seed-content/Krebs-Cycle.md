---
title: Krebs Cycle (Citric Acid Cycle) — Petri Net Tutorial
tags:
  - biology/metabolism
  - biology/krebs-cycle
  - nodebook/petri-net
  - tutorial
---

# Krebs Cycle (Citric Acid Cycle) — Petri Net Tutorial

The citric acid cycle (also called the Krebs cycle or TCA cycle) is the central metabolic hub of aerobic respiration. It takes place in the mitochondrial matrix and oxidises acetyl-CoA derived from carbohydrates, fats, and proteins. Each turn of the cycle produces 3 NADH, 1 FADH2, 1 GTP, and 2 CO2.

In Petri net terms:
- **Metabolites** (citrate, isocitrate, etc.) are **places**
- **Enzymes** are **transitions**
- **Stoichiometric coefficients** are **arc weights**

## Schema

```nodeBook-schema
# Enzyme [class]
# Metabolite [class]
# Cofactor [class]
# Coenzyme [class]
```

## Pathway Overview (Concept Map)

The cycle's eight intermediates form a closed loop, with acetyl-CoA entering and CO2 leaving.

```nodeBook
# Acetyl-CoA [Metabolite]
<feeds into> Citrate;

# Citrate [Metabolite]
<converts to> Isocitrate;

# Isocitrate [Metabolite]
<converts to> alpha-Ketoglutarate;

# alpha-Ketoglutarate [Metabolite]
<converts to> Succinyl-CoA;

# Succinyl-CoA [Metabolite]
<converts to> Succinate;

# Succinate [Metabolite]
<converts to> Fumarate;

# Fumarate [Metabolite]
<converts to> Malate;

# Malate [Metabolite]
<converts to> Oxaloacetate;

# Oxaloacetate [Metabolite]
<combines with> Acetyl-CoA;
```

## Individual Reactions

### Step 1 — Citrate Synthase

Acetyl-CoA condenses with oxaloacetate to form citrate, releasing CoA-SH.

```nodeBook
# Acetyl-CoA [Metabolite]
# Oxaloacetate [Metabolite]
# H2O [Metabolite]
# Citrate [Metabolite]
# CoA-SH [Cofactor]

# Citrate Synthase [Transition]
<has prior_state> Acetyl-CoA;
<has prior_state> Oxaloacetate;
<has prior_state> H2O;
<has post_state> Citrate;
<has post_state> CoA-SH;
```

### Step 3 — Isocitrate Dehydrogenase

The first oxidative decarboxylation: isocitrate is oxidised to alpha-ketoglutarate, producing NADH and releasing CO2.

```nodeBook
# Isocitrate [Metabolite]
# NAD+ [Coenzyme]
# alpha-Ketoglutarate [Metabolite]
# CO2 [Metabolite]
# NADH [Coenzyme]

# Isocitrate Dehydrogenase [Transition]
<has prior_state> Isocitrate;
<has prior_state> NAD+;
<has post_state> alpha-Ketoglutarate;
<has post_state> CO2;
<has post_state> NADH;
```

### Step 4 — alpha-Ketoglutarate Dehydrogenase

The second oxidative decarboxylation: alpha-ketoglutarate is converted to succinyl-CoA.

```nodeBook
# alpha-Ketoglutarate [Metabolite]
# NAD+ [Coenzyme]
# CoA-SH [Cofactor]
# Succinyl-CoA [Metabolite]
# CO2 [Metabolite]
# NADH [Coenzyme]

# aKG Dehydrogenase [Transition]
<has prior_state> alpha-Ketoglutarate;
<has prior_state> NAD+;
<has prior_state> CoA-SH;
<has post_state> Succinyl-CoA;
<has post_state> CO2;
<has post_state> NADH;
```

### Step 6 — Succinate Dehydrogenase

Succinate is oxidised to fumarate using FAD (the only step that uses FAD instead of NAD+). This enzyme is also Complex II of the electron transport chain.

```nodeBook
# Succinate [Metabolite]
# FAD [Coenzyme]
# Fumarate [Metabolite]
# FADH2 [Coenzyme]

# Succinate Dehydrogenase [Transition]
<has prior_state> Succinate;
<has prior_state> FAD;
<has post_state> Fumarate;
<has post_state> FADH2;
```

### Step 8 — Malate Dehydrogenase

The final step regenerates oxaloacetate from malate, producing the third NADH of the cycle.

```nodeBook
# Malate [Metabolite]
# NAD+ [Coenzyme]
# Oxaloacetate [Metabolite]
# NADH [Coenzyme]

# Malate Dehydrogenase [Transition]
<has prior_state> Malate;
<has prior_state> NAD+;
<has post_state> Oxaloacetate;
<has post_state> NADH;
```

## Net Equation

One full turn of the Krebs cycle:

**Acetyl-CoA + 3 NAD+ + FAD + GDP + Pi + 2 H2O → 2 CO2 + 3 NADH + FADH2 + GTP + CoA-SH**

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
<has prior_state 1> Acetyl-CoA;
<has prior_state 3> NAD+;
<has prior_state 1> FAD;
<has prior_state 1> GDP;
<has prior_state 1> Pi;
<has prior_state 2> H2O;
<has post_state 2> CO2;
<has post_state 3> NADH;
<has post_state 1> FADH2;
<has post_state 1> GTP;
<has post_state 1> CoA-SH;
```
