/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CodeProps } from '../../../components/markdown-renderer/replace-components/code-block-component-replacer'
import { parseLedger } from './ledger-parser'
import type { ChartDirective, SummaryDirective } from './ledger-parser'
import { aggregateByPeriod, computeLedger, filterByCategories } from './ledger-compute'
import type { CategorySummary, PeriodSummary } from './ledger-compute'
import styles from './ledger.module.scss'
import React, { useMemo, useRef } from 'react'
import { useAsync } from 'react-use'

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

function buildPieSpec(summaries: CategorySummary[]): object {
  const expenseData = summaries
    .filter((s) => s.total < 0)
    .map((s) => ({ category: s.category, amount: Math.abs(s.total) }))

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 250,
    data: { values: expenseData },
    mark: { type: 'arc', innerRadius: 40 },
    encoding: {
      theta: { field: 'amount', type: 'quantitative', stack: true },
      color: { field: 'category', type: 'nominal', legend: { title: 'Category' } },
      tooltip: [
        { field: 'category', type: 'nominal' },
        { field: 'amount', type: 'quantitative', format: '.2f' }
      ]
    }
  }
}

function buildBarSpec(periods: PeriodSummary[], subject: string): object {
  const data: Array<{ period: string; type: string; amount: number }> = []
  for (const p of periods) {
    if (p.income > 0) {
      data.push({ period: p.period, type: 'Income', amount: p.income })
    }
    if (p.expenses > 0) {
      data.push({ period: p.period, type: 'Expenses', amount: p.expenses })
    }
  }

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 250,
    data: { values: data },
    mark: 'bar',
    encoding: {
      x: { field: 'period', type: 'ordinal', title: subject },
      y: { field: 'amount', type: 'quantitative', title: 'Amount' },
      color: {
        field: 'type',
        type: 'nominal',
        scale: { domain: ['Income', 'Expenses'], range: ['#198754', '#dc3545'] }
      },
      xOffset: { field: 'type' },
      tooltip: [
        { field: 'period', type: 'ordinal' },
        { field: 'type', type: 'nominal' },
        { field: 'amount', type: 'quantitative', format: '.2f' }
      ]
    }
  }
}

const VegaChart: React.FC<{ spec: object }> = ({ spec }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const { error } = useAsync(async () => {
    if (!containerRef.current) {
      return
    }
    const vegaEmbed = (await import(/* webpackChunkName: "vega" */ 'vega-embed')).default
    await vegaEmbed(containerRef.current, spec as Parameters<typeof vegaEmbed>[1], {
      actions: false,
      renderer: 'svg'
    })
  }, [spec])

  return (
    <div className={styles['chart-container']}>
      {error && <div className={styles['ledger-errors']}>Chart error: {error.message}</div>}
      <div ref={containerRef} />
    </div>
  )
}

const ChartView: React.FC<{ directive: ChartDirective; data: ReturnType<typeof parseLedger> }> = ({
  directive,
  data
}) => {
  const computed = useMemo(() => computeLedger(data), [data])

  if (directive.kind === 'pie') {
    const spec = buildPieSpec(computed.categorySummaries)
    return (
      <div className={styles['ledger-section']}>
        <h4 className={styles['section-title']}>Expense Breakdown</h4>
        <VegaChart spec={spec} />
      </div>
    )
  }

  if (directive.kind === 'bar') {
    const periods = aggregateByPeriod(data.transactions, directive.subject)
    const spec = buildBarSpec(periods, directive.subject)
    return (
      <div className={styles['ledger-section']}>
        <h4 className={styles['section-title']}>
          {directive.subject.charAt(0).toUpperCase() + directive.subject.slice(1)} Trends
        </h4>
        <VegaChart spec={spec} />
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
