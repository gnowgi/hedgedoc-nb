<!--
SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)

SPDX-License-Identifier: CC-BY-SA-4.0
-->

# @nodebook/react

React components for [nodeBook](https://nodebook.co.in) CNL knowledge graphs: an interactive Cytoscape.js graph view with morph switching and transition simulation, a schema display, a text analyzer, and CodeMirror 6 / highlight.js language support for CNL.

Parsing and graph logic live in [`@nodebook/core`](https://github.com/gnowgi/hedgedoc-nb/tree/main/packages/nodebook-core); this package is the UI layer.

## Install

```bash
npm install @nodebook/react @nodebook/core
```

Peer dependencies: `react` / `react-dom` ≥ 18. The CodeMirror integrations additionally require `@codemirror/autocomplete`, `@codemirror/language`, and `@lezer/highlight` (only if you use them).

## Quick start

```tsx
import { NodeBookGraph } from '@nodebook/react'
import '@nodebook/react/styles.css'

const cnl = `# Water [Substance]
boiling_point: 100 *C*;
<part of> Ocean;`

export function MyGraph() {
  return <NodeBookGraph code={cnl} />
}
```

The stylesheet import is required once per app — it carries the compiled styles for all components.

## Exports

| Export | Purpose |
|--------|---------|
| `NodeBookGraph` | Interactive graph rendering of a CNL block (Cytoscape.js, lazy-loaded) |
| `NodeBookSchemaDisplay` | Renders schema definition blocks |
| `NodeBookTextAnalyzer` | Text → CNL analysis UI |
| `cnlLanguageDescription` | CodeMirror 6 language for CNL editing |
| `buildNodeBookInBlockCompletions` | CodeMirror autocompletion source |
| `cnlHljsLanguage` | highlight.js language definition |

## Embedding in other editors

Any React-capable host that lets you handle a fenced code block (` ```nodeBook `) can pass the block's text to `NodeBookGraph`. This is how the HedgeDoc integration and the standalone nodeBook app in this repository work — see `apps/nodebook-app` for a complete example wired to CodeMirror.

## License

AGPL-3.0-only. See the repository's `LICENSES/` directory.
