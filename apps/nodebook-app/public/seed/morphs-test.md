---
title: Morphs and Transitions Test
tags:
  - nodebook/morphs
  - nodebook/concept-map
  - test
---

# Morphs and Transitions Test

This CNL file demonstrates the morphs functionality in NodeBook, showing how nodes can transition between different states without creating new nodes.

# Oxygen [Element]
has atomic number: 8;
has number of protons: 8;
has number of neutrons: 8;
has number of electrons: 8;
has state: "gas";

## Oxide ion
has atomic number: 8;
has number of protons: 8;
has number of neutrons: 8;
has number of electrons: 10;
has charge: -2;
has state: "ion";
<part of> Water;

## Ozone
has atomic number: 8;
has number of protons: 8;
has number of neutrons: 8;
has number of electrons: 8;
has molecular formula: "O3";
has state: "gas";

# Hydrogen [Element]
has atomic number: 1;
has number of protons: 1;
has number of neutrons: 0;
has number of electrons: 1;
has state: "gas";

## Hydrogen ion
has atomic number: 1;
has number of protons: 1;
has number of neutrons: 0;
has number of electrons: 0;
has charge: +1;
has state: "ion";
<part of> Water;

# Water [Molecule]
has molecular formula: "H2O";
has state: "liquid";
<is a type of> Compound;

## Ice
has molecular formula: "H2O";
has state: "solid";
has temperature: 0 *Celsius*;

## Steam
has molecular formula: "H2O";
has state: "gas";
has temperature: 100 *Celsius*;

# Oxidation [Transition]
<has prior_state> Oxygen;
<has prior_state> Hydrogen;
<has post_state> Oxide ion;
<has post_state> Hydrogen ion;

# Reduction [Transition]
<has prior_state> Oxide ion;
<has prior_state> Hydrogen ion;
<has post_state> Oxygen;
<has post_state> Hydrogen;

# Phase Change [Transition]
<has prior_state> Water;
<has prior_state> Heat;
<has post_state> Steam;

# Freezing [Transition]
<has prior_state> Water;
<has prior_state> Cold;
<has post_state> Ice;

# Heat [Energy]
# Cold [Energy]
