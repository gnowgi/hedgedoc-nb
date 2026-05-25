---
title: "Tutorial 11 · Schemas"
description: "nodeBook Tutorial, Level 5 — define your own vocabulary of types"
tags:
  - nodebook
  - tutorial
---

# Lesson 11 · Schemas

So far the words in brackets (`[class]`, `[Animal]`) and your relation names
were free-form — nodeBook accepted whatever you typed. A **schema** lets you
*define your own vocabulary*: which node types, relations, and attributes are
allowed, what they mean, and how they fit together.

Schemas go in a ` ```nodeBook-schema ` block:

```nodeBook-schema
nodeType: Animal, A living organism that can move, parent: class
relationType: preys_on, One animal hunts and eats another, domain: Animal, range: Animal, transitive: false
attributeType: lifespan, integer, Typical years an animal lives, unit: years, domain: Animal
```

- **nodeType** — a kind of node (with an optional `parent:` for a hierarchy of types).
- **relationType** — a kind of link, with `domain:` (allowed source) and `range:`
  (allowed target), plus flags like `transitive:` / `inverse:`.
- **attributeType** — a kind of property, with a datatype, optional `unit:`, and
  the `domain:` it applies to.

Now your concepts can use that vocabulary, and nodeBook can **check** them:

```nodeBook
# Lion [Animal]
lifespan: 15 *years*;
<preys_on> Zebra;
```

Press the **Validate** button on the canvas (see
[Reading the canvas](/n/tutorial-canvas)) and nodeBook flags anything that
doesn't fit the schema — a misspelt relation, a wrong domain, an unknown type.

> 🏁 **Milestone — you can govern your knowledge.** A schema turns loose notes
> into a checked, shareable vocabulary — the difference between a personal
> sketch and a knowledge base a whole team (or class) can build on together.

### Try it
Add an `attributeType: diet` and a `nodeType: Plant`, then give a herbivore a
`<eats> Grass;` — and validate.

---

← [Lesson 10](/n/tutorial-10-morphs) · [Tutorial home](/n/tutorial) · *Level 6 (dynamics) coming soon*
