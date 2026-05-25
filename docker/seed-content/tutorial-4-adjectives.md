---
title: "Tutorial 4 · Adjectives"
description: "nodeBook Tutorial, Level 2 — qualify a concept with an adjective"
tags:
  - nodebook
  - tutorial
---

# Lesson 4 · Adjectives

Sometimes a bare concept isn't specific enough — a *wild* dog and a *domestic*
dog are not quite the same idea. nodeBook lets you **qualify** a concept with an
adjective by wrapping it in `**double asterisks**` before the name:

```nodeBook
# **playful** Dog [Animal]
legs: 4;
<chases> Cat;
```

The adjective shows in **bold** on the node, so `playful Dog` reads as one
qualified concept — distinct from a plain `Dog`.

### Why it's useful
Adjectives let you tell apart variants of the same thing without inventing new
names:

```nodeBook
# **wild** Dog [Animal]
<hunts> Deer;

# **domestic** Dog [Animal]
<lives_with> Human;
```

Now your graph has two clearly different dogs. Adjectives are the lightest way to
add nuance — next we'll see a faster way to sketch whole hierarchies.

---

← [Lesson 3](/n/tutorial-3-attributes) · [Tutorial home](/n/tutorial) · [Lesson 5: Mind-maps →](/n/tutorial-5-mindmap)
