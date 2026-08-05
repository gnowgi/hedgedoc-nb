<!--
SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)

SPDX-License-Identifier: CC-BY-SA-4.0
-->

# @nodebook/core

The nodeBook engine: a parser and graph toolkit for **Controlled Natural Language (CNL)** knowledge graphs. Pure TypeScript with no DOM or framework dependencies — runs in the browser, Node.js, and worker environments.

nodeBook lets you write knowledge as readable text and get a typed, queryable graph back:

```
# Water [Substance]
boiling_point: 100 *C*;
<part of> Ocean;

## frozen
    state: solid;
```

## Install

```bash
npm install @nodebook/core
```

## Quick start

```ts
import { getOperationsFromCnl, operationsToGraph, validateOperations } from '@nodebook/core'

const cnl = `# Water [Substance]
boiling_point: 100 *C*;
<part of> Ocean;`

const operations = getOperationsFromCnl(cnl)
const errors = validateOperations(operations)
const graph = operationsToGraph(operations)

console.log(graph.nodes, graph.edges, graph.attributes)
```

## What's inside

| Area | Exports |
|------|---------|
| Parsing | `getOperationsFromCnl` — CNL text → operations |
| Graph | `operationsToGraph` — operations → nodes/edges/attributes |
| Validation | `validateOperations` |
| Morphs | `MorphRegistry` — polymorphic node states |
| Inference | `TransitiveClosureEngine`, `PrologInferenceEngine` (tau-prolog), `queryInferredRelations` |
| Inheritance | `getInheritedAttributes` — attribute inheritance along `is_a` |
| Schemas | `parseSchemaBlock`, `mergeSchemaResults`, schema store (`setUserSchemas`, `getMergedSchemas`, …) |
| Math | `evaluateExpression`, `parseExpression` (mathjs), `expressionToPetriNetOps` |
| Text analysis | `analyzeWithFallback`, `analyzeWithKeywords`, span resolution (compromise NLP) |

The full CNL syntax is documented in the [nodeBook CNL specification](https://github.com/gnowgi/hedgedoc-nb/blob/main/docs/nodebook-cnl-spec.md).

## Related packages

- [`@nodebook/react`](https://github.com/gnowgi/hedgedoc-nb/tree/main/packages/nodebook-react) — React components: Cytoscape graph view, schema display, CodeMirror language support.

## License

AGPL-3.0-only. See the repository's `LICENSES/` directory.
