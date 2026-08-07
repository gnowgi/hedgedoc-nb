/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { autocompletion, acceptCompletion } from '@codemirror/autocomplete'
import { EditorView, keymap } from '@codemirror/view'
import { cnlLanguageDescription, buildNodeBookInBlockCompletions } from '@nodebook/react'

interface EditorProps {
  code: string
  onChange: (code: string) => void
  readOnly?: boolean
}

export const Editor: React.FC<EditorProps> = ({ code, onChange, readOnly }) => {
  const extensions = useMemo(() => {
    const langSupport = cnlLanguageDescription.support
    const completions = buildNodeBookInBlockCompletions()
    return [
      langSupport,
      autocompletion({
        override: completions,
        activateOnTyping: true,
        defaultKeymap: true
      }),
      keymap.of([{ key: 'Tab', run: acceptCompletion }]),
      EditorView.lineWrapping
    ]
  }, [])

  // Detect dark mode from the root element
  const isDark = typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark'

  return (
    <CodeMirror
      value={code}
      onChange={onChange}
      readOnly={readOnly}
      editable={!readOnly}
      extensions={extensions}
      theme={isDark ? 'dark' : 'light'}
      height="100%"
      style={{ height: '100%', overflow: 'auto' }}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: !readOnly,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false
      }}
    />
  )
}
