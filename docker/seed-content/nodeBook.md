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

Welcome to nodeBook!

![nodeBook logo](https://nodebook.co.in/logo.png)

**nodeBook** builds knowledge graphs and performs semantic computing. If you are new to knowledge graphs or semantic computing, the demonstrations below will show you what they are and why nodeBook is useful for students and teachers at all levels.

## Mind Maps

Let's start with the simplest of all: building a mind map. Note the common linking phrase used between all the nodes. Most mind maps are made without this restriction, but the advantage will become clear when we use the maps for valid reasoning.

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
- Plasma membrane
  - Phospholipids
```

The mind map above is constructed by nodeBook when you enter the following text in the editor (which is a Markdown editor). Created graphs can be exported as both PNG and SVG using the buttons above the graph.

```cnl
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
- Plasma membrane
  - Phospholipids
```

## Concept Maps

We can build concept maps by explicitly declaring the name of the edges (linking phrases) between nodes.

Here is a self-describing knowledge graph -- nodeBook explaining itself:

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

Here are the CNL statements the user writes to create the concept map above. We call these statements **CNL**, short for **Controlled Natural Language**. More examples follow so you can learn the syntax as we go.

```cnl
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

## Reasoning

nodeBook is not merely a drawing tool. It is a tiny semantic computer that helps you understand how logic and reasoning work.

### A simple and famous example

If we write the following CNL statements, we get the graph shown below:

```cnl
# Socrates [individual]
<member_of> Greek;

# Greek [class]
<is_a> Human;

# Human [class]
<is_a> Mortal;

# Mortal [class]
```

```nodeBook
# Socrates [individual]
<member_of> Greek;

# Greek [class]
<is_a> Human;

# Human [class]
<is_a> Mortal;

# Mortal [class]
```

These are interactive graphs. Use your mouse or touchscreen to select a node and drag it around. Click a node to see its details. Use the toolbar icons to zoom in, zoom out, fit to view, pan, validate, hide or show inferred edges, and more.

## Process Maps

nodeBook can also express processes -- for example, graphically representing photosynthesis.

### Photosynthesis

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

When you click on the green transition bar, nodeBook simulates the chemical reaction. You can specify both the reactants required and how many molecules take part. Here are the CNL statements that generate this graph:

```cnl
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

## Functions

We can define computed attributes based on the properties of other nodes. In the example below, we define speed given distance and time:

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

The CNL statements:

```cnl
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

A function is represented like a chemical reaction: inputs on the left-hand side, outputs on the right. Click the transition bar to evaluate the expression and see the computed value of speed.

### Attribute abbreviations

When input nodes have long attribute names, use `{abbrev}` to create short aliases for use in definitions:

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

The CNL statements for assigning alias symbols to verbose attributes:

```cnl
# Hydrogen [Element]
number of protons {p}: 1;
number of neutrons {n}: 0;

# atomicMass [Function]
<input> Hydrogen;
<output> mass;
definition: p + n;

# mass
```

### Chaining functions

The result of one function can become the input to another. Here is a real-world formula combining multiple operators: $KE = \frac{1}{2} m v^2$.

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

CNL statements:

```cnl
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

### Parsing algebraic equations

nodeBook parses algebraic equations in order of operations, making nested computations graphically intuitive. Assign values to the variables to simulate them:

```cnl
expression: sqrt(x^2 + y^2);
```

```nodeBook
expression: sqrt(x^2 + y^2);
```

## Queries and Transitive Inference

The built-in schema declares `is_a` and `part_of` as transitive relations. You can query facts from your graph using Wh-words (what, who, where, when, how), and nodeBook will reveal the full inferred chain:

```nodeBook
# Dog [species]
<is_a> Mammal;
<is_a> what;

# Cat [species]
<is_a> Mammal;
<is_a> what;

# Mammal [class]
<is_a> Vertebrate;

# Vertebrate [phylum]
<is_a> Animal;

# Animal [kingdom]

who <is_a> Animal;
```

Note the query statements that use "what" and "who" in the example below. Results appear below the graph.

```cnl
# Dog [species]
<is_a> Mammal;
<is_a> what;

# Cat [species]
<is_a> Mammal;
<is_a> what;

# Mammal [class]
<is_a> Vertebrate;

# Vertebrate [phylum]
<is_a> Animal;

# Animal [kingdom]

who <is_a> Animal;
```

- `<is_a> what;` under Dog shows: Mammal, Vertebrate, *and* Animal (the full transitive chain)
- `who <is_a> Animal;` at graph level finds everything that is (directly or transitively) an Animal

You can also write Prolog-style queries for more advanced reasoning:

```cnl
?- relation(Dog, X, is_a).
```

## Polymorphic Nodes (Morphs)

Nodes can have multiple states using `## Morph Name` sub-headings. Each morph carries its own attributes and relations. Click a node in the graph to switch between its states:

```nodeBook
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

```cnl
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

When you click on the Water node in the graph, a morph selector appears. Switching between Ice, Steam, and the basic state changes the visible attributes.

## Transactions

nodeBook also supports double-entry bookkeeping. Please see [Transactions](https://nodebook.co.in/n/nodeBook_transactions) for a full walkthrough.

---

## nodeBook CNL Reference

Write structured knowledge in plain English. Each `# Node [Type]` declares a concept; relations and attributes describe it. The graph renders automatically.

### Nodes

```
# Node Name                     — basic node
# Node Name [Type]              — node with a type
# **adjective** Node [Type]     — node with an adjective (bold in graph)
# *quantifier* Node [Type]      — node with a quantifier (shows as for-all or there-exists symbol)
```

**Built-in types:** `class`, `individual`, `Transition`, `Function`, `Transaction`, `Account`, `Asset`, `Liability`, `Equity`, `Revenue`, `Expense`, `Element`, `Molecule`, `Substance`, `Person`, `Organization`, `Place`, `Concept`, `Object`

### Attributes

```
attribute: value;               — basic attribute
has attribute: value;           — same (the "has" prefix is optional)
attribute: 42 *unit*;           — attribute with a unit
attribute {a}: 42;              — attribute with abbreviation for use in definitions
attribute: value ++adverb++;    — attribute with an adverb qualifier
attribute: value [modality];    — attribute with a modality qualifier
```

### Relations (Edges)

```
<relation name> Target;         — directed edge to another node
<relation> **adj** Target;      — edge to a target with an adjective
<relation> 6 Target;            — weighted edge (arc weight in Petri nets)
```

**Built-in relations:** `is_a` (transitive), `member_of`, `instance_of`, `part_of` (transitive), `has prior_state`, `has post_state`, `debit`, `credit`, `inflow`, `outflow`, `provides`, `receives`

### Morphs (Polymorphic States)

```
# Water [Molecule]              — declare a node
molecular formula: "H2O";

## Ice                          — morph (under a # node)
    state: "solid";             — morph-specific attribute
    <bonds with> Crystal;       — morph-specific edge

## Steam                        — another morph
    state: "gas";
```

### Processes (Petri Nets)

```
# Reaction [Transition]         — transition node
<has prior_state> 6 CO2;        — input (consumed when fired)
<has post_state> Glucose;       — output (produced when fired)
```

Shorthand aliases: `<input>` = `<has prior_state>`, `<output>` = `<has post_state>`

### Functions (Computed Values)

```
# computeSpeed [Function]       — function transition
<input> distance;               — input node
<input> time;                   — another input
<output> speed;                 — output node
definition: distance / time;    — expression using attribute values/abbreviations
```

Supported operators: `+`, `-`, `*`, `/`, `^`, and functions like `sqrt()`, `pow()`, `log()`, `abs()`, etc.

### Algebraic Expressions

```
expression: sqrt(x^2 + y^2);   — parses into a Petri net of operators and variables
```

### Mind Maps

```
# Root Topic <relation label>   — root node with a shared relation
- Branch A                      — first child
  - Leaf 1                      — nested child
  - Leaf 2
- Branch B
```

### Queries

**Wh-word queries** (inline or graph-level):

```
<is_a> what;                    — under a node: what is this node an is_a of?
<how> Target;                   — under a node: how does this relate to Target?
attribute: what;                — under a node: what is this attribute's value?
who <is_a> Animal;              — graph-level: who is_a Animal (transitively)?
what <part_of> Cell;            — graph-level: what is part_of Cell?
```

**Prolog queries:**

```
?- relation(Dog, X, is_a).     — find all X where Dog is_a X
?- attribute(X, mass, V).      — find nodes with a mass attribute
```

### Descriptions

````
# Water [Molecule]
```description
Water is a chemical substance with the formula H2O.
It is essential for all known forms of life.
```
````

(The description text is shown when you click the node in the graph.)

### Accounting

```
currency: INR;                  — set currency (USD, EUR, GBP, INR, JPY, etc.)

# Cash [Asset]                  — account node
balance: 50000;                 — initial balance

# Buy Inventory [Transaction]   — transaction (fires automatically)
date: 2026-01-15;
<debit> 25000 Inventory;        — debit side
<credit> 25000 Cash;            — credit side
```

### Schema Validation

Define custom schemas in a separate code fence to validate your graphs:

````
```nodeBook-schema
nodeType: Planet, A celestial body, parent: Object
relationType: orbits, One body orbits another, domain: Planet, range: Star
attributeType: diameter, float, Size measurement, unit: km, domain: Planet
```
````

Click the shield icon above the graph to validate against all loaded schemas.

---

## Tips

- **Real-time collaboration** -- share the note URL and edit together
- **Combine extensions** -- use nodeBook, mermaid, math ($\LaTeX$), and standard Markdown all in one note
- **Pan & zoom** graphs with the mouse wheel; drag nodes to rearrange
- **Export** graphs as PNG or SVG using the toolbar buttons
- **Source toggle** -- click the code icon (`</>`) above a graph to view syntax-highlighted CNL source (copy-paste ready)
- **Dark mode** -- nodeBook graphs adapt automatically to light and dark themes
- **Click nodes** to inspect their attributes, morphs, and relations in a detail panel
- **Inferred edges** -- toggle the inference icon to show or hide transitively derived relations, with proof paths

| Extension | Code fence | What it does |
|-----------|-----------|--------------|
| **nodeBook** | ` ```nodeBook ` | Build knowledge graphs using Controlled Natural Language (CNL) |
| **cnl** | ` ```cnl ` | Display syntax-highlighted CNL source (no graph) |

---

**nodeBook** extends [HedgeDoc](https://docs.hedgedoc.org), a collaborative Markdown editor. The nodeBook extensions use code fences to turn plain text into knowledge graphs -- right inside your collaborative notes.

---

*Create your own notes at [/new](/new) or explore the [features demo](/n/features).*
