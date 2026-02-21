# Transition (Declarative)

Transition shows prior-state of nodes and their state on one side, and
post-state of nodes on the other side; and prior state also includes
the conditions for the transition. Conditions are necessary and
sufficient conditions required for the transition to take place. they
could be more than one node. Similarly the post-state can also be more
than one node.

Since a polynode (polymmorphic node) is a node with more than one
possible morph, it is the same node that is changing, therefore, we
cannot give a new ids except the name change; e.g. oxygen becomes
oxide ion after gaining two more electrons.





👤adminAdmin

# Hydrogen [Element]
has number of protons: 1;
has number of electrons: 1;
has number of neutrons: 0;

## Hydrogen ion
has number of protons: 1;
has number of neutrons: 0;
has number of electrons: 0;
<part of> Water;

## Hydrogen isotope
has number of protons: 1;
has number of neutrons: 1;
has number of electrons: 1;

# Oxygen [Element]
has number of protons: 8;
has number of neutrons: 8;
has number of electrons: 8;

## Oxide ion
has number of protons: 8;
has number of neutrons: 8;
has number of electrons: 10;
<part of> Water;

# Water [Class]
<is a type of> Substance;
<is a type of> Molecule;
has chemical formula: $\ce{H2O}$; 

## hydronium
has chemical formula: $\ce{H3O+}$;

## hydroxide
has chemical formula: $\ce{OH-}$;

# Combustion Trigger [LogicalOperator]
has operator: "OR";
<has operand> Spark;
<has operand> Flame;

# Electrolysis of Water [Transition]
<has prior_state> Water;
<has prior_state> Electricity;
<has post_state> Hydrogen;
<has post_state> Oxygen;

# Combustion [Transition]
<has prior_state> Hydrogen;
<has prior_state> Oxygen;
<has prior_state> Combustion Trigger;
<has post_state> Water;

# Spark [Energy]
# Flame [Energy]
# Electricity [Energy]

