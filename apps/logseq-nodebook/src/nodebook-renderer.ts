/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import '@logseq/libs'
import type { NodeBookHandle, NodeBookSchemaHandle, RenderNodeBookOptions, RenderSchemaOptions } from '@nodebook/dom'

// The fenced-code renderers are React components executed with the HOST app's
// React (logseq.Experiments.React) — the plugin bundles no React of its own.
// Cytoscape and @nodebook/dom live in the host page too: they are loaded once
// via loadScripts (see vendor-entry.ts) and reached through ensureHostScope(),
// so all DOM they touch is host-realm. Everything here therefore avoids JSX
// and uses React.createElement directly.

type HostReact = {
  createElement: (...args: unknown[]) => unknown
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (next: T) => void]
  useEffect: (fn: () => void | (() => void), deps?: unknown[]) => void
}

export interface NodeBookDomApi {
  renderNodeBook: (el: HTMLElement, code: string, options?: RenderNodeBookOptions) => NodeBookHandle
  renderNodeBookSchema: (el: HTMLElement, code: string, options?: RenderSchemaOptions) => NodeBookSchemaHandle
  registerSchemaSource: (id: string, text: string) => void
  unregisterSchemaSource: (id: string) => void
  factorySchemasText: () => string
}

let vendorLoading: Promise<void> | null = null

export function hostNodeBookDom(): NodeBookDomApi | null {
  const host = logseq.Experiments.ensureHostScope() as { NodeBookDom?: NodeBookDomApi }
  return host.NodeBookDom ?? null
}

export function ensureVendorLoaded(): Promise<void> {
  if (hostNodeBookDom()) return Promise.resolve()
  vendorLoading ??= logseq.Experiments.loadScripts('./vendors/nodebook-dom.js').then(() => undefined)
  return vendorLoading
}

function useLogseqTheme(React: HostReact): 'light' | 'dark' {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light')
  React.useEffect(() => {
    void logseq.App.getUserConfigs().then((configs) => {
      setTheme(configs.preferredThemeMode === 'dark' ? 'dark' : 'light')
    })
    return logseq.App.onThemeModeChanged(({ mode }) => {
      setTheme(mode === 'dark' ? 'dark' : 'light')
    })
  }, [])
  return theme
}

// Logseq wraps edit:false fenced renderers in a div whose pointer-down
// handler calls preventDefault + stopPropagation; preventDefault on
// pointerdown suppresses the derived mouse events Cytoscape needs. Halting
// propagation at our container keeps the event from reaching that wrapper.
function useContainerEventIsolation(React: HostReact, containerRef: { current: HTMLElement | null }): void {
  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const stop = (event: Event): void => event.stopPropagation()
    el.addEventListener('pointerdown', stop)
    el.addEventListener('dblclick', stop)
    return () => {
      el.removeEventListener('pointerdown', stop)
      el.removeEventListener('dblclick', stop)
    }
  }, [])
}

function useVendor(React: HostReact, setFailure: (message: string) => void): boolean {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    let cancelled = false
    ensureVendorLoaded()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((error: unknown) => {
        if (!cancelled) setFailure(`nodeBook: failed to load renderer (${String(error)})`)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return ready
}

export function makeNodeBookRenderer(): (props: { content: string }) => unknown {
  return function NodeBookFencedCode({ content }: { content: string }) {
    const React = logseq.Experiments.React as HostReact
    const containerRef = React.useRef<HTMLElement | null>(null)
    const handleRef = React.useRef<NodeBookHandle | null>(null)
    const [failure, setFailure] = React.useState<string | null>(null)
    const theme = useLogseqTheme(React)
    const ready = useVendor(React, setFailure)
    useContainerEventIsolation(React, containerRef)

    React.useEffect(() => {
      if (!ready || !containerRef.current) return
      const host = hostNodeBookDom()
      if (!host) {
        setFailure('nodeBook: renderer not available in host scope')
        return
      }
      let cancelled = false
      const editAction = {
        label: 'Edit',
        title: 'Edit the CNL source',
        onClick: () => {
          const uuid = containerRef.current?.closest('[blockid]')?.getAttribute('blockid')
          if (uuid) {
            void logseq.Editor.editBlock(uuid)
          } else {
            console.error('logseq-nodebook: could not locate enclosing block uuid')
          }
        }
      }
      // Resolve a leading `schemas: [[Page]];` directive before rendering.
      void import('./schema-page').then(async ({ resolveSchemaDirective }) => {
        const { code, schemaTexts } = await resolveSchemaDirective(content)
        if (cancelled || !containerRef.current) return
        handleRef.current?.destroy()
        containerRef.current.textContent = ''
        try {
          handleRef.current = host.renderNodeBook(containerRef.current, code, {
            theme,
            schemaTexts,
            toolbarActions: [editAction]
          })
        } catch (error) {
          setFailure(`nodeBook: render failed (${String(error)})`)
        }
      })
      return () => {
        cancelled = true
        handleRef.current?.destroy()
        handleRef.current = null
      }
    }, [ready, content])

    React.useEffect(() => {
      handleRef.current?.setTheme(theme)
    }, [theme])

    if (failure) {
      return React.createElement('div', { style: { color: '#c0392b', padding: '8px' } }, failure)
    }

    return React.createElement(
      'div',
      {
        ref: containerRef,
        className: 'nodebook-fenced-graph',
        style: { width: '100%', height: '420px', borderRadius: '8px', overflow: 'hidden' }
      },
      ready ? null : 'nodeBook: loading…'
    )
  }
}

let schemaBlockSeq = 0

/** Renderer for ```nodeBook-schema fences: summary panel + store contribution. */
export function makeSchemaRenderer(): (props: { content: string }) => unknown {
  return function NodeBookSchemaFencedCode({ content }: { content: string }) {
    const React = logseq.Experiments.React as HostReact
    const containerRef = React.useRef<HTMLElement | null>(null)
    const schemaRef = React.useRef<NodeBookSchemaHandle | null>(null)
    const [failure, setFailure] = React.useState<string | null>(null)
    const theme = useLogseqTheme(React)
    const ready = useVendor(React, setFailure)
    useContainerEventIsolation(React, containerRef)

    React.useEffect(() => {
      if (!ready || !containerRef.current) return
      const host = hostNodeBookDom()
      if (!host) return
      schemaRef.current?.destroy()
      try {
        schemaRef.current = host.renderNodeBookSchema(containerRef.current, content, {
          theme,
          sourceId: `logseq:block-${++schemaBlockSeq}`
        })
      } catch (error) {
        setFailure(`nodeBook schema: render failed (${String(error)})`)
      }
      return () => {
        schemaRef.current?.destroy()
        schemaRef.current = null
      }
    }, [ready, content])

    React.useEffect(() => {
      if (containerRef.current) containerRef.current.dataset.nbTheme = theme
    }, [theme])

    if (failure) {
      return React.createElement('div', { style: { color: '#c0392b', padding: '8px' } }, failure)
    }
    return React.createElement('div', { ref: containerRef, style: { width: '100%' } }, ready ? null : 'nodeBook schema: loading…')
  }
}
