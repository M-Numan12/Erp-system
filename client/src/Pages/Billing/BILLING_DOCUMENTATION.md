# 📁 Billing Folder — Complete Documentation

> **Path:** `client/src/Pages/Billing/`
> **Total Files:** 11
> **Purpose:** Yeh folder poora POS (Point of Sale) / Billing system handle karta hai — Wholesale aur Retail (1, 2, 3) counters ke liye. Yahan se sale create hoti hai, cart manage hota hai, receipts print hoti hain, customer ledger dekhte hain, sale return hota hai, WhatsApp pe ledger bhejte hain, aur held bills manage karte hain.

---

## 📊 Folder Architecture Overview

```
Wholesale.jsx ──┐
Retail1.jsx  ───┤
Retail2.jsx  ───┼──► CounterHub.jsx ──► Billing.jsx (Smart Router)
Retail3.jsx  ───┘                            │
                                             ├──► WholesaleBilling.jsx  (POS Engine)
                                             ├──► Retail1Billing.jsx    (POS Engine)
                                             ├──► Retail2Billing.jsx    (POS Engine)
                                             └──► Retail3Billing.jsx    (POS Engine)

Retail.jsx ──► Legacy Placeholder (unused)
```

---

## 📁 File-by-File Deep Explanation

---

## 1. `Billing.jsx`

**Lines:** 84 | **Size:** 2.5 KB
**Purpose:** Yeh file **Smart Router / Switcher** hai — decide karti hai ke kaunsa billing module render hona chahiye (Wholesale, Retail 1, Retail 2, ya Retail 3). Admin users ke liye tab-switcher bhi dikhati hai.

### Imports:
- `React`, `useContext`, `useState` from React
- `AuthContext` — logged-in user info ke liye
- `WholesaleBilling`, `Retail1Billing`, `Retail2Billing`, `Retail3Billing` — actual billing engine components

### Functions:

---

### `Billing({ type })` — Main Component (Line 8)
- **Props:** `type` — optional string (`"Wholesale"`, `"Retail 1"`, `"Retail 2"`, `"Retail 3"`)
- **Context:** `AuthContext` se `user` object leta hai
- **State:** `adminActiveTab` — admin ke liye currently selected tab (default: `"Wholesale"`)
- **Kya karta hai:** Agar `type` prop diya hai toh woh module directly render karta hai. Agar admin logged in hai aur koi `type` nahi diya toh admin ko tabs dikhata hai (Wholesale, Retail 1, Retail 2) taake admin switch kar sake. Normal counter users ke liye unka assigned `module_type` use hota hai.

---

### `getModuleType()` — Helper Arrow Function (Line 14)
- **Return:** String — `"Wholesale"`, `"Retail 1"`, `"Retail 2"`, or `"Retail 3"`
- **Logic:**
  1. Agar `type` prop hai → use directly return karo
  2. Agar user admin hai → `adminActiveTab` return karo
  3. Token se JWT decode karke `module_type` nikalo:
     - `localStorage` se token lete hain
     - `atob()` se JWT payload decode karte hain
     - `user.module_type` nikaalte hain
  4. Fallback: `user.module_type` ya `"Wholesale"`
- **Deep Detail:** Yeh function teen jagah se user ka role check karta hai: (a) AuthContext, (b) localStorage JWT token, (c) sessionStorage JWT token. Isse ensure hota hai ke chahe context load na hua ho tab bhi correct module milega.

---

### `renderContent()` — Conditional Renderer (Line 38)
- **Return:** JSX — appropriate billing component
- **Logic:** `moduleType` ki value check karke:
  - `"Retail 1"` → `<Retail1Billing />`
  - `"Retail 2"` → `<Retail2Billing />`
  - `"Retail 3"` → `<Retail3Billing />`
  - Default → `<WholesaleBilling />`
- **Deep Detail:** Har billing component ko `type` prop pass karta hai taake component ko pata ho ke woh kis counter ka hai.

### JSX Output:
- **Admin View:** Top pe tab buttons (Wholesale, Retail 1, Retail 2) + selected content neeche
- **Counter User View:** Directly `renderContent()` return hota hai — koi switcher nahi

---

## 2. `CounterHub.jsx`

**Lines:** 54 | **Size:** 2.5 KB
**Purpose:** Yeh **Multi-Tab Navigation Hub** hai har counter ke liye. Jab koi counter user (Wholesale/Retail 1/2/3) apna dashboard kholta hai, toh usse yeh hub milta hai jisme POS, Products, Stock, Customers, Suppliers, aur Expenses ke tabs hote hain.

### Imports:
- React, useState
- Lucide icons: `ShoppingCart`, `Package`, `Boxes`, `History`, `Users`, `UserSquare2`, `TrendingUp`, `Wallet`
- `Billing`, `Products`, `Stock`, `Customers`, `Suppliers`, `Expenses` — tab content components
- `ModulePages.scss` — styling

### Functions:

---

### `CounterHub({ type = "Wholesale" })` — Main Component (Line 14)
- **Props:** `type` — module type string, default `"Wholesale"`
- **State:** `activeTab` — currently active tab (default: `"POS"`)
- **Kya karta hai:**
  - Ek top navigation bar render karta hai jisme 6 tabs hain
  - Har tab apna icon use karta hai (lucide-react se)
  - Active tab highlight hoti hai CSS class `active` se
  - `type` prop har child component ko forward karta hai
  - Hub badge dikhata hai module type ke saath (e.g., "Wholesale Hub" ya "Retail 1 Hub")

---

### `renderContent()` — Tab Content Renderer (Line 17)
- **Return:** JSX — corresponding page component
- **Logic:** Switch-case based on `activeTab`:

| activeTab Value | Rendered Component | Description |
|---|---|---|
| `'POS'` | `<Billing type={type} />` | Point of Sale + Sales History |
| `'Products'` | `<Products type={type} />` | Product Management |
| `'Stock'` | `<Stock type={type} />` | Stock/Inventory Management |
| `'Customers'` | `<Customers type={type} />` | Customer Management |
| `'Suppliers'` | `<Suppliers type={type} />` | Supplier Management |
| `'Expenses'` | `<Expenses type={type} />` | Expense Management |
| Default | `<Billing type={type} />` | Fallback to POS |

- **Deep Detail:** Har rendered component ko `type` prop deta hai taake woh sirf apne module ka data fetch kare (e.g., Retail 1 ke products, Retail 1 ke customers, etc.)

---

## 3. `Retail.jsx`

**Lines:** 12 | **Size:** 280 bytes
**Purpose:** Yeh ek **legacy placeholder page** hai. Sirf ek static heading dikhata hai: "Retail Sale Module". Yeh pehle use hota tha jab retail billing implement nahi hui thi. Ab yeh practically unused hai.

### Functions:

---

### `Retail()` — Static Page Component (Line 4)
- **Props:** None
- **Return:** Simple div with:
  - `<h2>Retail Sale Module</h2>`
  - `<p>Manage daily billing, POS, and walk-in customers.</p>`
- **Uses:** `Dashboard.scss` for styling
- **Deep Detail:** Koi dynamic logic nahi hai — pure static content. Yeh file cleanup ke liye mark ki ja sakti hai.

---

## 4. `Retail1.jsx`

**Lines:** 7 | **Size:** 152 bytes
**Purpose:** **Retail 1 Counter Entry Point.** Yeh sirf `CounterHub` ko `type="Retail 1"` deke render karta hai.

### Functions:

---

### `Retail1()` — Wrapper Component (Line 4)
- **Props:** None
- **Return:** `<CounterHub type="Retail 1" />`
- **Deep Detail:** Yeh routing ke liye hai — jab sidebar menu se "Retail 1" click hota hai, toh yeh component load hota hai. React Router is component ko directly render karta hai, aur yeh CounterHub ko "Retail 1" type pass kar deta hai. Iska koi internal state ya logic nahi hai.

---

## 5. `Retail2.jsx`

**Lines:** 7 | **Size:** 152 bytes
**Purpose:** **Retail 2 Counter Entry Point.** Same pattern as Retail1.jsx.

### Functions:

---

### `Retail2()` — Wrapper Component (Line 4)
- **Props:** None
- **Return:** `<CounterHub type="Retail 2" />`

---

## 6. `Retail3.jsx`

**Lines:** 7 | **Size:** 146 bytes
**Purpose:** **Retail 3 Counter Entry Point.**

### Functions:

---

### `Retail3()` — Wrapper Component (Line 4)
- **Props:** None
- **Return:** `<CounterHub type="Retail 3" />`

---

## 7. `Wholesale.jsx`

**Lines:** 7 | **Size:** 155 bytes
**Purpose:** **Wholesale Counter Entry Point.**

### Functions:

---

### `Wholesale()` — Wrapper Component (Line 4)
- **Props:** None
- **Return:** `<CounterHub type="Wholesale" />`

---

## 8. `WholesaleBilling.jsx` ⭐ (MAIN POS ENGINE)

**Lines:** 2549 | **Size:** 131 KB
**Purpose:** Yeh **MAIN POS ENGINE** hai Wholesale counter ke liye. Is file mein poora Point of Sale system hai — product catalog, shopping cart, customer management, transport vehicle selection, payment processing, receipt printing, sale history, customer ledger, sale return, WhatsApp ledger sharing, bill hold/resume, aur bohot kuch.

> ⚠️ **Yeh sabse badi aur sabse important file hai Billing folder mein. Har function deeply explain kiya gaya hai neeche.**

### API Configuration (Lines 1-26)

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : 'https://erp-backend-3rf8.onrender.com/api';

const PRODUCTS_API  = API_BASE_URL + "/products";
const CUSTOMERS_API = API_BASE_URL + "/customers";
const SALES_API     = API_BASE_URL + "/sales";
const TRANSPORT_API = API_BASE_URL + "/transport";
```

- Pehle `.env` file check hoti hai API URL ke liye
- Agar nahi mila toh fallback production URL use hota hai

### Constants (Line 28)
```javascript
const CATEGORIES = ["All", "Cement", "Steel", "Crush", "Bricks", "Sand", "Tiles Bond", "Chips", "Other"];
```
Product categories for filtering POS grid.

### Imports:
- **React:** `useState`, `useEffect`, `useContext`, `useMemo`, `useRef`
- **Lucide Icons:** `ShoppingCart`, `Search`, `Trash2`, `User`, `Plus`, `Minus`, `Printer`, `CreditCard`, `Banknote`, `Truck`, `Tag`, `X`, `CheckCircle`, `Pencil`, `History`, `ArrowLeft`, `ChevronLeft`, `FileText`, `Download`, `Filter`, `Package`, `Phone`, `MapPin`, `ArrowDownCircle`, `Hash`, `Users`, `MessageCircle`
- **PrimeReact:** `Button`, `Dialog`, `InputText`, `Dropdown`, `AutoComplete`, `DataTable`, `Column`, `MultiSelect`
- **Custom:** `ActionMenu`, `AuthContext`
- **Styles:** `ModulePages.scss`

---

### 🔧 Utility Functions (File-Level)

---

### `formatItemName(brand, name)` — (Lines 30-47)
- **Purpose:** Brand aur product name ko intelligently combine karta hai bina duplication ke.
- **Parameters:**
  - `brand` (string) — Product ka brand name (e.g., "DG", "Maple Leaf")
  - `name` (string) — Product ka name (e.g., "DG Cement 50kg")
- **Return:** Formatted string
- **Logic (step by step):**
  1. Dono values trim karta hai
  2. Agar brand empty ya `"undefined"` hai → sirf name return karo
  3. Agar name empty hai → sirf brand return karo
  4. Case-insensitive check: agar name mein brand already included hai → sirf name return karo
  5. Case-insensitive check: agar brand mein name already included hai → sirf brand return karo
  6. Otherwise → `"brand name"` combined return karo
- **Example:**
  - `formatItemName("DG", "DG Cement")` → `"DG Cement"` (duplicate nahi)
  - `formatItemName("Maple Leaf", "Cement 50kg")` → `"Maple Leaf Cement 50kg"` (combined)
  - `formatItemName("", "Steel Bar")` → `"Steel Bar"` (no brand)

---

### 🏗️ Main Component: `WholesaleBilling({ type })`

---

### All State Variables (Lines 49-267)

Yeh component 60+ state variables use karta hai. Main categories mein divide kiya hai:

#### WhatsApp States
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `showWhatsAppModal` | boolean | `false` | WhatsApp preview modal visibility |
| `whatsAppPdfUrl` | string | `""` | Generated PDF ka blob URL (preview ke liye) |
| `whatsAppPdfBase64` | string | `""` | PDF ka base64 data (API ko bhejne ke liye) |
| `whatsappCustomer` | object/null | `null` | Jis customer ko PDF bhejna hai |

#### View & Master Data
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `view` | string | `"POS"` | Current view — `"POS"` ya `"History"` |
| `products` | array | `[]` | All products list |
| `customers` | array | `[]` | All customers list |
| `sales` | array | `[]` | All sales records |
| `vehicles` | array | `[]` | All transport vehicles |
| `bankAccounts` | array | `[]` | Bank accounts for payment |

#### Cart States
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `cart` | array | `[]` | Current cart items `[{id, name, price, qty, subtotal}]` |
| `search` | string | `""` | Product search term |
| `selectedCategory` | string | `"All"` | Active product category filter |

#### Customer States
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `selectedCustomer` | object/null | `null` | Matched registered customer |
| `customerName` | string | `""` | Customer name input |
| `customerPhone` | string | `""` | Customer phone input |
| `customerAddress` | string | `""` | Customer address input |

#### Payment States
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `discount` | string | `""` | Discount amount |
| `delivery` | string | `""` | Delivery charges |
| `paidAmount` | string | `""` | Amount paid by customer |
| `steelLabour` | string | `""` | Steel labour charges (Retail only) |
| `paymentType` | string | `"Cash"` | Cash / Bank / Credit |
| `selectedBank` | string | `""` | Selected bank account |
| `bankDigits` | string | `""` | Bank account last digits |

#### Registration Modal
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `showRegModal` | boolean | `false` | Registration modal visible |
| `regModalName` | string | `""` | Customer name in modal |
| `regModalPhone` | string | `""` | Customer phone in modal |
| `regModalAddress` | string | `""` | Customer address in modal |
| `regModalLoading` | boolean | `false` | Registration loading state |

#### Sale Return States
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `showReturnModal` | boolean | `false` | Return modal visible |
| `returnBillNo` | string | `""` | Bill number for return |
| `returnLoading` | boolean | `false` | Return processing loading |
| `returnStep` | number | `1` | Return modal step (1 = fetch, 2 = select items) |
| `returnSaleDetails` | object/null | `null` | Fetched sale details |
| `selectedItemsToReturn` | array | `[]` | Items selected for return |
| `refundAmount` | number | `0` | Cash refund amount |
| `refundMethod` | string | `"Cash"` | Refund via Cash/Bank |
| `showReturnSlip` | boolean | `false` | Return receipt visible |
| `lastReturnSlipData` | object/null | `null` | Return receipt data |
| `returnVehicleType` | string | `"Rent"` | Return vehicle type |
| `returnVehicleId` | string | `""` | Return vehicle ID |
| `returnDeliveryCharges` | number | `0` | Return delivery charges |

#### Transport States
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `transportType` | string | `""` | Personal / Rent / Supplier |
| `selectedVehicleIds` | array | `[]` | Selected vehicle IDs |
| `supplierVehicleNumber` | string | `""` | Manually entered supplier vehicle |

#### Ledger States
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `showLedgerModal` | boolean | `false` | Ledger modal visible |
| `ledgerData` | array | `[]` | Raw ledger records |
| `ledgerFrom` | string | `""` | Ledger date from |
| `ledgerTo` | string | `""` | Ledger date to |
| `ledgerFilter` | string | `"all"` | Active filter key |
| `selectedCustForLedger` | object/null | `null` | Customer whose ledger is open |
| `ledgerSearch` | string | `""` | Search within ledger |

#### Hold Bills
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `heldBills` | array | localStorage | Bills on hold (persisted) |
| `showHoldModal` | boolean | `false` | Held bills modal visible |

#### Sales History
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `salesDateFilter` | string | `"Today"` | Active date filter |
| `salesCustomStart` | string | `""` | Custom range start |
| `salesCustomEnd` | string | `""` | Custom range end |
| `salesSearch` | string | `""` | Search in sales history |
| `selectedSales` | array | `[]` | Admin selected sales (for bulk delete) |

#### UI & Loading States
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `loading` | boolean | `false` | Global loading indicator |
| `showSuccess` | boolean | `false` | Sale success modal |
| `lastSaleId` | number/null | `null` | Last created sale ID |
| `showCustomerSection` | boolean | `true` | Customer section collapsed/expanded |
| `showTransportSection` | boolean | `true` | Transport section collapsed/expanded |
| `showPaymentSection` | boolean | `true` | Payment section collapsed/expanded |
| `receiptData` | object/null | `null` | Data for thermal receipt |

#### Edit Mode
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `editId` | number/null | `null` | Sale ID being edited |
| `originalItems` | object | `{}` | Original item quantities (for stock adjustment) |

#### Confirm Dialog
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `showConfirmModal` | boolean | `false` | Confirm dialog visible |
| `confirmMessage` | string | `""` | Dialog message |
| `confirmAction` | function/null | `null` | Callback on confirm |

#### Labour
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `labourGroups` | array | `[]` | Available labour group names |
| `selectedLabourGroup` | string | `""` | Selected group for this sale |
| `labourWages` | string | `""` | Labour wages amount |

---

### 🔧 All Functions — Deep Explanation

---

### `dataURItoBlob(dataURI)` — (Lines 57-71)
- **Purpose:** Base64 data URI ko browser Blob object mein convert karta hai.
- **Parameters:** `dataURI` — base64 encoded string (e.g., `data:application/pdf;base64,JVBERi...`)
- **Return:** `Blob` object ya `null` (error case)
- **Logic (step by step):**
  1. `dataURI.split(',')[1]` se base64 data nikalta hai
  2. `atob()` se base64 decode karta hai → raw binary string
  3. MIME type extract karta hai: `data:application/pdf;base64` → `application/pdf`
  4. `ArrayBuffer` create karta hai decoded bytes ki length ka
  5. `Uint8Array` mein har byte copy karta hai using `charCodeAt()`
  6. `new Blob([ab], { type: mimeString })` se Blob object banata hai
  7. Error pe `null` return karta hai
- **Use Case:** WhatsApp modal mein PDF preview ke liye — base64 PDF ko blob URL mein convert karke iframe mein dikhata hai.

---

### `closeWhatsAppModal()` — (Lines 73-81)
- **Purpose:** WhatsApp modal cleanly close karta hai aur saara temporary data clear karta hai.
- **Logic:**
  1. Agar `whatsAppPdfUrl` exist karta hai toh `URL.revokeObjectURL()` call karta hai — yeh browser memory se blob URL free karta hai
  2. `whatsAppPdfUrl` → empty string
  3. `whatsAppPdfBase64` → empty string
  4. `whatsappCustomer` → null
  5. `showWhatsAppModal` → false
- **Why important:** `URL.revokeObjectURL()` call karna zaruri hai warna memory leak hoti hai — har blob URL browser memory mein ek reference rakhta hai.

---

### `handleConfirmWhatsAppSend()` — (Lines 83-141)
- **Purpose:** Customer ke WhatsApp pe ledger PDF document bhejta hai backend API ke through.
- **Async:** Yes
- **Logic (detailed step by step):**

  **Step 1: Phone Number Normalization**
  - Customer ka phone number lete hain
  - **Urdu/Arabic digit conversion:** `۰` → `0`, `۱` → `1`, ... `۹` → `9` (regex replace)
  - Non-numeric characters remove: `replace(/[^0-9]/g, '')`
  - **Pakistani format handling:**
    - `00` prefix (international) → remove first 2 digits
    - `0` prefix (local) → replace with `92` (Pakistan country code)
    - 10 digits starting with `3` → prefix `92` (e.g., `3001234567` → `923001234567`)
    - `920` prefix fix → `92` (e.g., `9203001234567` → `923001234567`)
    - Length > 12 when starting with `923` → truncate to 12

  **Step 2: API Call**
  - `POST /api/sales/send-document`
  - Body: `{ to: phone, document: base64PDF, filename: "Ledger_CustomerName.pdf" }`
  - Headers: Content-Type + Bearer token

  **Step 3: On Success**
  - Pre-filled WhatsApp message create karta hai with file URL
  - `window.open()` se WhatsApp Web URL open karta hai new tab mein
  - Modal close karta hai

  **Step 4: On Failure**
  - Alert dikhaata hai error message ke saath

---

### `getEffectiveStock(productId)` — (Lines 199-206)
- **Purpose:** Product ka "effective" available stock calculate karta hai, edit mode ko consider karke.
- **Parameters:** `productId` — product ka ID
- **Return:** Number — effective stock quantity
- **Logic:**
  1. Products list mein se matching product find karta hai
  2. `stock_quantity` nikalta hai (default 0)
  3. **Normal Mode (editId = null):** Current stock directly return
  4. **Edit Mode (editId = sale ID):** Original sale ki item quantity wapas add karta hai current stock mein
     - Example: Product A ka stock 10 hai, original sale mein 5 use huay thay
     - Effective stock = 10 + 5 = 15 (kyunke edit save hone pe purane 5 restore ho jayenge)
- **Why critical:** Bina is function ke edit mode mein stock validation galat hoga — user apni purani qty bhi use nahi kar payega.

---

### `calculatedLedgerData` — useMemo (Lines 208-219)
- **Purpose:** Raw ledger data ko chronologically sort karke running balance calculate karta hai.
- **Dependencies:** `[ledgerData]` — sirf jab raw data change ho tab recalculate
- **Logic:**
  1. Ledger data ko `created_at` ascending order mein sort karta hai (oldest first)
  2. `currentBal = 0` se start karta hai
  3. Har row ke liye:
     - `debit = net_amount` (sale total — customer pe charha)
     - `credit = paid_amount` (payment received — customer ne diya)
     - `currentBal += (debit - credit)` — running balance update
  4. Har row mein `running_balance` field add karta hai
- **Output Example:**
  ```
  Row 1: Sale Rs.5000, Paid Rs.3000 → Balance: 2000
  Row 2: Sale Rs.2000, Paid Rs.0    → Balance: 4000
  Row 3: Sale Rs.0,    Paid Rs.1000 → Balance: 3000 (payment received)
  ```

---

### `filteredLedgerData` — useMemo (Lines 225-257)
- **Purpose:** Calculated ledger data ko user ke search term se filter karta hai.
- **Dependencies:** `[calculatedLedgerData, ledgerSearch]`
- **Logic:**
  1. Agar search empty hai → full data return
  2. Har row mein yeh fields search hote hain:
     - **Common:** Date (DD/MM/YYYY format), debit amount, credit amount, balance
     - **Sale Rows (net_amount > 0):**
       - Bill ID: `#sal-123` format
       - Item names aur rates
       - "delivery" keyword (agar delivery charges hain)
       - "discount" keyword (agar discount hai)
     - **Payment Rows (net_amount = 0):**
       - Payment ID: `#pay-123` format
       - "payment received" keyword
       - Payment type (Cash, Bank, etc.)

---

### `filteredSales` — useMemo (Lines 274-336)
- **Purpose:** Sales history ko date filter aur search term se filter karta hai.
- **Dependencies:** `[sales, salesDateFilter, salesSearch, salesCustomStart, salesCustomEnd]`
- **Logic:**

  **Step 1: Role-Based Restriction**
  - Non-admin users sirf 30 din purani sales dekh sakte hain
  - Admin has no date restriction

  **Step 2: Date Filtering**
  | Filter Value | Behavior |
  |---|---|
  | `"Today"` | Sirf aaj ki date ki sales |
  | `"Yesterday"` | Sirf kal ki sales |
  | `"Custom"` | User-specified date range (start to end) |
  | `"All Time"` / `"Last 30 Days"` | Sab records |

  **Step 3: Text Search (case-insensitive)**
  - Bill ID: `#sal-123`
  - Customer name, phone, address
  - Payment type (Cash, Bank, Credit)
  - Status (Completed, Returned)
  - Item names and brands (JSON parsed from `items` field)

---

### `triggerConfirm(message, onConfirm)` — (Lines 268-273)
- **Purpose:** Reusable confirmation dialog trigger karta hai (mainly delete ke liye).
- **Parameters:**
  - `message` (string) — Dialog mein dikhne wala text
  - `onConfirm` (function) — "Yes, Delete" click hone pe execute hone wala callback
- **Logic:** State set karta hai — message, action, aur modal visibility. "Yes, Delete" click hone pe stored callback execute hota hai.

---

### `useEffect` — Held Bills Persistence (Lines 338-341)
- **Purpose:** Jab bhi `heldBills` array change ho, localStorage mein save karta hai.
- **Dependencies:** `[heldBills]`
- **Logic:** `localStorage.setItem('heldBills', JSON.stringify(heldBills))`
- **Why important:** Browser close hone pe bhi held bills preserve hote hain.

---

### `fetchData()` — (Lines 347-381)
- **Purpose:** Saara master data ek saath API se fetch karta hai.
- **Async:** Yes
- **Logic (step by step):**
  1. Authorization header set karta hai (Bearer token)
  2. `Promise.all()` se **6 API calls simultaneously** karta hai:
     - `GET /api/products?type={activeTab}` → Products list
     - `GET /api/sales?type={activeTab}` → Sales records
     - `GET /api/transport?type={activeTab}` → Vehicles
     - `GET /api/banks` → Bank accounts
     - `GET /api/customers?type={activeTab}` → Customers
     - `GET /api/labours` → Labour groups
  3. Responses parse karke state mein set karta hai:
     - `setProducts(prods)` — array check ke saath
     - `setSales(sls)` — array check
     - `setVehicles(vehs)` — array check
     - `setBankAccounts(banks)` — **filtered:** `Admin Recipient` type exclude + sirf current module ke banks
     - `setCustomers(custs)` — array check
     - `setLabourGroups(unique group names)` — `Set` se deduplicate karta hai
  4. **Caching (localStorage):** Saara fetched data localStorage mein save karta hai:
     - `cache_products_{activeTab}`
     - `cache_customers_{activeTab}`
     - `cache_vehicles_{activeTab}`
     - `cache_sales_{activeTab}`
     - `cache_banks_list`

---

### `useEffect` — Component Mount & Cache Pre-loading (Lines 383-401)
- **Purpose:** Component mount hone pe pehle cache se instant data load karta hai, phir background mein fresh data fetch karta hai.
- **Dependencies:** `[activeTab]`
- **Logic:**
  1. **Cache Read (Instant):** localStorage se cached data parse karke state mein set karta hai
  2. **Fresh Fetch (Background):** `fetchData()` call karta hai jo API se fresh data lata hai
- **Pattern Name:** "Stale-While-Revalidate" — user ko 0-second delay milti hai cached data se, phir silently fresh data replace ho jata hai.

---

### `handleCustomerChange(val)` — (Lines 402-413)
- **Purpose:** Customer name input change hone pe auto-fill karta hai phone aur address agar registered customer match ho.
- **Parameters:** `val` — typed customer name string
- **Logic:**
  1. `customerName` state update karta hai
  2. Customers list mein case-insensitive match dhundhta hai
  3. **Match found:** Phone, address auto-fill + `selectedCustomer` set ho jata hai
  4. **No match:** `selectedCustomer` null ho jata hai (walk-in customer)

---

### `addToCart(product)` — (Lines 414-430)
- **Purpose:** Product ko cart mein add karta hai. Agar pehle se hai toh quantity badha deta hai.
- **Parameters:** `product` — product object from catalog `{id, name, price, stock_quantity, ...}`
- **Logic:**
  1. Cart mein same product ID check karta hai
  2. **Already in cart:** `qty + 1`, `subtotal = newQty * price`
  3. **New item:** Cart mein add: `{id, name, price: parseFloat(product.price), qty: 1, subtotal: parseFloat(product.price)}`

---

### `updateQty(id, delta)` — (Lines 431-441)
- **Purpose:** Cart item ki quantity increment/decrement karta hai +/- buttons se.
- **Parameters:**
  - `id` — product ID
  - `delta` — change value (+1 ya -1)
- **Logic:**
  - `currentQty + delta` = new quantity
  - `Math.max(0.01, ...)` — minimum 0.01 (zero nahi hone deta, 0.01 bags bhi sell ho sakte hain e.g. crushed material)
  - 2 decimal places tak round karta hai
  - Subtotal recalculate: `newQty * price`

---

### `setQtyDirect(id, value)` — (Lines 442-459)
- **Purpose:** Cart item ki quantity manually type karne ke liye (input field handler).
- **Parameters:**
  - `id` — product ID
  - `value` — raw string input value (e.g., "2", "2.", "2.5")
- **Logic:**
  1. `parseFloat(value)` — numeric value nikalta hai
  2. NaN handle → empty string set karta hai
  3. Negative handle → `Math.max(0, parsed)`
  4. **Decimal handling (special):**
     - Agar user "2." type kare (decimal point abhi complete nahi) → raw string preserve karta hai input mein
     - Subtotal calculation mein parsed numeric value use hota hai
  5. Subtotal: `subtotalQty * price`
- **Why this complexity:** Normal `parseFloat("2.")` → `2` ban jata hai, toh user "2." type karke aur decimal nahi likh pata. Isliye raw string input mein rakhte hain jab tak user decimal complete kare.

---

### `updatePrice(id, newPrice)` — (Lines 460-469)
- **Purpose:** Cart item ka price programmatically update karta hai.
- **Parameters:** `id`, `newPrice`
- **Logic:** `parseFloat(newPrice)` → price set → subtotal = qty * newPrice

---

### `setPriceDirect(id, value)` — (Lines 470-487)
- **Purpose:** Cart item ka price manually type karne ke liye (input field handler).
- **Logic:** Same decimal handling as `setQtyDirect` — raw string preserve karta hai for smooth decimal typing.

---

### `holdBill()` — (Lines 488-524)
- **Purpose:** Current cart/bill ko "hold" pe rakhta hai taake user nayi sale start kar sake.
- **Logic:**
  1. **Validation:** Cart empty check → alert + return
  2. **Save current state:** Ek object mein sab kuch save:
     ```javascript
     { id: Date.now(), time: currentTime, cart, customerName, customerPhone,
       customerAddress, discount, delivery, steelLabour, paidAmount,
       paymentType, selectedBank, transportType, selectedVehicleIds, selectedCustomer }
     ```
  3. `heldBills` array mein push karta hai
  4. **Reset POS:** Cart, customer, discount, delivery, steelLabour, paidAmount, transport — sab clear
  5. Alert: "Current bill is now on hold."
- **Use Case:** Customer abhi decide nahi kar raha, toh bill hold karo, dusre customer ki sale karo, phir wapas resume karo.

---

### `resumeBill(held)` — (Lines 525-543)
- **Purpose:** Held bill wapas restore karta hai POS mein.
- **Parameters:** `held` — held bill object (from heldBills array)
- **Logic:**
  1. Saare state variables restore karta hai held object se
  2. **Backward compatibility:** `selectedVehicleIds` array handle karta hai — purane format mein `selectedVehicleId` (single) tha, naye mein array hai
  3. Held bills list se is bill ko remove karta hai
  4. Hold modal close karta hai

---

### `removeFromCart(id)` — (Line 544)
- **Purpose:** Cart se ek specific item remove karta hai.
- **Logic:** `cart.filter(item => item.id !== id)` — matching ID wala item nikaal deta hai.

---

### Computed Values (Lines 546-551)

```javascript
const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
const isRetail = activeTab === 'Retail 1' || activeTab === 'Retail 2';
const steelLabourVal = isRetail ? parseFloat(steelLabour || 0) : 0;
const netTotal = Math.round((subtotal - discount + delivery + steelLabourVal) * 100) / 100;
const balance = Math.round((netTotal - paidAmount) * 100) / 100;
```

| Variable | Formula | Description |
|---|---|---|
| `subtotal` | Sum of all `item.subtotal` | Cart items ka total |
| `isRetail` | activeTab check | Retail counter hai ya nahi |
| `steelLabourVal` | Retail only | Steel labour charges (sirf Retail mein) |
| `netTotal` | `subtotal - discount + delivery + steelLabour` | Final bill amount (rounded to 2 decimals) |
| `balance` | `netTotal - paidAmount` | Customer pe baaqi amount |

---

### `fetchSaleForReturn()` — (Lines 552-574)
- **Purpose:** Sale return ke liye purani sale ki details fetch karta hai bill number se.
- **Async:** Yes
- **Logic:**
  1. `returnBillNo` empty check
  2. `GET /api/sales/{returnBillNo}` call
  3. **Success:**
     - Sale details state mein save
     - Items ko return format mein convert: har item ko `return_qty = qty` (full return by default)
     - Return modal step 2 pe switch
  4. **Failure:** Alert "Sale not found"

---

### `handleSaleReturn(e)` — (Lines 576-628)
- **Purpose:** Selected items ka sale return process karta hai — stock wapas aata hai inventory mein.
- **Async:** Yes
- **Parameters:** `e` — form submit event
- **Logic:**
  1. `POST /api/sales/return` pe request:
     ```javascript
     {
       sale_id: returnBillNo,
       items_to_return: [selected items with return_qty],
       refund_amount: refundAmount,
       refund_method: refundMethod,
       vehicle_id: returnVehicleId,
       vehicle_type: returnVehicleType,
       delivery_charges: returnDeliveryCharges
     }
     ```
  2. **Success:**
     - Return slip data save karta hai (for receipt printing)
     - Modals close
     - Data refresh via `fetchData()`
     - Alert: "Stock successfully returned to inventory!"
  3. **Return Slip Data:** Original bill, customer name, returned items, refund info, vehicle info, date

---

### `proceedWithCheckout(custObj, custName, custPhone, custAddress)` — (Lines 629-763)
- **Purpose:** **Core checkout function** — sale ko server pe save karta hai. Yeh function actual API call karta hai.
- **Async:** Yes
- **Parameters:**
  - `custObj` — registered customer object (ya null for walk-in)
  - `custName`, `custPhone`, `custAddress` — customer details
- **Logic (detailed step by step):**

  **Step 1: Payment Type Finalize**
  - Agar `paymentType === 'Bank'`:
    - Bank selected hona zaruri hai → alert
    - Format: `"Bank - {bankName}"`

  **Step 2: Sale Data Object Build**
  ```javascript
  {
    customer_name, customer_phone, customer_address,
    vehicle_type, vehicle_id, vehicle_id2, vehicle_ids, vehicle_number,
    total_amount: subtotal,
    discount, delivery_charges, steel_labour, net_amount, paid_amount, balance_amount,
    payment_type, sale_type: activeTab,
    items: [{ ...item, price, qty, subtotal }],
    labour_group
  }
  ```

  **Step 3: API Call**
  - **New Sale:** `POST /api/sales`
  - **Edit Mode:** `PUT /api/sales/{editId}`
  - Headers: Content-Type + Authorization

  **Step 4: Labour Logging (if selected)**
  - `POST /api/labours/work-history`
  - Records loading work: `"Loading cement for Bill #{saleId} ({customerName})"`

  **Step 5: Balance Calculation**
  - **Walk-in customer:** Simple balance (this sale only)
  - **Registered customer:** Server se `customer_balance` use karta hai (ya fallback formula: `existing balance + sale balance`)
  - Previous balance: `finalBal - currentBalance`

  **Step 6: Receipt Data Build**
  - Sab sale details, items, amounts, balance, payment method, vehicle info, labour group — sab receipt object mein

  **Step 7: State Reset**
  - Cart, editId, originalItems, discount, delivery, steelLabour, paidAmount, customer fields, transport, bank, labour — sab clear

  **Step 8: Data Refresh**
  - `fetchData()` call for fresh data

---

### `handleCheckout()` — (Lines 765-812)
- **Purpose:** Checkout button ka main handler — saari validations karke `proceedWithCheckout` call karta hai.
- **Async:** Yes
- **Logic (validation chain):**

  1. **Empty Cart Check:**
     - `cart.length === 0` → alert "Cart is empty!"

  2. **Master Inventory Lockdown:**
     - Har cart item ki qty check karta hai `getEffectiveStock()` se
     - Agar koi item stock se zyada hai → alert with item name + sale BLOCKED

  3. **Overpayment Check:**
     - `paidAmount > netTotal` → alert "Paid amount cannot be more than total!"

  4. **Unregistered Customer Credit Check:**
     - Agar balance pending hai (customer ne poora nahi diya)
     - Aur customer registered nahi hai (selectedCustomer = null)
     - Walk-in names check: "walk-in customer", "walking customer", "walk-in", "walking", empty
     - **Action:** Registration modal open karta hai (customer ko register karna padega credit sale ke liye)

  5. **All Valid → `proceedWithCheckout()`**

---

### `handleRegisterAndCheckout()` — (Lines 814-877)
- **Purpose:** Registration modal se customer register karta hai aur phir checkout complete karta hai.
- **Async:** Yes
- **Logic:**

  1. **Validations:**
     - Name required (empty check)
     - Walk-in type names reject: "walk-in customer", "walking customer", "walk-in", "walking"
     - Phone required

  2. **Existing Customer Check:**
     - Name ya phone se match karta hai existing customers mein
     - Match mila → us customer ko use karta hai (naya nahi banata)

  3. **New Customer Registration:**
     - `POST /api/customers`
     - Body: `{ name, phone, address, balance: "0", module_type: activeTab }`
     - Response se customer object milta hai

  4. **POS State Update:**
     - `selectedCustomer`, `customerName`, `customerPhone`, `customerAddress` set karta hai

  5. **Checkout:**
     - Registration modal close
     - `proceedWithCheckout()` call with registered customer

---

### `openLedger(customer, from, to, filter)` — (Lines 879-900)
- **Purpose:** Customer ka ledger (account statement) open karta hai modal mein.
- **Async:** Yes
- **Parameters:**
  - `customer` — customer object `{id, name, ...}`
  - `from` — start date (optional, format: YYYY-MM-DD)
  - `to` — end date (optional)
  - `filter` — filter key string
- **Logic:**
  1. Customer ID validate karta hai
  2. State set: customer, dates, filter, clear search
  3. Modal open
  4. `GET /api/sales/ledger/{customerId}` se data fetch
  5. Optional date range: `?from=YYYY-MM-DD&to=YYYY-MM-DD`

---

### `applyLedgerFilter(filterKey)` — (Lines 902-925)
- **Purpose:** Ledger modal mein date filter apply karta hai.
- **Parameters:** `filterKey` — `"today"`, `"week"`, `"month"`, `"custom"`, `"all"`
- **Logic:**

| Filter Key | Date Calculation |
|---|---|
| `"today"` | `from = to = today` |
| `"week"` | `from = 7 days ago, to = today` |
| `"month"` | `from = 1st of current month, to = today` |
| `"custom"` | Sets filter state, waits for user input |
| `"all"` | No date parameters (all records) |

- Custom filter ke liye sirf `ledgerFilter` state set karta hai → UI mein date pickers dikhte hain
- Other filters ke liye `openLedger()` call karta hai with calculated dates

---

### `filteredProducts` — Computed (Lines 927-940)
- **Purpose:** POS product grid ke liye products filter karta hai category aur search se.
- **Logic:**
  1. **Category Match:**
     - `"All"` → sab products
     - `"Steel"` → matches `"Iron/Steel"` bhi (legacy compatibility)
     - `"Crush"` → matches `"Crush/Bajri"` bhi (legacy compatibility)
     - Others → exact category match
  2. **Text Search:** Product `name` ya `brand` mein search term (case-insensitive)

---

### `sendLedgerToWhatsApp()` — (Lines 942-1018)
- **Purpose:** Customer ka ledger PDF generate karta hai aur WhatsApp share ke liye prepare karta hai.
- **Async:** Yes
- **Logic (detailed):**

  1. **Validations:**
     - Customer object check
     - Customer phone check (required)
     - `window.html2pdf` library loaded check

  2. **DOM Element Get:**
     - `ledgerReportRef.current` se print-only ledger element nikalta hai

  3. **Temporary DOM Container:**
     - Ek div create karta hai `document.body` pe
     - Fixed position at (0, 0), width 1000px, white background
     - Ledger content `innerHTML` copy karta hai
     - z-index 1 — modal ke peeche rakhta hai (flash avoid)

  4. **PDF Generation (html2pdf library):**
     ```javascript
     options = {
       margin: [10, 10, 10, 10],
       filename: "ledger_{customerName}.pdf",
       image: { type: 'jpeg', quality: 0.98 },
       html2canvas: { scale: 2, useCORS: true },
       jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
     }
     ```
     - 400ms wait for DOM reflow
     - `html2pdf().from(tempContainer).set(opt).outputPdf('datauristring')` → base64 PDF

  5. **Preview Setup:**
     - Base64 PDF save karta hai (API ko bhejne ke liye)
     - Blob URL create karta hai (iframe preview ke liye)
     - WhatsApp modal open karta hai

  6. **Cleanup:**
     - Temporary container DOM se remove karta hai

---

### JSX/UI Sections (Lines 1020 onwards)

---

#### Module Header (Lines 1022-1072)
- Back button (browser history back)
- Module icon + title ("Wholesale POS System")
- Admin counter switcher tabs (Wholesale, Retail 1, Retail 2)
- View navigation: New Sale | Sales History | Return Sale | Held Bills | Cancel Edit

#### POS View — Product Catalog (Lines 1074-1103)
- Category tabs (All, Cement, Steel, Crush, etc.)
- Search bar (name/vehicle number search)
- Product cards grid — each card shows:
  - Brand name + stock quantity
  - Product name
  - Price + Add button
  - Click to add to cart

#### POS View — Cart Sidebar (Lines 1105-1404)

**Customer Section (collapsible):**
- Customer name input with datalist autocomplete (registered customers)
- Phone number input
- Address input
- Previous balance display (for registered customers)

**Transport Section (collapsible):**
- Transport type dropdown:
  - Wholesale: Personal, Rent, Supplier
  - Retail: Personal, Rent
- Vehicle selection:
  - Rent/Personal: MultiSelect dropdown (filtered by transport type)
  - Supplier: Manual vehicle number text input

**Cart Items List (scrollable):**
- Each item shows:
  - Name (with "Out of Stock" badge if over-limit)
  - Price input (editable with Rs prefix)
  - Quantity controls (-/qty input/+)
  - Subtotal display
  - Delete button
- Dynamic sizing: compact/ultra-compact classes based on cart.length

**Payment Section (collapsible):**
- Subtotal display
- Delivery charges input
- Steel Labour input (Retail only)
- Discount input
- Grand Total display
- Paid amount input + Hold Bill button
- Payment type dropdown (Cash/Bank/Credit)
- Bank selector (shown when Bank selected)
- Labour Group dropdown (Wholesale only)
- "Complete Sale" button (disabled when loading or stock exceeded)

#### Sales History View (Lines 1406-1688)
- **Toolbar:**
  - "Sales Log" heading
  - Bulk delete button (admin only, when sales selected)
  - Search input
  - Date filter tabs (Today/Yesterday/Custom/All Time or Last 30 Days)
  - Custom date range pickers

- **Summary Strip:**
  - Total Sales Value (blue accent)
  - Total Paid/Collected (green accent)
  - Total Remaining Balance (red accent)

- **DataTable (PrimeReact):**
  - Columns: Checkbox (admin), Date, Bill No, Customer, Phone, Items Sold, Address, Total, Paid, Balance, Payment Type, Status, Actions
  - Sortable columns
  - Paginator (10/25/50 rows)
  - Action menu per row: Edit, Delete, Print Receipt, View Ledger

#### Success Modal (Lines 1690-1702)
- Green checkmark icon
- "Sale Completed!" heading
- Invoice number display
- Close + Print Receipt buttons

#### Thermal Receipt (Lines 1704-1836)
- Print-only section (CSS class: `print-only`)
- Business header: DATA WALEY CEMENT DEALER
- Contact numbers
- Address
- Bill info: Bill No, Date, Name, Phone, Address, Vehicle, Labour Group, Payment Type
- Items table: Description, QTY, RATE, AMOUNT
- Subtotal, Discount, Steel Labour, Delivery, Bill Amount, Paid Now
- Previous Balance, Total Balance
- PENDING/CLEAR status
- Footer: "Thank you for coming"

#### Customer Ledger Modal (Lines 1837-2118)
- **Header:** Customer name, Print button, WhatsApp send button, Close button
- **Print Report Section:** Business header, customer info, date range, ledger table
- **Filter Buttons:** All, Today, This Week, This Month, Custom
- **Custom Date Inputs:** From/To date pickers
- **Search Bar**
- **Stats Grid:** Total Invoices, Total Value, Total Collected
- **Ledger Table:**
  - S.No, Date, Bill Details (with item breakdown), Debit (+), Credit (-), Balance
  - Sale rows: Invoice #, items with qty × rate, steel labour, delivery, discount
  - Payment rows: "Payment Received" with payment type

#### Held Bills Dialog (Lines 2119-2169)
- PrimeReact Dialog component
- Empty state: "No bills are currently on hold"
- Each held bill shows: Customer name, items count, total, held time
- Resume button + Delete button

#### Sale Return Modal (Lines 2171-2360)
- **Step 1:** Bill number input → Fetch Bill button
- **Step 2:**
  - Bill summary (customer, total)
  - Items table with checkboxes, sold qty, return qty input, rate input
  - Return vehicle section (Rent/Personal toggle, vehicle dropdown, delivery charges)
  - Refund details (refund amount input, refund method dropdown)
  - Confirm & Process Return button

#### Return Receipt Slip (Lines 2362-2431)
- DATA WALEY CEMENT header
- Original bill info, customer, vehicle
- Returned items table
- Returned value, refund given, balance adjusted
- Footer: "Thank you for your business"

#### Confirm Delete Modal (Lines 2433-2456)
- Trash icon
- "Confirm Deletion" heading
- Message display
- Cancel + "Yes, Delete" buttons

#### WhatsApp Preview Modal (Lines 2458-2489)
- "WhatsApp Document Preview" heading
- PDF preview iframe (blob URL)
- Customer phone display
- Cancel + "Send Ledger to WhatsApp" button (green themed)

#### Customer Registration Modal (Lines 2491-2546)
- "Credit Restriction - Register Customer" heading
- Warning message about walk-in credit restriction
- Customer Name input (required)
- Phone Number input with +92 prefix (required, auto-removes leading 0)
- Address input (optional)
- Cancel + "Register & Complete Checkout" button

---

## 9. `Retail1Billing.jsx`

**Lines:** 2550 | **Size:** 131 KB
**Purpose:** **Retail 1 POS Engine.** Yeh file **virtually identical** hai `WholesaleBilling.jsx` se — same saare functions, same UI, same logic.

### Differences from WholesaleBilling:
| Aspect | WholesaleBilling | Retail1Billing |
|---|---|---|
| Component Name | `WholesaleBilling` | `Retail1Billing` |
| `activeTab` Value | `"Wholesale"` | `"Retail 1"` |
| `isRetail` | `false` | `true` |
| Steel Labour Field | Hidden | Visible in POS |
| Labour Group | Visible | Hidden |
| Transport Supplier Option | Available | Not available |

> **Note:** Saare functions ka detailed explanation `WholesaleBilling.jsx` section mein hai — sab bilkul same hain.

---

## 10. `Retail2Billing.jsx`

**Lines:** 2549 | **Size:** 131 KB
**Purpose:** **Retail 2 POS Engine.** Same structure as Retail1Billing.

### Additional Differences:
| Aspect | Retail1Billing | Retail2Billing |
|---|---|---|
| Component Name | `Retail1Billing` | `Retail2Billing` |
| `activeTab` Value | `"Retail 1"` | `"Retail 2"` |
| Receipt Header | "DATA WALEY CEMENT DEALER" | "DATA WALEY RETAIL 2" |
| Contact Numbers | Tariq, Shehroz, Ziaullah | Waqar Butt, Mhd Aiss, Hassam Ahmad |
| Address | 12-KM Lahore Sheikhupura Road | Ada Treadywali Stop, Jaranwala Road |

---

## 11. `Retail3Billing.jsx`

**Lines:** 2549 | **Size:** 131 KB
**Purpose:** **Retail 3 POS Engine.** Same structure.

### Differences:
| Aspect | Value |
|---|---|
| Component Name | `Retail3Billing` |
| `activeTab` Value | `"Retail 3"` |

---

## 📋 Complete Function Index

### Billing.jsx
| Function | Line | Purpose |
|---|---|---|
| `Billing({ type })` | 8 | Smart router — module type se correct billing component render karta hai |
| `getModuleType()` | 14 | User role/module type detect karta hai (prop → admin tab → JWT → context) |
| `renderContent()` | 38 | Module type ke hisaab se billing component select karta hai |

### CounterHub.jsx
| Function | Line | Purpose |
|---|---|---|
| `CounterHub({ type })` | 14 | Multi-tab hub — POS, Products, Stock, Customers, Suppliers, Expenses tabs |
| `renderContent()` | 17 | Active tab ke hisaab se component render karta hai |

### Retail.jsx
| Function | Line | Purpose |
|---|---|---|
| `Retail()` | 4 | Legacy placeholder — static "Retail Sale Module" text |

### Retail1.jsx / Retail2.jsx / Retail3.jsx / Wholesale.jsx
| Function | Line | Purpose |
|---|---|---|
| `Retail1()` / `Retail2()` / `Retail3()` / `Wholesale()` | 4 | Wrapper — CounterHub ko correct `type` prop ke saath render karta hai |

### WholesaleBilling.jsx / Retail1Billing.jsx / Retail2Billing.jsx / Retail3Billing.jsx
| Function | Line | Purpose |
|---|---|---|
| `formatItemName(brand, name)` | 30 | Brand+name combine without duplication |
| `dataURItoBlob(dataURI)` | 57 | Base64 URI → Blob conversion for PDF preview |
| `closeWhatsAppModal()` | 73 | WhatsApp modal cleanup + memory free |
| `handleConfirmWhatsAppSend()` | 83 | WhatsApp pe ledger PDF send (phone normalization + API call) |
| `getEffectiveStock(productId)` | 199 | Effective stock calculate (edit mode aware) |
| `calculatedLedgerData` (useMemo) | 208 | Ledger data sort + running balance calculate |
| `filteredLedgerData` (useMemo) | 225 | Ledger search filter |
| `filteredSales` (useMemo) | 274 | Sales history date+text filter |
| `triggerConfirm(msg, fn)` | 268 | Reusable delete confirmation dialog |
| `fetchData()` | 347 | 6 parallel API calls → products, sales, vehicles, banks, customers, labours + cache |
| `handleCustomerChange(val)` | 402 | Customer name auto-fill (phone, address) |
| `addToCart(product)` | 414 | Product → cart (new item or increment qty) |
| `updateQty(id, delta)` | 431 | Cart item qty ±1 (min 0.01) |
| `setQtyDirect(id, value)` | 442 | Cart item qty manual input (decimal-safe) |
| `updatePrice(id, newPrice)` | 460 | Cart item price change |
| `setPriceDirect(id, value)` | 470 | Cart item price manual input (decimal-safe) |
| `holdBill()` | 488 | Current bill hold → localStorage persist |
| `resumeBill(held)` | 525 | Held bill restore → POS state |
| `removeFromCart(id)` | 544 | Cart se item remove |
| `fetchSaleForReturn()` | 552 | Bill number se sale details fetch for return |
| `handleSaleReturn(e)` | 576 | Sale return process → API → stock restore |
| `proceedWithCheckout(...)` | 629 | Core checkout: API call, labour log, receipt data, state reset |
| `handleCheckout()` | 765 | Checkout validations: stock, overpayment, credit restriction |
| `handleRegisterAndCheckout()` | 814 | Unregistered customer register → then checkout |
| `openLedger(customer, ...)` | 879 | Customer ledger modal open + data fetch |
| `applyLedgerFilter(key)` | 902 | Ledger date filter apply (today/week/month/custom/all) |
| `filteredProducts` (computed) | 927 | POS products category+search filter |
| `sendLedgerToWhatsApp()` | 942 | Ledger → PDF generate (html2pdf) → WhatsApp share prep |

---

## 💡 Code Improvement Suggestion

> **Important:** `WholesaleBilling.jsx`, `Retail1Billing.jsx`, `Retail2Billing.jsx`, `Retail3Billing.jsx` — yeh char files **99% identical** hain (sirf `activeTab` value aur receipt header different hai). In sab ko ek single `BillingEngine.jsx` component mein merge kiya ja sakta hai jo `activeTab` prop accept kare. Isse **~390KB duplicate code** save hoga aur maintenance bohot easy ho jayega.
