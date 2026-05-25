---
title: "Tutorial 2 · A relationship"
description: "nodeBook Tutorial, Level 1 — connect two concepts with a relationship"
tags:
  - nodebook
  - tutorial
---

# Lesson 2 · A relationship

A single concept is just a label. Knowledge lives in the **connections between
concepts** — *Dog **chases** Cat*, *Bee **pollinates** Flower*.

In nodeBook, a relationship is a word in angle brackets, pointing at another
concept, ending with `;`:

```nodeBook
# Dog [Animal]
<chases> Cat;
```

Read it like a sentence: **Dog → chases → Cat**. Two things just happened:

- nodeBook drew a **directed, labelled arrow** from `Dog` to `Cat`.
- You didn't have to declare `Cat` first — mentioning it as a target created it.

> 🏁 **Milestone — you've built a knowledge graph.** Concepts joined by meaning
> *is* a knowledge graph. Everything from here just makes it richer.

### Try it
Add more relationships under `Dog` (each on its own line):

```nodeBook
# Dog [Animal]
<chases> Cat;
<eats> Bone;
<lives_with> Human;
```

A relationship always reads *subject → relation → target*, so put the lines
under the concept they start from. Next, we'll give these concepts some real
**data**.

---

← [Lesson 1](/n/tutorial-1-node) · [Tutorial home](/n/tutorial) · [Lesson 3: Properties →](/n/tutorial-3-attributes)
