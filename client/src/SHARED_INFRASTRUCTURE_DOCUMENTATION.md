# 📁 Shared Infrastructure — Complete Documentation

> **Scope:** `client/src/components/`, `client/src/context/`, `client/src/services/`
> **Total Files:** 6
> **Purpose:** Yeh folders poore ERP ka shared infrastructure provide karte hain — reusable components (ActionMenu, Sidebar, Layout, Route guard), global auth state management (AuthContext), aur centralized API client (axios instance with interceptors).

---

## 📊 Architecture Overview

```
components/
├── ActionMenu.jsx    (193 lines, 6 KB)  ──► Reusable 3-dot kebab action menu
├── MainLayout.jsx    (34 lines, 1 KB)   ──► App shell (Sidebar + Content area)
├── PrivateRoute.jsx  (14 lines, 0.4 KB) ──► Auth route guard
└── Sidebar.jsx       (113 lines, 4 KB)  ──► Navigation sidebar with permission filtering

context/
└── AuthContext.js    (88 lines, 3 KB)   ──► Global auth state (user, login, logout)

services/
└── api.js            (38 lines, 1 KB)   ──► Axios instance with JWT interceptors
```

---

## 1. `components/ActionMenu.jsx`

**Lines:** 193 | **Size:** 6 KB
**Purpose:** **Reusable 3-dot (kebab) action menu** for DataTable rows. Provides Edit/Delete actions with admin-only access control and a premium delete confirmation dialog.

### Props:
| Prop | Type | Required | Purpose |
|---|---|---|---|
| `onEdit` | function | No | Edit callback |
| `onDelete` | function | No | Delete callback |
| `extraItems` | array | No | Additional PrimeReact menu items |
| `bypassConfirm` | boolean | No | Skip delete confirmation dialog |

### Internal Logic:
1. **Admin-Only Actions:** Edit and Delete are `disabled: !isAdmin` — only admin role can trigger them
2. **Delete Confirmation Dialog:** Custom modal with:
   - Blur backdrop overlay
   - Warning icon + message
   - Cancel / "Yes, Delete" buttons
   - **Smart confirm bypass:** Temporarily overrides `window.confirm` to `() => true` so the handler's internal confirm call doesn't double-prompt
3. **Animations:** `fadeIn` and `scaleIn` CSS keyframes embedded inline

### Dependencies:
- PrimeReact: `Menu`, `Button`
- AuthContext (for `user.role` check)

---

## 2. `components/MainLayout.jsx`

**Lines:** 34 | **Size:** 1 KB
**Purpose:** **App shell component.** Wraps the entire application with Sidebar + Content area. Handles mobile responsive hamburger menu with backdrop overlay.

### Props:
| Prop | Type | Purpose |
|---|---|---|
| `children` | ReactNode | Page content to render |

### State:
- `sidebarOpen` — Mobile sidebar drawer state

### JSX Structure:
```
<div class="main-layout">
  <div class="mobile-header">     ← Hamburger menu + brand name (mobile only)
  <div class="sidebar-overlay">   ← Blur backdrop (mobile drawer)
  <Sidebar isOpen onClose />      ← Navigation sidebar
  <div class="content-area">      ← Page content
</div>
```

---

## 3. `components/PrivateRoute.jsx`

**Lines:** 14 | **Size:** 0.4 KB
**Purpose:** **Route guard component.** Checks if user is authenticated. Shows loading state while auth is initializing. Redirects to `/` (login) if not authenticated.

### Logic:
```
if (loading) → show "Loading..."
if (user exists) → render children
if (no user) → Navigate to "/"
```

### Usage:
```jsx
<Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
```

---

## 4. `components/Sidebar.jsx`

**Lines:** 113 | **Size:** 4 KB
**Purpose:** **Navigation sidebar** with permission-based menu filtering. Shows all 19 menu items for admin, filtered list for counter users based on `user.permissions` array.

### Props:
| Prop | Type | Purpose |
|---|---|---|
| `isOpen` | boolean | Mobile drawer open state |
| `onClose` | function | Close drawer callback |

### Menu Items (19 total):
| ID | Name | Path | Icon |
|---|---|---|---|
| dashboard | Dashboard | /dashboard | LayoutDashboard |
| wholesale | Wholesale Counter | /wholesale | Building2 |
| retail1 | Retail 1 Counter | /retail1 | Store |
| retail2 | Retail 2 Counter | /retail2 | Store |
| products | Product Catalog | /products | Package |
| stock | Stock Inventory | /stock | Boxes |
| billing | Billing POS | /billing | ShoppingCart |
| customers | Customers CRM | /customers | UsersIcon |
| suppliers | Suppliers/Factory | /suppliers | UserSquare2 |
| transport | Transport Logistics | /transport | Truck |
| expenses | Daily Expenses | /expenses | Wallet |
| salary | Employee Salary | /salary | Banknote |
| labours | Labour Tracking | /labours | UsersIcon |
| profit | Profit & Loss | /profit | LineChart |
| rent | Rent Tracking | /rent | Home |
| investment | Investments | /investment | TrendingUp |
| staff | Staff Ledger | /staff | MoreHorizontal |
| accounts | Bank Accounts | /accounts | Wallet |
| users | Admin Control | /users | ShieldAlert |

### Permission Filtering Logic (Lines 53-62):
```javascript
if (user.role === 'admin') → show ALL
if (item.id === 'dashboard') → always show
else → check user.permissions.includes(item.id)
```

### Header:
- Brand: "Data Waley" + "Cement ERP"
- User badge: name + role label (System Administrator / {module_type} Operator)
- Close button (mobile)

### Footer:
- "Exit System" logout button

---

## 5. `context/AuthContext.js`

**Lines:** 88 | **Size:** 3 KB
**Purpose:** **Global authentication state management.** Provides `user`, `loading`, `login()`, `register()`, `logout()`, `autoLogin()` to the entire app via React Context.

### Helper: `sanitizeUser(userData)` (Lines 6-16)
**Purpose:** Fallback module_type detection from email when server doesn't set it.
**Logic:** Same email-based pattern used everywhere:
- `wholesale` → "Wholesale"
- `retail1` / `retailsaller1` → "Retail 1"
- `retail2` / `retailseller2` / `wali2022` → "Retail 2"
- `retail3` / `retailseller3` → "Retail 3"

### State:
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `user` | object/null | `null` | Current authenticated user |
| `loading` | boolean | `true` | Auth initialization state |

### Functions:

| Function | Line | Purpose |
|---|---|---|
| `loadUser()` (useEffect) | 22-42 | On mount: check token → `GET /api/auth/me` → set user. Token not found or expired → clear storage |
| `login(email, password, rememberMe, isAdminLogin, coords)` | 44-55 | `POST /api/auth/login`. rememberMe → localStorage, else → sessionStorage. Coords for geolocation logging |
| `register(name, email, password)` | 57-63 | `POST /api/auth/register`. Always uses sessionStorage |
| `logout()` | 65-69 | Clear both storages, set user null |
| `autoLogin(token, user, rememberMe)` | 71-80 | Set token + user directly (used for device-approved auto-login) |

### Context Value:
```javascript
{ user, loading, login, register, logout, autoLogin }
```

### Token Storage Strategy:
| Scenario | Storage | Persistence |
|---|---|---|
| Remember Me checked | `localStorage` | Survives tab close |
| Remember Me unchecked | `sessionStorage` | Clears on tab close |

---

## 6. `services/api.js`

**Lines:** 38 | **Size:** 1 KB
**Purpose:** **Centralized Axios HTTP client.** Pre-configured with base URL, content-type, JWT token injection, and 401 auto-cleanup.

### Configuration:
```javascript
baseURL: process.env.REACT_APP_API_URL + "/api"
       || "https://erp-backend-3rf8.onrender.com/api"
```

### Request Interceptor (Lines 11-22):
- Reads token from `localStorage` or `sessionStorage`
- Attaches `Authorization: Bearer {token}` header to every request

### Response Interceptor (Lines 25-35):
- On `401 Unauthorized` → clears both token storages
- Redirect to login handled by AuthContext/Router (not here)

### Usage:
```javascript
import api from '../services/api';

// Used by AuthContext and UsersManager (axios-style)
const res = await api.get('/users');
const res = await api.post('/auth/login', { email, password });
```

### Note:
Most module components use raw `fetch()` instead of this api service. Only `AuthContext.js` and `UsersManager.jsx` use the axios `api` instance. All other modules construct URLs manually with `API_BASE_URL`.

---

## 📋 Complete Function Index

### ActionMenu.jsx
| Element | Line | Purpose |
|---|---|---|
| `ActionMenu({onEdit, onDelete, extraItems, bypassConfirm})` | 13 | Main component |
| `items` array | 21 | Build menu items with admin check |
| Delete confirmation dialog | 67-177 | Custom modal with blur backdrop |

### MainLayout.jsx
| Element | Line | Purpose |
|---|---|---|
| `MainLayout({children})` | 6 | App shell with sidebar |
| `sidebarOpen` state | 7 | Mobile drawer state |

### PrivateRoute.jsx
| Element | Line | Purpose |
|---|---|---|
| `PrivateRoute({children})` | 5 | Auth guard component |

### Sidebar.jsx
| Element | Line | Purpose |
|---|---|---|
| `Sidebar({isOpen, onClose})` | 26 | Navigation sidebar |
| `menuItems` | 29-49 | 19 nav items definition |
| `filteredMenuItems` | 53-62 | Permission-based filtering |

### AuthContext.js
| Element | Line | Purpose |
|---|---|---|
| `sanitizeUser(userData)` | 6 | Email → module_type fallback |
| `loadUser()` (useEffect) | 22 | Auto-load user on mount |
| `login()` | 44 | Email/password login |
| `register()` | 57 | New user registration |
| `logout()` | 65 | Clear auth state |
| `autoLogin()` | 71 | Direct token+user set |

### api.js
| Element | Line | Purpose |
|---|---|---|
| `api` (axios instance) | 3 | Configured HTTP client |
| Request interceptor | 11 | JWT token injection |
| Response interceptor | 25 | 401 auto-cleanup |

---

## 🔑 Key Patterns

| Pattern | Where | Description |
|---|---|---|
| **Email-Based Module Detection** | AuthContext, all modules | Fallback when module_type is null: email → counter type |
| **Dual Token Storage** | AuthContext, api.js | localStorage (persistent) vs sessionStorage (session-only) |
| **Permission-Based Navigation** | Sidebar | Admin sees all, users see only permitted modules |
| **Admin-Only Actions** | ActionMenu | Edit/Delete disabled for non-admin users |
| **Delete Confirmation** | ActionMenu | Premium dialog with confirm bypass trick |
| **API Dual Pattern** | api.js vs fetch() | AuthContext+UsersManager use axios; all others use raw fetch |
