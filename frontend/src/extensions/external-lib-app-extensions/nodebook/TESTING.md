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

## Automated Unit Tests

All unit tests are pure-function tests (no mocking required) using the existing Jest + jsdom setup.

```bash
# Run all nodeBook unit tests
yarn workspace @hedgedoc/frontend jest --testPathPattern='nodebook.*spec'

# Run with coverage
yarn workspace @hedgedoc/frontend jest --testPathPattern='nodebook.*spec' --coverage
```

### Test Files (7 files, 247 tests)

| File                                              | Tests | Covers                                                                                                                                                                                    |
| ------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodebook-parser/cnl-parser.spec.ts`              | ~120  | Node parsing, singularization/cleanName, attributes, relations, mindmap blocks, morphs, descriptions, graph directives, Wh-word queries, role synonyms                                    |
| `nodebook-parser/operations-to-graph.spec.ts`     | ~30   | 3-pass pipeline (nodes→morphs→relations/attributes), morph linking, abbreviations, updateNode, setCurrency, addExpression, full end-to-end                                                |
| `nodebook-parser/validate-operations.spec.ts`     | 15    | Known/unknown node types, attribute types, relation types, alias matching, is_a subsumption error, surface form consolidation, custom schemas                                             |
| `nodebook-parser/morph-registry.spec.ts`          | 17    | CRUD, node morphs, relation/attribute lookups, reverse lookups, filterRelationsForMorph, filterAttributesForMorph, deduplication, clear, getStats                                         |
| `nodebook-parser/schema-parser.spec.ts`           | 21    | All 5 type prefixes (nodeType, relationType, attributeType, transitionType, functionType), unknown prefix, missing fields, comments/blanks, quoted fields, pipe lists, mergeSchemaResults |
| `nodebook-parser/inference-engine.spec.ts`        | 13    | TransitiveClosureEngine: simple/longer chains, cycle prevention, self-loop skip, explicit edge dedup, member_of/instance_of inheritance, proof paths, alias resolution                    |
| `nodebook-sidebar/compute-nodebook-score.spec.ts` | 24    | All 9 scoring categories, threshold levels, max=100, zero-node division safety                                                                                                            |

### Requirements Specification (from tests)

The unit tests serve as a living specification. Key behaviors guaranteed:

**CNL Parser (`cnl-parser.ts`)**

- `# Name` creates a node with deterministic ID via `cleanName` (lowercase, singularized, special chars removed)
- `# Name [Type]` assigns the type; untyped nodes default to `individual`
- `# **adj** Name [Type]` captures adjective; `# *quant* Name` captures quantifier
- Role synonyms normalize: class/concept/type/universal/common noun → `class`; individual/particular/token/member/proper noun → `individual`
- Singularization: humans→human, cities→city, wolves→wolf, dishes→dish, boxes→box; invariants preserved (species, sheep); -ss/-us/-is endings preserved (glass, status, analysis)
- `attr: value;` creates addAttribute; `has attr: value;` equivalent; `*unit*`, `{abbr}`, `++adverb++`, `[modality]` modifiers extracted
- `<rel> Target;` creates addRelation + implicit target node; `<rel> N Target;` extracts weight N; aliases mapped (debit→has post_state, credit→has prior_state)
- Accounting relations (debit/credit) give target nodes the `Account` role
- `## morph_name` under a `#` heading creates addMorph; morph-scoped attrs/relations tagged with morphId
- `# Root <rel>\n- A\n- B` creates mindmap block with hierarchy from indentation
- `currency: USD;` → setCurrency; `expression: a + b;` → addExpression
- ` ```description ... ``` ` → updateNode; ` ```graph-description ... ``` ` → updateGraphDescription
- Wh-word queries (`<rel> what;`, `who <rel> Target;`, `attr: what;`, `what: value;`, `<how> Target;`) generate addQuery with Prolog goalStrings
- Empty/falsy input returns empty array

**Operations-to-Graph (`operations-to-graph.ts`)**

- Pass 1: Creates nodes from addNode ops; duplicate IDs skipped (first wins); each node gets auto basic morph
- Pass 2: Appends addMorph to existing nodes; skips if node missing
- Pass 3: Links relations/attributes to basic morph by default, or specific morph when morphId set; populates abbreviations map; handles updateNode, updateGraphDescription, setCurrency, addExpression, addQuery

**Validate Operations (`validate-operations.ts`)**

- Warns on unknown node types, attribute types, and relation types
- Accepts relation aliases (e.g., "is a" for "is_a")
- Warns when individuals use `<is_a>` (should use `<member_of>` or `<instance_of>`)
- Warns when multiple display names collapse to same node ID
- Accepts custom schemas; falls back to defaults when none provided

**Morph Registry (`morph-registry.ts`)**

- Stores morphs with relation/attribute ID lists; copies arrays for mutation safety
- Forward lookups: getMorph, getNodeMorphs, getMorphRelations, getMorphAttributes
- Reverse lookups: getRelationMorphs, getAttributeMorphs
- filterRelationsForMorph/filterAttributesForMorph accept single ID or array, deduplicate results
- clear() removes all data; getStats() reports counts

**Schema Parser (`schema-parser.ts`)**

- Parses 5 type prefixes: nodeType, relationType, attributeType, transitionType, functionType
- Errors on unknown prefixes and missing required fields
- Skips comments (`#`) and blank lines; respects quoted fields with commas; parses pipe-separated lists
- mergeSchemaResults deduplicates by name (last wins) and accumulates errors

**Inference Engine (`inference-engine.ts`)**

- TransitiveClosureEngine: BFS per transitive relation; infers A→C from A→B→C
- Handles longer chains (A→B→C→D produces a→c, a→d, b→d)
- Prevents infinite loops on cycles; skips self-loops; never duplicates explicit edges
- Membership inheritance: member_of(X,A) + is_a(A,B) → member_of(X,B); same for instance_of
- Proof paths contain ordered edge IDs; aliases (e.g., "is a") resolved to canonical names

**Scoring (`compute-nodebook-score.ts`)**

- 9 categories totaling max 100 points: coverage (20), connectivity (15), typing (15), inference (10), schema (10), processes (10), computation (10), queries (5), morphs (5)
- Each category uses threshold-based scoring (not linear)
- Safe division: 0 nodes produces 0 connectivity/typing (no NaN)

## File Structure

```
nodebook/
  nodebook-app-extension.ts        # AppExtension: registers renderer, cheatsheet, autocompletion
  nodebook-markdown-extension.ts   # CodeBlockMarkdownRendererExtension for 'nodeBook' language
  nodebook-graph.tsx               # Main React component with Cytoscape.js rendering
  nodebook-graph.module.scss       # Scoped styles
  nodebook-codemirror-language.ts  # CNL syntax highlighting for CodeMirror 6
  nodebook-completions.ts          # Autocompletion provider
  nodebook-hljs-language.ts        # Highlight.js language definition
  nodebook-schema-display.tsx      # Schema block renderer
  cytoscape-plugins.d.ts           # Type declarations for cytoscape-dagre and cytoscape-svg
  tau-prolog.d.ts                  # Type declarations for tau-prolog
  TESTING.md                       # This file
  demo/                            # Sample CNL documents
  nodebook-parser/
    types.ts                       # TypeScript interfaces (CnlNode, Morph, CnlEdge, etc.)
    schemas.ts                     # Default schema data (nodeTypes, relationTypes, attributeTypes, etc.)
    schema-store.ts                # Runtime schema store (user schemas merged with defaults)
    schema-parser.ts               # Parses nodeBook-schema code blocks
    cnl-parser.ts                  # CNL text → CnlOperation[]
    operations-to-graph.ts         # CnlOperation[] → CnlGraphData (3-pass processing)
    morph-registry.ts              # O(1) morph lookup registry
    validate-operations.ts         # Advisory schema validation
    inference-engine.ts            # TransitiveClosureEngine + PrologInferenceEngine
    prolog-bridge.ts               # Tau Prolog integration (lazy-loaded)
    nodebook-evaluator.ts          # Math expression evaluator (lazy-loaded math.js)
    equation-to-pn.ts              # Expression → Petri net operations
    cnl-parser.spec.ts             # Unit tests: parser
    operations-to-graph.spec.ts    # Unit tests: graph builder
    validate-operations.spec.ts    # Unit tests: validation
    morph-registry.spec.ts         # Unit tests: morph registry
    schema-parser.spec.ts          # Unit tests: schema parser
    inference-engine.spec.ts       # Unit tests: inference engine
  nodebook-sidebar/
    compute-nodebook-score.ts      # Scoring rubric (9 categories, max 100)
    use-nodebook-stats.ts          # React hook: aggregate stats across blocks
    score-ring.tsx                 # Score visualization component
    compute-nodebook-score.spec.ts # Unit tests: scoring
```
