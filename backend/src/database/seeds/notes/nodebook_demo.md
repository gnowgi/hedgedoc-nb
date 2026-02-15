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

Jump to: [nodeBook CNL](#nodebook-cnl-reference) | [Petri Nets](#petri-net-transitions) | [Mind Maps](#mind-maps) | [Ledger](#ledger-reference) | [Features](/n/features)

---

## nodeBook CNL Reference

Write structured knowledge in plain English. Each `# Node [Type]` declares a concept; relations and attributes describe it. The graph renders automatically.

### Syntax at a glance

```
# Node Name [Type]              — declare a node
attribute: value;               — node property ("has" prefix optional)
attr: 42 *unit*;                — attribute with unit
<relation name> Target Node;    — directed edge to another node
<relation> N Target;            — weighted edge (N tokens/instances)

## Morph Name                   — polymorphic state (under a # node)
    attr: new value;            — morph-specific property
    <relation> Target;          — morph-specific edge

# Process [Transition]          — Petri net transition node
<has prior_state> N Input;      — consumes N tokens per firing
<has post_state> M Output;      — produces M tokens per firing
```

Arc weights default to 1 when omitted. Weights greater than 1 display as circled numbers (e.g. ⑥) on the graph arcs.

### Example 1: Concept Map — Elements & Molecules

Nodes can have **morphs** — polymorphic states that represent structural changes. Click a node to view its attributes; nodes with multiple morphs show a state selector.

```nodeBook
# Hydrogen [Element]
atomic number: 1;
number of protons: 1;
number of electrons: 1;
number of neutrons: 0;
state: "gas";

## Hydrogen ion
number of protons: 1;
number of neutrons: 0;
number of electrons: 0;
charge: +1;
state: "ion";
<part of> Water;

# Oxygen [Element]
atomic number: 8;
number of protons: 8;
number of neutrons: 8;
number of electrons: 8;
state: "gas";

## Oxide ion
number of protons: 8;
number of neutrons: 8;
number of electrons: 10;
charge: -2;
state: "ion";
<part of> Water;

# Water [Molecule]
molecular formula: "H2O";
state: "liquid";

## Ice
state: "solid";
temperature: 0 *Celsius*;

## Steam
state: "gas";
temperature: 100 *Celsius*;
```

**Try it:** Click **Hydrogen** or **Oxygen** to switch between their base state and ion morphs. Click **Water** to see its ice and steam phases.

### Petri Net Transitions

Declare a node with `[Transition]` to model a process. Connect input places with `<has prior_state>` and output places with `<has post_state>`. Use **arc weights** to specify how many tokens are consumed or produced per firing — essential for stoichiometric reactions.

### Example 2: Chemistry — Electrolysis & Combustion

Set initial tokens to **2** and fire **Electrolysis** to split water into hydrogen and oxygen. Then fire **Combustion** to recombine them. Arc weights (②) enforce the correct stoichiometry.

```nodeBook
# Electrolysis [Transition]
<has prior_state> 2 Water;
<has prior_state> Electricity;
<has post_state> 2 Hydrogen;
<has post_state> Oxygen;

# Combustion [Transition]
<has prior_state> 2 Hydrogen;
<has prior_state> Oxygen;
<has prior_state> Spark;
<has post_state> 2 Water;

# Water [Substance]
# Hydrogen [Substance]
# Oxygen [Substance]
# Electricity [Energy]
# Spark [Energy]
```

**Try it:** Click an enabled (green) transition bar to fire it. The circled ② on each arc shows that 2 tokens are consumed or produced. Use the token input and **Reset** button to try different initial markings.

### Example 3: Photosynthesis with Arc Weights

A single reaction consuming 6 CO₂ + 6 H₂O + sunlight to produce glucose and 6 O₂. Set initial tokens to **6** to fire the reaction.

```nodeBook
# Photosynthesis [Transition]
<has prior_state> 6 CO2;
<has prior_state> 6 H2O;
<has prior_state> Sunlight;
<has post_state> Glucose;
<has post_state> 6 O2;

# CO2 [Molecule]
# H2O [Molecule]
# Sunlight [Energy]
# Glucose [Molecule]
# O2 [Molecule]
```

When all prior-state places have enough tokens (≥ arc weight), the transition bar turns **green**. When no transition can fire, a **deadlock** banner appears.

### Mind Maps

Use list syntax with a `# Root <relation>` heading to create hierarchical mindmaps. Indentation defines the tree structure.

### Example 4: Cell Biology

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

### Example 5: What is nodeBook?

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
- **Arc weights** — write `<relation> 6 Target;` to specify quantities on edges (displayed as circled numbers ①–⑳)
- **Petri net simulation** — click green transition bars to fire them; adjust the initial token count and use Reset to experiment
- **Deadlock detection** — the graph alerts you when no transition can fire
- **Optional "has" prefix** — `atomic number: 8;` works the same as `has atomic number: 8;`

---

*Create your own notes at [/new](/new) or explore the [features demo](/n/features).*
