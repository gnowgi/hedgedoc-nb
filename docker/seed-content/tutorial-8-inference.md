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

# Dog [class]
<is_a> Mammal;

# Fido [individual]
<instance_of> Dog;
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

### Try it
Add `# Cat [class]` `<is_a> Mammal;` and `# Whiskers [individual]`
`<instance_of> Cat;`. Without writing it, the graph will infer that Whiskers is
an Animal too.

Next: if the graph *knows* all this, can we **ask** it? Yes —

---

← [Lesson 7](/n/tutorial-7-nuance) · [Tutorial home](/n/tutorial) · [Lesson 9: Queries →](/n/tutorial-9-queries)
