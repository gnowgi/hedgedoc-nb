/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react'
import type { NoteExploreEntryInterface } from '@hedgedoc/commons'
import type { TagTreeNode } from './types'
import { UNTAGGED_KEY } from './use-tag-tree'
import type { UseTagTreeResult } from './use-tag-tree'
import Link from 'next/link'
import { Badge, Breadcrumb, ListGroup, ListGroupItem } from 'react-bootstrap'
import { NoteTags } from '../explore-page/note-tags/note-tags'
import { UserAvatarForUsername } from '../common/user-avatar/user-avatar-for-username'
import { formatChangedAt } from '../../utils/format-date'
import { Trans } from 'react-i18next'
import { useTranslatedText } from '../../hooks/common/use-translated-text'

export interface NoteListPanelProps {
  selectedPath: string | null
  tagTree: Map<string, TagTreeNode>
  collectAllNotesRecursive: UseTagTreeResult['collectAllNotesRecursive']
}

const findNodeByPath = (tree: Map<string, TagTreeNode>, path: string): TagTreeNode | null => {
  const segments = path.split('/')
  let currentMap = tree
  let node: TagTreeNode | null = null
  for (const seg of segments) {
    const key = seg.toLowerCase()
    const found = currentMap.get(key)
    if (!found) return null
    node = found
    currentMap = found.children
  }
  return node
}

const NoteItem: React.FC<{ note: NoteExploreEntryInterface }> = ({ note }) => {
  const fallbackUntitled = useTranslatedText('editor.untitledNote')

  return (
    <ListGroupItem>
      <div className={'d-flex align-items-center'}>
        <div className={'flex-grow-1'}>
          <Link href={`/n/${note.primaryAlias}`} className={'text-decoration-none'}>
            {note.title !== '' ? note.title : <i>{fallbackUntitled}</i>}
          </Link>
          {note.tags.length > 0 && (
            <>
              <br />
              <NoteTags tags={note.tags} />
            </>
          )}
        </div>
        <div className={'text-end me-2'}>
          <UserAvatarForUsername username={note.owner} />
          <br />
          <small className={'text-muted'}>
            <Trans i18nKey={'explore.timestamps.lastUpdated'} values={{ timeAgo: formatChangedAt(note.lastChangedAt) }} />
          </small>
        </div>
      </div>
    </ListGroupItem>
  )
}

export const NoteListPanel: React.FC<NoteListPanelProps> = ({ selectedPath, tagTree, collectAllNotesRecursive }) => {
  const node = useMemo(() => {
    if (!selectedPath) return null
    if (selectedPath === UNTAGGED_KEY) return tagTree.get(UNTAGGED_KEY) ?? null
    return findNodeByPath(tagTree, selectedPath)
  }, [selectedPath, tagTree])

  const displayNotes = useMemo(() => {
    if (!node) return []
    if (node.children.size > 0) {
      return collectAllNotesRecursive(node)
    }
    return node.notes
  }, [node, collectAllNotesRecursive])

  const breadcrumbSegments = useMemo(() => {
    if (!selectedPath || selectedPath === UNTAGGED_KEY) return null
    return selectedPath.split('/')
  }, [selectedPath])

  if (!selectedPath || !node) {
    return (
      <div className={'text-center text-muted mt-4'}>
        <Trans i18nKey={'organizer.noSelection'} />
      </div>
    )
  }

  return (
    <>
      <Breadcrumb>
        {selectedPath === UNTAGGED_KEY ? (
          <Breadcrumb.Item active>
            <Trans i18nKey={'organizer.untagged'} />
          </Breadcrumb.Item>
        ) : (
          breadcrumbSegments?.map((seg, i) => (
            <Breadcrumb.Item key={i} active={i === breadcrumbSegments.length - 1}>
              {seg}
            </Breadcrumb.Item>
          ))
        )}
        <Badge bg={'info'} className={'ms-2 align-self-center'}>
          {displayNotes.length}
        </Badge>
      </Breadcrumb>
      <ListGroup>
        {displayNotes.map((note) => (
          <NoteItem key={note.primaryAlias} note={note} />
        ))}
      </ListGroup>
    </>
  )
}
