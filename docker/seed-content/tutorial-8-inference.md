---
title: "Tutorial 8 · Inference"
description: "nodeBook Tutorial, Level 4 — nodeBook derives new facts from your taxonomy"
tags:
  - nodebook
  - tutorial
---

# Lesson 8 · Inference

In Lesson 6 you wrote a chain — *Fido is a Dog, Dog is a Mammal, Mammal is an
Animal* — but you **never** wrote *Fido is an Animal*. Watch what nodeBook does
with it anyway:

```nodeBook
# Animal [class]

# Mammal [class]
<is_a> Animal;
has_fur: yes;
legs: 4;

# Dog [class]
<is_a> Mammal;

# Fido [individual]
<instance_of> Dog;
name: Rex;
```

Look closely at the graph: alongside the **solid** links you typed, nodeBook
draws extra **dashed** links — `Dog → Animal`, `Fido → Mammal`, `Fido → Animal`.
You wrote 3 relationships; the graph *knows* several more.

- **Solid edges** = facts you stated.
- **Dashed edges** = facts nodeBook **inferred** by following `is_a` /
  `instance_of` chains (transitive reasoning).

This is the moment a knowledge graph stops being a *drawing* and becomes a
*reasoning system* — it derives consequences you didn't spell out.

> You can hide or show the derived links with the **inferred-edges** toggle on
> the canvas (see [Reading the canvas](/n/tutorial-canvas)).

### Properties are inherited too
Inference isn't only about links — it flows **attributes** down the chain. We gave
`Mammal` the properties `has_fur` and `legs`, and `Fido` only its own `name`. Yet
look inside the `Dog` and `Fido` boxes: they also show `has_fur: yes` and
`legs: 4` — in *italic* with a **(from Mammal)** tag, marking them as **inherited**
rather than stated. (If a node sets its own value for a property, that own value
wins.)

That's classic ontology behaviour: state something once about a class, and every
subclass and member gets it for free.

### Try it
Add `# Cat [class]` `<is_a> Mammal;` and `# Whiskers [individual]`
`<instance_of> Cat;`. Without writing it, the graph will infer that Whiskers is
an Animal too.

Next: if the graph *knows* all this, can we **ask** it? Yes —

---

← [Lesson 7](/n/tutorial-7-nuance) · [Tutorial home](/n/tutorial) · [Lesson 9: Queries →](/n/tutorial-9-queries)
