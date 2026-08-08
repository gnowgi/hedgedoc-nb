<!--
SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)

SPDX-License-Identifier: CC-BY-SA-4.0
-->

# obsidian-nodebook

An [Obsidian](https://obsidian.md) plugin that renders ` ```nodeBook ` code fences as interactive CNL knowledge graphs — the Obsidian twin of [logseq-nodebook](https://github.com/gnowgi/logseq-nodebook), built on the same [`@nodebook/dom`](https://www.npmjs.com/package/@nodebook/dom) renderer.

````
```nodeBook
# Water [Substance]
boiling_point: 100 *C*;
<part of> Ocean;

## frozen
    state: solid;
```
````

Everything `@nodebook/dom` provides works here: draggable concept maps with inspector panel and morph switching, inferred relations with proof tooltips, containment (Nest) view, and Petri-net process notation with click-to-fire token simulation. The theme follows Obsidian's light/dark setting live.

## Install (manual / development)

```bash
yarn install
yarn workspace obsidian-nodebook build
```

Then copy the plugin into a vault and enable it:

```bash
mkdir -p "<YourVault>/.obsidian/plugins/nodebook"
cp apps/obsidian-nodebook/dist/main.js apps/obsidian-nodebook/dist/manifest.json "<YourVault>/.obsidian/plugins/nodebook/"
```

Obsidian → Settings → Community plugins → enable **nodeBook** (turn on community plugins if this vault hasn't yet).

## How it works

`registerMarkdownCodeBlockProcessor('nodeBook', …)` hands each fence's source to `renderNodeBook`; a `MarkdownRenderChild` ties the Cytoscape instance's lifetime to the block so re-renders and closed panes clean up properly. Editing needs no special affordance: in Live Preview, click beside the block to flip it back to source.

## Learning the CNL

The public [nodeBook tutorial](https://nodebook.co.in/n/tutorial) walks through the whole language in 17 guided lessons — nodes, relations, attributes, morphs, inference, and process simulation — with live examples you can copy into any fence.

## License

AGPL-3.0-only.
