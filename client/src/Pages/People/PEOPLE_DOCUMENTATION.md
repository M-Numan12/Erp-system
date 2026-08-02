# 📁 People Folder — Complete Documentation

> **Path:** `client/src/Pages/People/`
> **Total Files:** 6
> **Purpose:** Yeh folder poora human resource aur stakeholder management ka system hai — Customer directory + payment + ledger, Supplier directory + payment + ledger, Staff advance/ledger management, Salary payroll with advance deductions, Labour group tracking with bill-linked wages, aur User/Permission management with device security.

---

## 📊 Folder Architecture Overview

```
People/
├── Customers.jsx      (1549 lines, 86 KB)  ──► Customer CRUD, Payment Collection, Ledger, Adjustments
├── Suppliers.jsx      (1239 lines, 64 KB)  ──► Supplier CRUD, Payment Sending, Ledger, Adjustments
├── Staff.jsx          (688 lines, 34 KB)   ──► Staff Ledger (Advances, Returns, Balance Tracking)
├── Salary.jsx         (1150 lines, 62 KB)  ──► Salary Payroll, Advance Given/Returned, Deduction Scheduler
├── Labours.jsx        (1024 lines, 52 KB)  ──► Labour Group Tracking, Work Logging, Bill-Linked Wages
└── UsersManager.jsx   (393 lines, 17 KB)   ──► User CRUD, Module Permissions, Device Management
```

---

## 1. `Customers.jsx`

**Lines:** 1549 | **Size:** 86 KB
**Purpose:** **Customer Relationship Management.** Customer directory CRUD, Customer ledger (full transaction history with running balance), Payment collection (Cash/Bank), Payment undo (admin), Balance adjustments (Debit/Credit), Payment receipt generator, aur WhatsApp ledger sharing. Balance filters (Positive/Negative/Zero) aur Activity filters (Active/Inactive).

### Helper Functions:
- **`formatItemName(brand, name)`** — Lines 18-35: Smart brand+name formatter. Avoids duplicate text (e.g., "Lucky Cement Cement" → "Lucky Cement")

### State Variables (Key):
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `records` | array | `[]` | Customer list |
| `showLedgerModal` | boolean | `false` | Full transaction ledger modal |
| `isLedgerMaximized` | boolean | `false` | Fullscreen ledger toggle |
| `showPaymentModal` | boolean | `false` | Payment collection modal |
| `selectedCustomer` | object/null | `null` | Customer being operated on |
| `ledgerData` | array | `[]` | Raw transaction history |
| `ledgerFilter` | string | `"all"` | Date filter for ledger |
| `paymentType` | string | `"Cash"` | Cash/Bank payment source |
| `undoLoading` | boolean | `false` | Undo payment loading |
| `adjForm` | object | `{type, amount, notes}` | Balance adjustment form |
| `balanceFilter` | string | `"all"` | All/Positive/Negative/Zero filter |
| `activityFilter` | string | `"all"` | Active/Inactive customer filter |
| `showReceipt` | boolean | `false` | Payment receipt modal |

### Core Logic: Running Balance Calculation (Lines 99-147)
```
sortedLedgerData (useMemo):
1. Sort all ledger entries chronologically (oldest first)
2. Calculate historySum = sum of (net_amount - paid_amount) for ALL records
3. absoluteBaseOpeningBal = liveBalance - historySum (reverse-engineered opening)
4. Walk through each row: running += (debit - credit)
5. Apply date filter (all/today/yesterday/week/month/custom)
```

### Functions:

| Function | Line | Purpose |
|---|---|---|
| `fetchRecords()` | 165 | `GET /api/customers?type=` + `GET /api/banks`, 15s refresh |
| `openLedger(customer, filter)` | 240 | `GET /api/sales/ledger/{id}` — full transaction history |
| `applyLedgerFilter(key)` | 261 | Date filter: all/today/yesterday/week/month/custom |
| `openPayment(customer)` | 284 | Open payment collection modal |
| `handleUndoPayment(paymentId)` | 294 | `POST /api/sales/payment/undo` — admin reversal |
| `handlePostAdjustment(e)` | 323 | `POST /api/sales/adjustment` — manual Debit/Credit entry |
| `handleSubmit(e)` | — | Create/update customer (CRUD) |
| `handleDelete(id)` | — | Delete customer |

### JSX Highlights:
- Stats cards: Total Customers, Total Receivable, Total Payable, Zero Balance
- Balance filter (All/Positive/Negative/Zero) + Activity filter
- Customer table: Name, Phone, Balance (color-coded), Actions
- Ledger modal: Maximizable, printable, date-filterable
  - Print layout with business header
  - Opening Balance row
  - Transaction rows: Date, Bill#, Details, Debit, Credit, Running Balance
  - Balance adjustment form inline
  - Undo Payment button (admin only)
- Payment modal: Amount, Reference, Source (Cash/Bank), Available balance display
- Receipt modal: Printable payment receipt with business header

---

## 2. `Suppliers.jsx`

**Lines:** 1239 | **Size:** 64 KB
**Purpose:** **Supplier Relationship Management.** Mirror of Customers but for suppliers — CRUD, payment sending (outbound), purchase ledger, balance adjustments, payment undo (admin). Key difference: Supplier balance is what we OWE them (liability), not what they owe us.

### Key Difference from Customers:
- **Customer balance:** What customer owes us (Receivable — asset)
- **Supplier balance:** What we owe supplier (Payable — liability)
- **Ledger API:** `/api/purchases/supplier/{id}` (not `/api/sales/ledger/`)

### State Variables (Key):
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `records` | array | `[]` | Supplier list |
| `ledgerData` | array | `[]` | Purchase history with running balance |
| `ledgerOpeningBalance` | number | `0` | Back-calculated opening balance |
| `paymentForm` | object | `{amount, notes}` | Payment sending form |
| `paymentSource` | string | `"Cash"` | Cash/Bank toggle |
| `liveBalances` | object | `{}` | Real-time account balances |
| `adjForm` | object | `{type, amount, notes}` | Balance adjustment |

### Running Balance Calculation (Lines 239-274):
```
openLedger(supplier):
1. GET /api/purchases/supplier/{id}?type=
2. Sort oldest → newest
3. historicalImpact = sum(total_amount - paid_amount) for ALL records
4. initialBal = current_balance - historicalImpact (reverse engineering)
5. Walk through: running += total_amount - paid_amount
6. Store opening balance separately
```

### Functions:

| Function | Line | Purpose |
|---|---|---|
| `fetchRecords()` | 154 | `GET /api/suppliers?type=`, 15s refresh |
| `fetchBanks()` | 170 | `GET /api/banks` |
| `openLedger(supplier, filter)` | 239 | Fetch + compute running balance |
| `applyLedgerFilter(key)` | 276 | Date filter |
| `handlePostAdjustment(e)` | 299 | `POST /api/purchases/adjustment` — Debit/Credit |
| `openPayment(supplier)` | 331 | Open payment sending modal |
| `handleMakePayment(e)` | 340 | `POST /api/purchases/payment` with balance validation |
| `handleUndoPayment(paymentId)` | — | `POST /api/purchases/payment/undo` — admin reversal |

### JSX Highlights:
- Stats cards: Total Suppliers, Total Payable (we owe), Total Paid
- Supplier table: Name, Company, Phone, Balance, Actions
- Ledger modal: Maximizable, printable, Opening Balance row, Purchase/Payment/Return entries
- Payment modal: Amount, Notes, Source (Cash/Bank), Available balance

---

## 3. `Staff.jsx`

**Lines:** 688 | **Size:** 34 KB
**Purpose:** **Staff Ledger Management.** Generic staff directory with ledger for tracking advances given, advance returns, and balance tracking. Different from Salary — Staff.jsx tracks advances/returns only (no payroll), while Salary.jsx handles full payroll.

### Key Concept: Staff Balance
- **Positive balance** = We gave advance (staff owes us)
- **Negative balance** = We owe staff (payable)

### State Variables (Key):
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `records` | array | `[]` | Staff list |
| `ledgerData` | array | `[]` | Ledger entries |
| `transactionType` | string | `"advance"` | advance / return |
| `paymentType` | string | `"Cash"` | Cash/Bank |

### Functions:

| Function | Line | Purpose |
|---|---|---|
| `fetchRecords()` | 77 | `GET /api/staff?type=` + `GET /api/banks`, 15s refresh |
| `openLedger(staff)` | 145 | `GET /api/staff/{id}/ledger` |
| `handleUndoTransaction(ledgerId)` | 163 | `POST /api/staff/ledger/undo` — admin reversal |
| `openPayment(staff)` | 192 | Open advance/return modal |
| `handlePayment(e)` | 202 | `POST /api/staff/{id}/ledger` — advance or return |
| `handleSubmit(e)` | 245 | Create/update staff member |
| `handleDelete(id)` | 267 | Delete staff member |

### Computed Stats:
- `totalAdvance` — Sum of positive balances (advances given)
- `totalPayable` — Sum of negative balances (payables)

---

## 4. `Salary.jsx`

**Lines:** 1150 | **Size:** 62 KB
**Purpose:** **Full Payroll System.** Employee registry (designation, CNIC, salary amount, joining date, status), Salary payment disbursement, Advance given, Advance returned (two methods: Direct Cash or Salary Deduction scheduler), payment ledger, printable salary receipt, and balance validation.

### Key Feature: Advance Deduction Scheduler
When an employee has taken an advance and wants to return it via salary deduction:
1. Admin sets the target month for deduction
2. System creates a scheduled deduction entry
3. When salary is paid for that month, deduction is auto-applied (net salary = base - scheduled deductions)

### State Variables (Key):
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `records` | array | `[]` | Employee list |
| `payForm` | object | complex | Payment form: staff_id, employee_name, amount, transaction_type (Salary/Advance Given/Advance Returned), advance_return_type (Direct Cash/Salary Deduction), month, deduction_month, payment_date, payment_type, notes |
| `activeDeductions` | array | `[]` | Pending scheduled deductions for selected month |
| `showReceipt` | boolean | `false` | Salary receipt modal |
| `receiptData` | object/null | `null` | Receipt data for printing |

### Functions:

| Function | Line | Purpose |
|---|---|---|
| `fetchInitialData()` | 92 | `GET /api/banks` + `GET /api/banks/balances` |
| `fetchRecords()` | 110 | `GET /api/salary?type=`, 15s refresh |
| `useEffect` (deductions) | 183-208 | Auto-fetch pending deductions: `GET /api/salary/deductions/pending/{staff_id}?month=`. Recalculates net salary: baseSalary - scheduledCuts |
| `getSelectedMethodBalance()` | 210 | Get available balance for selected payment source |
| `handleSubmit(e)` | 217 | Create/update employee record |
| `handleSalaryPayment(e)` | 239 | **Complex payment handler:** |
|  |  | 1. Salary Deduction path → `POST /api/salary/deductions` (schedule only) |
|  |  | 2. Direct Cash flow → balance check → `POST /api/salary/pay` → show receipt |
| `openLedger(staff)` | 322 | `GET /api/salary/ledger/{employee_name}` |
| `applyLedgerFilter(key)` | 336 | Date filter for salary ledger |

### Payment Types:
| Type | Flow | Impact |
|---|---|---|
| `Salary` | Payout | Cash decreases, employee gets salary |
| `Advance Given` | Payout | Cash decreases, employee balance increases (owes company) |
| `Advance Returned` (Direct Cash) | Inflow | Cash increases, employee balance decreases |
| `Advance Returned` (Salary Deduction) | Scheduled | No immediate cash impact, deduction applies on next salary |

### Form Fields:
Employee Name, Designation, CNIC, Salary Amount, Joining Date, Status (Active/Inactive), Notes

---

## 5. `Labours.jsx`

**Lines:** 1024 | **Size:** 52 KB
**Purpose:** **Labour Group Tracking System.** Manages daily-wage labourers organized in groups (e.g., "Loading Group A"). Tracks individual workers, group work history (bill-linked), wage payments, and manual work entries. Key difference from Staff/Salary: Labours are per-job/per-bill payments, not monthly salaries.

### Key Architecture: Group-Based System
```
Labour Group "Loading Group A"
├── Worker 1 (name, contact, rate_per_day, CNIC)
├── Worker 2
└── Worker 3
    Work History:
    ├── Bill #1234 — Loading 2 trucks — Rs. 5000 (Unpaid)
    ├── Bill #1567 — Unloading cement — Rs. 3000 (Paid)
    └── Manual work — Warehouse cleanup — Rs. 2000 (Unpaid)
```

### State Variables (Key):
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `labours` | array | `[]` | Individual labour workers |
| `workHistory` | array | `[]` | Work history entries |
| `selectedGroup` | string/null | `null` | Currently selected group |
| `showPayModal` | boolean | `false` | Pay wages modal (group-level) |
| `showWorkModal` | boolean | `false` | Log manual work modal |
| `showGlobalPayModal` | boolean | `false` | Pay by Bill ID modal |
| `isNewGroup` | boolean | `false` | Creating new group toggle |
| `customGroup` | string | `""` | New group name input |

### Functions:

| Function | Line | Purpose |
|---|---|---|
| `handleGlobalPayWages(e)` | 76 | `POST /api/labours/pay` — Pay by group + bill ID, balance validated |
| `handleBillIdChange(val)` | 121 | Auto-detect group from bill ID in work history |
| `fetchData()` | 130 | Parallel fetch: labours + work-history + balances + banks, 15s refresh |
| `handleSubmit(e)` | 191 | Create/update labour worker (with group selection or new group) |
| `handleDelete(id)` | 229 | Delete labour worker |
| `handleEdit(labour)` | 242 | Open edit modal |
| `handlePayWages(e)` | 249 | `POST /api/labours/pay` — group-level payment |
| `handleLogWork(e)` | 292 | `POST /api/labours/work-history` — manual work entry |
| `groupsStats` (computed) | 326 | Per-group stats: workers count, earned (unpaid), paid, balance |
| `applyLedgerFilter(key)` | 343 | Date filter for work history |

### Group Stats Calculation (Lines 326-341):
```
For each group:
  earned = sum of work history where status === 'Unpaid'
  paid = sum of work history where status === 'Paid'
  balance = earned - paid (what we owe the group)
```

### JSX Highlights:
- Group cards grid: Each card shows group name, worker count, pending balance
- Click group → shows workers list + work history
- Add Worker modal with group selection (existing dropdown + new group input)
- Pay Wages modal: Amount, Notes, Payment Source (Cash/Bank)
- Log Work modal: Description, Amount
- Global Pay by Bill modal: Bill ID → auto-detect group → pay

---

## 6. `UsersManager.jsx`

**Lines:** 393 | **Size:** 17 KB
**Purpose:** **User & Permission Management.** Admin-only component. Create/Edit/Delete system users. Assign roles (admin, Wholesale, Retail 1/2/3, user), assign counter module_type, grant granular module-level permissions, and manage active device sessions (approve/revoke).

### Available Modules (Permissions):
```
wholesale, retail, users, products, stock, billing, customers,
suppliers, transport, expenses, salary, profit, accounts, rent,
investment, staff, labours
```

### State Variables:
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `users` | array | `[]` | All system users |
| `showForm` | boolean | `false` | Add/Edit form visibility |
| `editingId` | number/null | `null` | User being edited |
| `formData` | object | `{name, email, password, role, module_type, permissions[]}` | User form |
| `devices` | array | `[]` | User's active device sessions |

### Functions:

| Function | Line | Purpose |
|---|---|---|
| `fetchUsers()` | 39 | `GET /api/users` — all users (uses `api` service, not raw fetch) |
| `fetchDevices(userId)` | 48 | `GET /api/users/{userId}/devices` — active sessions |
| `handlePermissionToggle(moduleId)` | 60 | Toggle module permission checkbox |
| `handleEditClick(user)` | 69 | Populate form + fetch devices for editing |
| `handleSubmit(e)` | 91 | `POST /api/users` (create) or `PUT /api/users/{id}` (update) |
| `handleDelete(id)` | 113 | `DELETE /api/users/{id}` |
| `handleLogoutDevice(deviceId)` | 122 | `DELETE /api/users/devices/{deviceId}` — force logout |
| `handleApproveDevice(deviceId)` | 136 | `PUT /api/users/devices/{deviceId}/approve` |

### Role ↔ Module Auto-Sync:
When role changes → module_type auto-updates (e.g., role "Wholesale" → module_type "Wholesale")
When module_type changes → role auto-updates (bidirectional sync)

### Device Management:
- Shows: Device/OS/Browser, IP Address, Live Location (with Google Maps link), Last Activity, Status (Approved/Pending)
- Actions: Force Logout (approved devices), Approve Device (pending devices)

---

## 📋 Complete Function Index

### Customers.jsx
| Function | Line | Purpose |
|---|---|---|
| `formatItemName(brand, name)` | 18 | Smart brand+name formatter |
| `fetchRecords()` | 165 | Fetch customers + banks |
| `openLedger(customer, filter)` | 240 | Open customer ledger |
| `applyLedgerFilter(key)` | 261 | Date filter |
| `openPayment(customer)` | 284 | Open payment modal |
| `handleUndoPayment(paymentId)` | 294 | Admin payment reversal |
| `handlePostAdjustment(e)` | 323 | Manual Debit/Credit adjustment |
| `sortedLedgerData` (useMemo) | 99 | Running balance calculation |

### Suppliers.jsx
| Function | Line | Purpose |
|---|---|---|
| `fetchRecords()` | 154 | Fetch suppliers |
| `fetchBanks()` | 170 | Fetch bank accounts |
| `openLedger(supplier, filter)` | 239 | Fetch + compute running balance |
| `applyLedgerFilter(key)` | 276 | Date filter |
| `handlePostAdjustment(e)` | 299 | Manual Debit/Credit |
| `openPayment(supplier)` | 331 | Open payment modal |
| `handleMakePayment(e)` | 340 | Send payment with balance check |

### Staff.jsx
| Function | Line | Purpose |
|---|---|---|
| `fetchRecords()` | 77 | Fetch staff + banks |
| `openLedger(staff)` | 145 | Open staff ledger |
| `handleUndoTransaction(ledgerId)` | 163 | Admin undo |
| `openPayment(staff)` | 192 | Open advance/return modal |
| `handlePayment(e)` | 202 | Post advance or return |
| `handleSubmit(e)` | 245 | Create/update staff |
| `handleDelete(id)` | 267 | Delete staff |

### Salary.jsx
| Function | Line | Purpose |
|---|---|---|
| `fetchInitialData()` | 92 | Fetch banks + balances |
| `fetchRecords()` | 110 | Fetch employees |
| `handleSubmit(e)` | 217 | Create/update employee |
| `handleSalaryPayment(e)` | 239 | Complex: Salary/Advance/Deduction |
| `openLedger(staff)` | 322 | Salary payment history |
| `applyLedgerFilter(key)` | 336 | Date filter |
| `getSelectedMethodBalance()` | 210 | Get source available balance |

### Labours.jsx
| Function | Line | Purpose |
|---|---|---|
| `handleGlobalPayWages(e)` | 76 | Pay by bill ID |
| `handleBillIdChange(val)` | 121 | Auto-detect group from bill |
| `fetchData()` | 130 | Fetch labours + work + balances |
| `handleSubmit(e)` | 191 | Create/update labour |
| `handleDelete(id)` | 229 | Delete labour |
| `handlePayWages(e)` | 249 | Group-level payment |
| `handleLogWork(e)` | 292 | Manual work entry |
| `groupsStats` (computed) | 326 | Per-group balance calc |

### UsersManager.jsx
| Function | Line | Purpose |
|---|---|---|
| `fetchUsers()` | 39 | Fetch all users |
| `fetchDevices(userId)` | 48 | Fetch user sessions |
| `handlePermissionToggle(id)` | 60 | Toggle permission |
| `handleEditClick(user)` | 69 | Open edit form |
| `handleSubmit(e)` | 91 | Create/update user |
| `handleDelete(id)` | 113 | Delete user |
| `handleLogoutDevice(id)` | 122 | Force logout device |
| `handleApproveDevice(id)` | 136 | Approve pending device |

---

## 🔑 Key Patterns

| Pattern | Files | Description |
|---|---|---|
| **Running Balance** | Customers, Suppliers | Back-calculated opening balance + chronological walk |
| **Undo Payment** | Customers, Suppliers, Staff | Admin-only transaction reversal |
| **Balance Adjustment** | Customers, Suppliers | Manual Debit/Credit entries for corrections |
| **Payment Source** | All (except UsersManager) | Cash/Bank toggle with live balance validation |
| **Advance Deduction Scheduler** | Salary | Schedule deduction for future salary month |
| **Group-Based Tracking** | Labours | Workers organized in groups, paid per-job |
| **Device Security** | UsersManager | Approve/Revoke device sessions |
| **Bill-Linked Work** | Labours | Work entries tied to sale bill numbers |
| **Receipt Generator** | Customers, Salary | Printable payment/salary receipts |
