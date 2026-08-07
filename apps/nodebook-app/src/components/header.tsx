/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useRef, useState } from 'react'
import {
  List as IconMenu,
  PlusLg as IconNew,
  Folder2Open as IconOpen,
  Download as IconSave,
  LayoutSplit as IconSplit,
  Code as IconCode,
  Diagram3 as IconGraph,
  MoonFill as IconDark,
  SunFill as IconLight
} from 'react-bootstrap-icons'
import styles from './header.module.scss'

interface HeaderProps {
  layout: 'split' | 'editor' | 'graph'
  onLayoutChange: (layout: 'split' | 'editor' | 'graph') => void
  onSidebarToggle: () => void
  onFileOpen: () => void
  onFileSave: () => void
  onNewFile: () => void
  docName: string
  onRename: (name: string) => void
  readOnly?: boolean
}

export const Header: React.FC<HeaderProps> = ({
  layout,
  onLayoutChange,
  onSidebarToggle,
  onFileOpen,
  onFileSave,
  onNewFile,
  docName,
  onRename,
  readOnly
}) => {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('nodebook-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
      localStorage.setItem('nodebook-theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  // Apply theme on mount
  React.useEffect(() => {
    const stored = localStorage.getItem('nodebook-theme')
    if (stored) {
      document.documentElement.setAttribute('data-theme', stored)
    }
  }, [])

  const handleNameClick = useCallback(() => {
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [])

  const handleNameBlur = useCallback(() => {
    setEditing(false)
    const val = inputRef.current?.value.trim()
    if (val && val !== docName) onRename(val)
  }, [docName, onRename])

  const handleNameKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleNameBlur()
      }
      if (e.key === 'Escape') {
        setEditing(false)
      }
    },
    [handleNameBlur]
  )

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.iconBtn} onClick={onSidebarToggle} title="Documents">
          <IconMenu size={18} />
        </button>
        <span className={styles.logo}>nodeBook</span>
        {editing && !readOnly ? (
          <input
            ref={inputRef}
            className={styles.nameInput}
            defaultValue={docName}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKey}
            autoFocus
          />
        ) : (
          <span
            className={styles.docName}
            onClick={readOnly ? undefined : handleNameClick}
            title={readOnly ? 'Example document (read-only)' : 'Click to rename'}
            style={readOnly ? { cursor: 'default', fontStyle: 'italic' } : undefined}>
            {docName}
          </span>
        )}
      </div>
      <div className={styles.center}>
        <button
          className={`${styles.layoutBtn} ${layout === 'editor' ? styles.active : ''}`}
          onClick={() => onLayoutChange('editor')}
          title="Editor only">
          <IconCode size={16} />
        </button>
        <button
          className={`${styles.layoutBtn} ${layout === 'split' ? styles.active : ''}`}
          onClick={() => onLayoutChange('split')}
          title="Split view">
          <IconSplit size={16} />
        </button>
        <button
          className={`${styles.layoutBtn} ${layout === 'graph' ? styles.active : ''}`}
          onClick={() => onLayoutChange('graph')}
          title="Graph only">
          <IconGraph size={16} />
        </button>
      </div>
      <div className={styles.right}>
        <button className={styles.iconBtn} onClick={onNewFile} title="New document">
          <IconNew size={16} />
        </button>
        <button className={styles.iconBtn} onClick={onFileOpen} title="Open file">
          <IconOpen size={16} />
        </button>
        <button className={styles.iconBtn} onClick={onFileSave} title="Save file">
          <IconSave size={16} />
        </button>
        <button className={styles.iconBtn} onClick={toggleDarkMode} title="Toggle theme">
          {darkMode ? <IconLight size={16} /> : <IconDark size={16} />}
        </button>
      </div>
    </header>
  )
}
