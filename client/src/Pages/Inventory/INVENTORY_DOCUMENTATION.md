# 📁 Inventory Folder — Complete Documentation

> **Path:** `client/src/Pages/Inventory/`
> **Total Files:** 3
> **Purpose:** Yeh folder inventory management ka poora system hai — Product catalog management (CRUD), Stock levels monitoring + Purchase entries + Purchase returns + Sale returns, aur Transport/Vehicle fleet management with earnings ledger aur payment tracking.

---

## 📊 Folder Architecture Overview

```
Inventory/
├── Products.jsx   (525 lines, 23 KB)  ──► Product Catalog CRUD + Category Grid
├── Stock.jsx      (1183 lines, 63 KB) ──► Stock Monitoring + Purchase Entry + Returns
└── Transport.jsx  (980 lines, 49 KB)  ──► Vehicle Fleet + Earnings Ledger + Payments
```

---

## 1. `Products.jsx`

**Lines:** 525 | **Size:** 23 KB
**Purpose:** **Product Catalog Management.** Admin products create, edit, delete karta hai. Counter users sirf view karte hain. Products category-wise grid mein dikhte hain (Cement, Steel, Crush, Bricks, Sand, Tiles Bond, Chips, Other).

### Constants:
- **CATEGORIES:** 8 categories with emoji icons (Cement 🧱, Steel 🏗️, Crush 🪨, Bricks 🧱, Sand 🏖️, Tiles Bond 🔗, Chips ⚪, Other 📦)
- **emptyForm:** Default product form fields: name, brand, category, unit, price, cost_price, stock_quantity, minimum_stock, description

### State Variables:

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `activeTab` | string | JWT-derived | Current counter (Wholesale/Retail 1/2/3) |
| `products` | array | `[]` | All products for current counter |
| `selectedCategory` | string/null | `null` | Selected category (null = grid view) |
| `form` | object | `emptyForm` | Product form data |
| `editId` | number/null | `null` | Product ID being edited |
| `showModal` | boolean | `false` | Add/Edit form modal |
| `search` | string | `""` | Search filter |
| `loading` | boolean | `false` | API loading state |
| `selectedProduct` | object/null | `null` | Product for detail view |
| `showDetailModal` | boolean | `false` | Detail modal visibility |

### Functions:

---

### `activeTab` Initialization (Lines 45-65)
- **Purpose:** Lazy state initialization — JWT token se user ka module type detect karta hai.
- **Logic:** Same pattern as other modules — `type` prop → JWT decode → email-based fallback → `"Wholesale"` default

---

### `fetchProducts()` — (Lines 84-97)
- **Purpose:** Current counter ke products fetch karta hai.
- **Async:** Yes
- **API:** `GET /api/products?type={activeTab}`
- **Auto-refresh:** 15-second interval (useEffect, line 99-104)

---

### `openAdd(cat)` — (Lines 138-142)
- **Purpose:** Add Product modal open karta hai selected category ke saath.
- **Logic:** Empty form set + pre-filled category + editId null + modal open

---

### `openEdit(e, prod)` — (Lines 144-159)
- **Purpose:** Edit Product modal open karta hai existing product data ke saath.
- **Logic:** Product data se form populate + editId set + modal open

---

### `openDetail(prod)` — (Lines 161-164)
- **Purpose:** Product detail view modal open karta hai.

---

### `handleSubmit(e)` — (Lines 166-190)
- **Purpose:** Product create ya update karta hai.
- **Async:** Yes
- **Logic:**
  - `editId` exists → `PUT /api/products/{editId}` (update)
  - `editId` null → `POST /api/products` (create)
  - `module_type` automatically added to payload
  - Success → modal close + refresh data

---

### `handleDelete(e, id)` — (Lines 192-203)
- **Purpose:** Product delete karta hai.
- **API:** `DELETE /api/products/{id}`

---

### `filteredProducts` — Computed (Lines 205-221)
- **Purpose:** Products ko category aur search se filter karta hai.
- **Special handling:** Steel matches "Iron/Steel", Crush matches "Crush/Bajri" (legacy category names)

### JSX Output:
- **Admin Counter Selection:** Admin ke liye counter choose karne ka grid (Wholesale, Retail 1, Retail 2)
- **Category Grid View:** 8 category cards with brand count aur total stock units
- **Product Table (DataTable):** ID, Brand, Name, Retail Price, Cost Price, Stock (color-coded: green/amber/red), Status badge (In Stock/Low Stock/Out of Stock), Actions (admin: edit/delete)
- **Detail Modal:** Product name, category badge, brand, retail price, stock, min stock, description, edit button
- **Form Modal:** Basic Info (name, brand, category, unit) + Pricing (retail price, cost price, stock qty, min stock alert) + Notes textarea

---

## 2. `Stock.jsx`

**Lines:** 1183 | **Size:** 63 KB
**Purpose:** **Stock/Inventory Management Hub.** Yeh file stock levels monitor karti hai, purchase entries (stock receive) karta hai, purchase returns process karta hai, sale returns handle karta hai, aur stock ledger (purchase history) dikhata hai. Yeh Products se different hai — Products sirf catalog manage karta hai, Stock actual inventory operations handle karta hai.

### State Variables:

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `products` | array | `[]` | Products list |
| `suppliers` | array | `[]` | Suppliers list (for purchase entries) |
| `vehicles` | array | `[]` | Vehicles (for purchase transport) |
| `search` | string | `""` | Product search |
| `filterStock` | string | `"All"` | All / Low / Out filter |
| `selectedCategory` | string/null | `null` | Category drill-down |
| `selectedProduct` | object/null | `null` | Product being operated on |
| `showDetailModal` | boolean | `false` | Stock detail popup |
| `showLedgerModal` | boolean | `false` | Purchase history ledger |
| `stockHistory` | array | `[]` | Purchase history records |
| `showReceiveModal` | boolean | `false` | Purchase entry form |
| `receiveForm` | object | `{supplier_id, quantity, vehicle_number, vehicle_id, rate, paid_amount, delivery_charges, fare_status, vehicle_type, gatepass}` | Purchase entry data |
| `showPurchaseReturnModal` | boolean | `false` | Return stock to supplier |
| `purchaseReturnForm` | object | similar to receiveForm | Return data |
| `showReturnModal` | boolean | `false` | Sale return modal |
| `returnBillNo` | string | `""` | Bill number for sale return |
| `billData` | object/null | `null` | Fetched bill data |
| `returnItems` | array | `[]` | Items to return |

### Functions:

---

### `fetchData()` — (Lines 92-117)
- **Purpose:** Products, Suppliers, aur Vehicles simultaneously fetch karta hai.
- **API Calls:** `Promise.all` → 3 endpoints: products, suppliers, transport
- **Auto-refresh:** 15-second interval

---

### `fetchStockHistory(prodId)` — (Lines 127-142)
- **Purpose:** Specific product ka purchase history (stock arrivals) fetch karta hai.
- **API:** `GET /api/purchases/product/{prodId}?type={activeTab}`
- **Use Case:** Stock Ledger modal mein dikhta hai

---

### `updateStock(e, prod, adjustment)` — (Lines 184-200)
- **Purpose:** Quick stock adjustment — +5 ya -5 buttons se.
- **API:** `PUT /api/products/{id}` with updated `stock_quantity`
- **Validation:** `newQty < 0` → block

---

### `handleReceiveStock(e)` — (Lines 202-268)
- **Purpose:** **Purchase Entry** — supplier se stock receive karta hai.
- **Async:** Yes
- **Logic (detailed):**
  1. Total cost calculate: `quantity × rate`
  2. **Overpayment check:** paid > total → block
  3. **Cash balance validation:** Agar payment amount > 0, toh pehle `GET /api/banks/balances` se available cash check karta hai. Insufficient → alert + block
  4. `POST /api/purchases` → supplier_id, product_id, vehicle info, quantity, rate, paid_amount, delivery_charges, fare_status, gatepass, module_type
  5. Success → modal close, form reset, data refresh

---

### `handlePurchaseReturn(e)` — (Lines 270-312)
- **Purpose:** Stock supplier ko wapas return karta hai (defective/excess material).
- **API:** `POST /api/purchases/return`
- **Payload:** supplier_id, product_id, vehicle info, quantity, rate, received_amount, delivery_charges, fare_status
- **Effect:** Stock decrease + supplier balance adjust

---

### `handleFetchBill(e)` — (Lines 314-335)
- **Purpose:** Sale return ke liye purani sale ki details fetch karta hai bill number se.
- **API:** `GET /api/sales/{returnBillNo}`

---

### `handleSaleReturn(e)` — (Lines 337-387)
- **Purpose:** Customer sale return process karta hai — stock wapas inventory mein.
- **API:** `POST /api/sales/return`
- **Payload:** sale_id, items_to_return (with return_qty, rate), vehicle_id, delivery_charges

---

### `filtered` — Computed (Lines 389-410)
- **Purpose:** Products ko category + search + stock level filter se filter karta hai.
- **Stock Filters:** All → sab, Low → `qty <= min_stock`, Out → `qty <= 0`

---

### Computed Stats (Lines 412-414)
| Stat | Formula | Purpose |
|---|---|---|
| `lowStockCount` | `qty <= min_stock` filter count | Low stock alert items |
| `outOfStockCount` | `qty <= 0` filter count | Out of stock items |
| `totalStockValue` | `sum(price × stock_qty)` | Total inventory value in Rs. |

### JSX Output:
- **Stats Bar:** 4 cards (Low Stock, Out of Stock, Total Products, Inventory Value)
- **Category Grid:** Same 8 categories with drill-down
- **Stock Table:** ID, Brand, Name, Min Level, Current Stock (color-coded), Status, Action menu (View Ledger, Receive Stock, Return Stock)
- **Detail Modal:** Product info + quick adjust buttons (+5, -5) + View Ledger button
- **Stock Ledger Modal:** Purchase history table (Date, Supplier, Type, Qty, Rate, Total, Paid, Balance, Vehicle/GP)
- **Receive Stock Modal:** Supplier select, Qty, Gatepass, Vehicle (External/Personal), Fare, Rate, Total Bill, Paid Amount, Balance to Pay
- **Purchase Return Modal:** Available stock display, Supplier, Return Qty, Vehicle, Fare, Return Rate, Total Value, Cash Received, Supplier Balance Deduction
- **Sale Return Modal:** 2-step (Bill lookup → Item selection with return qty/rate + vehicle + fare)

---

## 3. `Transport.jsx`

**Lines:** 980 | **Size:** 49 KB
**Purpose:** **Vehicle Fleet Management.** Personal aur Rent vehicles manage karta hai — CRUD operations, vehicle earnings ledger (how much fare each vehicle has earned), driver payments, aur fare deductions. Vehicles ka revenue automatically track hota hai jab sales mein transport use hota hai.

### State Variables:

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `activeCounter` | string | JWT-derived | Current counter module |
| `activeTab` | string | `"Personal"` | Personal vs Rent tab |
| `records` | array | `[]` | All vehicles |
| `form` | object | `emptyForm` | Vehicle form {ownership_type, vehicle_number, driver_name, driver_cnic, driver_phone} |
| `editId` | number/null | `null` | Vehicle being edited |
| `showModal` | boolean | `false` | Add/Edit modal |
| `showLedgerModal` | boolean | `false` | Earnings ledger modal |
| `isLedgerMaximized` | boolean | `false` | Fullscreen toggle for ledger |
| `ledgerData` | array | `[]` | Raw ledger records |
| `ledgerFilter` | string | `"all"` | Date filter key |
| `ledgerFrom/To` | string | `""` | Custom date range |
| `ledgerOpeningBalance` | number | `0` | Balance before visible records |
| `selectedVehicle` | object/null | `null` | Vehicle being operated on |
| `showPaymentModal` | boolean | `false` | Driver payment modal |
| `paymentForm` | object | `{amount, notes}` | Payment form data |
| `paymentSource` | string | `"Cash"` | Cash or Bank |
| `bankAccounts` | array | `[]` | Available bank accounts |
| `selectedBank` | string | `""` | Selected bank for payment |
| `liveBalances` | object | `{}` | Real-time account balances |
| `showLessModal` | boolean | `false` | Fare deduction modal |
| `lessForm` | object | `{amount, notes}` | Deduction form data |

### Functions:

---

### `fetchBanks()` — (Lines 115-120)
- **Purpose:** Bank accounts list fetch karta hai (for payment source selection).

---

### `useEffect` — Live Balances (Lines 79-113)
- **Purpose:** Payment modal open hone pe real-time bank balances fetch karta hai.
- **Logic:** `GET /api/banks/balances` → balances object (e.g., `{Cash: 50000, "HBL (****1234)": 30000}`)
- **Auto-selection:** Positive balance wala source auto-select hota hai

---

### `openPayment(vehicle)` — (Lines 126-133)
- **Purpose:** Rent vehicle ke driver ko payment karne ka modal open karta hai.

---

### `handleMakePayment(e)` — (Lines 135-168)
- **Purpose:** Driver ko fare payment karta hai.
- **Validations:**
  1. Amount > outstanding earnings → block
  2. Amount > available balance (Cash/Bank) → block
- **API:** `POST /api/transport/payment` → vehicle_id, paid_amount, notes, payment_type, module_type
- **Effect:** Vehicle ka total_earnings decrease hota hai (paid amount deducted)

---

### `handleLessPayment(e)` — (Lines 170-185)
- **Purpose:** Vehicle earnings se deduction/adjustment apply karta hai.
- **API:** Same endpoint `POST /api/transport/payment` with `payment_type: "Deduction"`
- **Use Case:** Overcharge correction, damage deduction, advance adjustment

---

### `fetchRecords()` — (Lines 187-195)
- **Purpose:** Current counter ke saare vehicles fetch karta hai.
- **API:** `GET /api/transport?type={activeCounter}`
- **Auto-refresh:** 15-second interval

---

### `handleSubmit(e)` — (Lines 204-218)
- **Purpose:** Vehicle create ya update karta hai.
- **API:** POST (new) or PUT (edit) to `/api/transport`

---

### `openLedger(vehicle)` — (Lines 226-258)
- **Purpose:** Vehicle ka earnings ledger open karta hai with opening balance calculation.
- **Logic (complex):**
  1. `GET /api/transport/ledger/{vehicle.id}` → raw ledger data
  2. Data chronologically sort (oldest first)
  3. **Historical impact calculate:** Sum of all earnings - sum of all payments
  4. **Opening balance:** `liveBalance - historicalImpact` (reverse engineering to find initial balance)
  5. State set: data, opening balance

---

### `applyLedgerFilter(filterKey)` — (Lines 260-280)
- **Purpose:** Ledger date filter apply karta hai.
- **Filters:** All, Today, Yesterday, Week, Month, Custom

---

### `processedLedgerData` — useMemo (Lines 282-311)
- **Purpose:** Raw ledger data ko chronological sort + running balance calculate karta hai.
- **Logic:** Har row ke liye:
  - `Outward (Sale)` ya `Inward (Stock)` → earning (balance +)
  - Payment/Deduction → expense (balance -)
  - Running balance continuously update hota hai

---

### `filteredLedgerData` — useMemo (Lines 313-343)
- **Purpose:** Processed data ko date filter se filter karta hai.

---

### `filteredEarnings` — useMemo (Lines 345-352)
- **Purpose:** Filtered period ka net earnings calculate karta hai.
- **"All" filter:** Live total_earnings se directly. **Other filters:** Filtered data se calculate.

---

### `displayedTrips` — useMemo (Lines 354-356)
- **Purpose:** Sirf "Inward (Stock)" type trips count karta hai.

---

### `handleDelete(id)` — (Lines 358-363)
- **Purpose:** Vehicle delete karta hai (soft delete).
- **API:** `DELETE /api/transport/{id}`

---

### `filtered` — Computed (Lines 365-371)
- **Purpose:** Vehicles ko ownership_type (Personal/Rent) + search + deleted status se filter.

### JSX Output:
- **Counter Selection (Admin):** Wholesale, Retail 1, Retail 2 cards
- **Header:** Module title, counter switcher (admin), "Add New Vehicle" button
- **Tab Toggle:** Personal Vehicles | Rent Vehicles
- **Vehicle Table:** Vehicle Number, Driver Name, CNIC, Phone, Total Revenue, Actions (Edit, Delete, View Ledger, Make Payment, Less Payment)
- **Add/Edit Modal:** Ownership type, Vehicle number, Driver name, CNIC, Phone
- **Vehicle Ledger Modal:** Maximizable, printable, date-filterable
  - Print report: Business header, vehicle/driver info, ledger table (S.No, Date, Customer/Bill, Trip Type, Earnings +, Expenses -, Balance)
  - Opening balance row
  - Stats mini-cards (Records count, Filtered Earnings)
  - DataTable with columns: S.No, Date, Trip Type, Party/Details, Earnings (+), Expenses (-), Running Balance
- **Payment Modal:** Amount, Notes, Payment Source (Cash/Bank), Available balance display
- **Less/Deduction Modal:** Deduction amount, Notes/Reason

---

## 📋 Complete Function Index

### Products.jsx
| Function | Line | Purpose |
|---|---|---|
| `Products({ type })` | 43 | Product catalog management component |
| `fetchProducts()` | 84 | Fetch products for current counter |
| `openAdd(cat)` | 138 | Open add product modal |
| `openEdit(e, prod)` | 144 | Open edit product modal |
| `openDetail(prod)` | 161 | Open product detail modal |
| `handleSubmit(e)` | 166 | Create or update product |
| `handleDelete(e, id)` | 192 | Delete product |
| `filteredProducts` | 205 | Category + search filter |

### Stock.jsx
| Function | Line | Purpose |
|---|---|---|
| `Stock({ type })` | 18 | Stock management component |
| `fetchData()` | 92 | Fetch products + suppliers + vehicles |
| `fetchStockHistory(prodId)` | 127 | Product purchase history |
| `updateStock(e, prod, adj)` | 184 | Quick stock ±5 adjustment |
| `handleReceiveStock(e)` | 202 | Purchase entry with cash validation |
| `handlePurchaseReturn(e)` | 270 | Return stock to supplier |
| `handleFetchBill(e)` | 314 | Fetch sale details for return |
| `handleSaleReturn(e)` | 337 | Process customer sale return |
| `filtered` (computed) | 389 | Category + search + stock level filter |

### Transport.jsx
| Function | Line | Purpose |
|---|---|---|
| `Transport({ type })` | 22 | Vehicle fleet management component |
| `fetchBanks()` | 115 | Fetch bank accounts for payment |
| `openPayment(vehicle)` | 126 | Open driver payment modal |
| `handleMakePayment(e)` | 135 | Pay driver with balance validation |
| `handleLessPayment(e)` | 170 | Apply fare deduction |
| `fetchRecords()` | 187 | Fetch vehicles for current counter |
| `handleSubmit(e)` | 204 | Create or update vehicle |
| `openLedger(vehicle)` | 226 | Open earnings ledger with opening balance calc |
| `applyLedgerFilter(key)` | 260 | Apply date filter to ledger |
| `processedLedgerData` (useMemo) | 282 | Sort + running balance calculation |
| `filteredLedgerData` (useMemo) | 313 | Date-filtered ledger data |
| `filteredEarnings` (useMemo) | 345 | Net earnings for filtered period |
| `displayedTrips` (useMemo) | 354 | Inward trip count |
| `handleDelete(id)` | 358 | Soft delete vehicle |
| `filtered` (computed) | 365 | Ownership type + search filter |

---

## 🔑 Key Patterns

- **Counter Isolation:** Har counter (Wholesale, Retail 1, 2, 3) ka data alag hai — `?type=` query parameter se filter
- **Admin Counter Switcher:** Admin sabke data dekh sakta hai by switching counters
- **JWT Fallback Chain:** `type` prop → JWT token → email-based detection → default
- **Cash Balance Validation:** Purchase entry mein actual available cash check hota hai before payment
- **Opening Balance Calculation:** Transport ledger mein reverse engineering se opening balance calculate hota hai
