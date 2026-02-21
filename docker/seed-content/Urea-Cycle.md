---
title: Urea Cycle — Petri Net Tutorial
tags:
  - biology/metabolism
  - biology/urea-cycle
  - nodebook/petri-net
  - tutorial
---

# Urea Cycle — Petri Net Tutorial

The urea cycle (ornithine cycle) converts toxic ammonia produced by amino acid catabolism into urea for excretion. It occurs partly in the mitochondrial matrix (first two steps) and partly in the cytosol (remaining steps) of hepatocytes. The cycle connects to the Krebs cycle via fumarate, linking nitrogen metabolism to energy metabolism.

In Petri net terms:
- **Metabolites** (ornithine, citrulline, arginine, etc.) are **places**
- **Enzymes** are **transitions**
- **Stoichiometric coefficients** are **arc weights**

## Schema

```nodeBook-schema
# Enzyme [class]
# Metabolite [class]
# Cofactor [class]
# Amino Acid [class]
```

## Pathway Overview (Concept Map)

The four intermediates form a closed loop, with ammonia and CO2 entering and urea leaving.

```nodeBook
# NH3 [Metabolite]
<feeds into> Carbamoyl Phosphate;

# CO2 [Metabolite]
<feeds into> Carbamoyl Phosphate;

# Carbamoyl Phosphate [Metabolite]
<combines with> Ornithine;
<converts to> Citrulline;

# Ornithine [Amino Acid]
<converts to> Citrulline;

# Citrulline [Amino Acid]
<converts to> Argininosuccinate;

# Aspartate [Amino Acid]
<feeds into> Argininosuccinate;

# Argininosuccinate [Metabolite]
<converts to> Arginine;
<produces> Fumarate;

# Arginine [Amino Acid]
<converts to> Ornithine;
<produces> Urea;

# Fumarate [Metabolite]
<enters> Krebs Cycle;

# Urea [Metabolite]
<excreted by> Kidneys;
```

## Individual Reactions

### Step 1 — Carbamoyl Phosphate Synthetase I (CPS I)

The first nitrogen enters the cycle: ammonia and CO2 are condensed into carbamoyl phosphate at the cost of 2 ATP. This is the rate-limiting step, activated by N-acetylglutamate.

```nodeBook
# CO2 [Metabolite]
# NH3 [Metabolite]
# ATP [Cofactor]
# Carbamoyl Phosphate [Metabolite]
# ADP [Cofactor]

# CPS I [Transition]
<has prior_state> CO2;
<has prior_state> NH3;
<has prior_state 2> ATP;
<has post_state> Carbamoyl Phosphate;
<has post_state 2> ADP;
```

### Step 2 — Ornithine Transcarbamylase (OTC)

Carbamoyl phosphate reacts with ornithine to form citrulline, which is then transported from the mitochondria to the cytosol.

```nodeBook
# Carbamoyl Phosphate [Metabolite]
# Ornithine [Amino Acid]
# Citrulline [Amino Acid]
# Pi [Metabolite]

# OTC [Transition]
<has prior_state> Carbamoyl Phosphate;
<has prior_state> Ornithine;
<has post_state> Citrulline;
<has post_state> Pi;
```

### Step 3 — Argininosuccinate Synthetase (ASS)

The second nitrogen enters via aspartate: citrulline and aspartate condense to form argininosuccinate, consuming ATP (cleaved to AMP + PPi).

```nodeBook
# Citrulline [Amino Acid]
# Aspartate [Amino Acid]
# ATP [Cofactor]
# Argininosuccinate [Metabolite]
# AMP [Cofactor]
# PPi [Metabolite]

# Argininosuccinate Synthetase [Transition]
<has prior_state> Citrulline;
<has prior_state> Aspartate;
<has prior_state> ATP;
<has post_state> Argininosuccinate;
<has post_state> AMP;
<has post_state> PPi;
```

### Step 4 — Argininosuccinate Lyase (ASL)

Argininosuccinate is cleaved into arginine and fumarate. The fumarate enters the Krebs cycle, forming the key link between nitrogen and carbon metabolism.

```nodeBook
# Argininosuccinate [Metabolite]
# Arginine [Amino Acid]
# Fumarate [Metabolite]

# Argininosuccinate Lyase [Transition]
<has prior_state> Argininosuccinate;
<has post_state> Arginine;
<has post_state> Fumarate;
```

### Step 5 — Arginase

The final step: arginine is hydrolysed to ornithine (regenerating the cycle carrier) and urea (the waste product).

```nodeBook
# Arginine [Amino Acid]
# H2O [Metabolite]
# Ornithine [Amino Acid]
# Urea [Metabolite]

# Arginase [Transition]
<has prior_state> Arginine;
<has prior_state> H2O;
<has post_state> Ornithine;
<has post_state> Urea;
```

## Connection to the Krebs Cycle

Fumarate produced by argininosuccinate lyase (step 4) is converted to malate by fumarase, then to oxaloacetate by malate dehydrogenase. Oxaloacetate can be transaminated back to aspartate, which re-enters the urea cycle at step 3. This **aspartate-argininosuccinate shunt** links the two cycles:

```nodeBook
# Fumarate [Metabolite]
<converts to> Malate;

# Malate [Metabolite]
<converts to> Oxaloacetate;

# Oxaloacetate [Metabolite]
<converts to> Aspartate;

# Aspartate [Amino Acid]
<re-enters> Urea Cycle;

# Urea Cycle [Metabolite]
<produces> Fumarate;
```

## Net Equation

One full turn of the urea cycle:

**NH3 + CO2 + Aspartate + 3 ATP + H2O → Urea + Fumarate + 2 ADP + AMP + 2 Pi + PPi**

```nodeBook
# NH3 [Metabolite]
# CO2 [Metabolite]
# Aspartate [Amino Acid]
# ATP [Cofactor]
# H2O [Metabolite]
# Urea [Metabolite]
# Fumarate [Metabolite]
# ADP [Cofactor]
# AMP [Cofactor]
# Pi [Metabolite]
# PPi [Metabolite]

# Urea Cycle Net [Transition]
<has prior_state> NH3;
<has prior_state> CO2;
<has prior_state> Aspartate;
<has prior_state 3> ATP;
<has prior_state> H2O;
<has post_state> Urea;
<has post_state> Fumarate;
<has post_state 2> ADP;
<has post_state> AMP;
<has post_state 2> Pi;
<has post_state> PPi;
```
