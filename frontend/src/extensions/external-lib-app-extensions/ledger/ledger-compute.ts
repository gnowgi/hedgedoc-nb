/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Account, ChartSubject, LedgerData, Transaction } from './ledger-parser'

export interface TransactionRow {
  date: string
  description: string
  amount: number
  account: string
  categories: string[]
  runningBalance: number
}

export interface CategorySummary {
  category: string
  total: number
  count: number
}

export interface PeriodSummary {
  period: string
  income: number
  expenses: number
  net: number
}

export interface AccountBalance {
  name: string
  balance: number
}

export interface ComputedLedger {
  rows: TransactionRow[]
  accountBalances: AccountBalance[]
  categorySummaries: CategorySummary[]
}

export function computeLedger(data: LedgerData): ComputedLedger {
  const balances = new Map<string, number>()
  for (const account of data.accounts) {
    balances.set(account.name, account.initialBalance)
  }

  const rows: TransactionRow[] = []
  for (const tx of data.transactions) {
    if (!balances.has(tx.account)) {
      balances.set(tx.account, 0)
    }

    const newBalance = (balances.get(tx.account) ?? 0) + tx.amount
    balances.set(tx.account, newBalance)

    if (tx.targetAccount) {
      if (!balances.has(tx.targetAccount)) {
        balances.set(tx.targetAccount, 0)
      }
      balances.set(tx.targetAccount, (balances.get(tx.targetAccount) ?? 0) - tx.amount)
    }

    rows.push({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      account: tx.account,
      categories: tx.categories,
      runningBalance: newBalance
    })
  }

  const accountBalances: AccountBalance[] = Array.from(balances.entries()).map(([name, balance]) => ({
    name,
    balance
  }))

  const categoryTotals = new Map<string, { total: number; count: number }>()
  for (const tx of data.transactions) {
    const cats = tx.categories.length > 0 ? tx.categories : ['uncategorized']
    for (const cat of cats) {
      const entry = categoryTotals.get(cat) ?? { total: 0, count: 0 }
      entry.total += tx.amount
      entry.count += 1
      categoryTotals.set(cat, entry)
    }
  }

  const categorySummaries: CategorySummary[] = Array.from(categoryTotals.entries()).map(
    ([category, { total, count }]) => ({ category, total, count })
  )
  categorySummaries.sort((a, b) => a.category.localeCompare(b.category))

  return { rows, accountBalances, categorySummaries }
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
  return monday.toISOString().slice(0, 10)
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

function getDayKey(dateStr: string): string {
  return dateStr
}

const periodFunctions: Record<ChartSubject, (dateStr: string) => string> = {
  daily: getDayKey,
  weekly: getWeekKey,
  monthly: getMonthKey,
  categories: getDayKey
}

export function aggregateByPeriod(transactions: Transaction[], period: ChartSubject): PeriodSummary[] {
  const getPeriodKey = periodFunctions[period] ?? getDayKey
  const periods = new Map<string, { income: number; expenses: number }>()

  for (const tx of transactions) {
    const key = getPeriodKey(tx.date)
    const entry = periods.get(key) ?? { income: 0, expenses: 0 }
    if (tx.amount >= 0) {
      entry.income += tx.amount
    } else {
      entry.expenses += Math.abs(tx.amount)
    }
    periods.set(key, entry)
  }

  return Array.from(periods.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { income, expenses }]) => ({
      period,
      income,
      expenses,
      net: income - expenses
    }))
}

export function filterByCategories(transactions: Transaction[], categories: string[]): Transaction[] {
  if (categories.length === 0) {
    return transactions
  }
  return transactions.filter((tx) => tx.categories.some((c) => categories.includes(c)))
}
