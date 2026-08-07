<!--
SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)

SPDX-License-Identifier: CC-BY-SA-4.0
-->

# logseq-nodebook

A [Logseq](https://logseq.com) plugin that renders ` ```nodeBook ` code fences as interactive CNL knowledge graphs — the reference integration for the [`@nodebook/dom`](https://www.npmjs.com/package/@nodebook/dom) package.

Write this in any Logseq block:

````
```nodeBook
# Water [Substance]
boiling_point: 100 *C*;
<part of> Ocean;

## frozen
    state: solid;
```
````

and the fence renders as a pannable, zoomable Cytoscape graph that follows Logseq's light/dark theme.

## How it works

- `logseq.Experiments.registerFencedCodeRenderer('nodeBook', …)` registers a renderer component for the fence (the same experimental API used by [logseq-fenced-code-plus](https://github.com/xyhp915/logseq-fenced-code-plus)).
- The component uses the **host app's React** (`logseq.Experiments.React`) — the plugin bundles no React.
- `@nodebook/dom` + Cytoscape are loaded **into the host page once** via `logseq.Experiments.loadScripts('./vendors/nodebook-dom.js')`, so all rendering happens in the host realm (`ensureHostScope().NodeBookDom.renderNodeBook(...)`).

## Install (from this repository)

```bash
yarn install
yarn workspace logseq-nodebook build
```

Then in Logseq:

1. **Settings → Advanced → Developer mode** — enable it.
2. **⋯ menu → Plugins → Load unpacked plugin** — pick the `apps/logseq-nodebook` directory.
3. Create a block with a ` ```nodeBook ` fence (type `<` as part of relation syntax normally — inside a code fence Logseq leaves it alone).

To iterate on the plugin: `yarn workspace logseq-nodebook dev` (rebuild on change), then "Reload" the plugin from Logseq's plugin page.

## Files

| File | Runs in | Purpose |
|------|---------|---------|
| `src/main.ts` | plugin sandbox | registers the fenced-code renderer (nodeBook/nodebook/NodeBook casings) |
| `src/nodebook-renderer.ts` | plugin sandbox (host React) | React component: theme tracking, vendor loading, render/destroy lifecycle |
| `src/vendor-entry.ts` | **host page** | exposes `window.NodeBookDom.renderNodeBook` from `@nodebook/dom` |
| `build.mjs` | build | esbuild: `dist/main.js` (sandbox) + `vendors/nodebook-dom.js` (host) |

## License

AGPL-3.0-only.
