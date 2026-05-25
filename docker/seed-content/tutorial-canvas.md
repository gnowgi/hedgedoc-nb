---
title: "Tutorial · Reading the canvas"
description: "nodeBook Tutorial — navigate the graph canvas and view the CNL behind it"
tags:
  - nodebook
  - tutorial
---

# Reading the canvas

Every ` ```nodeBook ` block renders an interactive **canvas**. Before going
further, it's worth knowing how to move around it and — importantly — how to see
the CNL code behind any graph.

```nodeBook
# Dog [Animal]
legs: 4;
<chases> Cat;
```

### See the CNL behind a graph
Each canvas has a small toolbar in its corner. The **`< >` (Show CNL source)**
button flips the canvas between the **graph view** and the exact **CNL code**
that produced it. This is the quickest way to "read the code" of any example —
toggle it on, study the CNL, toggle it back.

To *edit* the CNL (and watch the graph update live), open the note itself for
editing — the left pane is the text, the right pane is the rendered result.

### Moving around
- **Pan:** click and drag the empty canvas.
- **Zoom:** scroll, or use the **＋ / －** buttons.
- **Fit:** the **⤢ (Fit graph to view)** button frames the whole graph.
- **Select:** click a node to highlight it.

### Other handy buttons
- **Layout / mode** — switch how the graph is drawn (e.g. mind-map vs. network).
- **Export** — save the graph as a **PNG** or **SVG** image.
- A few buttons (validate, containment, queries, token controls) appear only
  when they're relevant — we'll meet those in later lessons.

> 💡 Tip: when an example confuses you, hit **Show CNL source** to see exactly
> how it was written, then copy the pattern into your own note.

---

← [Tutorial home](/n/tutorial) · [Start Lesson 1: A concept →](/n/tutorial-1-node)
