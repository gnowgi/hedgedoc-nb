---
title: "Tutorial 9 · Queries"
description: "nodeBook Tutorial, Level 4 — ask your knowledge graph questions"
tags:
  - nodebook
  - tutorial
---

# Lesson 9 · Queries

If the graph *knows* facts, you can **ask** it. The mental model is delightfully
simple: **take a statement and replace one part with a question word.**

- `who` → which node is the *subject*?
- `what` → which node is the *target* (or value)?
- `<how>` → which *relation* connects two nodes?

### Ask across the whole graph
Put a query on its own line. `who <is_a> Animal;` means *"who is an Animal?"*:

```nodeBook
# Animal [class]

# Mammal [class]
<is_a> Animal;

# Dog [class]
<is_a> Mammal;

# Fido [individual]
<instance_of> Dog;

who <is_a> Animal;
```

The results appear in the **query panel** (toggle it on the canvas). And notice —
the answer includes `Dog`, `Mammal`, **and** `Fido`, even though you only wrote
`Dog <is_a> Mammal`. Queries use the **inference** from Lesson 8, so they reason,
not just look up.

### Ask about one node
Place a query *inside* a node's block to ask about that node. Under `Dog`:

```nodeBook
# Dog [class]
<is_a> Mammal;
<is_a> what;
```

`<is_a> what;` asks *"what is a Dog an `is_a` of?"* → `Mammal` and `Animal`.

You can query attributes too: `mass: what;` (what's the value?) or
`what: meat;` (which node has that value?).

> 🏁 **Milestone — your notes answer questions.** You've gone from drawing
> concepts, to classifying them, to a graph that **reasons and responds**. That
> is the heart of nodeBook.

### Try it
Ask `who <instance_of> Dog;`, then add a Cat branch and ask `who <is_a> Mammal;`.

---

← [Lesson 8](/n/tutorial-8-inference) · [Tutorial home](/n/tutorial) · [Lesson 10: Morphs →](/n/tutorial-10-morphs)
