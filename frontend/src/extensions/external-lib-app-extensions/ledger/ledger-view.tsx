/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CodeProps } from '../../../components/markdown-renderer/replace-components/code-block-component-replacer'
import { Logger } from '../../../utils/logger'
import { parseLedger } from './ledger-parser'
import type { ChartDirective, SummaryDirective } from './ledger-parser'
import { aggregateByPeriod, computeLedger } from './ledger-compute'
import type { CategorySummary, PeriodSummary } from './ledger-compute'
import styles from './ledger.module.scss'
import React, { useMemo, useRef } from 'react'
import { useAsync } from 'react-use'

const log = new Logger('LedgerChart')

const formatAmount = (amount: number): string => {
  return amount.toFixed(2)
}

const AmountCell: React.FC<{ amount: number }> = ({ amount }) => {
  const className = amount >= 0 ? styles['amount-positive'] : styles['amount-negative']
  return <span className={className}>{formatAmount(amount)}</span>
}

const BalanceTable: React.FC<{ data: ReturnType<typeof computeLedger> }> = ({ data }) => {
  return (
    <div className={styles['ledger-section']}>
      <h4 className={styles['section-title']}>Transactions</h4>
      <table className={styles['ledger-table']}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th className={styles['text-right']}>Amount</th>
            <th>Account</th>
            <th>Categories</th>
            <th className={styles['text-right']}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              <td>{row.date}</td>
              <td>{row.description}</td>
              <td className={styles['text-right']}>
                <AmountCell amount={row.amount} />
              </td>
              <td>{row.account}</td>
              <td>
                {row.categories.map((cat) => (
                  <span key={cat} className={styles['category-tag']}>
                    {cat}
                  </span>
                ))}
              </td>
              <td className={styles['text-right']}>
                <AmountCell amount={row.runningBalance} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.accountBalances.length > 0 && (
        <>
          <h4 className={styles['section-title']} style={{ marginTop: '0.75rem' }}>
            Account Balances
          </h4>
          <table className={styles['ledger-table']}>
            <thead>
              <tr>
                <th>Account</th>
                <th className={styles['text-right']}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.accountBalances.map((ab) => (
                <tr key={ab.name}>
                  <td>{ab.name}</td>
                  <td className={styles['text-right']}>
                    <AmountCell amount={ab.balance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

const SummaryTable: React.FC<{ summaries: CategorySummary[]; directive: SummaryDirective }> = ({
  summaries,
  directive
}) => {
  const filtered =
    directive.categories.length > 0
      ? summaries.filter((s) => directive.categories.includes(s.category))
      : summaries

  return (
    <div className={styles['ledger-section']}>
      <h4 className={styles['section-title']}>Summary by Category</h4>
      <table className={styles['ledger-table']}>
        <thead>
          <tr>
            <th>Category</th>
            <th className={styles['text-right']}>Total</th>
            <th className={styles['text-right']}>Count</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <tr key={s.category}>
              <td>
                <span className={styles['category-tag']}>{s.category}</span>
              </td>
              <td className={styles['text-right']}>
                <AmountCell amount={s.total} />
              </td>
              <td className={styles['text-right']}>{s.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function buildPieMermaid(summaries: CategorySummary[]): string {
  const lines = ['pie title "Expense Breakdown"']
  for (const s of summaries) {
    if (s.total < 0) {
      lines.push(`    "${s.category}" : ${Math.abs(s.total).toFixed(2)}`)
    }
  }
  return lines.join('\n')
}

function buildBarMermaid(periods: PeriodSummary[], subject: string): string {
  const title = subject.charAt(0).toUpperCase() + subject.slice(1) + ' Trends'
  const lines = [
    'xychart-beta',
    `    title "${title}"`,
    `    x-axis [${periods.map((p) => `"${p.period}"`).join(', ')}]`,
    `    y-axis "Amount"`,
    `    bar [${periods.map((p) => p.income.toFixed(2)).join(', ')}]`,
    `    bar [${periods.map((p) => p.expenses.toFixed(2)).join(', ')}]`
  ]
  return lines.join('\n')
}

let mermaidInitialized = false

const loadMermaid = async (): Promise<(typeof import('mermaid'))['default']> => {
  try {
    return (await import(/* webpackChunkName: "mermaid" */ 'mermaid')).default
  } catch (error) {
    log.error('Error while loading mermaid', error)
    throw new Error('Error while loading mermaid')
  }
}

/**
 * Renders a mermaid chart from a generated DSL string.
 * Uses the same dynamic import of mermaid as the mermaid extension.
 */
const MermaidChartInline: React.FC<{ code: string }> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const { error } = useAsync(async () => {
    if (!containerRef.current) {
      return
    }

    const mermaid = await loadMermaid()

    if (!mermaidInitialized) {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'sandbox' })
      mermaidInitialized = true
    }

    try {
      if (!containerRef.current) {
        return
      }
      await mermaid.parse(code)
      delete containerRef.current.dataset.processed
      containerRef.current.textContent = code
      await mermaid.init(undefined, containerRef.current)
    } catch (error) {
      const message = (error as Error).message
      log.error(error)
      containerRef.current?.querySelectorAll('iframe').forEach((child) => child.remove())
      throw new Error(message)
    }
  }, [code])

  return (
    <div className={styles['chart-container']}>
      {error && <div className={styles['ledger-errors']}>Chart error: {error.message}</div>}
      <div className={'text-center'} ref={containerRef} />
    </div>
  )
}

const ChartView: React.FC<{ directive: ChartDirective; data: ReturnType<typeof parseLedger> }> = ({
  directive,
  data
}) => {
  const computed = useMemo(() => computeLedger(data), [data])

  if (directive.kind === 'pie') {
    const mermaidCode = buildPieMermaid(computed.categorySummaries)
    return (
      <div className={styles['ledger-section']}>
        <h4 className={styles['section-title']}>Expense Breakdown</h4>
        <MermaidChartInline code={mermaidCode} />
      </div>
    )
  }

  if (directive.kind === 'bar') {
    const periods = aggregateByPeriod(data.transactions, directive.subject)
    const mermaidCode = buildBarMermaid(periods, directive.subject)
    return (
      <div className={styles['ledger-section']}>
        <h4 className={styles['section-title']}>
          {directive.subject.charAt(0).toUpperCase() + directive.subject.slice(1)} Trends
        </h4>
        <MermaidChartInline code={mermaidCode} />
      </div>
    )
  }

  return null
}

export const LedgerView: React.FC<CodeProps> = ({ code }) => {
  const data = useMemo(() => parseLedger(code), [code])
  const computed = useMemo(() => computeLedger(data), [data])

  const hasBalanceDirective = data.directives.some((d) => d.type === 'balance')
  const showBalance = hasBalanceDirective || data.directives.length === 0

  return (
    <div className={styles['ledger-container']}>
      {data.errors.length > 0 && (
        <div className={styles['ledger-errors']}>
          <strong>Parse warnings:</strong>
          <ul>
            {data.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {showBalance && <BalanceTable data={computed} />}

      {data.directives.map((directive, i) => {
        if (directive.type === 'summary') {
          return <SummaryTable key={i} summaries={computed.categorySummaries} directive={directive} />
        }
        if (directive.type === 'chart') {
          return <ChartView key={i} directive={directive} data={data} />
        }
        return null
      })}
    </div>
  )
}
