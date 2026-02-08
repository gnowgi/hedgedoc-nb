# nodeBook Extension for HedgeDoc - Testing Guide

## Overview

The nodeBook extension renders CNL (Controlled Natural Language) code blocks as interactive
knowledge graphs using Cytoscape.js. Users write structured text inside a ` ```nodeBook ` code
fence and see a live graph visualization in the rendered markdown.

## How to Start the Mock Dev Server

```bash
# Requires Node.js 24+ (check with: node --version)
# If using nvm: nvm use 24

cd hedgedoc/frontend
node ../.yarn/releases/yarn-4.12.0.cjs run start:dev:mock
```

This starts HedgeDoc at **http://localhost:3001** with a mock API (no backend/database needed).
Open the `/n/features` demo note and replace its content with test CNL to try the extension.

## CNL Syntax Reference

### Nodes
```
# NodeName [Type]
```
- `#` defines a node
- `[Type]` is optional (defaults to `individual`)
- Bold adjective: `# **Adjective** NodeName [Type]`

### Attributes
```
has attribute_name: value;
has temperature: 25 *Celsius*;
has speed: 100 *km/h* ++rapidly++ [possibly];
```
- `*unit*` - unit annotation
- `++adverb++` - adverb modifier
- `[modality]` - modality qualifier

### Relations
```
<relation_name> TargetNode;
<contains> Water;
<is part of> **Large** System;
```

### Morphs (Polymorphic States)
```
# Water [Transition]
has default_attr: value;

## Liquid
has viscosity: 0.89 *mPa.s*;
<flows through> Pipe;

## Frozen
has crystal_structure: hexagonal;
```
- `##` defines a morph (alternate state) under the parent `#` node
- Each morph can have its own attributes and relations
- The first morph listed becomes the default active morph

### Transitions
```
# Water [Transition]
<has prior_state> Ice;
<has post_state> Steam;
```
- Nodes with `[Transition]` type get a "Simulate" button
- Simulation switches prior_state nodes to their next morph

### Functions
```
has function "myFunction";
```

### Descriptions
````
```description
Free-form text describing the node.
```
````

### Graph Description
````
```graph-description
Overall description of the graph.
```
````

## Expected Behavior

### Graph Rendering
- CNL code inside ` ```nodeBook ` fence is parsed and rendered as a Cytoscape.js graph
- Nodes appear as labeled shapes in a left-to-right dagre layout
- Edges (relations) appear as labeled arrows between nodes
- Graph auto-fits to container on render

### Node Styles
- **Regular nodes**: Blue (#4a90d9) rounded rectangles
- **Transition nodes**: Purple (#9b59b6) diamonds
- **Nodes with multiple morphs**: Double border (6px)
- **Selected node**: Orange (#e67e22) border

### Node Selection & Detail Panel
- Clicking a node opens a detail panel on the right side
- Panel shows: node name, type, attributes (name: value), relations
- Close button (X) dismisses the panel

### Morph Switching
- If a node has morphs, radio buttons appear in the detail panel
- Selecting a different morph filters the displayed attributes and relations
- The graph edges update to reflect the active morph's relations
- Default morph is "basic" (attributes/relations defined directly under the node heading)

### Transition Simulation
- For `[Transition]` nodes, a "Simulate Transition" button appears
- Clicking it switches prior_state connected nodes to their next morph
- Visual feedback: transition node briefly highlights

### Export
- PNG button: downloads graph as PNG image
- SVG button: downloads graph as SVG file

### Schema Validation
- A yellow warning banner appears if the CNL uses unknown node types, relation types, or attribute names
- Warnings are advisory only and do not block rendering

### Error Handling
- Empty code blocks render nothing (no crash)
- Malformed CNL degrades gracefully (parses what it can)
- Missing targets in relations create placeholder nodes

## Test Checklist

### Basic Rendering
- [ ] Empty ` ```nodeBook ` block renders without errors
- [ ] Single node: `# Alice` renders one node
- [ ] Node with type: `# Alice [Person]` shows type label
- [ ] Node with adjective: `# **Tall** Alice [Person]` shows bold adjective
- [ ] Multiple nodes render as separate graph elements
- [ ] Attribute: `has age: 30;` appears in detail panel when node is clicked
- [ ] Attribute with unit: `has speed: 100 *km/h*;` shows unit
- [ ] Relation: `<knows> Bob;` creates edge labeled "knows"
- [ ] Relation target creates a node if it doesn't exist as a `#` heading

### Graph Layout
- [ ] Graph uses left-to-right dagre layout
- [ ] Graph fits within the container (no overflow)
- [ ] Container has visible border and minimum height (~500px)

### Interaction
- [ ] Clicking a node highlights it with orange border
- [ ] Clicking a node opens the detail panel
- [ ] Detail panel shows node name, type, attributes, relations
- [ ] Clicking the X button closes the detail panel
- [ ] Clicking background deselects node and closes panel

### Morph System
- [ ] Node with `##` sub-headings shows morph radio buttons in detail panel
- [ ] "basic" morph is selected by default
- [ ] Switching morph updates displayed attributes in detail panel
- [ ] Switching morph updates displayed relations in detail panel
- [ ] Graph edges update when morph changes (only active morph's relations shown)
- [ ] Nodes with multiple morphs have a double border style

### Transitions
- [ ] `[Transition]` type nodes render as purple diamonds
- [ ] Transition nodes show "Simulate Transition" button in detail panel
- [ ] `<has prior_state>` and `<has post_state>` relations are parsed correctly
- [ ] Clicking "Simulate" switches prior_state nodes to their next morph

### Export
- [ ] PNG export button downloads a .png file
- [ ] SVG export button downloads a .svg file

### Edge Cases
- [ ] Very long node names don't break layout
- [ ] Special characters in names are handled (parentheses, quotes)
- [ ] Duplicate node names are deduplicated by ID
- [ ] Code block updates live as text is edited (re-parse on change)

## Sample Test CNL

### Minimal Test
````
```nodeBook
# Alice [Person]
has age: 30;
<knows> Bob;

# Bob [Person]
has age: 25;
```
````

### Morph Test
````
```nodeBook
# Water [Transition]
has temperature: 25 *Celsius*;
<has prior_state> Ice;
<has post_state> Steam;

## Liquid
has viscosity: 0.89 *mPa.s*;
<flows through> Pipe;

## Frozen
has crystal_structure: hexagonal;
<is stored in> Freezer;

# Ice [individual]
has melting_point: 0 *Celsius*;

# Steam [individual]
has boiling_point: 100 *Celsius*;
<powers> Turbine;

# Pipe [individual]
has diameter: 10 *cm*;

# Freezer [individual]
has capacity: 200 *liters*;

# Turbine [individual]
has efficiency: 85 *percent*;
```
````

### Complex Graph Test
````
```nodeBook
# **Large** Solar System [System]
has age: 4600000000 *years*;
<contains> Earth;
<contains> Mars;
<orbits> Sun;

## Current
has planets: 8;
<is studied by> NASA;

## Historical
has planets: 9;
<included> Pluto;

# Earth [Planet]
has diameter: 12742 *km*;
has population: 8000000000;
<has satellite> Moon;

# Mars [Planet]
has diameter: 6779 *km*;
has atmosphere: thin *CO2*;
<is explored by> Rover;

# Sun [Star]
has temperature: 5778 *Kelvin*;
has type: G2V;

# Moon [Satellite]
has diameter: 3474 *km*;

# Rover [individual]
has name: Perseverance;

# NASA [Organization]
has founded: 1958;

# Pluto [DwarfPlanet]
has diameter: 2377 *km*;
```
````

## File Structure

```
nodebook/
  nodebook-app-extension.ts        # AppExtension: registers renderer, cheatsheet, autocompletion
  nodebook-markdown-extension.ts   # CodeBlockMarkdownRendererExtension for 'nodeBook' language
  nodebook-graph.tsx               # Main React component with Cytoscape.js rendering
  nodebook-graph.module.scss       # Scoped styles
  cytoscape-plugins.d.ts           # Type declarations for cytoscape-dagre and cytoscape-svg
  nodebook-parser/
    types.ts                       # TypeScript interfaces (CnlNode, Morph, CnlEdge, etc.)
    schemas.ts                     # Embedded schema data for validation
    cnl-parser.ts                  # CNL text parser -> CnlOperation[]
    operations-to-graph.ts         # CnlOperation[] -> CnlGraphData (3-pass processing)
    morph-registry.ts              # O(1) morph lookup registry
    validate-operations.ts         # Advisory schema validation
```
