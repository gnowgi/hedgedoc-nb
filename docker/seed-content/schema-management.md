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

Every nodeBook block has access to a rich set of built-in schema types:

| Category | Count | Examples |
|----------|-------|---------|
| **Node types** | 20+ | `class`, `individual`, `Person`, `Organization`, `Place`, `Object`, `Account`, `Asset`, `Transition` |
| **Relation types** | 16+ | `is_a`, `part_of`, `member_of`, `instance_of`, `has prior_state`, `has post_state`, `debit`, `credit` |
| **Attribute types** | 50+ | `name`, `description`, `mass`, `temperature`, `population`, `price`, `status`, `birth_date` |
| **Transition types** | 2 | `transform`, `create` |
| **Function types** | 6 | `atomicMass`, `distance`, `speed`, `acceleration` |

These defaults cover common domains like ontology modeling, accounting, chemistry, and physics. You can use them in any `nodeBook` block without any extra setup.

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
functionType: name, expression, scope: Type1|Type2, description: text
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
