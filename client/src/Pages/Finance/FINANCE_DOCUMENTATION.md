# 📁 Finance Folder — Complete Documentation

> **Path:** `client/src/Pages/Finance/`
> **Total Files:** 6
> **Purpose:** Yeh folder poora financial management system hai — Daily expenses (Office + House + Vehicle fares), Investment tracking, Other/Misc expenses, Profit & Loss dashboard (cross-counter), Rent/Property management, aur Bank Accounts with Galla Closeout and Fund Transfer operations.

---

## 📊 Folder Architecture Overview

```
Finance/
├── Accounts.jsx       (2333 lines, 116 KB) ──► Bank Accounts, Balances, Closeout, Transfers
├── Expenses.jsx       (942 lines, 46 KB)   ──► Office + House + Vehicle Fare Expenses
├── Investment.jsx     (343 lines, 15 KB)   ──► Investment Portfolio CRUD
├── OtherExpenses.jsx  (346 lines, 15 KB)   ──► Misc/Secondary Expenses CRUD
├── Profit.jsx         (497 lines, 27 KB)   ──► Master Profit & Loss Dashboard
└── Rent.jsx           (863 lines, 44 KB)   ──► Property + Rent Payment Management
```

---

## 1. `Expenses.jsx`

**Lines:** 942 | **Size:** 46 KB
**Purpose:** **Daily Business & Personal Expense Tracker.** Office expenses (rent, electricity, stationery), House expenses (multiple household categories: Mian House, Begum Kot House, Khohkar Road House, Fee Sabeelallah), Vehicle fare expenses (Supplier Vehicle, Personal Vehicle), and pending transport fare payments. Supports Cash and Bank payment sources with live balance validation.

### Constants:
- **CATEGORIES:** Grouped by type:
  - Office: Rent, Electricity, Staff Tea, Stationery, Internet, Maintenance, Other
  - House: MIAN HOUSE, BEGUM KOT HOUSE, KHOHKAR ROAD HOUSE, FEE SABEELALLAH, Grocery, Personal Withdrawal, Utility Bills, Education, Travel, Other

### State Variables (Key):
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `activeTab` | string | JWT-derived | Counter module (Wholesale/Retail) |
| `records` | array | `[]` | All expense records |
| `banks` | array | `[]` | Bank accounts for payment source |
| `liveBalances` | object | `{}` | Real-time Cash/Bank balances |
| `personalVehicles` | array | `[]` | Personal vehicles (to separate from supplier vehicles) |
| `filterType` | string | `"All"` | Type filter (All/Office/House/Pending Only/MIAN HOUSE etc.) |
| `dateFilter` | string | `"All Time"` | Date filter (Today/Yesterday/Custom) |
| `currentPage/rowsPerPage` | number | `0/15` | Manual pagination state |
| `showPayModal` | boolean | `false` | Pay pending transport fare modal |

### Functions:

| Function | Line | Purpose |
|---|---|---|
| `useEffect` (balances) | 81-140 | Fetch live balances when modal opens, auto-default to positive balance source |
| `fetchRecords()` | 150 | `GET /api/expenses?type={activeTab}`, 15s auto-refresh |
| `fetchBanks()` | 162 | `GET /api/banks` — all bank accounts |
| `fetchPersonalVehicles()` | 172 | `GET /api/transport?ownership_type=Personal` |
| `handleSubmit(e)` | 193 | Create/Update expense with payment source validation (Cash/Bank) |
| `handleDelete(id)` | 226 | `DELETE /api/expenses/{id}` |
| `filtered` (useMemo) | 236 | Multi-layer filter: type + house category + search + date |
| `sortedFiltered` (useMemo) | 283 | Sort by date + ID (chronological) |
| `paginatedRecords` (useMemo) | 294 | Manual pagination slice |
| `stats` (useMemo) | 299-360 | Calculate: officeTotal, houseTotal, per-house breakdown, personalVehTotal, supplierVehTotal, pendingTotal, grandPaidTotal |

### JSX Highlights:
- Stats cards: Office Total, House Total, Pending Fares, Grand Paid
- House expense breakdown per household
- Date filter bar (All Time, Today, Yesterday, Custom range)
- Custom table with manual pagination
- Pay Transport Fare modal with Cash/Bank source selection + available balance display

---

## 2. `Investment.jsx`

**Lines:** 343 | **Size:** 15 KB
**Purpose:** **Investment Portfolio Tracker.** Simple CRUD module for recording business investments — Real Estate, Stock Market, Business, Gold, Bonds, Fixed Deposit. Tracks investor name, category, amount, date, and notes.

### Constants:
- **CATEGORIES:** Real Estate, Stock Market, Business, Gold, Bonds, Fixed Deposit, Other

### Functions:

| Function | Line | Purpose |
|---|---|---|
| `fetchRecords()` | 71 | `GET /api/investments?type={activeTab}`, 15s auto-refresh |
| `handleSubmit(e)` | 92 | Create/Update investment record |
| `handleDelete(id)` | 114 | Delete investment |
| `filtered` | 122 | Search (title/investor) + category filter |
| `sortedFiltered` (useMemo) | 129 | Sort by date chronologically |

### Stats Cards:
- Total Capital (sum of all amounts)
- Total Assets (count of portfolios)
- Avg Investment (total / count)

### Form Fields:
Investment Name, Investor/Owner, Category, Date, Amount, Notes

---

## 3. `OtherExpenses.jsx`

**Lines:** 346 | **Size:** 15 KB
**Purpose:** **Miscellaneous/Secondary Expenses.** Similar structure to Investment — CRUD for non-core business expenses like Utilities, Maintenance, Marketing, Legal, Insurance costs.

### Constants:
- **CATEGORIES:** Utilities, Maintenance, Office Supplies, Marketing, Legal, Insurance, Miscellaneous, Other
- **PAYMENT_METHODS:** Cash, Bank Transfer, Cheque, Online, Credit Card

### Functions:

| Function | Line | Purpose |
|---|---|---|
| `fetchRecords()` | 74 | `GET /api/other-expenses?type={activeTab}`, 15s auto-refresh |
| `handleSubmit(e)` | 95 | Create/Update other expense |
| `handleDelete(id)` | 117 | Delete other expense |
| `filtered` | 125 | Search + category filter |
| `sortedFiltered` (useMemo) | 131 | Sort by date |

### Stats Cards:
- Monthly Spend, Total Vouchers, Primary Method (Cash)

---

## 4. `Profit.jsx`

**Lines:** 497 | **Size:** 27 KB
**Purpose:** **Master Profit & Loss Dashboard.** Cross-counter financial overview. Shows all counters (Wholesale, Retail 1, Retail 2) side by side with sales revenue, expenses breakdown, aur net profit. Date-filterable. Click any counter card for detailed breakdown with tabbed views (Sales, Expenses, Supply Pay, Rent, Salary, Other Exp., Top Products, Investments).

### Unique Design:
- **No counter isolation** — shows ALL counters simultaneously
- **localStorage caching** — `profit_summary_cache` for instant display
- **Background loading** — shows cached data while fetching fresh data

### Helper Functions:
| Function | Line | Purpose |
|---|---|---|
| `fmt(n)` | 27 | Format number to `Rs. X,XXX` |
| `fmtDate(d)` | 28 | Format date to DD/MM/YYYY |
| `today()/weekAgo()/monthStart()` | 30-32 | Date utility functions |

### API Endpoints:
- `GET /api/profit/summary?from=&to=` — All counters' summary
- `GET /api/profit/detail/{counterName}?from=&to=` — Single counter detail

### Functions:

| Function | Line | Purpose |
|---|---|---|
| `applyFilter(preset)` | 60 | Date filter: All/Today/Week/Month/Custom |
| `loadSummary(from, to)` | 70 | Fetch summary data with cache-first loading |
| `openDetail(counterName)` | 92 | Fetch detailed breakdown for a counter |
| `closeDetail()` | 105 | Close detail dialog |

### Computed Values (Lines 114-117):
- `totalSales` — sum of all counters' sales
- `totalSalesProfit` — sum of all margin profits
- `totalExpenses` — sum of all expenses
- `netProfit` — totalSales - totalExpenses

### JSX Sections:
- **KPI Strip:** 4 cards (Gross Sales, Sales Margin Profit, Total Expenses, Net Profit with color-coding)
- **Counter Cards Grid:** Each counter as a card with: Sales, Expenses, Supply Pay, Rent, Salaries, Other Costs, Net Profit, Profit Margin % bar
- **Detail Dialog (PrimeReact Dialog):** 8-tab view:
  - Sales: DataTable with sale date, customer, items, amount
  - Expenses: expense breakdown
  - Supplier Pay: supplier payment records
  - Rent: rent payments
  - Salary: salary disbursements
  - Other Exp: other expense records
  - Top Products: product-wise sales analysis
  - Investments: investment records

---

## 5. `Rent.jsx`

**Lines:** 863 | **Size:** 44 KB
**Purpose:** **Property & Rent Payment Management.** Dual-tab system — "Active Properties" (property registry) aur "Rent Payment Ledger" (monthly rent transactions). Properties can be "Paid" (we pay rent) or "Received" (we receive rent). Supports Cash/Bank payments with live balance validation.

### Key Concept: `is_property` Flag
- `is_property: true` → Property definition (registered properties)
- `is_property: false/null` → Rent payment transaction (monthly entry)

### State Variables (Key):
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `subTab` | string | `"properties"` | Properties vs History tab |
| `selectedMonth` | string | `"YYYY-MM"` | Month filter for payments |
| `filterType` | string | `"All"` | Paid/Received filter |
| `filterStatus` | string | `"All"` | Active/Inactive (properties) or Paid/Pending (transactions) |
| `showPayModal` | boolean | `false` | Pay pending rent modal |
| `showLedgerModal` | boolean | `false` | Property payment history |

### Computed Lists:
| Variable | Line | Purpose |
|---|---|---|
| `monthOptions` (useMemo) | 82 | 18 month options (-6 to +12 from current) |
| `propertiesList` (useMemo) | 94 | Records where `is_property === true` |
| `transactionsList` (useMemo) | 98 | Records where `is_property !== true` |
| `totalPaid` (useMemo) | 209 | Sum of paid rent expenses |
| `totalReceived` (useMemo) | 213 | Sum of received rent income |
| `settledCount` (useMemo) | 217 | Count of Paid status transactions |

### Functions:

| Function | Line | Purpose |
|---|---|---|
| `fetchRecords()` | 102 | `GET /api/rent?type={activeTab}`, 15s auto-refresh |
| `fetchBanks()` | 116 | Fetch bank accounts |
| `fetchLiveBalances()` | 126 | `GET /api/banks/balances` for payment validation |
| `handleSubmit(e)` | 156 | Create/Update property or rent transaction |
| `handleDelete(id)` | 178 | Delete record |
| `filtered` (useMemo) | 186 | Search + status + type filter (based on subTab) |

### Form Fields:
Property Name, Landlord/Tenant, Amount, Rent Date, Status (Active/Inactive/Paid/Pending), Notes, Rent Type (Paid/Received), is_property flag

---

## 6. `Accounts.jsx`

**Lines:** 2333 | **Size:** 116 KB
**Purpose:** **THE CENTRAL FINANCIAL HUB.** Yeh sabse bada aur complex component hai poore ERP mein. Bank accounts manage karta hai, real-time balances calculate karta hai (by aggregating ALL transactions from sales, purchases, expenses, salary, rent, investments, other expenses), Galla Closeout (day-end cash collection), Admin payments, Fund transfers between accounts, aur per-account ledger with bill viewer.

### Key Architecture:
```
Accounts.jsx aggregates data from:
├── /api/banks (accounts list)
├── /api/sales (all sales for payment tracking)
├── /api/purchases/ledger/all (supplier payments)
├── /api/expenses (general expenses)
├── /api/salary/payments (salary disbursements)
├── /api/rent (rent payments)
├── /api/investments (investment records)
└── /api/other-expenses (misc expenses)
```

### Critical Helper Functions:

#### `checkIsCash(acc)` — (Lines 17-30)
- **Purpose:** Determine if a bank account is actually the "Cash" account.
- **Logic:** Checks bank_name, account_number, account_title for "cash" variants
- **Why needed:** Cash account has no real bank — it's a virtual account

#### `checkAccountMatch(cleanMethod, bankAccount)` — (Lines 32-74)
- **Purpose:** Match a payment method string (e.g., "Bank - HBL (****1234)") to a bank account record.
- **Logic:** Strips "Bank -" prefix, checks last-4-digit match, bank name contains match, normalized string match, special "jazz/jazz cash" prefix match

### State Variables (Key):
| Variable | Purpose |
|---|---|
| `accounts` | Bank account records |
| `sales` | All sales for payment flow analysis |
| `supplierPayments` | Supplier payment records |
| `generalExpenses` | Expenses with payment type |
| `salaries` | Salary payments |
| `rents` | Rent payments |
| `investments` | Investment records |
| `otherExpenses` | Misc expenses |
| `showLedger` | Account ledger modal |
| `showCloseoutModal` | Galla Closeout modal |
| `showTransferModal` | Fund transfer modal |
| `showAdminPaymentModal` | Admin payment modal |
| `showBill` | Bill viewer modal |
| `showDeleteWarning` | Delete confirmation dialog |

### Core Data Functions:

| Function | Line | Purpose |
|---|---|---|
| `fetchAccounts()` | 471 | `GET /api/banks?include_recipients=true` |
| `fetchSales()` | 486 | `GET /api/sales?limit=10000&ignore_date_limit=true` |
| `fetchSupplierPayments()` | 501 | `GET /api/purchases/ledger/all` → filter for payments only |
| `fetchOthers()` | 517 | Parallel fetch: salary, rent, investments, other-expenses, expenses |
| `loadAllData()` | 554 | **Master loader** — 8 parallel API calls, sets all state atomically |

### Filtered Data (useMemo chain, Lines 126-198):
Each data source has a `filtered*` useMemo that filters by `activeTab` module:
- `filteredAccounts` — includes Admin Recipient accounts for non-retail
- `filteredSales` — by sale_type/module_type
- `filteredSupplierPayments` — by module_type
- `filteredGeneralExpenses` — by module_type
- `filteredSalaries` — by module_type
- `filteredRents` — only non-property + paid status
- `filteredInvestments` — by module_type
- `filteredOtherExpenses` — by module_type

### Business Operations:

#### `handleOpenCloseout()` — (Line 278)
**Galla Closeout:** End-of-day cash collection. Counter user sends total cash to admin bank account.
- Auto-fills total cash balance
- User splits: amount to send + amount to keep as opening balance
- Linked to Admin Recipient bank account

#### `handleCloseoutSubmit(e)` — (Line 394)
- **API:** `POST /api/banks/closeout`
- **Logic:** Creates expense record for sent amount, adjusts balances

#### `handleAdminPaymentSubmit(e)` — (Line 429)
- **Purpose:** Admin sends money back to counter from admin bank
- **API:** `POST /api/banks/admin-payment`

#### `handleTransferSubmit(e)` — (Line 318)
- **Purpose:** Transfer funds between Cash ↔ Bank accounts
- **API:** `POST /api/banks/transfer`
- **Validation:** Source balance check, same-account check

#### `handleAdminBankSubmit(e)` — (Line 255)
- **Purpose:** Create new Admin Recipient bank account
- **API:** `POST /api/banks` with `is_admin_recipient: true`

### Balance Calculation:
- **`getAdminBankBalance(acc)`** — Opening + Received closeouts - Admin payments sent
- **`getSourceBalance(method)`** — Get available balance for any payment source

### JSX Sections:
- **Counter Switcher** (Admin)
- **Bank Account Cards:** Each account card shows bank name, account number, balance
- **Galla Closeout Button** (counter users)
- **Fund Transfer Button** 
- **Add Bank Account Button**
- **Account Ledger Modal:** Full transaction history for selected account (date filtered)
- **Bill Viewer Modal:** View specific sale invoice details
- **Galla Closeout Modal:** Split cash between admin send and opening balance
- **Admin Payment Modal:** Admin→Counter fund injection
- **Transfer Modal:** Source/Destination account selection with balance validation

---

## 📋 Complete Function Index

### Expenses.jsx
| Function | Line | Purpose |
|---|---|---|
| `Expenses({type})` | 32 | Main component |
| `fetchRecords()` | 150 | Fetch expenses |
| `fetchBanks()` | 162 | Fetch bank accounts |
| `fetchPersonalVehicles()` | 172 | Fetch personal vehicles |
| `handleSubmit(e)` | 193 | Create/update expense |
| `handleDelete(id)` | 226 | Delete expense |
| `filtered` (useMemo) | 236 | Multi-layer filter |
| `stats` (useMemo) | 299 | Per-type totals calculation |

### Investment.jsx
| Function | Line | Purpose |
|---|---|---|
| `Investment({type})` | 31 | Main component |
| `fetchRecords()` | 71 | Fetch investments |
| `handleSubmit(e)` | 92 | Create/update investment |
| `handleDelete(id)` | 114 | Delete investment |

### OtherExpenses.jsx
| Function | Line | Purpose |
|---|---|---|
| `OtherExpenses({type})` | 34 | Main component |
| `fetchRecords()` | 74 | Fetch other expenses |
| `handleSubmit(e)` | 95 | Create/update expense |
| `handleDelete(id)` | 117 | Delete expense |

### Profit.jsx
| Function | Line | Purpose |
|---|---|---|
| `Profit()` | 34 | Main component (no type prop — cross-counter) |
| `applyFilter(preset)` | 60 | Date filter preset application |
| `loadSummary(from, to)` | 70 | Fetch summary with cache-first |
| `openDetail(counterName)` | 92 | Fetch counter detail for breakdown |

### Rent.jsx
| Function | Line | Purpose |
|---|---|---|
| `Rent({type})` | 30 | Main component |
| `fetchRecords()` | 102 | Fetch rent records |
| `fetchBanks()` | 116 | Fetch bank accounts |
| `fetchLiveBalances()` | 126 | Fetch live balances |
| `handleSubmit(e)` | 156 | Create/update property or transaction |
| `handleDelete(id)` | 178 | Delete record |

### Accounts.jsx
| Function | Line | Purpose |
|---|---|---|
| `Accounts()` | 14 | Main component (no type prop) |
| `checkIsCash(acc)` | 17 | Check if account is Cash |
| `checkAccountMatch(method, acc)` | 32 | Match payment string to bank account |
| `fetchAccounts()` | 471 | Fetch bank accounts |
| `fetchSales()` | 486 | Fetch all sales |
| `fetchSupplierPayments()` | 501 | Fetch supplier payments |
| `fetchOthers()` | 517 | Fetch salary+rent+invest+other+expenses |
| `loadAllData()` | 554 | Master parallel data loader (8 APIs) |
| `handleOpenCloseout()` | 278 | Init Galla Closeout |
| `handleCloseoutSubmit(e)` | 394 | Submit Galla Closeout |
| `handleAdminPaymentSubmit(e)` | 429 | Admin→Counter payment |
| `handleTransferSubmit(e)` | 318 | Inter-account fund transfer |
| `handleAdminBankSubmit(e)` | 255 | Create Admin Recipient bank |
| `getAdminBankBalance(acc)` | 232 | Calculate admin bank balance |
| `getSourceBalance(method)` | 243 | Get any source's available balance |
| `handleCloseoutFieldChange(field, val)` | 364 | Auto-split closeout amounts |
| `handlePaymentTypeChange(method)` | 289 | Change closeout payment source |

---

## 🔑 Key Patterns

| Pattern | Where | Description |
|---|---|---|
| **Balance Validation** | Expenses, Rent, Accounts | Before any payment, available balance check |
| **Cash/Bank Source** | Expenses, Rent | Toggle between Cash and Bank payment with auto-default to positive balance |
| **Galla Closeout** | Accounts | Day-end cash transfer from counter to admin |
| **Cross-Counter View** | Profit | Shows all counters simultaneously unlike other modules |
| **LocalStorage Cache** | Profit, Accounts | Cache for instant display while fresh data loads |
| **Admin Recipient Banks** | Accounts | Special bank accounts that receive Galla Closeout money |
| **Property vs Transaction** | Rent | `is_property` flag separates property registry from payment ledger |
