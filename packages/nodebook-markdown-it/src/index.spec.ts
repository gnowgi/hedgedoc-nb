/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import MarkdownIt from 'markdown-it'
import { nodeBookMarkdownItPlugin } from './index'

function makeMd(options?: Parameters<typeof nodeBookMarkdownItPlugin>[1]): MarkdownIt {
  return new MarkdownIt().use((md) => nodeBookMarkdownItPlugin(md, options))
}

describe('nodeBookMarkdownItPlugin', () => {
  it('replaces a nodeBook fence with a placeholder carrying the source', () => {
    const html = makeMd().render('```nodeBook\n# Water [Substance]\n<part of> Ocean;\n```')
    expect(html).toBe(
      '<div class="nodebook-block" data-nodebook="# Water [Substance]\n&lt;part of&gt; Ocean;\n"></div>\n'
    )
  })

  it('matches the fence language case-insensitively', () => {
    for (const lang of ['nodebook', 'nodeBook', 'NODEBOOK']) {
      const html = makeMd().render('```' + lang + '\n# A\n```')
      expect(html).toContain('data-nodebook="# A')
    }
  })

  it('escapes HTML and attribute-breaking characters in the source', () => {
    const html = makeMd().render('```nodeBook\n# "Quote" <b>&amp;\n```')
    expect(html).toContain('data-nodebook="# &quot;Quote&quot; &lt;b&gt;&amp;amp;')
    expect(html).not.toContain('<b>')
  })

  it('leaves other fences to the default renderer', () => {
    const html = makeMd().render('```js\nconst x = 1\n```')
    expect(html).toContain('<pre>')
    expect(html).toContain('const x = 1')
    expect(html).not.toContain('data-nodebook')
  })

  it('leaves indented code blocks and inline code untouched', () => {
    const html = makeMd().render('    indented code\n\nand `inline`')
    expect(html).toContain('<pre>')
    expect(html).toContain('<code>inline</code>')
  })

  it('honours custom languages, class, tag, and data attribute', () => {
    const md = makeMd({
      languages: ['cnl'],
      className: 'my-cnl',
      dataAttribute: 'data-cnl-source',
      tagName: 'section'
    })
    const html = md.render('```cnl\n# A\n```')
    expect(html).toBe('<section class="my-cnl" data-cnl-source="# A\n"></section>\n')
    expect(md.render('```nodeBook\n# A\n```')).toContain('<pre>')
  })

  it('rejects data attributes that are not data-*', () => {
    expect(() => makeMd({ dataAttribute: 'onclick' })).toThrow(/data-\*/)
  })

  it('rejects invalid tag names', () => {
    expect(() => makeMd({ tagName: 'di v' })).toThrow(/invalid tagName/)
  })

  it('composes with another fence-overriding plugin registered earlier', () => {
    const md = new MarkdownIt()
    const baseFence = md.renderer.rules.fence
    md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
      const token = tokens[idx]
      if ((token.info ?? '').trim() === 'shout') {
        return `<p>SHOUT:${md.utils.escapeHtml(token.content.trim())}</p>\n`
      }
      return baseFence ? baseFence(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts)
    }
    nodeBookMarkdownItPlugin(md)

    expect(md.render('```shout\nhey\n```')).toBe('<p>SHOUT:hey</p>\n')
    expect(md.render('```nodeBook\n# A\n```')).toContain('data-nodebook')
    expect(md.render('```js\nx\n```')).toContain('<pre>')
  })
})
