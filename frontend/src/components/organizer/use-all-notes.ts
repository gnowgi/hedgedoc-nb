/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useEffect, useState } from 'react'
import type { NoteExploreEntryInterface } from '@hedgedoc/commons'
import { SortMode } from '@hedgedoc/commons'
import { getExplorePageEntries } from '../../api/explore'
import { Mode } from '../explore-page/mode-selection/mode'

const fetchAllPages = async (mode: Mode): Promise<NoteExploreEntryInterface[]> => {
  const allNotes: NoteExploreEntryInterface[] = []
  let page = 1
  while (true) {
    const batch = await getExplorePageEntries(mode, SortMode.TITLE_ASC, null, null, page)
    if (batch.length === 0) {
      break
    }
    allNotes.push(...batch)
    page += 1
  }
  return allNotes
}

const deduplicateNotes = (notes: NoteExploreEntryInterface[]): NoteExploreEntryInterface[] => {
  const seen = new Set<string>()
  return notes.filter((note) => {
    if (seen.has(note.primaryAlias)) {
      return false
    }
    seen.add(note.primaryAlias)
    return true
  })
}

export interface UseAllNotesResult {
  notes: NoteExploreEntryInterface[]
  loading: boolean
  error: string | null
}

export const useAllNotes = (): UseAllNotesResult => {
  const [notes, setNotes] = useState<NoteExploreEntryInterface[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [myNotes, publicNotes] = await Promise.all([fetchAllPages(Mode.MY_NOTES), fetchAllPages(Mode.PUBLIC)])
      setNotes(deduplicateNotes([...myNotes, ...publicNotes]))
    } catch {
      setError('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchNotes()
  }, [fetchNotes])

  return { notes, loading, error }
}
