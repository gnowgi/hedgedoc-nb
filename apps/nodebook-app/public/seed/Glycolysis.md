---
title: Glycolysis — Petri Net Tutorial
tags:
  - biology/metabolism
  - biology/glycolysis
  - nodebook/petri-net
  - tutorial
---

# Glycolysis — Petri Net Tutorial

Glycolysis is the metabolic pathway that converts glucose into pyruvate, releasing energy stored as ATP and NADH. It occurs in the cytoplasm of all living cells and consists of 10 enzymatic steps divided into two phases: an **energy investment phase** (consuming ATP) and an **energy payoff phase** (producing ATP and NADH).

In Petri net terms:
- **Metabolites** (glucose, ATP, pyruvate, etc.) are **places** that hold tokens
- **Enzymes** catalysing each reaction are **transitions**
- **Stoichiometric coefficients** are **arc weights** (e.g., 2 ATP consumed = weight 2)

## Schema

```nodeBook-schema
# Enzyme [class]
# Metabolite [class]
# Cofactor [class]
# Coenzyme [class]
```

## Pathway Overview (Concept Map)

This concept map shows the full pathway as a series of metabolite conversions. Each edge is labelled with the enzyme catalysing that step.

```nodeBook
# Glucose [Metabolite]
<converts to> G6P;

# G6P [Metabolite]
<converts to> F6P;

# F6P [Metabolite]
<converts to> F16BP;

# F16BP [Metabolite]
<converts to> G3P;

# G3P [Metabolite]
<converts to> 13BPG;

# 13BPG [Metabolite]
<converts to> 3PG;

# 3PG [Metabolite]
<converts to> 2PG;

# 2PG [Metabolite]
<converts to> PEP;

# PEP [Metabolite]
<converts to> Pyruvate;
```

## Phase 1 — Energy Investment (Summary)

In the investment phase, 2 ATP are consumed to phosphorylate glucose into fructose-1,6-bisphosphate, which is then split into two G3P molecules.

```nodeBook
# Glucose [Metabolite]
# ATP [Metabolite]
# F16BP [Metabolite]
# ADP [Metabolite]

# Investment Phase [Transition]
<reactant> Glucose;
<reactant> 2 ATP;
<product> F16BP;
<product> 2 ADP;
```

## Phase 2 — Energy Payoff (Summary)

The payoff phase extracts energy from G3P, yielding 4 ATP and 2 NADH (net gain: 2 ATP, 2 NADH per glucose).

```nodeBook
# G3P [Metabolite]
# NAD+ [Coenzyme]
# ADP [Metabolite]
# Pyruvate [Metabolite]
# NADH [Coenzyme]
# ATP [Metabolite]

# Payoff Phase [Transition]
<reactant> 2 G3P;
<reactant> 2 NAD+;
<reactant> 4 ADP;
<product> 2 Pyruvate;
<product> 2 NADH;
<product> 4 ATP;
```

## Individual Reactions

### Step 1 — Hexokinase

The first committed step: glucose is phosphorylated to glucose-6-phosphate, consuming one ATP.

```nodeBook
# Glucose [Metabolite]
# ATP [Cofactor]
# G6P [Metabolite]
# ADP [Cofactor]

# Hexokinase [Transition]
<reactant> Glucose;
<reactant> ATP;
<product> G6P;
<product> ADP;
```

### Step 3 — Phosphofructokinase (PFK-1)

The key regulatory step: fructose-6-phosphate is phosphorylated to fructose-1,6-bisphosphate.

```nodeBook
# F6P [Metabolite]
# ATP [Cofactor]
# F16BP [Metabolite]
# ADP [Cofactor]

# Phosphofructokinase [Transition]
<reactant> F6P;
<reactant> ATP;
<product> F16BP;
<product> ADP;
```

### Step 7 — Phosphoglycerate Kinase

The first substrate-level phosphorylation: 1,3-BPG donates a phosphate to ADP, forming ATP.

```nodeBook
# 13BPG [Metabolite]
# ADP [Cofactor]
# 3PG [Metabolite]
# ATP [Cofactor]

# Phosphoglycerate Kinase [Transition]
<reactant> 13BPG;
<reactant> ADP;
<product> 3PG;
<product> ATP;
```

### Step 10 — Pyruvate Kinase

The final step: PEP transfers its phosphate to ADP, producing pyruvate and ATP.

```nodeBook
# PEP [Metabolite]
# ADP [Cofactor]
# Pyruvate [Metabolite]
# ATP [Cofactor]

# Pyruvate Kinase [Transition]
<reactant> PEP;
<reactant> ADP;
<product> Pyruvate;
<product> ATP;
```

## Net Equation

The overall reaction of glycolysis summarised as a single transition:

**Glucose + 2 NAD+ + 2 ADP + 2 Pi → 2 Pyruvate + 2 NADH + 2 H+ + 2 ATP + 2 H2O**

```nodeBook
# Glucose [Metabolite]
# NAD+ [Coenzyme]
# ADP [Metabolite]
# Pi [Metabolite]
# Pyruvate [Metabolite]
# NADH [Coenzyme]
# ATP [Metabolite]
# H2O [Metabolite]

# Glycolysis Net [Transition]
<reactant> Glucose;
<reactant> 2 NAD+;
<reactant> 2 ADP;
<reactant> 2 Pi;
<product> 2 Pyruvate;
<product> 2 NADH;
<product> 2 ATP;
<product> 2 H2O;
```
