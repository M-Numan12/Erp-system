# 📁 Styles — Complete Documentation

> **Path:** `client/src/Styles/`
> **Total Files:** 10
> **Purpose:** Yeh folder poore frontend ka CSS architecture hold karta hai. ERP application mein SCSS (Sass) use kiya gaya hai styling ke liye. Sabse bada aur core file `ModulePages.scss` hai jo lagbhag saare internal module pages ki design handle karta hai.

---

## 📊 Files Overview

| File Name | Size | Purpose |
|---|---|---|
| `ModulePages.scss` | 91 KB (4300+ lines) | **Core Stylesheet.** Sabhi main ERP modules (Inventory, Billing, Finance, People, etc.) ke layouts, tables, modals, stats cards, aur buttons ki common styling idhar hai. |
| `LandingPage.scss` | 48 KB | External landing/marketing page ki styling. |
| `Dashboard.scss` | 9.6 KB | Main Dashboard page ki specific styling (charts, KPI widgets). |
| `LoginPage.scss` | 5.4 KB | Login screen styling. |
| `ForgotPassword.scss`| 4.6 KB | Password recovery screen styling. |
| `Sidebar.scss` | 3.2 KB | Left navigation sidebar ki styling (desktop + mobile drawer). |
| `UsersManager.scss` | 3.1 KB | Admin users management table & form styling. |
| `MainLayout.scss` | 2.8 KB | App shell (header + sidebar + content area wrapper) layout CSS. |
| `global.scss` | 0.3 KB | Basic body resets aur default input/button base. |
| `variables.scss` | 0.1 KB | Core color hex variables (`$primary`, `$dark`, `$light`, `$text`). |

---

## 1. `ModulePages.scss` (The Core Engine)

Yeh ERP ka sabse crucial CSS file hai. Iski wajah se components ko baar baar CSS likhne ki zaroorat nahi padti. Sabhi module pages (`.module-page` wrapper class) isi ko inherit karte hain.

### Key CSS Components Defined Here:

#### 1. Page Layout (`.module-page`)
- Standard max-width (`1300px`), padding (`32px 36px`), aur `Inter` font family.
- `.module-header`: Top header with title, subtitle, aur Action buttons (like Add New).
- `.module-icon`: Gradient rounded square icons (e.g., `.rent-icon`, `.investment-icon`) header ke liye.

#### 2. Buttons System
- `.btn-primary`: Blue gradient button with hover translation and shadow.
- `.btn-secondary`: Light gray button for secondary actions.
- `.btn-danger` / `.btn-danger-outline`: Red buttons for delete/destructive actions.
- `.btn-icon`: Small circular icon buttons.

#### 3. Stats Cards (`.stats-grid-pos`)
- Top KPI widgets (e.g., Total Sales, Total Profit) ke liye grid layout.
- `.pos-stat-card`: White background, subtle shadow, left icon box, right value text.
- Color variations: `.icon.blue`, `.icon.green`, `.icon.red`, `.icon.purple`.

#### 4. Data Tables (`.module-table-container`)
- Wrapper for PrimeReact DataTables.
- Row striping, hover effects, header background styling, aur pagination controls ki custom styling.
- `.status-badge`: Reusable pill-shaped badges for status (Active, Inactive, Paid, Pending, Unpaid, Returned).

#### 5. Modals & Dialogs (`.modal-overlay` / `.modal-content`)
- Custom CSS for popups when not using PrimeReact Dialog.
- Backdrop blur, scale-in animations, header close button (`.close-btn`), scrollable body, aur sticky footer with action buttons.
- Forms styling inside modals: `.form-grid`, `.form-group`, input focus states.

#### 6. Specific Complex Components
- **Detail View Tabs:** (Used in Profit.jsx) `.detail-tabs-header` aur `.tab-btn` active states.
- **Counter Switcher:** (Used when Admin selects a counter) `.admin-selection-container` aur `.selection-card` with hover scaling.
- **Bill Receipt Print Layout:** (Used in Billing/Ledgers) `.bill-receipt-wrapper`, `.receipt-header`, `.print-btn`.
- `@media print`: Hides `.no-print` elements (sidebar, buttons) and formats the page for physical A4/Thermal printing.

---

## 2. Print Styles (`@media print`)

ERP mein billing aur ledgers ko print karne ki zaroorat hoti hai.
- **Invisible Elements:** Buttons, sidebar, filters are hidden via `.no-print`.
- **Backgrounds:** `print-color-adjust: exact` ensure karta hai ke badges aur table headers ke background colors print mein zaroor aayein.
- **Page Break:** Page breaks ko avoid karne ke rules lagaye gaye hain takay tables theek se print hon.

## 3. Responsive Design

- `@media (max-width: 1024px)`, `@media (max-width: 768px)`
- Table containers scrollable ho jaate hain.
- Grids (stats cards, forms) 1 column mein collapse ho jaati hain.
- Sidebar hidden ho jaati hai aur hamburger menu show hota hai.
