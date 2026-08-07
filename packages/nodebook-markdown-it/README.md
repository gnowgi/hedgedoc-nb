<!--
SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)

SPDX-License-Identifier: CC-BY-SA-4.0
-->

# @nodebook/markdown-it

A tiny, zero-dependency [markdown-it](https://github.com/markdown-it/markdown-it) plugin that turns ` ```nodeBook ` code fences into hydratable placeholders:

```html
<div class="nodebook-block" data-nodebook="# Water [Substance]&#10;&lt;part of&gt; Ocean;"></div>
```

Pair it with [`@nodebook/dom`](https://www.npmjs.com/package/@nodebook/dom) to turn the placeholders into interactive knowledge graphs — or consume the `data-nodebook` attribute with your own renderer.

## Install

```bash
npm install @nodebook/markdown-it
```

`markdown-it` ≥ 12 is a peer dependency.

## Usage

```ts
import MarkdownIt from 'markdown-it'
import { nodeBookMarkdownItPlugin } from '@nodebook/markdown-it'
import { hydrateNodeBookBlocks } from '@nodebook/dom'

const md = new MarkdownIt().use(nodeBookMarkdownItPlugin)
container.innerHTML = md.render(markdownText)
hydrateNodeBookBlocks(container)
```

## Options

```ts
md.use(nodeBookMarkdownItPlugin, {
  languages: ['nodebook', 'cnl'],   // fence infos, case-insensitive (default ['nodebook'])
  className: 'nodebook-block',      // class on the placeholder
  dataAttribute: 'data-nodebook',   // attribute carrying the CNL source
  tagName: 'div'                    // placeholder element
})
```

Other fences (` ```js ` etc.) are passed through to whatever fence renderer was active before the plugin, so it composes with syntax highlighters.

## License

AGPL-3.0-only.
