/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CodeProps } from '../../../components/markdown-renderer/replace-components/code-block-component-replacer'
import { parseSchemaBlock } from './nodebook-parser/schema-parser'
import styles from './nodebook-schema-display.module.scss'
import React, { useMemo, useState } from 'react'

type TabKey = 'nodeTypes' | 'relationTypes' | 'attributeTypes' | 'transitionTypes' | 'functionTypes'

const tabLabels: { key: TabKey; label: string }[] = [
  { key: 'nodeTypes', label: 'Node Types' },
  { key: 'relationTypes', label: 'Relation Types' },
  { key: 'attributeTypes', label: 'Attribute Types' },
  { key: 'transitionTypes', label: 'Transition Types' },
  { key: 'functionTypes', label: 'Function Types' }
]

/**
 * Renders a nodeBook-schema code block as a formatted table display.
 */
export const NodeBookSchemaDisplay: React.FC<CodeProps> = ({ code }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('nodeTypes')

  const parseResult = useMemo(() => parseSchemaBlock(code), [code])

  const { schemas, errors } = parseResult

  const totalEntries =
    schemas.nodeTypes.length +
    schemas.relationTypes.length +
    schemas.attributeTypes.length +
    schemas.transitionTypes.length +
    schemas.functionTypes.length

  const isEmpty = totalEntries === 0 && errors.length === 0

  return (
    <div className={styles['schema-container']}>
      <div className={styles['schema-header']}>
        nodeBook Schema
        <span className={styles['entry-count']}>{totalEntries} entries</span>
      </div>

      {errors.length > 0 && (
        <div className={styles['schema-errors']}>
          <strong>{errors.length} parse error(s)</strong>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {isEmpty && <div className={styles['schema-empty']}>Default schemas will be used</div>}

      {!isEmpty && (
        <>
          <div className={styles['schema-tabs']}>
            {tabLabels.map(({ key, label }) => {
              const count = schemas[key].length
              return (
                <button
                  key={key}
                  className={`${styles['schema-tab']} ${activeTab === key ? styles['schema-tab-active'] : ''}`}
                  onClick={() => setActiveTab(key)}>
                  {label}
                  <span className={styles['tab-badge']}>{count}</span>
                </button>
              )
            })}
          </div>

          {activeTab === 'nodeTypes' && schemas.nodeTypes.length > 0 && (
            <table className={styles['schema-table']}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Parent Types</th>
                </tr>
              </thead>
              <tbody>
                {schemas.nodeTypes.map((nt) => (
                  <tr key={nt.name}>
                    <td>{nt.name}</td>
                    <td>{nt.description}</td>
                    <td>{nt.parent_types.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'relationTypes' && schemas.relationTypes.length > 0 && (
            <table className={styles['schema-table']}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Domain</th>
                  <th>Range</th>
                </tr>
              </thead>
              <tbody>
                {schemas.relationTypes.map((rt) => (
                  <tr key={rt.name}>
                    <td>{rt.name}</td>
                    <td>{rt.description}</td>
                    <td>{rt.domain.join(', ') || '-'}</td>
                    <td>{rt.range.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'attributeTypes' && schemas.attributeTypes.length > 0 && (
            <table className={styles['schema-table']}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Unit</th>
                  <th>Domain</th>
                </tr>
              </thead>
              <tbody>
                {schemas.attributeTypes.map((at) => (
                  <tr key={at.name}>
                    <td>{at.name}</td>
                    <td>{at.data_type}</td>
                    <td>{at.description}</td>
                    <td>{at.unit ?? '-'}</td>
                    <td>{at.domain.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'transitionTypes' && schemas.transitionTypes.length > 0 && (
            <table className={styles['schema-table']}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Inputs</th>
                  <th>Outputs</th>
                </tr>
              </thead>
              <tbody>
                {schemas.transitionTypes.map((tt) => (
                  <tr key={tt.name}>
                    <td>{tt.name}</td>
                    <td>{tt.description}</td>
                    <td>{tt.inputs.join(', ') || '-'}</td>
                    <td>{tt.outputs.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'functionTypes' && schemas.functionTypes.length > 0 && (
            <table className={styles['schema-table']}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Expression</th>
                  <th>Scope</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {schemas.functionTypes.map((ft) => (
                  <tr key={ft.name}>
                    <td>{ft.name}</td>
                    <td>{ft.expression}</td>
                    <td>{ft.scope.join(', ') || '-'}</td>
                    <td>{ft.description ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
