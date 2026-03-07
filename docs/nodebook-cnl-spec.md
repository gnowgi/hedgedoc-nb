# nodeBook CNL Specification

This is the authoritative reference for **nodeBook's Controlled Natural Language (CNL)**. Use this to generate valid `nodeBook` code fences from natural language descriptions.

A `nodeBook` code fence is placed inside a Markdown document like this:

````
```nodeBook
<CNL statements go here>
```
````

Everything below describes what goes inside the fence.

---

## Table of Contents

1. [Nodes](#1-nodes)
2. [Relations (Edges)](#2-relations-edges)
3. [Attributes (Properties)](#3-attributes-properties)
4. [Morphs (Polymorphic States)](#4-morphs-polymorphic-states)
5. [Transitions (Petri Nets / Processes)](#5-transitions-petri-nets--processes)
6. [Functions (Computed Values)](#6-functions-computed-values)
7. [Mind Maps](#7-mind-maps)
8. [Queries](#8-queries)
9. [Descriptions](#9-descriptions)
10. [Accounting (Double-Entry Bookkeeping)](#10-accounting-double-entry-bookkeeping)
11. [Algebraic Expressions](#11-algebraic-expressions)
12. [Custom Schemas](#12-custom-schemas)
13. [Graph-Level Directives](#13-graph-level-directives)
14. [Built-in Types Reference](#14-built-in-types-reference)
15. [ID Normalization Rules](#15-id-normalization-rules)
16. [Common Mistakes](#16-common-mistakes)
17. [Complete Examples](#17-complete-examples)

---

## 1. Nodes

Nodes are declared with `#` headings. Each `#` line creates one node.

### Syntax

```
# Node Name
# Node Name [Type]
# **adjective** Node Name [Type]
# *quantifier* Node Name [Type]
```

### Rules

- `# ` (hash + space) is required at the start.
- `[Type]` is optional. If omitted, defaults to `individual`.
- `**adjective**` (double asterisks) creates a qualified subset node. `**venomous** Snakes` is a different node from `Snakes`.
- `*quantifier*` (single asterisks) adds a logical quantifier:
  - `*all*` or `*every*` = universal quantifier (renders as a for-all symbol)
  - `*some*` or `*exists*` = existential quantifier (renders as a there-exists symbol)
  - Any other value (e.g. `*no*`, `*most*`) renders in brackets: `[no]`, `[most]`
- A node with both quantifier and adjective: `# *all* **large** Mammals [class]`
- Node names are case-insensitive and automatically singularized for identity purposes. `Humans`, `humans`, and `Human` all refer to the same node.
- Only `#` (single hash) creates nodes. `##` is reserved for morphs (see section 4).

### Examples

```
# Socrates [individual]
# Human [class]
# Water [Molecule]
# **venomous** Snake [class]
# *all* Mammals [class]
# *some* Birds [class]
# *no* Perpetual Motion Machine [class]
# Photosynthesis [Transition]
# Cash [Asset]
```

---

## 2. Relations (Edges)

Relations are directed edges from the current node to a target node. They are written inside a node block (after a `#` heading, before the next `#` heading).

### Syntax

```
<relation name> Target;
<relation name> **adjective** Target;
<relation name> N Target;
```

### Rules

- Relation name goes inside `< >` angle brackets.
- Target is the name of another node.
- The line MUST end with a semicolon `;`.
- If the target node doesn't exist yet, it is auto-created (as type `class`).
- `N` is an optional numeric weight (integer or decimal up to 2 decimal places): `<has prior_state> 6 CO2;` or `<debit> 1500.50 Cash;`
- `**adjective**` on targets creates a qualified target node: `<is a> **large** Mammal;`
- Relation names are free-form. You can use any name: `<lives in>`, `<can>`, `<teaches>`, etc.
- Some relation names are aliases that map to canonical Petri net relations (see alias table below).

### Relation Aliases

These shorthand names are automatically mapped to their canonical forms:

| Alias | Maps to | Domain |
|-------|---------|--------|
| `<input>` | `<has prior_state>` | General / Functions |
| `<output>` | `<has post_state>` | General / Functions |
| `<in>` | `<has prior_state>` | General |
| `<out>` | `<has post_state>` | General |
| `<debit>` | `<has post_state>` | Accounting |
| `<credit>` | `<has prior_state>` | Accounting |
| `<reactant>` | `<has prior_state>` | Chemistry |
| `<product>` | `<has post_state>` | Chemistry |
| `<lhs>` | `<has prior_state>` | Mathematics |
| `<rhs>` | `<has post_state>` | Mathematics |
| `<in-flow>` | `<has prior_state>` | Systems theory |
| `<out-flow>` | `<has post_state>` | Systems theory |

### Examples

```
# Dog [class]
<is_a> Mammal;
<has part> Tail;
<lives in> Domestic Environment;

# Photosynthesis [Transition]
<has prior_state> 6 CO2;
<has prior_state> 6 H2O;
<has post_state> Glucose;
<has post_state> 6 O2;

# Buy Supplies [Transaction]
<debit> 500 Office Supplies;
<credit> 500 Cash;
```

---

## 3. Attributes (Properties)

Attributes are key-value pairs on a node. They are written inside a node block.

### Syntax

```
attribute name: value;
has attribute name: value;
attribute name: value *unit*;
attribute name {abbreviation}: value;
attribute name: value ++adverb++;
attribute name: value [modality];
attribute name: value *unit* ++adverb++ [modality];
```

### Rules

- The `has` prefix is optional and ignored: `has mass: 10;` is identical to `mass: 10;`.
- Lines MUST end with a semicolon `;`.
- **Units**: Surround with single asterisks: `temperature: 100 *Celsius*;`
- **Abbreviations**: Use `{abbr}` after the attribute name to create a short alias for use in function definitions: `number of protons {p}: 1;`
- **Adverbs**: Surround with `++`: `speed: 300000 *km/s* ++approximately++;`
- **Modalities**: Surround with `[]`: `boiling point: 100 *Celsius* [necessary];`
- All modifiers can be combined: `mass: 5.97e24 *kg* ++approximately++ [estimated];`
- Values are free-form strings. Numbers, dates, booleans, quoted strings are all valid.
- An attribute line is any line containing `:` that does NOT start with `<` (relation) or `?-` (query).

### Examples

```
# Earth [Planet]
mass: 5.972e24 *kg*;
diameter: 12742 *km*;
age: 4.5 *billion years* ++approximately++;
habitable: true [contingent];
orbital period: 365.25 *days*;

# Hydrogen [Element]
number of protons {p}: 1;
number of neutrons {n}: 0;
atomic number: 1;
```

---

## 4. Morphs (Polymorphic States)

Morphs represent alternative states of a single node. They are declared with `##` sub-headings under a `#` node.

### Syntax

```
# Node Name [Type]
base attribute: value;

## Morph Name
morph-specific attribute: value;
<morph-specific relation> Target;

## Another Morph
another attribute: value;
```

### Rules

- `##` (double hash + space) declares a morph. It MUST appear after a `#` node heading.
- Each morph has its own attributes and relations, stored separately from the base node.
- Attributes on the base node (before any `##`) apply to all morphs.
- Morph-specific attributes override base attributes of the same name.
- Users can switch between morphs by clicking the node in the rendered graph.
- Do NOT use `###` or deeper headings — only `##` is recognized for morphs.

### Example

```
# Water [Molecule]
molecular formula: H2O;
state: liquid;

## Ice
state: solid;
temperature: 0 *Celsius*;
density: 0.917 *g/cm3*;
<found in> Glaciers;

## Steam
state: gas;
temperature: 100 *Celsius*;
density: 0.0006 *g/cm3*;
<used in> Power Plants;
```

---

## 5. Transitions (Petri Nets / Processes)

Transitions model processes that consume inputs and produce outputs, visualized as Petri nets.

### Syntax

```
# Process Name [Transition]
<has prior_state> Input;
<has prior_state> N Input;
<has post_state> Output;
<has post_state> N Output;
```

### Rules

- The node type MUST be `[Transition]` (or `[Function]` for computed transitions).
- `<has prior_state>` = inputs (consumed when the transition fires).
- `<has post_state>` = outputs (produced when the transition fires).
- Use the aliases `<input>` / `<output>` for readability.
- Numeric weights specify stoichiometry / quantity: `<has prior_state> 6 CO2;` means 6 units of CO2 are consumed.
- Clicking the green transition bar in the rendered graph simulates the process.

### Example: Chemical Reaction

```
# Photosynthesis [Transition]
<input> 6 CO2;
<input> 6 H2O;
<input> Sunlight;
<output> Glucose;
<output> 6 O2;

# CO2 [Molecule]
# H2O [Molecule]
# Sunlight [Energy]
# Glucose [Molecule]
# O2 [Molecule]
```

---

## 6. Functions (Computed Values)

Functions are special transitions that compute output values from input attributes.

### Syntax

```
# functionName [Function]
<input> InputNode;
<output> OutputNode;
definition: expression;
```

### Rules

- Node type MUST be `[Function]`.
- Inputs and outputs are declared with `<input>` / `<output>` (aliases for `<has prior_state>` / `<has post_state>`).
- The `definition:` attribute contains the formula.
- Variable names in the formula reference attribute names or abbreviations of input nodes.
- Supported operators: `+`, `-`, `*`, `/`, `^` (exponentiation).
- Supported functions: `sqrt()`, `pow()`, `log()`, `abs()`, `sin()`, `cos()`, `tan()`, `power()`.
- Use `{abbreviation}` on input node attributes for concise formulas.
- Functions can be chained: the output of one function becomes the input to another.

### Example: Simple Computation

```
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

### Example: Using Abbreviations

```
# Hydrogen [Element]
number of protons {p}: 1;
number of neutrons {n}: 0;

# atomicMass [Function]
<input> Hydrogen;
<output> mass;
definition: p + n;

# mass
```

### Example: Chained Functions

```
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

---

## 7. Mind Maps

Mind maps create hierarchical trees with a single shared relation label.

### Syntax

```
# Root Topic <relation label>
- Branch A
  - Leaf A1
  - Leaf A2
- Branch B
  - Leaf B1
```

### Rules

- The heading MUST have the format: `# Name <relation>` (name, then relation in angle brackets on the same line).
- Child items use `-` (dash) list items.
- Indentation (spaces) determines hierarchy.
- All edges use the same relation label specified in the heading.
- Mind map blocks and regular CNL blocks can coexist in the same code fence.

### Example

```
# Cell <consists of>
- Nucleus
  - Chromosomes
    - DNA
  - Nucleolus
- Cytoplasm
  - Ribosomes
  - Endoplasmic Reticulum
  - Golgi Complex
- Plasma Membrane
  - Phospholipids
```

---

## 8. Queries

Queries ask questions about the graph and return results below the rendered graph.

### Wh-Word Queries

All Wh-words (`what`, `who`, `where`, `when`, `how`) are interchangeable. Pick whichever reads naturally.

#### Node-scoped queries (inside a `#` node block)

```
<relation> what;          What is this node <relation> to?
<how> Target;             How does this node relate to Target?
attribute: what;          What is the value of this attribute?
```

#### Graph-level queries (outside any `#` node block, or anywhere)

```
who <relation> Target;    Who has <relation> to Target?
what: value;              What node has an attribute with this value?
attribute: what;          What nodes have this attribute?
```

### Prolog Queries

For advanced reasoning, use Prolog-style queries:

```
?- relation(Dog, X, is_a).
?- attribute(X, mass, V).
?- node(X, _, class).
```

#### Available Prolog predicates (auto-generated from the graph)

| Predicate | Description |
|-----------|-------------|
| `node(Id, Name, Role)` | All nodes |
| `relation(Source, Target, RelName)` | Explicit AND inferred edges |
| `explicit_relation(Source, Target, RelName)` | Only user-written edges |
| `attribute(NodeId, AttrName, Value)` | Node attributes |
| `attribute_unit(NodeId, AttrName, Unit)` | Attribute units |
| `has_type(NodeId, TypeName)` | Node type lookup |
| `transitive(RelName)` | Schema: is this relation transitive? |
| `symmetric(RelName)` | Schema: is this relation symmetric? |
| `inverse(RelName, InvName)` | Schema: inverse relation lookup |

#### Prolog conventions

- Uppercase letters (`X`, `Y`, `V`) = unbound variables (will be filled in by query results).
- Lowercase atoms (`dog`, `mass`) = literal match.
- `_` = anonymous variable (match anything).

### Example

```
# Dog [class]
<is_a> Mammal;
<is_a> what;

# Cat [class]
<is_a> Mammal;

# Mammal [class]
<is_a> Vertebrate;

# Vertebrate [class]
<is_a> Animal;

# Animal [class]

who <is_a> Animal;
?- relation(dog, X, is_a).
```

---

## 9. Descriptions

Multi-line descriptions can be attached to nodes or to the entire graph.

### Node description

Place inside a node block:

````
# Water [Molecule]
```description
Water is a chemical substance with the formula H2O.
It is essential for all known forms of life.
```
````

### Graph description

Place at the top level (outside any node block):

````
```graph-description
This graph models the solar system and planetary orbits.
```
````

---

## 10. Accounting (Double-Entry Bookkeeping)

nodeBook supports full double-entry accounting with five account types.

### Account Types

| Type | Normal Balance | Debit increases? | Credit increases? |
|------|---------------|------------------|-------------------|
| `Asset` | Debit | Yes | No |
| `Liability` | Credit | No | Yes |
| `Equity` | Credit | No | Yes |
| `Revenue` | Credit | No | Yes |
| `Expense` | Debit | Yes | No |

### Syntax

```
currency: USD;

# Account Name [Asset]
balance: 1000;

# Transaction Name [Transaction]
date: 2026-01-15;
description: What happened;
<debit> amount Account Name;
<credit> amount Account Name;
```

### Rules

- Set `currency:` at the top level (outside any node). Supported: USD, EUR, GBP, INR, JPY, CNY, PHP, KRW, THB, BRL, ZAR, MXN, CAD, AUD, CHF, SEK, RUB, TRY, SAR, AED, NGN.
- Accounts without `balance:` start at 0.
- Each `[Transaction]` needs at least one `<debit>` and one `<credit>`.
- Amounts can be decimals: `<debit> 49.99 Cash;`
- Total debits must equal total credits (unbalanced transactions trigger a warning).
- Target accounts are auto-created if not explicitly declared.
- The accounting equation (Assets = Liabilities + Equity + Revenue - Expenses) is checked and displayed.

### Example

```
currency: INR;

# Cash [Asset]
balance: 50000;

# Inventory [Asset]
balance: 0;

# Accounts Payable [Liability]
balance: 0;

# Owner Capital [Equity]
balance: 50000;

# Sales Revenue [Revenue]

# Rent Expense [Expense]

# Buy Inventory [Transaction]
date: 2026-01-15;
description: Purchased goods for resale;
<debit> 25000 Inventory;
<credit> 25000 Cash;

# Pay Rent [Transaction]
date: 2026-01-20;
description: Monthly office rent;
<debit> 5000 Rent Expense;
<credit> 5000 Cash;

# Cash Sale [Transaction]
date: 2026-01-25;
description: Sold products to customer;
<debit> 15000 Cash;
<credit> 15000 Sales Revenue;
```

---

## 11. Algebraic Expressions

Parse an algebraic expression into a Petri net graph of operators and variables.

### Syntax

```
expression: sqrt(x^2 + y^2);
```

### Rules

- This is a graph-level directive (outside any node block).
- The expression is decomposed into a visual graph showing operator precedence.
- Assign values to variables by creating nodes with `value:` attributes to simulate.

---

## 12. Custom Schemas

Define domain-specific types in a separate `nodeBook-schema` code fence. These merge with the built-in defaults.

### Code fence

````
```nodeBook-schema
nodeType: Planet, A celestial body orbiting a star, parent: Object
relationType: orbits, One body orbits another, domain: Planet, range: Star, inverse: is orbited by
attributeType: diameter, float, Size measurement, unit: km, domain: Planet
transitionType: stellar_fusion, Hydrogen fuses into helium, inputs: Element, outputs: Element
functionType: surface_gravity, "mass" / power("diameter" / 2, 2) * 6.674e-11, scope: Planet
```
````

### Schema directives

#### nodeType

```
nodeType: Name, Description, parent: ParentType
```

#### relationType

```
relationType: name, Description, domain: Type1|Type2, range: Type1|Type2, symmetric: bool, transitive: bool, inverse: inverseName
```

#### attributeType

```
attributeType: name, data_type, Description, unit: unitName, domain: Type1|Type2, values: val1|val2
```

Data types: `string`, `number`, `float`, `date`, `boolean`, `complex`.

#### transitionType

```
transitionType: name, Description, inputs: Type1|Type2, outputs: Type1|Type2
```

#### functionType

```
functionType: name, definition, scope: Type1|Type2, description: text
```

### Rules

- Lines starting with `#` inside a schema block are comments.
- Multiple `nodeBook-schema` blocks on the same note are merged (last definition wins for duplicates).
- Local schemas add to global defaults; they don't replace them.
- Multiple values for `domain`, `range`, `inputs`, `outputs`, `scope`, and `values` are `|`-separated.

---

## 13. Graph-Level Directives

These lines go outside any `#` node block (at the top level of the code fence).

| Directive | Syntax | Purpose |
|-----------|--------|---------|
| Currency | `currency: USD;` | Set display currency for accounting |
| Expression | `expression: sqrt(x^2 + y^2);` | Parse algebraic expression into graph |
| Graph-level query | `who <is_a> Animal;` | Wh-word query across entire graph |
| Prolog query | `?- relation(X, Y, is_a).` | Prolog query across entire graph |

---

## 14. Built-in Types Reference

### Node Types

| Name | Parent | Description |
|------|--------|-------------|
| `class` | — | A class or category of entities |
| `individual` | — | A specific instance of a class |
| `Resource` | class | Goods, services, or money with economic value |
| `Event` | class | An economic event that changes resource quantity |
| `Agent` | class | A participant in an economic event |
| `LogicalOperator` | class | A logical condition (AND, OR) |
| `Substance` | class | A material with definite chemical composition |
| `Element` | Substance | A pure substance of one atom type |
| `Molecule` | Substance | A group of bonded atoms |
| `Transition` | class | A process transforming inputs to outputs |
| `Function` | Transition | A computable transition with a definition |
| `Transaction` | class | A double-entry accounting transaction |
| `Account` | class | A general ledger account |
| `Asset` | Account | Resources owned (debit-normal) |
| `Liability` | Account | Obligations owed (credit-normal) |
| `Equity` | Account | Owner's residual interest (credit-normal) |
| `Revenue` | Account | Income earned (credit-normal) |
| `Expense` | Account | Costs incurred (debit-normal) |
| `Person` | Agent | A human being |
| `Organization` | Agent | A group organized for a purpose |
| `Place` | individual | A physical location |
| `Concept` | individual | An abstract idea |
| `Object` | individual | A physical thing or artifact |

### Role Synonyms

These type names are normalized to their canonical form:

| Synonym | Canonical |
|---------|-----------|
| `class`, `concept`, `type`, `universal`, `common noun` | `class` |
| `individual`, `particular`, `token`, `member`, `proper noun` | `individual` |

### Relation Types

| Name | Transitive | Symmetric | Inverse | Domain | Range |
|------|-----------|-----------|---------|--------|-------|
| `is_a` | Yes | No | `has_subtype` | class | class |
| `member_of` | No | No | `has_member` | individual | class |
| `instance_of` | No | No | `has_instance` | individual | class |
| `part_of` | Yes | No | `has_part` | any | any |
| `is a type of` | Yes | No | `is a parent type of` | class | class |
| `has prior_state` | No | No | — | Transition | any |
| `has post_state` | No | No | — | Transition | any |
| `debit` | No | No | — | Transaction | Account types |
| `credit` | No | No | — | Transaction | Account types |
| `inflow` | No | No | — | Event | Resource |
| `outflow` | No | No | — | Event | Resource |
| `provides` | No | No | — | Agent | Event |
| `receives` | No | No | — | Agent | Event |
| `duality` | No | Yes | — | Event | Event |
| `stockflow` | No | No | — | Event | Resource |
| `has operand` | No | No | — | LogicalOperator | any |

### Common Attribute Names

These are recognized by the built-in schema (you can use any attribute name, but these have type/unit metadata):

**Core:** `name`, `description`, `identifier`, `url`, `status`, `type`, `category`, `tag`, `version`

**Temporal:** `birth_date`, `death_date`, `founded_date`, `start_date`, `end_date`, `created_date`, `modified_date`

**Spatial:** `latitude`, `longitude`, `elevation`, `area`

**Physical:** `mass` (kg), `weight` (kg), `velocity` (m/s), `temperature` (K), `charge` (C), `energy` (J), `color`, `material`, `width` (m), `height` (m), `depth` (m), `volume` (m^3), `density` (kg/m^3)

**People/Orgs:** `email`, `phone`, `author`, `publisher`

**Financial:** `price`, `currency`, `rating`, `score`

**Measurement:** `population`, `count`, `frequency` (Hz), `duration` (s), `distance` (m), `percentage` (%)

**Atomic:** `number of protons`, `number of neutrons`, `number of electrons`

---

## 15. ID Normalization Rules

Understanding how node IDs are generated helps avoid duplicate-node bugs.

1. The name is lowercased.
2. Special characters (anything not `a-z`, `0-9`, space, or hyphen) are removed.
3. Each word is singularized: `cities` -> `city`, `humans` -> `human`, `wolves` -> `wolf`.
4. Words are joined with underscores.

**Invariant words** (not singularized): species, series, means, news, sheep, fish, deer, moose, aircraft, mathematics, physics, economics, politics, ethics, linguistics, thermodynamics, genetics.

**Consequence:** `Humans`, `humans`, `Human`, and `human` all resolve to the node ID `human`. Write your CNL accordingly — these all refer to the same node.

If a node has an adjective, the ID is `adjective_basename`: `**venomous** Snake` -> `venomous_snake`.

---

## 16. Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Missing semicolon | `<is_a> Mammal` | Add `;` at the end: `<is_a> Mammal;` |
| Missing angle brackets | `is_a Mammal;` | Wrap relation name: `<is_a> Mammal;` |
| Using `##` without a `#` parent | `## Ice` at top level | Always put `##` morphs under a `#` node |
| Using `###` for morphs | `### Ice` | Only `##` is recognized for morphs |
| Forgetting `[Transition]` type | `# Photosynthesis` with `<input>` | Add the type: `# Photosynthesis [Transition]` |
| Forgetting `[Function]` type | `# compute` with `definition:` | Add the type: `# compute [Function]` |
| Forgetting `[Transaction]` type | `# Buy Supplies` with `<debit>` | Add: `# Buy Supplies [Transaction]` |
| Putting `currency:` inside a node | Under a `#` heading | Put `currency: USD;` at top level, before any `#` |
| Mind map without `<relation>` | `# Cell` with `- items` | Add relation: `# Cell <consists of>` |
| Unbalanced transaction | `<debit> 500 Cash;` only | Add matching `<credit> 500 Revenue;` |

---

## 17. Complete Examples

### Example 1: Concept Map (Classification)

```
# Animal [class]

# Mammal [class]
<is_a> Animal;

# Dog [class]
<is_a> Mammal;
domesticated: true;
average lifespan: 12 *years*;

# Cat [class]
<is_a> Mammal;
domesticated: true;
average lifespan: 15 *years*;

# Reptile [class]
<is_a> Animal;
blood type: cold-blooded;

# Snake [class]
<is_a> Reptile;
limbs: 0;
```

### Example 2: Process with Stoichiometry

```
# Combustion [Transition]
<reactant> 2 H2;
<reactant> O2;
<product> 2 H2O;

# H2 [Molecule]
name: Hydrogen gas;

# O2 [Molecule]
name: Oxygen gas;

# H2O [Molecule]
name: Water;
```

### Example 3: Polymorphic Node with Morphs

```
# Carbon [Element]
atomic number: 6;
number of protons: 6;

## Diamond
crystal structure: cubic;
hardness: 10 *Mohs*;
appearance: transparent;

## Graphite
crystal structure: hexagonal;
hardness: 1.5 *Mohs*;
appearance: opaque black;
<used in> Pencils;

## Fullerene
crystal structure: spherical;
appearance: dark solid;
```

### Example 4: Function with Abbreviations

```
# Rectangle
width {w}: 5;
height {h}: 3;

# computeArea [Function]
<input> Rectangle;
<output> area;
definition: w * h;

# area
```

### Example 5: Mind Map

```
# Solar System <contains>
- Inner Planets
  - Mercury
  - Venus
  - Earth
    - Moon
  - Mars
- Outer Planets
  - Jupiter
  - Saturn
  - Uranus
  - Neptune
- Dwarf Planets
  - Pluto
  - Eris
```

### Example 6: Accounting

```
currency: USD;

# Cash [Asset]
balance: 10000;

# Equipment [Asset]
balance: 0;

# Bank Loan [Liability]
balance: 0;

# Owner Capital [Equity]
balance: 10000;

# Sales Revenue [Revenue]

# Rent Expense [Expense]

# Take Loan [Transaction]
date: 2026-01-01;
description: Working capital loan;
<debit> 5000 Cash;
<credit> 5000 Bank Loan;

# Buy Equipment [Transaction]
date: 2026-01-05;
description: Office computers;
<debit> 3000 Equipment;
<credit> 3000 Cash;

# Make Sale [Transaction]
date: 2026-01-10;
description: Product sale to customer;
<debit> 2000 Cash;
<credit> 2000 Sales Revenue;

# Pay Rent [Transaction]
date: 2026-01-15;
description: Monthly office rent;
<debit> 1500 Rent Expense;
<credit> 1500 Cash;
```

### Example 7: Queries and Inference

```
# Socrates [individual]
<member_of> Greek;

# Greek [class]
<is_a> Human;

# Human [class]
<is_a> Mortal;
<is_a> what;

# Mortal [class]

who <member_of> Human;
?- relation(socrates, X, member_of).
```

### Example 8: Propositions with Quantifiers and Modalities

```
# *all* Metals [class]
<is_a> Element;
conductivity: high [necessary];
malleability: true [necessary];

# *some* Metals [class]
<is_a> Precious Metal;
rarity: high ++relatively++;

# **ferromagnetic** Metals [class]
<is_a> Metal;
magnetic: true [necessary];
examples: iron, cobalt, nickel;

# Element [class]
# Precious Metal [class]
# Metal [class]
```

### Example 9: Mixed Content (Concept Map + Process)

```
# Glucose [Molecule]
molecular formula: C6H12O6;

# O2 [Molecule]

# CO2 [Molecule]

# H2O [Molecule]

# ATP [Molecule]

# Cellular Respiration [Transition]
<input> Glucose;
<input> 6 O2;
<output> 6 CO2;
<output> 6 H2O;
<output> 36 ATP;

# Mitochondria [Organelle]
<performs> Cellular Respiration;
<part_of> Cell;

# Cell [class]
```
