/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react'
import type { Document } from '../hooks/use-document-store'
import { Trash as IconDelete, XLg as IconClose, Lock as IconLock } from 'react-bootstrap-icons'
import styles from './sidebar.module.scss'

interface SidebarProps {
  open: boolean
  documents: Document[]
  activeDocId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  documents,
  activeDocId,
  onSelect,
  onDelete,
  onClose
}) => {
  if (!open) return null

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span>Documents</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <IconClose size={16} />
          </button>
        </div>
        <div className={styles.docList}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`${styles.docItem} ${doc.id === activeDocId ? styles.active : ''}`}
              onClick={() => { onSelect(doc.id); onClose() }}>
              <div className={styles.docInfo}>
                <span className={styles.docTitle}>
                  {doc.readonly && <IconLock size={11} style={{ marginRight: 4, opacity: 0.6 }} />}
                  {doc.name}
                </span>
                <span className={styles.docMeta}>
                  {doc.readonly ? 'Example' : new Date(doc.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {!doc.readonly && documents.filter((d) => !d.readonly).length > 1 && (
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); onDelete(doc.id) }}
                  title="Delete">
                  <IconDelete size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
