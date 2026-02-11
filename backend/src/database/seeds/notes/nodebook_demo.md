---
title: nodeBook Knowledge Graph Demo
description: Interactive knowledge graph using Controlled Natural Language (CNL)
tags:
  - demo
  - nodebook
  - knowledge-graph
  - cnl
---

# nodeBook Knowledge Graph Demo

This note demonstrates the **nodeBook** extension for HedgeDoc. The code fence below defines a knowledge graph using Controlled Natural Language (CNL).

```nodeBook
# Hydrogen [Element]
has number of protons: 1;
has number of electrons: 1;
has number of neutrons: 0;

## Hydrogen ion
has number of protons: 1;
has number of neutrons: 0;
has number of electrons: 0;
<part of> Water;

# Oxygen [Element]
has number of protons: 8;
has number of electrons: 8;

## Oxide ion
has number of protons: 8;
has number of electrons: 10;
<part of> Water;

# Water [Molecule]
has chemical formula: H2O;

# Combustion [Transition]
<has prior_state> Hydrogen;
<has prior_state> Oxygen;
<has post_state> Water;
```

## How to use

- **Click** a node to see its details, attributes, and morph states
- **Switch morphs** using the radio buttons in the detail panel
- **Simulate transitions** by clicking a Transition node and pressing "Simulate"
- **Pan/zoom** with mouse wheel, **drag** nodes to rearrange
- **Export** the graph as PNG or SVG using the buttons above the graph
