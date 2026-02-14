---
title: nodeBook — Collaborative Knowledge Graphs & Smart Notes
description: Build knowledge graphs with Controlled Natural Language and track personal finances, all inside collaborative markdown notes.
tags:
  - nodebook
  - knowledge-graph
  - cnl
  - ledger
  - demo
---

# nodeBook

**nodeBook** extends [HedgeDoc](https://docs.hedgedoc.org) with interactive code fences that turn plain text into knowledge graphs and financial ledgers — right inside your collaborative markdown notes.

| Extension | Code fence | What it does |
|-----------|-----------|--------------|
| **nodeBook** | ` ```nodeBook ` | Build knowledge graphs using Controlled Natural Language (CNL) |
| **Ledger** | ` ```ledger ` | Track expenses, balances, and budgets with auto-computed reports |

Jump to: [nodeBook CNL](#nodebook-cnl-reference) | [Ledger](#ledger-reference) | [Features](/n/features)

---

## nodeBook CNL Reference

Write structured knowledge in plain English. Each `# Node [Type]` declares a concept; relations and attributes describe it. The graph renders automatically.

### Syntax at a glance

```
# Node Name [Type]              — declare a node
has attribute: value;           — node property
has attr: 42 *unit*;            — attribute with unit
<relation name> Target Node;    — directed edge to another node

## Morph Name                   — polymorphic state (under a # node)
    has attr: new value;        — morph-specific property
    <relation> Target;          — morph-specific edge

# Process [Transition]          — special node for state changes
<has prior_state> Before Node;  — input to the process
<has post_state> After Node;    — output of the process
```

### Example 1: Elements, Molecules & Transitions

Oxygen and Hydrogen have morphs (ion states). Water has phase morphs (ice, steam). Transitions model chemical and physical processes.

```nodeBook
# Hydrogen [Element]
has atomic number: 1;
has number of protons: 1;
has number of electrons: 1;
has number of neutrons: 0;
has state: "gas";

## Hydrogen ion
has number of protons: 1;
has number of neutrons: 0;
has number of electrons: 0;
has charge: +1;
has state: "ion";
<part of> Water;

# Oxygen [Element]
has atomic number: 8;
has number of protons: 8;
has number of neutrons: 8;
has number of electrons: 8;
has state: "gas";

## Oxide ion
has number of protons: 8;
has number of neutrons: 8;
has number of electrons: 10;
has charge: -2;
has state: "ion";
<part of> Water;

# Water [Molecule]
has molecular formula: "H2O";
has state: "liquid";

## Ice
has molecular formula: "H2O";
has state: "solid";
has temperature: 0 *Celsius*;

## Steam
has molecular formula: "H2O";
has state: "gas";
has temperature: 100 *Celsius*;

# Combustion Trigger [LogicalOperator]
has operator: "OR";
<has operand> Spark;
<has operand> Flame;

# Electrolysis of Water [Transition]
<has prior_state> Water;
<has prior_state> Electricity;
<has post_state> Hydrogen;
<has post_state> Oxygen;

# Combustion [Transition]
<has prior_state> Hydrogen;
<has prior_state> Oxygen;
<has prior_state> Combustion Trigger;
<has post_state> Water;

# Phase Change [Transition]
<has prior_state> Water;
<has prior_state> Heat;
<has post_state> Steam;

# Freezing [Transition]
<has prior_state> Water;
<has prior_state> Cold;
<has post_state> Ice;

# Spark [Energy]
# Flame [Energy]
# Electricity [Energy]
# Heat [Energy]
# Cold [Energy]
```

**Try it:** Click a node to see its attributes and morph states. Select a Transition node and press **Simulate** to animate the state change. Export the graph as PNG or SVG.

### Example 2: Mind Map — Cell Biology

Use list syntax with a relation to create hierarchical mindmaps.

```nodeBook
# Cell <consists of>
- Nucleus
  - Chromosomes
    - DNA
  - Nucleolus
- Cytoplasm
  - Ribosomes
  - Endoplasmic Reticulum
  - Golgi Complex
  - Cytoskeleton
- Plasma Membrane
  - Phospholipids
```

### Example 3: What is nodeBook?

A self-describing knowledge graph — nodeBook explaining itself.

```nodeBook
# nodeBook [App]
<is a> Note Book;
<constructs> Knowledge Graph;
<processes> Controlled Natural Language;
<consists of> *polymorphic* Nodes;
<consists of> Transitions;
<consists of> Functions;
<consists of> Attributes;
<consists of> Relations;

# Knowledge Graph [Representation]
<consists of> Nodes;
<consists of> Edges;

# Nodes [Representation]
<can be> Concepts;
<can be> People;
<can be> Places;
<can be> Substances;

# Edges [Representation]
<can be> Relations;
<can be> Attributes;

# Relations [Representation]
<is a> Edge;

# Attributes [Representation]
<is a> Edge;

# Functions [Representation]
<is a> *derived* Attribute;

# Transitions [Representation]
<is a> *special* Node;
<have> Prior State;
<have> Post State;

# Controlled Natural Language [Language]
<is a> *special* Language;
```

---

## Ledger Reference

Track income, expenses, and account balances in a ` ```ledger ` code fence. Transactions are one line each. Add report directives after a `---` separator to generate tables and charts.

### Syntax at a glance

```
@account Name  1000.00                        — declare account with opening balance

| Date | Description | Amount | Account | Tags |     — header row (optional)
|------|-------------|--------|---------|------|     — separator (optional)
| 2024-01-15 | Groceries | -50.00 | Checking | #food |   — transaction row
| 2024-01-20 | Transfer | -500.00 | Checking -> Savings | |  — transfer between accounts

---                                           — separator: directives below
balance                                       — show transaction table + balances
summary #tag1 #tag2                           — totals by category
chart pie categories                          — expense breakdown pie chart
chart bar weekly                              — bar chart (daily/weekly/monthly)
```

Transactions use **markdown table syntax** — each row is pipe-delimited with Date, Description, Amount, Account, and Tags columns. The header row and separator line are optional but recommended for readability. The same data renders as a plain table in any markdown editor.

### Example: January Budget

```ledger
@account Checking   5000.00
@account Savings   12000.00

| Date | Description | Amount | Account | Tags |
|------|-------------|--------|---------|------|
| 2024-01-01 | Salary Deposit    | +3200.00 | Checking              | #income        |
| 2024-01-03 | Coffee Shop       |    -4.50 | Checking              | #food          |
| 2024-01-05 | Grocery Store     |   -62.30 | Checking              | #food          |
| 2024-01-07 | Electric Bill     |   -85.00 | Checking              | #utilities     |
| 2024-01-10 | Internet Bill     |   -55.00 | Checking              | #utilities     |
| 2024-01-12 | Restaurant        |   -38.00 | Checking              | #food          |
| 2024-01-14 | Gas Station       |   -45.00 | Checking              | #transport     |
| 2024-01-15 | Freelance Payment |  +800.00 | Checking              | #income        |
| 2024-01-17 | Grocery Store     |   -71.20 | Checking              | #food          |
| 2024-01-19 | Movie Tickets     |   -24.00 | Checking              | #entertainment |
| 2024-01-20 | Savings Transfer  |  -500.00 | Checking -> Savings   |                |
| 2024-01-22 | Book Purchase     |   -15.99 | Checking              | #entertainment |
| 2024-01-25 | Pharmacy          |   -22.50 | Checking              | #health        |
| 2024-01-28 | Grocery Store     |   -55.80 | Checking              | #food          |

---
balance
summary #food #utilities #income #transport #entertainment #health
chart pie categories
chart bar weekly
```

### Chart types

| Directive | Renders |
|-----------|---------|
| `chart pie categories` | Donut chart of expense totals per category |
| `chart bar daily` | Grouped bar chart — income vs. expenses per day |
| `chart bar weekly` | Grouped bar chart — income vs. expenses per week |
| `chart bar monthly` | Grouped bar chart — income vs. expenses per month |

---

## Tips

- **Real-time collaboration** — share the note URL and edit together
- **Combine extensions** — use nodeBook, ledger, mermaid, math, and standard markdown all in one note
- **Pan & zoom** nodeBook graphs with the mouse wheel; drag nodes to rearrange
- **Export** nodeBook graphs as PNG or SVG using the buttons above the graph

---

*Create your own notes at [/new](/new) or explore the [features demo](/n/features).*
