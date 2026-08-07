---
title: Schema Management Guide
description: How to define and customize nodeBook schemas for your knowledge graphs
tags:
  - nodebook
  - schema
  - tutorial
---

# Schema Management Guide

nodeBook uses **schemas** to define the vocabulary of your knowledge graphs: what types of nodes exist, what relations connect them, and what attributes they can have. This note explains how schemas work and how to customize them.

[TOC]

## Global Schemas (Built-in Defaults)

Every nodeBook block has access to a rich set of built-in schema types covering ontology modeling, accounting, chemistry, and physics. You can use them in any `nodeBook` block without any extra setup.

The complete set of built-in defaults is shown below in `nodeBook-schema` syntax — this is exactly how you would define them yourself:

```nodeBook-schema
# ── Node Types ──────────────────────────────────────────────

nodeType: class, A class or category of entities
nodeType: individual, A specific instance of a class
nodeType: Resource, Goods services or money that have economic value, parent: class
nodeType: Event, An economic event that changes the quantity of a resource, parent: class
nodeType: Agent, A person or company who participates in an economic event, parent: class
nodeType: LogicalOperator, A node representing a logical condition like AND or OR, parent: class
nodeType: Substance, A material with definite chemical composition, parent: class
nodeType: Element, A pure substance consisting of one type of atom, parent: Substance
nodeType: Molecule, A group of atoms bonded together, parent: Substance
nodeType: Transition, A process that transforms inputs to outputs, parent: class
nodeType: Function, A computable transition with a definition that evaluates input values to produce output values, parent: Transition
nodeType: Transaction, An accounting transaction that moves value between accounts, parent: class
nodeType: Account, A general ledger account that holds monetary value, parent: class
nodeType: Asset, An account representing resources owned (debit-normal), parent: Account
nodeType: Liability, An account representing obligations owed (credit-normal), parent: Account
nodeType: Equity, An account representing owner's residual interest (credit-normal), parent: Account
nodeType: Revenue, An account representing income earned (credit-normal), parent: Account
nodeType: Expense, An account representing costs incurred (debit-normal), parent: Account
nodeType: Person, A human being, parent: Agent
nodeType: Organization, A group of people organized for a purpose, parent: Agent
nodeType: Place, A physical location or geographical area, parent: individual
nodeType: Concept, An abstract idea or mental construct, parent: individual
nodeType: Object, A physical thing or artifact, parent: individual

# ── Relation Types ──────────────────────────────────────────

relationType: inflow, An event increases a resource, domain: Event, range: Resource
relationType: outflow, An event decreases a resource, domain: Event, range: Resource
relationType: provides, An agent provides resources to an event, domain: Agent, range: Event
relationType: receives, An agent receives resources from an event, domain: Agent, range: Event
relationType: duality, Connects reciprocal events, symmetric: true, domain: Event, range: Event
relationType: stockflow, Connects an economic event to the resource it affects, domain: Event, range: Resource
relationType: is_a, Subsumption between two types/classes, domain: class, range: class, symmetric: false, transitive: true, inverse: has_subtype
relationType: member_of, An individual belongs to a class, domain: individual, range: class, symmetric: false, transitive: false, inverse: has_member
relationType: instance_of, An individual is an instance of a class, domain: individual, range: class, symmetric: false, transitive: false, inverse: has_instance
relationType: part_of, One entity is a part of another entity, symmetric: false, transitive: true, inverse: has_part
relationType: is a type of, A class is a subtype of another class, domain: class, range: class, transitive: true, inverse: is a parent type of
relationType: has prior_state, Defines the inputs and conditions for a transition, domain: Transition
relationType: has post_state, Defines the outputs of a transition, domain: Transition
relationType: debit, Debits an account, domain: Transaction, range: Account|Asset|Liability|Equity|Revenue|Expense
relationType: credit, Credits an account, domain: Transaction, range: Account|Asset|Liability|Equity|Revenue|Expense
relationType: has operand, Links a LogicalOperator to one of its operands, domain: LogicalOperator

# ── Relation Aliases ───────────────────────────────────────
# These are shorthand aliases parsed by the CNL parser:
#   <input>  → has prior_state  (friendly alias for Function/Transition inputs)
#   <output> → has post_state   (friendly alias for Function/Transition outputs)
#   <debit>  → has post_state   (accounting alias)
#   <credit> → has prior_state  (accounting alias)

# ── Attribute Types ─────────────────────────────────────────

attributeType: charge, float, Measures electric charge, unit: coulomb (C), domain: Electron|Ion
attributeType: energy, float, Quantifies the capacity to do work, unit: joule (J), domain: Particle|Field|Reaction
attributeType: mass, float, Measures the amount of matter in an object, unit: kilogram (kg), domain: Particle|Planet|Organism
attributeType: population, number, Number of inhabitants, domain: City|Region|Country
attributeType: temperature, float, Indicates thermal energy level, unit: kelvin (K), domain: Gas|Liquid|Solid
attributeType: velocity, float, Describes the rate of change of position, unit: meters per second (m/s), domain: Particle|Vehicle
attributeType: area, float, Any place will have an attribute area, domain: Place
attributeType: Alternate name, string, Any thing that is called by another name
attributeType: name, string, The primary name or title of an entity
attributeType: description, string, A detailed description or explanation of an entity
attributeType: identifier, string, A unique identifier or code for an entity
attributeType: url, string, A web address or link associated with an entity
attributeType: email, string, An email address, domain: Person|Organization
attributeType: phone, string, A phone number, domain: Person|Organization
attributeType: birth_date, date, The date when a person was born, domain: Person
attributeType: death_date, date, The date when a person died, domain: Person
attributeType: founded_date, date, The date when an organization was established, domain: Organization
attributeType: start_date, date, The beginning date of an event or period, domain: Event
attributeType: end_date, date, The ending date of an event or period, domain: Event
attributeType: created_date, date, The date when an entity was created
attributeType: modified_date, date, The date when an entity was last modified
attributeType: latitude, float, Geographic latitude coordinate, unit: degrees, domain: Place|Location
attributeType: longitude, float, Geographic longitude coordinate, unit: degrees, domain: Place|Location
attributeType: elevation, float, Height above sea level, unit: meters, domain: Place|Location
attributeType: width, float, The width dimension of an object, unit: meters, domain: Object
attributeType: height, float, The height dimension of an object, unit: meters, domain: Object
attributeType: depth, float, The depth dimension of an object, unit: meters, domain: Object
attributeType: weight, float, The weight of an object, unit: kilograms, domain: Object
attributeType: color, string, The color of an object, domain: Object
attributeType: material, string, The material an object is made of, domain: Object
attributeType: status, string, The current status or state of an entity, values: active|inactive|pending|completed|cancelled
attributeType: type, string, The type or category of an entity
attributeType: category, string, A category or classification of an entity
attributeType: tag, string, A tag or label associated with an entity
attributeType: language, string, The language of a document, domain: Document
attributeType: format, string, The format of a document or file, domain: Document
attributeType: size, number, The size of a file or document in bytes, unit: bytes, domain: Document
attributeType: version, string, The version number of an entity
attributeType: author, string, The author or creator of a document, domain: Document
attributeType: publisher, string, The publisher of a document, domain: Document
attributeType: isbn, string, International Standard Book Number, domain: Document
attributeType: issn, string, International Standard Serial Number, domain: Document
attributeType: price, float, The price or cost of an item, unit: currency, domain: Object
attributeType: currency, string, The currency used for a monetary value, values: USD|EUR|GBP|JPY|CNY|INR
attributeType: rating, float, A numerical rating or score
attributeType: score, float, A numerical score or grade
attributeType: count, number, A count or quantity of items
attributeType: percentage, float, A percentage value, unit: percent
attributeType: frequency, float, The frequency of occurrence, unit: hertz (Hz)
attributeType: duration, float, The duration or length of time, unit: seconds, domain: Event
attributeType: distance, float, The distance between two points, unit: meters
attributeType: volume, float, The volume of an object or container, unit: cubic meters, domain: Object
attributeType: density, float, The density of a material, unit: kg/m^3, domain: Object
attributeType: number of protons, string, Atomic property
attributeType: number of neutrons, string, Atomic property
attributeType: number of electrons, string, Atomic property

# ── Transition Types ────────────────────────────────────────

transitionType: transform, Transform one entity into another, inputs: individual, outputs: individual
transitionType: create, Create a new entity, outputs: individual

# ── Function Types ──────────────────────────────────────────

functionType: atomicMass, "number of protons" + "number of neutrons", scope: Element|class
functionType: distance, let $x_1$ be "position x"; let $y_1$ be "position y"; let $z_1$ be "position z"; let $x_2$ be "previous position x"; let $y_2$ be "previous position y"; let $z_2$ be "previous position z"; let delta_x be $x_1$ - $x_2$; let delta_y be $y_1$ - $y_2$; let delta_z be $z_1$ - $z_2$; sqrt(power(delta_x 2) + power(delta_y 2) + power(delta_z 2)), scope: Object|Particle|Vehicle|class, description: Euclidean distance between two 3D positions
functionType: displacement, let $x$ be "position x"; let $y$ be "position y"; let $z$ be "position z"; let $x_0$ be "initial position x"; let $y_0$ be "initial position y"; let $z_0$ be "initial position z"; let delta_x be $x$ - $x_0$; let delta_y be $y$ - $y_0$; let delta_z be $z$ - $z_0$; sqrt(power(delta_x 2) + power(delta_y 2) + power(delta_z 2)), scope: Object|Particle|Vehicle|class, description: Displacement from initial to current position
functionType: speed, let $x_1$ be "position x"; let $y_1$ be "position y"; let $z_1$ be "position z"; let $x_2$ be "previous position x"; let $y_2$ be "previous position y"; let $z_2$ be "previous position z"; let $t_1$ be "time"; let $t_2$ be "previous time"; let delta_x be $x_1$ - $x_2$; let delta_y be $y_1$ - $y_2$; let delta_z be $z_1$ - $z_2$; let dist be sqrt(power(delta_x 2) + power(delta_y 2) + power(delta_z 2)); let delta_t be $t_1$ - $t_2$; dist / delta_t, scope: Object|Particle|Vehicle|class, description: Speed (distance over time)
functionType: velocity_magnitude, let $x$ be "position x"; let $y$ be "position y"; let $z$ be "position z"; let $x_0$ be "initial position x"; let $y_0$ be "initial position y"; let $z_0$ be "initial position z"; let $t_1$ be "time"; let $t_2$ be "previous time"; let delta_x be $x$ - $x_0$; let delta_y be $y$ - $y_0$; let delta_z be $z$ - $z_0$; let disp be sqrt(power(delta_x 2) + power(delta_y 2) + power(delta_z 2)); let delta_t be $t_1$ - $t_2$; disp / delta_t, scope: Object|Particle|Vehicle|class, description: Velocity magnitude (displacement over time)
functionType: acceleration, let $x_1$ be "position x"; let $y_1$ be "position y"; let $z_1$ be "position z"; let $x_2$ be "previous position x"; let $y_2$ be "previous position y"; let $z_2$ be "previous position z"; let $x_3$ be "previous previous position x"; let $y_3$ be "previous previous position y"; let $z_3$ be "previous previous position z"; let $t_1$ be "time"; let $t_2$ be "previous time"; let $t_3$ be "previous previous time"; let v1 be sqrt(power($x_1$ - $x_2$ 2) + power($y_1$ - $y_2$ 2) + power($z_1$ - $z_2$ 2)) / ($t_1$ - $t_2$); let v2 be sqrt(power($x_2$ - $x_3$ 2) + power($y_2$ - $y_3$ 2) + power($z_2$ - $z_3$ 2)) / ($t_2$ - $t_3$); let delta_v be v1 - v2; let delta_t be $t_1$ - $t_2$; delta_v / delta_t, scope: Object|Particle|Vehicle|class, description: Acceleration (change in velocity over time)
```

## Local Schemas (Per-Note Overrides)

To add **domain-specific** types for a particular note, create a `nodeBook-schema` code block anywhere in the same note. Local schemas **merge** with the global defaults — they add new types and can override existing ones by name.

### Syntax Overview

Each line in a `nodeBook-schema` block follows this format:

```
schemaKind: name, positional fields..., key: value, key: value
```

Where `schemaKind` is one of: `nodeType`, `relationType`, `attributeType`, `transitionType`, or `functionType`.

Lines starting with `#` are treated as comments. Empty lines are ignored.

## Schema Type Reference

### nodeType

Defines a category of node.

```
nodeType: Name, Description text, parent: ParentType
```

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | The type name (appears in `[brackets]` on nodes) |
| Description | No | Human-readable description |
| `parent` | No | Parent type(s), separated by `\|` for multiple |

**Example:**
```
nodeType: Planet, A celestial body orbiting a star, parent: Object
nodeType: Star, A luminous ball of gas, parent: Object
nodeType: Galaxy, A gravitationally bound system of stars, parent: Object
```

### relationType

Defines a directed relationship between nodes.

```
relationType: name, Description, domain: Type1|Type2, range: Type1|Type2, symmetric: false, transitive: false, inverse: inverseName
```

| Field | Required | Description |
|-------|----------|-------------|
| name | Yes | The relation name (used in `<angle brackets>`) |
| Description | No | Human-readable description |
| `domain` | No | Source node type(s), `\|`-separated |
| `range` | No | Target node type(s), `\|`-separated |
| `symmetric` | No | `true` if A→B implies B→A |
| `transitive` | No | `true` if A→B→C implies A→C |
| `inverse` | No | Name of the inverse relation |

**Example:**
```
relationType: orbits, One body orbits another, domain: Planet, range: Star, inverse: is orbited by
relationType: contains, A galaxy contains stars, domain: Galaxy, range: Star|Planet, inverse: is in
```

### attributeType

Defines a property that nodes can have.

```
attributeType: name, data_type, Description, unit: unitName, domain: Type1|Type2, values: val1|val2
```

| Field | Required | Description |
|-------|----------|-------------|
| name | Yes | The attribute name (used before `:` in CNL) |
| data_type | Yes | `string`, `number`, `float`, `date`, `boolean`, or `complex` |
| Description | No | Human-readable description |
| `unit` | No | Measurement unit |
| `domain` | No | Applicable node type(s) |
| `values` | No | Allowed values, `\|`-separated |

**Example:**
```
attributeType: diameter, float, Size measurement, unit: km, domain: Planet|Star
attributeType: spectral_class, string, Stellar classification, domain: Star, values: O|B|A|F|G|K|M
attributeType: habitable, boolean, Whether the planet can support life, domain: Planet
```

### transitionType

Defines a process that transforms inputs into outputs (used in Petri net mode).

```
transitionType: name, Description, inputs: Type1|Type2, outputs: Type1|Type2
```

**Example:**
```
transitionType: stellar_fusion, Hydrogen fuses into helium in a star's core, inputs: Element, outputs: Element
```

### functionType

Defines a computed attribute derived from other attributes.

```
functionType: name, definition, scope: Type1|Type2, description: text
```

**Example:**
```
functionType: surface_gravity, "mass" / power("diameter" / 2, 2) * 6.674e-11, scope: Planet, description: Approximate surface gravity
```

## Full Example: Astronomy Schema

Here is a complete local schema for an astronomy domain:

```nodeBook-schema
# Astronomy domain schema
nodeType: Planet, A celestial body orbiting a star, parent: Object
nodeType: Star, A luminous ball of gas, parent: Object
nodeType: Galaxy, A gravitationally bound system of stars, parent: Object
nodeType: Moon, A natural satellite orbiting a planet, parent: Object

relationType: orbits, One body orbits another, domain: Planet|Moon, range: Star|Planet, inverse: is orbited by
relationType: contains, A system contains celestial bodies, domain: Galaxy, range: Star|Planet

attributeType: diameter, float, Size measurement, unit: km, domain: Planet|Star|Moon
attributeType: orbital_period, float, Time to complete one orbit, unit: days, domain: Planet|Moon
attributeType: spectral_class, string, Stellar classification, domain: Star, values: O|B|A|F|G|K|M
attributeType: habitable, boolean, Whether the planet can support life, domain: Planet
attributeType: number_of_moons, number, Count of natural satellites, domain: Planet
```

And a nodeBook block that uses these custom types:

```nodeBook
# Milky Way [Galaxy]
description: Our home galaxy;

# Sun [Star]
spectral_class: G;
diameter: 1392700;
mass: 1.989e30 *kg*;

# Earth [Planet]
<orbits> Sun;
diameter: 12742;
orbital_period: 365.25;
habitable: true;
number_of_moons: 1;
mass: 5.972e24 *kg*;

# Moon [Moon]
<orbits> Earth;
diameter: 3474;
orbital_period: 27.3;

# Mars [Planet]
<orbits> Sun;
diameter: 6779;
orbital_period: 687;
habitable: false;
number_of_moons: 2;

# Milky Way [Galaxy]
<contains> Sun;
```

## How Validation Uses Schemas

When you click the **Validate** button on a nodeBook graph, the system checks your CNL against the merged schemas:

- **Node types**: Warns if a `[Type]` is not defined in any schema
- **Relations**: Warns if a `<relation>` name is unknown
- **Domain/Range**: Warns if a relation's source or target node doesn't match the expected types
- **Attributes**: Warns if an attribute name is not defined

These are **advisory warnings** — your graph still renders even if validation finds issues. The warnings help you catch typos and ensure consistency.

## How Autocomplete Uses Schemas

The editor provides **schema-aware autocomplete** inside nodeBook code fences:

| Trigger | What it suggests | Example |
|---------|-----------------|---------|
| Type `[` on a heading line | Node type names | `# Earth [` shows `Planet`, `Object`, etc. |
| Type `<` at the start of a line | Relation names (including aliases and inverses) | `<` shows `orbits`, `contains`, `is_a`, etc. |
| Start typing an attribute name | Attribute names | `dia` shows `diameter`, `distance`, etc. |

Autocomplete reads from the **merged** schemas, so any types you define in a `nodeBook-schema` block on the same note appear in the suggestions immediately.

## Tips

- **One schema block is enough** — if you have multiple `nodeBook-schema` blocks in a note, they are merged (last definition wins for duplicate names)
- **Schema blocks don't render visually** — they configure the note's vocabulary silently
- **Global defaults are always available** — local schemas add to them, they don't replace the entire set
- **Use `parent`** on node types to build type hierarchies — a `Planet` with `parent: Object` inherits the domain constraints of `Object`
