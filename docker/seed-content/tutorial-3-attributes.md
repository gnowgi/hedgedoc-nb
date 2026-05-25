---
title: "Tutorial 3 · Properties"
description: "nodeBook Tutorial, Level 1 — give concepts data with attributes"
tags:
  - nodebook
  - tutorial
---

# Lesson 3 · Properties

Relationships connect concepts to *other concepts*. But a concept also has facts
that belong to it alone — a dog has **4 legs** and a **lifespan**. Those are
**attributes**: a property and a value, written `property: value;`.

```nodeBook
# Dog [Animal]
legs: 4;
lifespan: 13 *years*;
<chases> Cat;
```

- `legs: 4;` attaches the fact *legs = 4* to `Dog`.
- `lifespan: 13 *years*;` adds a value **with a unit** — wrap the unit in
  `*asterisks*`.
- Attributes and relationships happily live side by side under the same concept.

> 🏁 **Milestone — your concepts now carry real data.** With nodes, relationships,
> and attributes you can model almost anything: a recipe, a family tree, a
> scientific process, a budget. You've learned the core of nodeBook.

### Try it
Give `Cat` its own attributes, and add a second animal:

```nodeBook
# Cat [Animal]
legs: 4;
lifespan: 15 *years*;
sound: meow;

# Bee [Animal]
legs: 6;
<pollinates> Flower;
```

### Where to go next
You can now build real knowledge graphs. From here the tutorial adds *precision
and power* — describing concepts more finely, classifying them into types, and
making the graph **reason** and **answer questions**.

---

← [Lesson 2](/n/tutorial-2-relation) · [Tutorial home](/n/tutorial) · [Lesson 4: Adjectives →](/n/tutorial-4-adjectives)
