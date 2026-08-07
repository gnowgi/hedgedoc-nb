/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from './components/header'
import { Editor } from './components/editor'
import { GraphPanel } from './components/graph-panel'
import { Sidebar } from './components/sidebar'
import { useDocumentStore } from './hooks/use-document-store'
import { useSwipe } from './hooks/use-swipe'
import styles from './app.module.scss'

const DEFAULT_CNL = `# My First Knowledge Graph

This is a **nodeBook** document. Write markdown freely, and use \`\`\`nodeBook code fences to create knowledge graphs.

\`\`\`nodeBook
# Socrates [individual]
<member_of> Greek;

# Greek [class]
<is_a> Human;

# Human [class]
<is_a> Mortal;

# Mortal [class]

who <is_a> Mortal;
\`\`\`
`

export const App: React.FC = () => {
  const {
    documents,
    activeDocId,
    activeDoc,
    createDocument,
    updateContent,
    renameDocument,
    deleteDocument,
    setActiveDoc
  } = useDocumentStore()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [layout, setLayout] = useState<'split' | 'editor' | 'graph'>('split')
  const [mobilePanel, setMobilePanel] = useState<'editor' | 'graph'>('editor')
  const [splitRatio, setSplitRatio] = useState(0.45)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const swipeHandlers = useSwipe(
    useCallback(() => setMobilePanel('graph'), []),
    useCallback(() => setMobilePanel('editor'), [])
  )

  // Create a default document if none exist
  useEffect(() => {
    if (documents.length === 0) {
      createDocument('Untitled', DEFAULT_CNL)
    }
  }, [documents.length, createDocument])

  const code = activeDoc?.content ?? ''

  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (activeDocId) {
        updateContent(activeDocId, newCode)
      }
    },
    [activeDocId, updateContent]
  )

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const isVertical = rect.width < 768
      const ratio = isVertical
        ? (e.clientY - rect.top) / rect.height
        : (e.clientX - rect.left) / rect.width
      setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)))
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  const handleFileOpen = useCallback(async () => {
    try {
      if ('showOpenFilePicker' in window) {
        const [fileHandle] = await (window as unknown as { showOpenFilePicker: (opts: unknown) => Promise<Array<{ getFile: () => Promise<File> }>> }).showOpenFilePicker({
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.cnl.md'] } }]
        })
        const file = await fileHandle.getFile()
        const text = await file.text()
        const name = file.name.replace(/\.cnl\.md$|\.md$/, '')
        createDocument(name, text)
      } else {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.md,.txt'
        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) return
          const text = await file.text()
          const name = file.name.replace(/\.cnl\.md$|\.md$/, '')
          createDocument(name, text)
        }
        input.click()
      }
    } catch {
      // User cancelled
    }
  }, [createDocument])

  const handleFileSave = useCallback(async () => {
    if (!activeDoc) return
    const blob = new Blob([activeDoc.content], { type: 'text/markdown' })
    const filename = `${activeDoc.name}.cnl.md`

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }> }).showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.cnl.md'] } }]
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // User cancelled
    }
  }, [activeDoc])

  return (
    <div className={styles.app}>
      <Header
        layout={layout}
        onLayoutChange={setLayout}
        onSidebarToggle={() => setSidebarOpen((o) => !o)}
        onFileOpen={handleFileOpen}
        onFileSave={handleFileSave}
        onNewFile={() => createDocument('Untitled', DEFAULT_CNL)}
        docName={activeDoc?.name ?? ''}
        onRename={(name) => activeDocId && renameDocument(activeDocId, name)}
        readOnly={activeDoc?.readonly}
      />
      <div className={styles.main}>
        <Sidebar
          open={sidebarOpen}
          documents={documents}
          activeDocId={activeDocId}
          onSelect={setActiveDoc}
          onDelete={deleteDocument}
          onClose={() => setSidebarOpen(false)}
        />
        <div className={styles.content} ref={containerRef} {...(isMobile ? swipeHandlers : {})}>
          {isMobile ? (
            <>
              <div className={styles.editorPane} style={{ display: mobilePanel === 'editor' ? 'flex' : 'none', flex: 1 }}>
                <Editor code={code} onChange={handleCodeChange} readOnly={activeDoc?.readonly} />
              </div>
              <div className={styles.graphPane} style={{ display: mobilePanel === 'graph' ? 'flex' : 'none', flex: 1 }}>
                <GraphPanel code={code} />
              </div>
              <div className={styles.mobilePanelIndicator}>
                <button
                  className={`${styles.panelDot} ${mobilePanel === 'editor' ? styles.activeDot : ''}`}
                  onClick={() => setMobilePanel('editor')}>
                  Editor
                </button>
                <button
                  className={`${styles.panelDot} ${mobilePanel === 'graph' ? styles.activeDot : ''}`}
                  onClick={() => setMobilePanel('graph')}>
                  Preview
                </button>
              </div>
            </>
          ) : (
            <>
              {(layout === 'split' || layout === 'editor') && (
                <div
                  className={styles.editorPane}
                  style={layout === 'split' ? { flex: `0 0 ${splitRatio * 100}%` } : { flex: 1 }}>
                  <Editor code={code} onChange={handleCodeChange} readOnly={activeDoc?.readonly} />
                </div>
              )}
              {layout === 'split' && (
                <div className={styles.divider} onMouseDown={handleMouseDown} />
              )}
              {(layout === 'split' || layout === 'graph') && (
                <div
                  className={styles.graphPane}
                  style={layout === 'split' ? { flex: 1 } : { flex: 1 }}>
                  <GraphPanel code={code} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
