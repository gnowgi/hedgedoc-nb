```graph-description
This graph introduces nodeBook to the users. 
```
# nodeBook [App]

```description
You can build **knowledge graphs** expressed in a *controlled natural
language*, and visualize as a graph, linking one node to another
and describing the nodes with their properties. nodeBook is unique
application that has special nodes called **transitions** and
special attributes called **functions**.
```
<is a> Note Book;
<is a> p2p App;
<constructs> Knoweldge Graph;
<processes> Controlled Natural Language;
<decodes> Controlled Natural Language;
<parses> Controlled Natural Language;
<consists of> *polymorphic* Nodes;
<consists of> Transitions;
<consists of> Functions;
<consists of> Attributes;
<consists of> Relations;

# Knowledge Graph [Representation]

```description
A knowledge graph is made with **nodes** and *edges*, and nothing
else. Using a knowledge graph we can express **meaning**, without
worrying too much of about variations in grammar that we find in a
natural langauge. 
```
<consists of> Nodes;
<consists of> Edges;

# CNL [Language]
```description
CNL refers to Controlled Natural Language. 
```
<refers to> Controlled Natural Language;
<is a> *special* Language;

# Nodes [Representation]

```description
Any thing about which you want to talk about or describe. 

Nodes are represented in nodeBook as polymorphic nodes: a very special
implementation of NodeBook's graph database. We allow a nodes to
change their state. We call them **morphs**, because their structure
changed due to change in properties. Whenever a node gains 
a property or changes the value of a property, we represent them as
two different states (morphs) of the same node. E.g., Oxygen when it
gains two more electrons, it becomes an oxide ion. or Alice got
pregnant. Alice and Oxygen remain as the same node, but their property
changes. This helps us to represent changes of a node. 

```
<can be> Concepts;
<can be> People;
<can be> Places;
<can be> Substances;

# Edges [Representation]

```description
Any thing about which you want to talk about or describe. 
```

<can be> Relations;
<can be> Attributes;

# Relations [Representation]

```description
Relation is a **linking phrase** we use to link between two or more
nodes. e.g., Asia **is a** Continent; or Oxygen **is a**
Element. While making the graph we don't care about if the verb phrase
we use is **is a** or **is an**. We are more tolerant about the
grammatical exceptions we find in a natural langauge. We focus only on
meaning, or technically speaking: semantics. We use bare minimum
syntax of a sentence: subject-predicate-object. 
```
<is a> Edge;



# Attributes [Representation]
```description
Attributes are **properties** of a node. E.g. color, shape, size,
mass, weight, length of an object. 
```
<is a> Edges;

# Functions [Representation]
```description
Functions are **derived attributes**. E.g., if we know the number of
protons in an element, we know its atomic number. And if we also know
the number of neutrons of an element, we can make a function
mentioning that adding the number of neutrons and protons will be same
as its atomic mass. Derived attributes (functions) will work for all
the elements. Similarly, given the position and time of a moving
object, we can derive new attributes like displacement, speed,
velocity etc.  Functions are very special to nodeBook. 
```
<is a> *special* Edge;
<is a> *derived* Attribute;

# Transitions [Representation]
```description

These are special nodes that help us to represent changes/processes and the
conditions underwhich a change happens. E.g., an electric sparc,
in the presence of oxygen and hydrogen can produce water molecule. In
this example, water is represented as a post state of the process,
while sparc, oxygen and hydrogen are prior states. Also, sparc is also
represented as a trigger, in the absence of which no process
happens. We can represent such details in nodeBook.
```
<is a> *special* Node;
<have> Prior State;
<have> Post State;
