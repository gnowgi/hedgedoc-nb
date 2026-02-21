/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useMemo } from 'react'
import type { NoteExploreEntryInterface } from '@hedgedoc/commons'
import type { TagTreeNode } from './types'

const UNTAGGED_KEY = '__untagged__'

const getOrCreateChild = (parent: Map<string, TagTreeNode>, segment: string, fullPath: string): TagTreeNode => {
  const key = segment.toLowerCase()
  let node = parent.get(key)
  if (!node) {
    node = { segment, fullPath, children: new Map(), notes: [] }
    parent.set(key, node)
  }
  return node
}

const buildTree = (notes: NoteExploreEntryInterface[]): Map<string, TagTreeNode> => {
  const root = new Map<string, TagTreeNode>()

  for (const note of notes) {
    if (note.tags.length === 0) {
      const untagged = getOrCreateChild(root, UNTAGGED_KEY, UNTAGGED_KEY)
      untagged.notes.push(note)
      continue
    }
    for (const tag of note.tags) {
      const segments = tag.split('/')
      let currentMap = root
      let pathSoFar = ''
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        pathSoFar = pathSoFar ? `${pathSoFar}/${seg}` : seg
        const node = getOrCreateChild(currentMap, seg, pathSoFar)
        if (i === segments.length - 1) {
          node.notes.push(note)
        }
        currentMap = node.children
      }
    }
  }

  return root
}

const countAllNotes = (node: TagTreeNode): number => {
  let count = node.notes.length
  for (const child of node.children.values()) {
    count += countAllNotes(child)
  }
  return count
}

const matchesFilter = (node: TagTreeNode, filterLower: string): boolean => {
  if (node.fullPath.toLowerCase().includes(filterLower)) {
    return true
  }
  if (node.notes.some((n) => n.title.toLowerCase().includes(filterLower))) {
    return true
  }
  for (const child of node.children.values()) {
    if (matchesFilter(child, filterLower)) {
      return true
    }
  }
  return false
}

const filterTree = (tree: Map<string, TagTreeNode>, filterLower: string): Map<string, TagTreeNode> => {
  const filtered = new Map<string, TagTreeNode>()
  for (const [key, node] of tree) {
    if (matchesFilter(node, filterLower)) {
      filtered.set(key, node)
    }
  }
  return filtered
}

export interface UseTagTreeResult {
  tagTree: Map<string, TagTreeNode>
  countAllNotes: (node: TagTreeNode) => number
}

export const useTagTree = (notes: NoteExploreEntryInterface[], searchFilter: string): UseTagTreeResult => {
  const tagTree = useMemo(() => {
    const tree = buildTree(notes)
    if (searchFilter.trim() === '') {
      return tree
    }
    return filterTree(tree, searchFilter.toLowerCase())
  }, [notes, searchFilter])

  return { tagTree, countAllNotes }
}

export { UNTAGGED_KEY }
