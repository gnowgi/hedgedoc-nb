<!--
SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)

SPDX-License-Identifier: CC-BY-SA-4.0
-->

# @nodebook/dom

Framework-agnostic DOM renderer for [nodeBook](https://nodebook.co.in) CNL knowledge graphs. No React, no build-time CSS — just a function that parses CNL (via [`@nodebook/core`](https://www.npmjs.com/package/@nodebook/core)) and renders an interactive [Cytoscape.js](https://js.cytoscape.org/) graph, plus a `<nodebook-graph>` web component.

Use this from any editor or site that is not React-based (Obsidian plugins, plain pages, server-rendered apps). React apps should prefer [`@nodebook/react`](https://www.npmjs.com/package/@nodebook/react), the full-featured UI.

## Install

```bash
npm install @nodebook/dom
```

## Render a graph

```ts
import { renderNodeBook } from '@nodebook/dom'

const handle = renderNodeBook(document.querySelector('#graph'), `
# Water [Substance]
boiling_point: 100 *C*;
<part of> Ocean;

## frozen
    state: solid;
`, { theme: 'dark', layout: 'breadthfirst' })

handle.setMorph('water', 'frozen')  // switch a node's polymorphic state
handle.setTheme('light')
handle.relayout('cose')
handle.warnings                     // advisory schema warnings
handle.destroy()
```

The handle exposes the live Cytoscape instance as `handle.cy` for anything beyond the built-in API.

## Built-in UI

Rendering into a container also attaches (both on by default):

- **Toolbar** (top right): fit-to-view, layout picker, PNG export. Disable with `toolbar: false`.
- **Inspector** (opens on node click): the node's name, role, description, adjective/quantifier, its visible attributes and relations, and — when the node has morphs — a **morph switcher** whose buttons re-render the graph in place. Disable with `inspector: false`.

Nodes are draggable and the canvas pans/zooms by default (Cytoscape behavior). The UI follows the `theme` option and `handle.setTheme()`.

## Inferred relations

Derived facts — transitive closure over `is_a`, inverse/symmetric relations, membership inheritance — are computed with `@nodebook/core`'s `TransitiveClosureEngine` and drawn as dashed purple edges, added after layout so node positions reflect explicit structure only. The inspector lists them in an *Inferred* section; hovering shows the inference rule and proof path. Recomputed on every morph switch. Disable with `inference: false`; read programmatically via `handle.getInferredEdges()`.

## Hydrate markdown-it output

Together with [`@nodebook/markdown-it`](https://www.npmjs.com/package/@nodebook/markdown-it):

```ts
import { hydrateNodeBookBlocks } from '@nodebook/dom'

container.innerHTML = md.render(markdownText)   // md uses nodeBookMarkdownItPlugin
hydrateNodeBookBlocks(container)                // renders every placeholder once
```

## Web component

```ts
import { defineNodeBookElement } from '@nodebook/dom'
defineNodeBookElement()  // registers <nodebook-graph>
```

```html
<nodebook-graph theme="dark" layout="cose"
  code="# Sun [Star]&#10;<orbited by> Earth;"></nodebook-graph>
```

CNL can also go in the element's content, but note that raw `<relation>` syntax inside HTML is parsed as tags — escape it as `&lt;relation&gt;` (text content decodes entities), or use the `code` attribute as above.

## Containment view

The **Nest** toolbar button (or `containment: true` / `handle.setContainment(true)`) switches to nodeBook's containment view: nodes nest inside compound parent boxes along `is_a` / `member_of` / `instance_of` — including *inferred* containment, so a deep taxonomy nests fully — and those relations' arrows disappear since the nesting expresses them. Other relations keep their arrows; attribute leaves sit inside their owner's box. The layout auto-switches to the compound-aware `cose`.

## Process representation & token simulation

When a graph contains transition-role nodes (`[Transition]`, `[Transaction]`, `[Function]`) with `has prior_state` / `has post_state` arcs (the parser's `credit`/`debit` and flow synonyms normalize to these), the renderer runs a token game:

- Prior places start with tokens (max incoming arc weight), shown as dots (●●●) or a count in the node label.
- Enabled transitions get a green highlight — **click one to fire it**: tokens are consumed from prior places and produced into post places by arc weight.
- A **Reset** toolbar button restores the initial marking.
- Programmatic API: `handle.getMarking()`, `handle.fireTransition(id)`, `handle.resetSimulation()`.

This models reaction networks, metabolic pathways, ecological flows — any process where states transform. (HedgeDoc's accounting mode and Function evaluation are not included here.)

## Notes for bundlers

`@nodebook/core` includes the optional tau-prolog inference engine, whose dependency chain references Node builtins (`fs`, `os`, `crypto`, …) behind runtime guards. Browser bundlers should stub or externalize those (esbuild: `--external:fs --external:path --external:os --external:crypto --external:child_process`; Vite/webpack handle this via their usual node-polyfill settings).

## License

AGPL-3.0-only.
