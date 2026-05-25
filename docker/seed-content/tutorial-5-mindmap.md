---
title: "Tutorial 5 · Mind-maps"
description: "nodeBook Tutorial, Level 2 — sketch a hierarchy fast with the outline syntax"
tags:
  - nodebook
  - tutorial
---

# Lesson 5 · Mind-maps

So far we've connected concepts one relationship at a time. When you're building
a **hierarchy** — a tree of things inside things — there's a much faster way: an
**indented outline**.

Declare a root node followed by the relation to apply, then list children as an
indented bullet list. nodeBook turns the outline into a tree:

```nodeBook
# Animal <contains>
- Mammal
  - Dog
  - Cat
- Bird
  - Eagle
  - Sparrow
- Insect
  - Bee
```

- `# Animal <contains>` is the **root** and the relation to use for every branch.
- Each bullet becomes a node connected to its parent by `<contains>`.
- Indent deeper to go deeper — `Dog` and `Cat` sit under `Mammal`, which sits
  under `Animal`.

This renders as a **mind-map** — the same kind of knowledge graph, just drawn as
a tidy tree. (Use the layout button on the canvas — see
[Reading the canvas](/n/tutorial-canvas) — to compare layouts.)

> 🏁 **Milestone — you can describe concepts richly and sketch whole hierarchies
> in seconds.** Outlines are great for first drafts; the explicit
> `# Node` / `<relation>` style is great for precise, cross-linked graphs. Mix
> both freely.

### Try it
Add a `Reptile` branch with a couple of examples, and go one level deeper under
any animal (e.g. `Dog → Puppy`).

---

← [Lesson 4](/n/tutorial-4-adjectives) · [Tutorial home](/n/tutorial) · *Level 3 (classification) coming soon*
