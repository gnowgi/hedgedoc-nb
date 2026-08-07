/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import '@logseq/libs'
import type { NodeBookHandle, RenderNodeBookOptions } from '@nodebook/dom'

// The fenced-code renderer is a React component executed with the HOST app's
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

interface NodeBookDomApi {
  renderNodeBook: (el: HTMLElement, code: string, options?: RenderNodeBookOptions) => NodeBookHandle
}

let vendorLoading: Promise<void> | null = null

function ensureVendorLoaded(): Promise<void> {
  const host = logseq.Experiments.ensureHostScope() as { NodeBookDom?: NodeBookDomApi }
  if (host.NodeBookDom) return Promise.resolve()
  vendorLoading ??= logseq.Experiments.loadScripts('./vendors/nodebook-dom.js').then(() => undefined)
  return vendorLoading
}

export function makeNodeBookRenderer(): (props: { content: string }) => unknown {
  return function NodeBookFencedCode({ content }: { content: string }) {
    const React = logseq.Experiments.React as HostReact
    const containerRef = React.useRef<HTMLElement | null>(null)
    const handleRef = React.useRef<NodeBookHandle | null>(null)
    const [ready, setReady] = React.useState(false)
    const [theme, setTheme] = React.useState<'light' | 'dark'>('light')
    const [failure, setFailure] = React.useState<string | null>(null)

    React.useEffect(() => {
      void logseq.App.getUserConfigs().then((configs) => {
        setTheme(configs.preferredThemeMode === 'dark' ? 'dark' : 'light')
      })
      return logseq.App.onThemeModeChanged(({ mode }) => {
        setTheme(mode === 'dark' ? 'dark' : 'light')
      })
    }, [])

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

    React.useEffect(() => {
      if (!ready || !containerRef.current) return
      const host = logseq.Experiments.ensureHostScope() as { NodeBookDom?: NodeBookDomApi }
      if (!host.NodeBookDom) {
        setFailure('nodeBook: renderer not available in host scope')
        return
      }
      handleRef.current?.destroy()
      containerRef.current.textContent = ''
      try {
        handleRef.current = host.NodeBookDom.renderNodeBook(containerRef.current, content, { theme })
      } catch (error) {
        setFailure(`nodeBook: render failed (${String(error)})`)
        return
      }
      return () => {
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

    return React.createElement('div', {
      ref: containerRef,
      className: 'nodebook-fenced-graph',
      style: {
        width: '100%',
        height: '420px',
        borderRadius: '8px',
        overflow: 'hidden'
      }
    }, ready ? null : 'nodeBook: loading…')
  }
}
