/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export interface Document {
  id: string
  name: string
  content: string
  updatedAt: number
  readonly?: boolean
}

const STORAGE_KEY = 'nodebook-documents'
const ACTIVE_KEY = 'nodebook-active-doc'
const SEEDS_LOADED_KEY = 'nodebook-seeds-loaded'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadDocuments(): Document[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveDocuments(docs: Document[]): void {
  // Only persist user documents, not readonly seed docs
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs.filter((d) => !d.readonly)))
}

async function loadSeedDocuments(): Promise<Document[]> {
  try {
    const res = await fetch('/seed/index.json')
    const filenames: string[] = await res.json()
    const docs: Document[] = await Promise.all(
      filenames.map(async (filename) => {
        const content = await (await fetch(`/seed/${filename}`)).text()
        const name = filename.replace(/\.md$/, '')
        return {
          id: `seed-${name}`,
          name,
          content,
          updatedAt: 0,
          readonly: true
        }
      })
    )
    return docs
  } catch {
    return []
  }
}

export function useDocumentStore() {
  const [documents, setDocuments] = useState<Document[]>(() => loadDocuments())
  const [activeDocId, setActiveDocId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY) ?? documents[0]?.id ?? null
  )
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load seed documents on first launch
  useEffect(() => {
    if (localStorage.getItem(SEEDS_LOADED_KEY)) return
    loadSeedDocuments().then((seedDocs) => {
      if (seedDocs.length > 0) {
        setDocuments((prev) => [...prev, ...seedDocs])
        localStorage.setItem(SEEDS_LOADED_KEY, '1')
      }
    })
  }, [])

  // Persist documents on change (debounced)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveDocuments(documents), 300)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [documents])

  // Persist active doc ID
  useEffect(() => {
    if (activeDocId) localStorage.setItem(ACTIVE_KEY, activeDocId)
  }, [activeDocId])

  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null

  const createDocument = useCallback((name: string, content: string) => {
    const doc: Document = { id: generateId(), name, content, updatedAt: Date.now() }
    setDocuments((prev) => [doc, ...prev])
    setActiveDocId(doc.id)
    return doc.id
  }, [])

  const updateContent = useCallback((id: string, content: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id && !d.readonly ? { ...d, content, updatedAt: Date.now() } : d))
    )
  }, [])

  const renameDocument = useCallback((id: string, name: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id && !d.readonly ? { ...d, name, updatedAt: Date.now() } : d))
    )
  }, [])

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      const doc = prev.find((d) => d.id === id)
      if (doc?.readonly) return prev
      const next = prev.filter((d) => d.id !== id)
      return next
    })
    setActiveDocId((current) => {
      if (current === id) {
        const remaining = documents.filter((d) => d.id !== id)
        return remaining[0]?.id ?? null
      }
      return current
    })
  }, [documents])

  const setActiveDoc = useCallback((id: string) => {
    setActiveDocId(id)
  }, [])

  return {
    documents,
    activeDocId,
    activeDoc,
    createDocument,
    updateContent,
    renameDocument,
    deleteDocument,
    setActiveDoc
  }
}
