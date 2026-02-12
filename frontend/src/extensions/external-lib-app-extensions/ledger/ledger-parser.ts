/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface Account {
  name: string
  initialBalance: number
}

export interface Transaction {
  date: string
  description: string
  amount: number
  account: string
  targetAccount?: string
  categories: string[]
}

export type DirectiveType = 'balance' | 'summary' | 'chart'
export type ChartKind = 'pie' | 'bar'
export type ChartSubject = 'categories' | 'daily' | 'weekly' | 'monthly'

export interface BalanceDirective {
  type: 'balance'
}

export interface SummaryDirective {
  type: 'summary'
  categories: string[]
}

export interface ChartDirective {
  type: 'chart'
  kind: ChartKind
  subject: ChartSubject
}

export type Directive = BalanceDirective | SummaryDirective | ChartDirective

export interface LedgerData {
  accounts: Account[]
  transactions: Transaction[]
  directives: Directive[]
  errors: string[]
}

const ACCOUNT_REGEX = /^@account\s+(.+?)\s+([-+]?\d+(?:\.\d+)?)$/
const TABLE_SEPARATOR_REGEX = /^\|[\s\-:|]+\|$/
const TABLE_ROW_REGEX = /^\|(.+)\|$/
const COMMENT_REGEX = /^#\s/
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function parseCategories(tagString: string): string[] {
  return tagString
    .trim()
    .split(/\s+/)
    .filter((t) => t.startsWith('#'))
    .map((t) => t.slice(1))
}

function isHeaderRow(cells: string[]): boolean {
  if (cells.length < 3) {
    return false
  }
  const first = cells[0].toLowerCase()
  return first === 'date' || first === 'description' || first === 'amount'
}

function parseTableRow(line: string): Transaction | null {
  const rowMatch = line.match(TABLE_ROW_REGEX)
  if (!rowMatch) {
    return null
  }

  const cells = rowMatch[1].split('|').map((c) => c.trim())

  if (cells.length < 4) {
    return null
  }

  const [dateStr, description, amountStr, accountStr, ...rest] = cells

  if (!DATE_REGEX.test(dateStr)) {
    return null
  }

  const amount = parseFloat(amountStr)
  if (isNaN(amount)) {
    return null
  }

  // Account field may contain "From -> To" for transfers
  let account = accountStr
  let targetAccount: string | undefined
  const transferMatch = accountStr.match(/^(.+?)\s*->\s*(.+)$/)
  if (transferMatch) {
    account = transferMatch[1].trim()
    targetAccount = transferMatch[2].trim()
  }

  // Remaining cells are tags (may be spread across one or more cells)
  const tagStr = rest.join(' ')
  const categories = parseCategories(tagStr)

  return {
    date: dateStr,
    description,
    amount,
    account,
    targetAccount,
    categories
  }
}

function parseDirective(line: string): Directive | null {
  const parts = line.trim().split(/\s+/)
  const command = parts[0]

  if (command === 'balance') {
    return { type: 'balance' }
  }

  if (command === 'summary') {
    const categories = parts
      .slice(1)
      .filter((p) => p.startsWith('#'))
      .map((p) => p.slice(1))
    return { type: 'summary', categories }
  }

  if (command === 'chart') {
    const kind = parts[1] as ChartKind
    if (kind !== 'pie' && kind !== 'bar') {
      return null
    }
    const subject = (parts[2] ?? 'categories') as ChartSubject
    if (!['categories', 'daily', 'weekly', 'monthly'].includes(subject)) {
      return null
    }
    return { type: 'chart', kind, subject }
  }

  return null
}

export function parseLedger(code: string): LedgerData {
  const lines = code.split('\n')
  const accounts: Account[] = []
  const transactions: Transaction[] = []
  const directives: Directive[] = []
  const errors: string[] = []

  let inDirectives = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '' || COMMENT_REGEX.test(line)) {
      continue
    }

    if (line === '---') {
      inDirectives = true
      continue
    }

    if (inDirectives) {
      const directive = parseDirective(line)
      if (directive) {
        directives.push(directive)
      } else {
        errors.push(`Line ${i + 1}: Unknown directive "${line}"`)
      }
      continue
    }

    // Skip markdown table separators (|---|---|...)
    if (TABLE_SEPARATOR_REGEX.test(line)) {
      continue
    }

    const accountMatch = line.match(ACCOUNT_REGEX)
    if (accountMatch) {
      accounts.push({
        name: accountMatch[1],
        initialBalance: parseFloat(accountMatch[2])
      })
      continue
    }

    // Try parsing as a pipe-delimited table row
    if (line.startsWith('|')) {
      const rowMatch = line.match(TABLE_ROW_REGEX)
      if (rowMatch) {
        const cells = rowMatch[1].split('|').map((c) => c.trim())
        // Skip header rows (Date | Description | Amount | ...)
        if (isHeaderRow(cells)) {
          continue
        }
      }

      const tx = parseTableRow(line)
      if (tx) {
        transactions.push(tx)
        continue
      }
    }

    errors.push(`Line ${i + 1}: Could not parse "${line}"`)
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date))

  return { accounts, transactions, directives, errors }
}
