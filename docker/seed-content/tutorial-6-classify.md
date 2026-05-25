---
title: "Tutorial 6 · Classes & individuals"
description: "nodeBook Tutorial, Level 3 — build a taxonomy with is_a and instance_of"
tags:
  - nodebook
  - tutorial
---

# Lesson 6 · Classes & individuals

Until now the bracket after a concept was just a loose type. nodeBook has two
special kinds that unlock **taxonomies** — organised hierarchies of knowledge:

- `[class]` — a **category** of things (Dog, Mammal, Animal).
- `[individual]` — a **specific** thing (Fido, a particular dog).

And two relations connect them:

- `<is_a>` — a class is a *kind of* a broader class.
- `<instance_of>` — an individual is a *member of* a class.

```nodeBook
# Animal [class]

# Mammal [class]
<is_a> Animal;

# Dog [class]
<is_a> Mammal;

# Fido [individual]
<instance_of> Dog;
age: 3 *years*;
```

Read it top-down: **Fido** is an instance of **Dog**, which is a **Mammal**,
which is an **Animal**. You've just written a small **ontology** — the same
structure scientists, librarians, and databases use to organise knowledge.

> 🏁 **Milestone — you can build a taxonomy.** Classes give you the categories,
> individuals give you the real members, and `is_a` / `instance_of` give you the
> backbone that every knowledge base is built on.

### Why this is about to get powerful
You said *Fido is_a Dog* and *Dog is_a Mammal* — but you never said *Fido is a
Mammal*. In the next level, nodeBook will **figure that out for you** (and let
you *ask* it). That's where a knowledge graph stops being a drawing and starts
being a reasoning system.

### Try it
Add a second individual (e.g. `# Whiskers [individual]` `<instance_of> Cat;`)
and a `Cat [class]` that `<is_a> Mammal`.

---

← [Lesson 5](/n/tutorial-5-mindmap) · [Tutorial home](/n/tutorial) · [Lesson 7: Adding nuance →](/n/tutorial-7-nuance)
