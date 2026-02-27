---
title: nodeBook Graph Score
tags:
  - nodebook
  - scoring
  - reference
---

# nodeBook Graph Score

The **Graph Score** (0–100) measures how rich and well-structured your knowledge graph is. It appears in the sidebar when your note contains ` ```nodeBook ` blocks. The score is computed across **9 categories**, each with threshold-based levels.

---

## 1. Coverage (max 20 pts)

How many **nodes** does your graph contain?

| Nodes | Points |
|-------|--------|
| 0–4   | 0      |
| 5–9   | 5      |
| 10–19 | 10     |
| 20–29 | 15     |
| 30+   | 20     |

**Tip:** Add more entities to your graph. Each `# NodeName` heading creates a node. Relation targets also create nodes automatically.

---

## 2. Connectivity (max 15 pts)

How well-connected are your nodes? Measured by **average degree** (2 × edges ÷ nodes).

| Avg Degree | Points |
|------------|--------|
| < 2        | 0      |
| 2–2.9      | 5      |
| 3–3.9      | 10     |
| 4+         | 15     |

**Tip:** Add more relations between nodes using `<relation> Target;` syntax. A well-connected graph means each node has multiple relationships.

---

## 3. Typing (max 15 pts)

What percentage of nodes have an **explicit type** (not just the default `individual`)?

| Typed % | Points |
|---------|--------|
| < 50%   | 0      |
| 50–74%  | 5      |
| 75–99%  | 10     |
| 100%    | 15     |

**Tip:** Add types with `# NodeName [Type]` — e.g., `[class]`, `[Event]`, `[Transition]`, `[Planet]`. Define custom types with a `nodeBook-schema` block.

---

## 4. Inference (max 10 pts)

How long is the **longest transitive inference chain**? The inference engine derives implicit edges — e.g., if A `<is_a>` B and B `<is_a>` C, then A `<is_a>` C is inferred.

| Chain Length | Points |
|-------------|--------|
| 0–1         | 0      |
| 2           | 3      |
| 3           | 6      |
| 4+          | 10     |

**Tip:** Build taxonomies with `<is_a>` or `<member_of>` chains at least 4 levels deep.

---

## 5. Schema (max 10 pts)

Does your note include a **custom schema** and does the graph validate against it?

| Condition            | Points |
|---------------------|--------|
| No schema           | 0      |
| Schema defined      | 5      |
| Schema + validates  | 10     |

**Tip:** Add a ` ```nodeBook-schema ` block defining your custom types:

````
```nodeBook-schema
nodeType: Planet, A celestial body, parent:Celestial
relationType: orbits, domain:Planet, range:Star
attributeType: radius, float, unit:km
```
````

---

## 6. Processes (max 10 pts)

Does your graph include **transitions** (state changes) and are they balanced (each has both inputs and outputs)?

| Condition                   | Points |
|----------------------------|--------|
| No transitions             | 0      |
| Has transition(s)          | 5      |
| Balanced (prior + post)    | 10     |

**Tip:** Create a `[Transition]` node with both `<has prior_state>` and `<has post_state>` relations:

```
# Melting [Transition]
<has prior_state> Ice;
<has post_state> Water;
```

---

## 7. Computation (max 10 pts)

Does your graph include **math expressions** and are they chained?

| Condition              | Points |
|-----------------------|--------|
| No expressions        | 0      |
| Has expression(s)     | 5      |
| Chained (2+ exprs)   | 10     |

**Tip:** Add `expression: a + b * c;` directives. Use two or more expressions to earn full marks.

---

## 8. Queries (max 5 pts)

Does your graph include **any queries** (Wh-word questions or raw Prolog)?

| Condition   | Points |
|------------|--------|
| No queries | 0      |
| Any query  | 5      |

**Tip:** Add queries like `<is_a> what;` or `who <member_of> Animal;` to interrogate your graph.

---

## 9. Morphs (max 5 pts)

Does your graph include **any morphs** (polymorphic states)?

| Condition  | Points |
|-----------|--------|
| No morphs | 0      |
| Any morph | 5      |

**Tip:** Add `##` sub-headings under a `#` node to define alternate states:

```
# Water [class]
state: liquid;

## frozen
temperature: 0 *Celsius*;

## boiling
temperature: 100 *Celsius*;
```

---

## Scoring Summary

| Category     | Max | What It Measures                     |
|-------------|-----|--------------------------------------|
| Coverage     | 20  | Number of nodes                      |
| Connectivity | 15  | Average degree (edges per node)      |
| Typing       | 15  | Percentage of typed nodes            |
| Inference    | 10  | Longest transitive chain             |
| Schema       | 10  | Custom schema + validation           |
| Processes    | 10  | Balanced transitions                 |
| Computation  | 10  | Math expressions                     |
| Queries      | 5   | Wh-word or Prolog queries            |
| Morphs       | 5   | Polymorphic states                   |
| **Total**    | **100** |                                  |

All thresholds are **level-based** (not linear) — you jump to the next tier by crossing a threshold, not by incremental progress.
