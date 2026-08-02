# 📁 Dashboard Folder — Complete Documentation

> **Path:** `client/src/Pages/Dashboard/`
> **Total Files:** 1
> **Purpose:** Admin aur counter users ka main dashboard — login ke baad yeh page dikhta hai. Real-time stats (inventory count, low stock alerts, customer count, monthly expenses), live clock, primary module shortcuts (Wholesale, Retail counters), aur secondary business module navigation grid.

---

## 1. `Dashboard.jsx`

**Lines:** 228 | **Size:** 10 KB
**Purpose:** **Main Application Dashboard.** Login ke baad pehla page jo dikhta hai. Admin ke liye detailed stats cards dikhata hai. Saare users ke liye permission-based module navigation grid hota hai.

### Imports:
- `React`, `useContext`, `useState`, `useEffect` — React core
- `Link` — React Router
- Lucide Icons: `Building2`, `Store`, `Package`, `Boxes`, `Receipt`, `UsersIcon`, `Truck`, `Wallet`, `Banknote`, `LineChart`, `UserSquare2`, `Home`, `TrendingUp`, `MoreHorizontal`, `ArrowRight`, `AlertTriangle`
- `AuthContext` — user role + permissions
- `Dashboard.scss` — Styling

### API Configuration:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : 'https://erp-backend-3rf8.onrender.com/api';
```

### State Variables:

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `stats` | object | `{products: 0, lowStock: 0, customers: 0, monthlyExpenses: 0}` | Dashboard stats data |
| `currentTime` | Date | `new Date()` | Live clock display |

### Functions:

---

### `useEffect` — Live Clock (Lines 20-25)
- **Purpose:** Har second dashboard pe live time update karta hai.
- **Dependencies:** `[]` (mount only)
- **Logic:**
  1. `setInterval(1000ms)` se har second `new Date()` set karta hai
  2. Cleanup: interval clear on unmount
- **Display Format:** `"Monday, August 1, 2026 | 7:22:11 PM"` — full weekday + date + time with seconds

---

### `useEffect` — Stats Fetching + Auto-Refresh (Lines 27-67)
- **Purpose:** Dashboard stats fetch karta hai 5 parallel API calls se, aur har 15 seconds auto-refresh karta hai.
- **Dependencies:** `[user]`
- **Logic (detailed):**

  **Step 1: Authorization**
  - Bearer token from `localStorage`

  **Step 2: Counter Query**
  - Admin → koi filter nahi (sab data)
  - Counter user → `?type={module_type}` (sirf apne module ka data)

  **Step 3: Parallel API Calls (Promise.all)**
  | API Endpoint | Data |
  |---|---|
  | `GET /api/products{counterQuery}` | Products list |
  | `GET /api/expenses{counterQuery}` | Expenses list |
  | `GET /api/customers{counterQuery}` | Customers list |
  | `GET /api/suppliers{counterQuery}` | Suppliers list |
  | `GET /api/transport{counterQuery}` | Transport/vehicles list |

  **Step 4: Stats Calculation**
  - `products` → total count of products
  - `lowStock` → products jahan `stock_quantity <= minimum_stock` (alert items)
  - `customers` → total customer count
  - `monthlyExpenses` → sum of all `expense.amount` values

  **Step 5: Auto-Refresh**
  - `setInterval(15000ms)` — har 15 seconds fresh data fetch
  - Cleanup: interval clear on unmount

---

### `modules` — Navigation Module Config (Lines 69-82)
- **Purpose:** Business modules ka configuration array — dashboard grid ke liye.
- **12 Modules Defined:**

| Module ID | Name | Path | Icon | Color | Description |
|---|---|---|---|---|---|
| `products` | Products | `/products` | Package | Blue | Manage Items |
| `stock` | Stock | `/stock` | Boxes | Green | Inventory |
| `billing` | Billing | `/billing` | Receipt | Purple | Invoices |
| `customers` | Customers | `/customers` | UsersIcon | Amber | CRM |
| `suppliers` | Suppliers | `/suppliers` | UserSquare2 | Pink | Vendors |
| `transport` | Transport | `/transport` | Truck | Cyan | Fleet |
| `expenses` | Expenses | `/expenses` | Wallet | Red | Daily Costs |
| `salary` | Salary | `/salary` | Banknote | Indigo | Payroll |
| `profit` | Profit | `/profit` | LineChart | Orange | Analytics |
| `rent` | Rent | `/rent` | Home | Violet | Property |
| `investment` | Investment | `/investment` | TrendingUp | Teal | Track ROI |
| `other-expenses` | Other Expenses | `/other-expenses` | MoreHorizontal | Slate | Misc. |

---

### `hasPermission(moduleId)` — Permission Checker (Lines 84-87)
- **Purpose:** Check karta hai ke current user ko specific module access hai ya nahi.
- **Parameters:** `moduleId` — string (e.g., `"products"`, `"billing"`)
- **Return:** boolean
- **Logic:**
  1. Admin → `true` (sab access)
  2. Counter user → `user.permissions.includes(moduleId)` check
- **Deep Detail:** Permissions array user object mein server se aata hai login ke waqt. Yeh fine-grained access control hai — admin set karta hai ke kaunsa counter user kaunse modules dekh sakta hai.

### JSX Output:

#### Header Section
- Welcome message with user name + 👋 emoji
- Subtitle: "Here's a quick overview of your building materials empire today."
- Live clock display (monospace font, animated ⏰ emoji)

#### Stats Grid (Admin Only)
4 stats cards (sirf admin ko dikhte hain):

| Card | Icon | Color | Display |
|---|---|---|---|
| Inventory | Package | Blue | `{products} Items` |
| Low Stock | AlertTriangle | Orange | `{lowStock} Alerts` |
| Partners | UsersIcon | Green | `{customers} Contacts` |
| Expense Flow | Wallet | Red | `Rs. {monthlyExpenses}` |

#### Primary Actions Section
Large clickable cards for main counters (permission-based):
- **Wholesale** → `/wholesale` (Building2 icon)
- **Retail 1** → `/retail1` (Store icon)
- **Retail 2** → `/retail2` (Store icon)
- **Retail 3** → Commented out (disabled)

#### Business Modules Grid
"Business Modules" heading ke neeche smaller cards grid:
- Sirf permitted modules dikhte hain (`hasPermission` filter)
- Har card: icon (colored background) + module name + short description
- Click → navigate to module path

---

## 📋 Complete Function Index

| Function | Line | Purpose |
|---|---|---|
| `Dashboard()` | 14 | Main dashboard component |
| `useEffect` (clock) | 20 | Live clock timer (1s interval) |
| `useEffect` (stats) | 27 | Fetch + auto-refresh stats (15s interval, 5 parallel APIs) |
| `hasPermission(moduleId)` | 84 | Check user module access permission |

---

## 🔑 Key Architecture Points

- **Role-Based UI:** Admin dekhta hai stats + sab modules. Counter user dekhta hai sirf apne permitted modules.
- **Real-time:** 15s auto-refresh ensures dashboard always shows fresh data.
- **Permission System:** `user.permissions` array controls module visibility — no API calls for unauthorized modules.
- **Counter Query:** Non-admin users sirf apne module type ka data dekhte hain (Wholesale sirf wholesale data, Retail 1 sirf retail 1 data).
