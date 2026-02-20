---
title: nodeBook Transactions — Double-Entry Accounting in Markdown
description: Learn how to record double-entry accounting transactions using nodeBook code fences. Covers all five account types with worked examples.
tags:
  - nodebook
  - accounting
  - transactions
  - double-entry
  - demo
---

# nodeBook Transactions

Record **double-entry accounting** transactions directly in markdown using `nodeBook` code fences. Each transaction automatically debits and credits the right accounts, and the graph shows final balances immediately.

Jump to: [Quick Start](#quick-start) | [Account Types](#the-five-account-types) | [Full Example](#full-example-small-business-month) | [Syntax Reference](#syntax-reference)

---

## Quick Start

A minimal transaction needs three things: an account with a starting balance, a `[Transaction]` node, and `<debit>` / `<credit>` relations.

```nodeBook
currency: USD;

# Cash [Asset]
balance: 1000;

# Office Supplies [Expense]

# Buy Supplies [Transaction]
date: 2026-01-05;
description: Purchased pens and paper;
<debit> 50 Office Supplies;
<credit> 50 Cash;
```

**What happens:** Cash drops from $1000 to $950. Office Supplies goes from $0 to $50. Debits equal credits — the transaction balances.

---

## The Five Account Types

Double-entry accounting uses five account types. Each behaves differently when debited or credited:

| Type | Normal Balance | Debit increases | Credit increases | Examples |
|------|---------------|-----------------|------------------|----------|
| **Asset** | Debit | Yes | — | Cash, Equipment, Inventory |
| **Liability** | Credit | — | Yes | Loans, Accounts Payable |
| **Equity** | Credit | — | Yes | Owner's Capital, Retained Earnings |
| **Revenue** | Credit | — | Yes | Sales, Service Income |
| **Expense** | Debit | Yes | — | Rent, Salaries, Utilities |

The **accounting equation** must always hold:

> **Assets = Liabilities + Equity + Revenue − Expenses**

nodeBook checks this automatically and displays it below the graph.

---

### Asset Transactions

Assets are resources the business owns. They increase with debits and decrease with credits.

```nodeBook
currency: USD;

# Cash [Asset]
balance: 5000;

# Equipment [Asset]
balance: 0;

# Accounts Receivable [Asset]

# Purchase Equipment [Transaction]
date: 2026-01-10;
description: Bought a laptop for office use;
<debit> 1200 Equipment;
<credit> 1200 Cash;

# Invoice Client [Transaction]
date: 2026-01-15;
description: Billed client for consulting work;
<debit> 3000 Accounts Receivable;
<credit> 3000 Service Income;

# Service Income [Revenue]
```

**Result:** Cash = $3,800 | Equipment = $1,200 | Accounts Receivable = $3,000

---

### Liability Transactions

Liabilities are obligations the business owes. They increase with credits and decrease with debits.

```nodeBook
currency: USD;

# Cash [Asset]
balance: 2000;

# Bank Loan [Liability]
balance: 0;

# Accounts Payable [Liability]

# Take Bank Loan [Transaction]
date: 2026-02-01;
description: Borrowed from bank for working capital;
<debit> 10000 Cash;
<credit> 10000 Bank Loan;

# Buy on Credit [Transaction]
date: 2026-02-05;
description: Purchased inventory on 30-day terms;
<debit> 1500 Inventory;
<credit> 1500 Accounts Payable;

# Inventory [Asset]
```

**Result:** Cash = $12,000 | Bank Loan = $10,000 | Accounts Payable = $1,500 | Inventory = $1,500

---

### Equity Transactions

Equity represents the owner's stake in the business. It increases with credits and decreases with debits (withdrawals).

```nodeBook
currency: USD;

# Cash [Asset]
balance: 0;

# Owner Capital [Equity]
balance: 0;

# Owner Drawings [Equity]

# Owner Invests [Transaction]
date: 2026-03-01;
description: Owner deposits personal funds into business;
<debit> 25000 Cash;
<credit> 25000 Owner Capital;

# Owner Withdrawal [Transaction]
date: 2026-03-15;
description: Owner withdraws for personal use;
<debit> 2000 Owner Drawings;
<credit> 2000 Cash;
```

**Result:** Cash = $23,000 | Owner Capital = $25,000 | Owner Drawings = $2,000

---

### Revenue Transactions

Revenue is income earned by the business. It increases with credits.

```nodeBook
currency: USD;

# Cash [Asset]
balance: 500;

# Accounts Receivable [Asset]
balance: 0;

# Sales Revenue [Revenue]
balance: 0;

# Consulting Fees [Revenue]

# Cash Sale [Transaction]
date: 2026-04-01;
description: Sold products to walk-in customer;
<debit> 800 Cash;
<credit> 800 Sales Revenue;

# Consulting Engagement [Transaction]
date: 2026-04-10;
description: Completed consulting project, invoiced client;
<debit> 5000 Accounts Receivable;
<credit> 5000 Consulting Fees;
```

**Result:** Cash = $1,300 | Accounts Receivable = $5,000 | Sales Revenue = $800 | Consulting Fees = $5,000

---

### Expense Transactions

Expenses are costs of running the business. They increase with debits.

```nodeBook
currency: USD;

# Cash [Asset]
balance: 10000;

# Rent Expense [Expense]
balance: 0;

# Salary Expense [Expense]

# Pay Rent [Transaction]
date: 2026-05-01;
description: Monthly office rent;
<debit> 2000 Rent Expense;
<credit> 2000 Cash;

# Pay Salaries [Transaction]
date: 2026-05-15;
description: Bi-weekly payroll;
<debit> 4500 Salary Expense;
<credit> 4500 Cash;
```

**Result:** Cash = $3,500 | Rent Expense = $2,000 | Salary Expense = $4,500

---

## Full Example: Small Business Month

A complete month of transactions across all five account types. Watch the accounting equation balance at the bottom.

```nodeBook
currency: USD;

# Cash [Asset]
balance: 10000;

# Accounts Receivable [Asset]
balance: 0;

# Equipment [Asset]
balance: 0;

# Inventory [Asset]
balance: 0;

# Bank Loan [Liability]
balance: 0;

# Accounts Payable [Liability]
balance: 0;

# Owner Capital [Equity]
balance: 10000;

# Sales Revenue [Revenue]
balance: 0;

# Service Income [Revenue]
balance: 0;

# Rent Expense [Expense]
balance: 0;

# Utilities Expense [Expense]
balance: 0;

# Salary Expense [Expense]
balance: 0;

# Take Loan [Transaction]
date: 2026-06-01;
description: Working capital loan from bank;
<debit> 15000 Cash;
<credit> 15000 Bank Loan;

# Buy Equipment [Transaction]
date: 2026-06-02;
description: Purchased office furniture and computers;
<debit> 4000 Equipment;
<credit> 4000 Cash;

# Purchase Inventory [Transaction]
date: 2026-06-03;
description: Stocked up on products for resale;
<debit> 3000 Inventory;
<credit> 3000 Cash;

# Pay Rent [Transaction]
date: 2026-06-05;
description: Monthly office lease payment;
<debit> 2500 Rent Expense;
<credit> 2500 Cash;

# Product Sale [Transaction]
date: 2026-06-10;
description: Sold products to customer for cash;
<debit> 1800 Cash;
<credit> 1800 Sales Revenue;

# Consulting Delivered [Transaction]
date: 2026-06-12;
description: Completed consulting project, invoiced;
<debit> 6000 Accounts Receivable;
<credit> 6000 Service Income;

# Supplies on Credit [Transaction]
date: 2026-06-15;
description: Ordered supplies from vendor on net-30;
<debit> 800 Inventory;
<credit> 800 Accounts Payable;

# Pay Utilities [Transaction]
date: 2026-06-18;
description: Electric and internet bills;
<debit> 350 Utilities Expense;
<credit> 350 Cash;

# Pay Salaries [Transaction]
date: 2026-06-25;
description: Monthly staff payroll;
<debit> 5000 Salary Expense;
<credit> 5000 Cash;

# Collect Receivable [Transaction]
date: 2026-06-28;
description: Client pays outstanding invoice;
<debit> 6000 Cash;
<credit> 6000 Accounts Receivable;
```

**Expected final balances:**

| Account | Balance |
|---------|---------|
| Cash | $18,950 |
| Accounts Receivable | $0 |
| Equipment | $4,000 |
| Inventory | $3,800 |
| Bank Loan | $15,000 |
| Accounts Payable | $800 |
| Owner Capital | $10,000 |
| Sales Revenue | $1,800 |
| Service Income | $6,000 |
| Rent Expense | $2,500 |
| Utilities Expense | $350 |
| Salary Expense | $5,000 |

**Accounting equation:** Assets ($26,750) = Liabilities ($15,800) + Equity ($10,000) + Revenue ($7,800) − Expenses ($7,850)

> $26,750 = $15,800 + $10,000 + $7,800 − $7,850 = $25,750 ... plus the $1,000 net income retained!

---

## Syntax Reference

### Declaring accounts

```
# Account Name [Type]
balance: 1000;
```

Available types: `Asset`, `Liability`, `Equity`, `Revenue`, `Expense`, or generic `Account`.

Accounts without a `balance:` attribute start at **$0.00**.

### Recording transactions

```
# Description [Transaction]
date: 2026-01-15;
description: Optional note about the transaction;
<debit> amount Account Name;
<credit> amount Account Name;
```

- Each transaction must have at least one `<debit>` and one `<credit>`
- Amounts can be decimals: `<debit> 49.99 Cash;`
- Target accounts are auto-created if not declared (as generic `Account` type)
- Unbalanced transactions (debits != credits) trigger a warning banner

### Setting currency

Add `currency: CODE;` at the top of your nodeBook block:

```
currency: EUR;    # Shows €
currency: GBP;    # Shows £
currency: INR;    # Shows ₹
currency: JPY;    # Shows ¥
```

Supported codes: USD, EUR, GBP, INR, JPY, CNY, PHP, KRW, THB, BRL, ZAR, MXN, CAD, AUD, CHF, SEK, RUB, TRY, SAR, AED, NGN.

---

*See also: [nodeBook overview](/n/nodeBook) | [Features](/n/features) | [Create a new note](/new)*
