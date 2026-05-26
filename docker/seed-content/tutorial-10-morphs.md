---
title: "Tutorial 10 · Morphs"
description: "nodeBook Tutorial, Level 5 — one concept, many states (polymorphic nodes)"
tags:
  - nodebook
  - tutorial
---

# Lesson 10 · Morphs

Some concepts aren't one fixed thing. A frog is a single animal — but a
**tadpole** and an **adult** frog have different bodies, habitats, and diets.
You *could* make two separate nodes… but they're the same frog. nodeBook lets
one concept hold several **states**, called **morphs**.

Write the everyday state directly, then add a `## state-name` block for each
alternative state, with its own attributes and relations:

```nodeBook
# Frog [class]
stage: adult;
breathes_with: lungs;
habitat: land;
<eats> Insects;

## tadpole
breathes_with: gills;
habitat: water;
<eats> Algae;
```

### See it change
1. Click the **Frog** node to select it.
2. In the sidebar a **Current State** selector appears — switch between *basic*
   (the adult) and *tadpole*.
3. Watch the node's property list and its relations **change**: `breathes_with`
   flips `lungs → gills`, `habitat` `land → water`, and `<eats>` re-points
   `Insects → Algae`.

It's one node the whole time — the morph swaps its entire neighbourhood. (This is
exactly why properties live *inside* the node box: so you can watch them change.)

> 🏁 **Milestone — you can model states and context without duplicating
> concepts.** Morphs capture life-cycles (tadpole/adult), phases (ice/water/
> steam), roles, or any "same thing, different state."

### Try it
Add a third state to a `# Butterfly` — `## caterpillar` and `## adult` — and flip
between them.

> 🧪 **See it in chemistry:** [Oxidation states & reactions](/n/chemistry-oxidation) uses morphs for an element's oxidation states alongside the reactions that change them.

---

← [Lesson 9](/n/tutorial-9-queries) · [Tutorial home](/n/tutorial) · [Lesson 11: Schemas →](/n/tutorial-11-schemas)
