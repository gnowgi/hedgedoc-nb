---
title: Cell Biology — Mindmap Demo
tags:
  - biology/cell-biology
  - nodebook/mindmap
  - demo
---

# Cell Biology — Mindmap Demo

A mindmap of cell structure using nodeBook's mindmap syntax. The `<contains>` relation creates a tree from the root node to all indented items.

## Cell Structure

```nodeBook
# Cell <contains>
- Nucleus
  - Chromosomes
    - DNA
  - Nucleolus
- Cytoplasm
  - Ribosomes
  - Endoplasmic Reticulum
  - Golgi Complex
  - Cytoskeleton
- Plasma membrane
  - Phospholipids
```

## Nucleus Detail (Concept Map)

A more detailed view of the nucleus with descriptions:

```nodeBook
# Nucleus [Organelle]
```description
The nucleus is a membrane-bound organelle found in eukaryotic cells that contains the genetic material (DNA) organized into chromosomes.
```
<contains> Chromosomes;
<contains> Nucleolus;
<surrounded by> Nuclear envelope;

# Chromosomes [Structure]
<consists of> DNA;
<consists of> Histone proteins;

# DNA [Molecule]
has structure: double helix;
<encodes> Genes;

# Nucleolus [Structure]
<produces> Ribosomal RNA;

# Nuclear envelope [Membrane]
<has> Nuclear pores;
```
