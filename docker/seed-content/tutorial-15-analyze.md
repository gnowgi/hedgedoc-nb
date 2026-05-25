---
title: "Tutorial 15 · Text to graph"
description: "nodeBook Tutorial, Level 7 — turn prose into CNL with the analyze feature"
tags:
  - nodebook
  - tutorial
---

# Lesson 15 · Text → graph

You can now write CNL by hand. But a lot of knowledge already lives in **prose** —
textbook paragraphs, notes, articles. nodeBook can help you turn that into a
graph. Put text in a ` ```nodeBook-analyze ` block:

```nodeBook-analyze
The cheetah is a large wild cat that hunts gazelles on the African savanna.
It runs rapidly, reaching 110 kilometres per hour. Cheetahs are mammals, and a
female usually gives birth to three cubs.
```

A toolbar appears above the passage. **Toggle annotation categories** — *nodes*,
*relations*, *adjectives*, *attributes*, *quantifiers*… — and nodeBook highlights
which words play which role, and reports each one with a suggested bit of CNL.

### From reading to a graph
Each suggestion in the report has a **+Add** button. Click it and nodeBook inserts
ready-made CNL into a ` ```nodeBook ` block in this note — defaulting to a class
node with `is_a`/`instance_of` prompts for you to complete:

```nodeBook
```

*(To use +Add you'll edit the note — the inserted lines land in the empty
`nodeBook` block above. Everything you learned in Levels 1–6 then applies:
classify the nodes, add relations, give them attributes.)*

> 🏁 **Milestone — nodeBook meets your notes where they are.** Read a paragraph,
> decompose it into concepts and relations, and grow a knowledge graph from it —
> the bridge between ordinary notes and a reasoning model.

Two real-world graphs to finish on — built entirely from the features you now
know:

---

← [Lesson 14](/n/tutorial-14-expressions) · [Tutorial home](/n/tutorial) · [Lesson 16: A metabolic pathway →](/n/tutorial-16-biology)
