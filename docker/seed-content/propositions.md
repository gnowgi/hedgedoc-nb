---
title: Propositions — Quantifiers, Adjectives & Adverbs
tags:
  - nodebook/quantifiers
  - nodebook/concept-map
  - logic
  - tutorial
---

# Propositions — Quantifiers, Adjectives & Adverbs

In logic, a **proposition** is a statement that can be true or false. nodeBook lets you annotate knowledge-graph nodes and attributes with quantifiers, adjectives, adverbs, and modalities — turning a flat concept map into a structured representation of logical claims.

This note demonstrates each annotation type, then combines them in a richer example.

---

## 1. Quantifiers: Universal & Existential

Wrap a quantifier in single asterisks before the node name: `# *all* Mammals [class]`.

- `*all*` or `*every*` renders the **universal quantifier** ∀ and adds a dashed purple border
- `*some*` or `*exists*` renders the **existential quantifier** ∃
- Any other value (e.g. `*no*`, `*most*`) renders in brackets: `[no]`, `[most]`

Click a quantified node to see the quantifier badge in the detail panel.

```nodeBook
# *all* Humans [class]
<is a> Mortal Being;
mortality: true [necessary];

# *all* Greeks [class]
<is a> Human;
origin: Greece;

# Socrates [individual]
<is a> Greek;

# *some* Birds [class]
<can> Fly;
flight: true [contingent];

# *no* Perpetual Motion Machine [class]
<violates> Thermodynamics;
feasibility: impossible [necessary];

# *some* Fish [class]
<lives in> Fresh Water;

# Mortal Being [class]
# Human [class]
# Greek [class]
# Thermodynamics [law]
# Fresh Water [substance]
```

The classic syllogism is visible in the graph: ∀ Greeks → Humans → Mortal Being. Socrates, as a Greek, inherits mortality through the chain.

---

## 2. Adjectives & Qualified Nodes

Wrap an adjective in double asterisks before the node name: `# **venomous** Snakes [class]`.

Adjectives create a qualified subset — a new node distinct from the unqualified version. This lets you represent statements like "venomous snakes are dangerous" without claiming all snakes are.

```nodeBook
# Snakes [class]
<is a> Reptile;
body plan: elongated;

# **venomous** Snakes [class]
<is a> Snake;
<produces> Venom;
danger level: high;

# **non-venomous** Snakes [class]
<is a> Snake;
danger level: low;

# **extinct** Species [class]
<no longer> Exist;
conservation status: extinct;

# **endangered** Species [class]
<at risk of> Extinction;
conservation status: critical;

# Reptile [class]
# Venom [substance]
# Extinction [event]
# Snake [class]
# Species [class]
```

Notice that `**venomous** Snakes` and `**non-venomous** Snakes` are separate nodes, each linking back to the unqualified `Snake` class.

---

## 3. Adverbs & Modalities on Attributes

Annotations on attribute values refine how a fact should be interpreted.

**Adverbs** — wrap in `++double plus++` signs after the value:
`speed: 300000 *km/s* ++approximately++;`

**Modalities** — wrap in `[brackets]` after the value:
`boiling point: 100 *Celsius* [necessary];`

These show as colored tags when you click a node — adverbs in slate, modalities in amber.

```nodeBook
# Speed of Light [constant]
speed: 299792458 *m/s* ++exactly++;
medium: vacuum [necessary];

# Pi [constant]
value: 3.14159 ++approximately++;
type: irrational [necessary];

# Earth [planet]
age: 4.5 *billion years* ++approximately++;
orbital period: 365.25 *days* ++approximately++;
habitability: confirmed [contingent];
atmosphere: present [necessary];

# Water [substance]
boiling point: 100 *Celsius* [necessary];
freezing point: 0 *Celsius* [necessary];
density: 1 *g/cm3* ++approximately++ [contingent];

# Human Lifespan [concept]
average: 73 *years* ++approximately++ [contingent];
maximum: 122 *years* ++reportedly++;
```

Try clicking on "Earth" or "Water" to see the adverb and modality tags beside each attribute value.

---

## 4. Combined Example: Aristotelian Logic

A richer graph combining all annotation types to represent a chain of logical reasoning about living things.

```nodeBook
# *all* Living Things [class]
<require> Energy;
<undergo> Metabolism;
mortality: true [necessary];
cellular structure: present [necessary];

# *all* Animals [class]
<is a> Living Thing;
<can> Move;
locomotion: true [contingent];
sentience: true [possibly];

# *all* Mammals [class]
<is a> Animal;
body temperature: 37 *Celsius* ++approximately++;
gestation: live birth [necessary];

# *some* Mammals [class]
<can> Fly;

# **aquatic** Mammals [class]
<is a> Mammal;
<lives in> Ocean;
habitat: marine [contingent];

# **nocturnal** Animals [class]
<is a> Animal;
activity period: night [necessary];
vision: adapted [necessarily];

# *all* Plants [class]
<is a> Living Thing;
<performs> Photosynthesis;
mobility: sessile [necessary];
energy source: sunlight [necessary];

# *no* Robots [class]
<is a> Living Thing;
autonomy: programmed [contingent];

# Energy [concept]
# Metabolism [process]
# Photosynthesis [process]
# Mammal [class]
# Animal [class]
# Living Thing [class]
# Ocean [environment]
```

This graph encodes several propositions:
- **Universal**: "All living things require energy" — ∀ Living Things → Energy
- **Existential**: "Some mammals can fly" — ∃ Mammals → Fly
- **Negative**: "No robots are living things" — `[no]` Robots
- **Qualified**: "Aquatic mammals live in the ocean" — adjective narrows scope
- **Modal**: "Gestation is necessarily live birth for mammals" — `[necessary]` tag
- **Approximate**: "Body temperature is approximately 37 °C" — `++approximately++` tag

---

## Syntax Reference

| Annotation | Syntax | Example | Rendering |
|---|---|---|---|
| **Universal quantifier** | `# *all* Node [Type]` | `# *all* Birds [class]` | ∀ prefix, dashed purple border |
| **Existential quantifier** | `# *some* Node [Type]` | `# *some* Fish [class]` | ∃ prefix, dashed purple border |
| **Custom quantifier** | `# *word* Node [Type]` | `# *no* Unicorns [class]` | `[no]` prefix, dashed purple border |
| **Adjective** | `# **adj** Node [Type]` | `# **toxic** Waste [class]` | Adjective in node label, separate node |
| **Adverb** | `attr: value ++adv++;` | `speed: 60 ++roughly++;` | Slate tag in detail panel |
| **Modality** | `attr: value [mod];` | `state: solid [necessary];` | Amber tag in detail panel |
| **Combined** | `attr: val *unit* ++adv++ [mod];` | `mass: 5 *kg* ++about++ [estimated];` | Unit + adverb tag + modality tag |
