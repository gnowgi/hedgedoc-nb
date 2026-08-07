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

## Notes for bundlers

`@nodebook/core` includes the optional tau-prolog inference engine, whose dependency chain references Node builtins (`fs`, `os`, `crypto`, …) behind runtime guards. Browser bundlers should stub or externalize those (esbuild: `--external:fs --external:path --external:os --external:crypto --external:child_process`; Vite/webpack handle this via their usual node-polyfill settings).

## License

AGPL-3.0-only.
