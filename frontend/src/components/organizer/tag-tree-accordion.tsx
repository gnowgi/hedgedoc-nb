/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useMemo } from 'react'
import { Accordion, Badge } from 'react-bootstrap'
import type { TagTreeNode } from './types'
import { TagTreeNodeList } from './tag-tree-node-list'
import { UNTAGGED_KEY } from './use-tag-tree'
import { Trans } from 'react-i18next'

export interface TagTreeAccordionProps {
  tagTree: Map<string, TagTreeNode>
  selectedPath: string | null
  onSelectPath: (path: string) => void
  countAllNotes: (node: TagTreeNode) => number
}

export const TagTreeAccordion: React.FC<TagTreeAccordionProps> = ({
  tagTree,
  selectedPath,
  onSelectPath,
  countAllNotes
}) => {
  const sortedEntries = useMemo(() => {
    const entries = [...tagTree.entries()]
    return entries.sort(([keyA], [keyB]) => {
      if (keyA === UNTAGGED_KEY) return 1
      if (keyB === UNTAGGED_KEY) return -1
      return keyA.localeCompare(keyB)
    })
  }, [tagTree])

  const defaultActiveKey = useMemo(() => {
    if (sortedEntries.length === 0) return ''
    return sortedEntries[0][0]
  }, [sortedEntries])

  const onHeaderClick = useCallback(
    (path: string) => (event: React.MouseEvent) => {
      event.stopPropagation()
      onSelectPath(path)
    },
    [onSelectPath]
  )

  return (
    <Accordion defaultActiveKey={defaultActiveKey}>
      {sortedEntries.map(([key, node]) => (
        <Accordion.Item eventKey={key} key={key}>
          <Accordion.Header>
            <span
              className={'d-flex justify-content-between align-items-center w-100 me-2'}
              onClick={onHeaderClick(node.fullPath)}
              role={'button'}>
              <span>
                {key === UNTAGGED_KEY ? <Trans i18nKey={'organizer.untagged'} /> : node.segment}
              </span>
              <Badge bg={selectedPath === node.fullPath ? 'primary' : 'secondary'} pill>
                {countAllNotes(node)}
              </Badge>
            </span>
          </Accordion.Header>
          <Accordion.Body className={'p-0'}>
            <TagTreeNodeList
              node={node}
              selectedPath={selectedPath}
              onSelectPath={onSelectPath}
              countAllNotes={countAllNotes}
            />
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
