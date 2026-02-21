/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useState } from 'react'
import { Col, Row } from 'react-bootstrap'
import { Trans } from 'react-i18next'
import { useAllNotes } from './use-all-notes'
import { useTagTree } from './use-tag-tree'
import { OrganizerSearch } from './organizer-search'
import { TagTreeAccordion } from './tag-tree-accordion'
import { NoteListPanel } from './note-list-panel'
import styles from './organizer-content.module.scss'

export const OrganizerContent: React.FC = () => {
  const { notes, loading, error } = useAllNotes()
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const { tagTree, countAllNotes, collectAllNotesRecursive } = useTagTree(notes, searchFilter)

  if (loading) {
    return (
      <div className={'text-center mt-4'}>
        <Trans i18nKey={'organizer.loading'} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={'text-center text-danger mt-4'}>
        <Trans i18nKey={'organizer.error'} />
      </div>
    )
  }

  return (
    <Row className={'mt-2'}>
      <Col xs={3} className={styles.sidebar}>
        <h3>
          <Trans i18nKey={'organizer.title'} />
        </h3>
        <OrganizerSearch searchFilter={searchFilter} setSearchFilter={setSearchFilter} />
        <TagTreeAccordion
          tagTree={tagTree}
          selectedPath={selectedPath}
          onSelectPath={setSelectedPath}
          countAllNotes={countAllNotes}
        />
      </Col>
      <Col xs={9}>
        <NoteListPanel selectedPath={selectedPath} tagTree={tagTree} collectAllNotesRecursive={collectAllNotesRecursive} />
      </Col>
    </Row>
  )
}
