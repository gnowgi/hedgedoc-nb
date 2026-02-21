---
title: Taxonomic Classification
tags:
  - biology/taxonomy
  - nodebook/concept-map
  - tutorial
---

# Taxonomic Classification

A hierarchical classification of life using nodeBook. Taxonomic ranks are encoded as node types (e.g., `[Domain]`, `[Kingdom]`, `[Phylum]`), and `<classifies>` relations link each rank to its children.

## Full Classification (Concept Map)

```nodeBook
# Eukarya [Domain]
<classifies> Animalia;
<classifies> Plantae;
<classifies> Fungi;
<classifies> Protista;

# Animalia [Kingdom]
<classifies> Chordata;

# Chordata [Phylum]
<classifies> Mammalia;
<classifies> Reptilia;

# Mammalia [Class]
<classifies> Primates;

# Primates [Order]
<classifies> Hominidae;

# Hominidae [Family]
<classifies> Homo;

# Homo [Genus]
<classifies> Homo sapiens;

# Homo sapiens [Species]

# Reptilia [Phylum]
<classifies> Archosauria;

# Archosauria [Class]
<classifies> Aves;

# Aves [Order]

# Plantae [Kingdom]
<classifies> Phytotaxa;

# Phytotaxa [Phylum]
<classifies> Magnifera;

# Magnifera [Class]
<classifies> Proteaceae;

# Proteaceae [Order]
<classifies> Utricularia;

# Utricularia [Example]

# Fungi [Kingdom]
<classifies> Mycofungi;

# Mycofungi [Phylum]
<classifies> Basidiomycetes;

# Basidiomycetes [Class]
<classifies> Basidiomycetaceae;

# Basidiomycetaceae [Order]
<classifies> Lentinula edodes;

# Lentinula edodes [Example]

# Protista [Kingdom]
<classifies> Eukaryophora;
<classifies> Anthophyta;
<classifies> Eumycota;
<classifies> Ustaceae;

# Eukaryophora [Phylum]
<classifies> Dinosaurs;

# Anthophyta [Phylum]
<classifies> Algae;

# Eumycota [Phylum]
<classifies> Fungi imperfecti;

# Ustaceae [Phylum]
<classifies> Unicellular algae;
```

## Animalia (Mindmap)

A mindmap view of the animal kingdom hierarchy:

```nodeBook
# Animalia <classifies>
- Chordata
  - Mammalia
    - Primates
      - Hominidae
        - Homo sapiens
  - Reptilia
    - Archosauria
      - Aves
        - Canis lupus
```

## Plantae (Mindmap)

```nodeBook
# Plantae <classifies>
- Phytotaxa
  - Magnifera
    - Proteaceae
      - Utricularia
```
