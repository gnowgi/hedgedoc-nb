/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react'
import { Badge, ListGroup, ListGroupItem } from 'react-bootstrap'
import type { TagTreeNode } from './types'

export interface TagTreeNodeListProps {
  node: TagTreeNode
  selectedPath: string | null
  onSelectPath: (path: string) => void
  countAllNotes: (node: TagTreeNode) => number
}

const collectAllPaths = (node: TagTreeNode): { path: string; noteCount: number; segment: string }[] => {
  const items: { path: string; noteCount: number; segment: string }[] = []
  if (node.notes.length > 0) {
    items.push({ path: node.fullPath, noteCount: node.notes.length, segment: node.fullPath })
  }
  for (const child of [...node.children.values()].sort((a, b) =>
    a.segment.toLowerCase().localeCompare(b.segment.toLowerCase())
  )) {
    items.push({ path: child.fullPath, noteCount: child.notes.length, segment: child.fullPath })
    items.push(...collectChildPaths(child))
  }
  return items
}

const collectChildPaths = (node: TagTreeNode): { path: string; noteCount: number; segment: string }[] => {
  const items: { path: string; noteCount: number; segment: string }[] = []
  for (const child of [...node.children.values()].sort((a, b) =>
    a.segment.toLowerCase().localeCompare(b.segment.toLowerCase())
  )) {
    items.push({ path: child.fullPath, noteCount: child.notes.length, segment: child.fullPath })
    items.push(...collectChildPaths(child))
  }
  return items
}

export const TagTreeNodeList: React.FC<TagTreeNodeListProps> = ({ node, selectedPath, onSelectPath }) => {
  const items = useMemo(() => collectAllPaths(node), [node])

  return (
    <ListGroup variant={'flush'}>
      {items.map(({ path, noteCount, segment }) => (
        <ListGroupItem key={path} action active={path === selectedPath} onClick={() => onSelectPath(path)}>
          <span className={'d-flex justify-content-between align-items-center'}>
            <span>{segment}</span>
            {noteCount > 0 && (
              <Badge bg={'secondary'} pill>
                {noteCount}
              </Badge>
            )}
          </span>
        </ListGroupItem>
      ))}
    </ListGroup>
  )
}
