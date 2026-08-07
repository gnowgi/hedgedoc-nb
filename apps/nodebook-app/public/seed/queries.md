---
title: Querying Knowledge Graphs
tags:
  - nodebook/queries
  - nodebook/concept-map
  - prolog
  - tutorial
---

# Querying Knowledge Graphs

nodeBook can do more than render graphs — you can **query** them. The mental model is simple: **replace one part of a statement with a question word to make it a query.**

Use any Wh-word — `what`, `who`, `where`, `when`, `how` — they all work identically. Pick whichever reads most naturally.

[TOC]

---

## 1. Declaring Facts

Every heading and relation in a nodeBook block is a **fact**. The graph below states three things: Socrates is a member of the Greeks, the Greeks are a subclass of Humans, and Humans are a subclass of Mortals.

```nodeBook
# Socrates [individual]
<member_of> Greek;

# Greek [class]
<is_a> Human;

# Human [class]
<is_a> Mortal;

# Mortal [class]
```

Nothing is queried yet — this is just a concept map. But notice the dashed purple edges: the inference engine already figured out that Socrates is transitively a member of Humans and Mortals, and that Greeks are transitively a subclass of Mortals. Click any dashed edge to highlight the proof path.

---

## 2. Asking Questions with Wh-Words

Replace the unknown part of a statement with a question word. The syntax mirrors the CNL you already know.

### Node-scoped queries (under a `# Node` heading)

Place a query line inside a node's block to ask about **that specific node**:

```nodeBook
# Socrates [individual]
<member_of> Greek;
<member_of> what;

# Greek [class]
<is_a> Human;
<how> Human;

# Human [class]
<is_a> Mortal;

# Mortal [class]
```

- `<member_of> what;` under Socrates asks: *"What is Socrates a member of?"* — returns Greek, Human, and Mortal (via transitive inference)
- `<how> Human;` under Greek asks: *"How does Greek relate to Human?"* — returns `is_a`

### Graph-level queries (not under any heading)

Place queries outside any `#` heading to search **across all nodes**:

```nodeBook
# Socrates [individual]
<member_of> Greek;

# Greek [class]
<is_a> Human;

# Human [class]
<is_a> Mortal;

# Mortal [class]

who <is_a> Mortal;
who <member_of> Human;
```

- `who <is_a> Mortal;` asks: *"Who is_a Mortal?"* — returns Human and Greek (transitively)
- `who <member_of> Human;` asks: *"Who is a member_of Human?"* — returns Socrates

---

## 3. Query Syntax Reference

### Node-scoped (under a `# Node` heading)

| Syntax | Reads as | Example |
|---|---|---|
| `<rel> what;` | What is this node `<rel>` to? | `<member_of> what;` |
| `<how> Target;` | How does this node relate to Target? | `<how> Human;` |
| `what: value;` | Which attribute has this value? | `what: red;` |
| `attr: what;` | What is the value of this attribute? | `mass: what;` |

### Graph-level (outside any heading)

| Syntax | Reads as | Example |
|---|---|---|
| `who <rel> Target;` | Who `<rel>` Target? | `who <is_a> Mortal;` |
| `what: value;` | What node has this attribute value? | `what: engineer;` |
| `mass: what;` | What has a mass? | `mass: what;` |

All Wh-words (`what`, `who`, `where`, `when`, `how`) are interchangeable. Use whichever reads best.

---

## 4. Attributes & Units

You can query attributes too. Use `attr: what;` to find the value, or `what: value;` to find which attribute has a given value.

```nodeBook
# Earth [planet]
mass: 5.972e24 *kg*;
radius: 6371 *km*;
orbital period: 365.25 *days*;
radius: what;
<orbits> Sun;

# Mars [planet]
mass: 6.417e23 *kg*;
radius: 3389 *km*;
orbital period: 687 *days*;
<orbits> Sun;

# Jupiter [planet]
mass: 1.898e27 *kg*;
radius: 69911 *km*;
orbital period: 4333 *days*;
<orbits> Sun;

# Sun [star]

what: 6371;
who <orbits> Sun;
```

- `radius: what;` under Earth asks *"What is Earth's radius?"* — returns 6371
- `what: 6371;` at graph level finds which node has `6371` as an attribute value (Earth's radius)
- `who <orbits> Sun;` finds everything that orbits the Sun

---

## 5. Filtering by Type

Combine Wh-word queries with node-scoped patterns to explore your graph:

```nodeBook
# Alice [individual]
<works_at> Acme Corp;
role: engineer;
what: engineer;

# Bob [individual]
<works_at> Acme Corp;
role: manager;

# Carol [individual]
<works_at> Globex;
role: engineer;

# Acme Corp [organization]
industry: technology;

# Globex [organization]
industry: energy;

who <works_at> Acme Corp;
what: engineer;
```

- `what: engineer;` under Alice asks *"Which of Alice's attributes has value 'engineer'?"* — returns `role`
- `who <works_at> Acme Corp;` at graph level asks *"Who works at Acme Corp?"* — returns Alice and Bob
- `what: engineer;` at graph level asks *"What node has 'engineer' as an attribute value?"* — returns Alice and Carol

---

## 6. Transitive Inference in Action

The schema declares `is_a` and `classifies` as transitive relations. Wh-word queries reveal the full inferred chain:

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

- `<is_a> what;` under Dog shows: Mammal, Vertebrate, *and* Animal (the full transitive chain)
- `who <is_a> Animal;` at graph level finds everything that is (directly or transitively) an Animal

---

## 7. Membership Inheritance

A special inference rule propagates `member_of` up the `is_a` chain. If X is a member of A, and A is_a B, then X is also a member of B.

```nodeBook
# Fido [individual]
<member_of> Dog;
<member_of> what;

# Rex [individual]
<member_of> Dog;

# Dog [class]
<is_a> Canine;

# Canine [class]
<is_a> Mammal;

# Mammal [class]
<is_a> Animal;

# Animal [class]

who <member_of> Mammal;
```

- `<member_of> what;` under Fido returns Dog, Canine, Mammal, and Animal
- `who <member_of> Mammal;` asks *"Who is a member of Mammal?"* — returns Fido and Rex

---

## 8. Advanced: Prolog `?-` Syntax

For full power, you can write raw Prolog queries using `?-` syntax. Variables start with an uppercase letter; lowercase atoms match literally.

```nodeBook
# Socrates [individual]
<member_of> Greek;

# Greek [class]
<is_a> Human;

# Human [class]
<is_a> Mortal;

# Mortal [class]

?- relation(socrates, X, member_of).
?- relation(greek, X, is_a).
?- node(X, _, class).
```

### Available Predicates

Every nodeBook block automatically generates these Prolog predicates:

| Predicate | Meaning |
|---|---|
| `node(Id, Name, Role)` | All declared nodes |
| `relation(Source, Target, RelName)` | Explicit **and** inferred edges |
| `explicit_relation(Source, Target, RelName)` | Only the edges you wrote |
| `attribute(NodeId, AttrName, Value)` | Node attributes |
| `attribute_unit(NodeId, AttrName, Unit)` | Attribute units |
| `has_type(NodeId, TypeName)` | Node type / role lookup |
| `transitive(RelName)` | Schema: which relations are transitive |
| `symmetric(RelName)` | Schema: which relations are symmetric |
| `inverse(RelName, InvName)` | Schema: inverse relation pairs |

### Prolog Syntax Tips

| Syntax | Meaning | Example |
|---|---|---|
| `?- goal.` | Query line (period optional) | `?- node(X, _, class).` |
| Uppercase `X`, `Y` | Variables (unbound, to be solved) | `?- relation(X, Y, is_a).` |
| Lowercase `atom` | Literal values (must match exactly) | `?- relation(dog, X, is_a).` |
| `_` | Anonymous variable (match anything) | `?- node(_, Name, _).` |

---

## 9. Schema Introspection

You can query the schema metadata itself — which relations are transitive, symmetric, or have inverses. This requires `?-` Prolog syntax:

```nodeBook
# Placeholder [class]

?- transitive(X).
?- symmetric(X).
?- inverse(X, Y).
```

This returns the built-in schema rules. If you define custom schemas in a `nodeBook-schema` block, those facts appear here too.

---

**Tips:**
- Node IDs are lowercase, underscored, and singularized — `Homo sapiens` becomes `homo_sapien`, `Acme Corp` becomes `acme_corp`
- Relation names use the exact string from your `<relation>` lines — `is_a`, `member_of`, `orbits`, etc.
- The query panel appears below the graph. Toggle it with the search icon in the toolbar.
- Both Wh-word queries and `?-` Prolog queries can coexist in the same block
- All 5 Wh-words (`what`, `who`, `where`, `when`, `how`) work identically — pick whichever reads best
- If Prolog fails to load, the engine falls back to BFS-based inference — you still get inferred edges, just not query results.
