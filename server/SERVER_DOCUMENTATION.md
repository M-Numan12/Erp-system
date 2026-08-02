# 📁 Server (Backend) — Complete Documentation

> **Path:** `server/`
> **Purpose:** Yeh ERP system ka Node.js/Express backend hai. Yeh PostgreSQL database se connect karta hai aur saari business logic, API endpoints, authentication, aur integrations (WhatsApp/Email/PDF generation) handle karta hai.

---

## 📊 Backend Architecture Overview

```
server/
├── server.js              (60 lines)     ──► Application Entry Point
├── api/
│   ├── config/
│   │   └── db.js          (31 lines)     ──► PostgreSQL connection pool
│   ├── middleware/
│   │   └── auth.js        (108 lines)    ──► JWT verification & device security
│   ├── routes/            (19 files)     ──► Express route definitions
│   ├── controllers/       (9 files)      ──► Complex business logic handlers
│   └── utils/
│       ├── dbInit.js      (470+ lines)   ──► Auto-sync DB schema & tables
│       ├── whatsapp.js    (410+ lines)   ──► UltraMsg API integration (Messaging/PDFs)
│       └── emailService.js(600+ lines)   ──► Nodemailer (Reports/Alerts)
```

---

## 1. `server.js` (Entry Point)

**Purpose:** Server initialization.
- **Timezone:** Enforces `process.env.TZ = 'Asia/Karachi'` so all server logs and date logic default to local time.
- **Body Parser:** `express.json({ limit: '15mb' })` (Important for accepting base64 encoded PDFs from frontend).
- **Static Files:** Serves `/temp` folder publicly (temporarily saves PDFs so WhatsApp API can fetch them via URL).
- **Startup Sync:** Calls `syncDatabaseSchema()` from `dbInit.js` before starting the listener on port 5000.

## 2. Database Layer (`config/db.js`)

**Stack:** PostgreSQL (using `pg` pool).
- **Timezone injection:** On every connect event, it runs `SET TIME ZONE 'Asia/Karachi'` to ensure database queries return correct dates for reports (Profit, Ledger, etc.).
- Environment variable `DATABASE_URL` is used for production (Render/Supabase), local vars for dev.

## 3. Auto-Sync System (`utils/dbInit.js`)

**Purpose:** Schema Migration and Initialization.
- Server start hote hi yeh script run hoti hai.
- Yeh ensure karti hai ke saari tables (`users`, `sales`, `purchases`, `expenses`, `user_devices`, etc.) exist karti hain aur unme zaroori columns hain.
- Agar koi naya column ERP mein add hua hai (e.g., `module_type` in `customers`), toh yeh script usko `ALTER TABLE` karke automatically add kar deti hai.

## 4. Security Layer (`middleware/auth.js`)

**Purpose:** JWT validation and Active Device Management.
- Header se `Bearer <token>` extract karke verify karta hai.
- **Device Fingerprinting:** User ka IP address aur User-Agent (normalized to remove version numbers) check karta hai `user_devices` table mein.
- Agar device approved nahi hai, toh API access `401 Unauthorized` return karta hai, even if JWT token is valid.
- Modifies `req.user.module_type` based on email patterns as a fallback (Wholesale/Retail).

## 5. Routes & Controllers

API ko 19 modules mein split kiya gaya hai. Jo routes complex hain unke controllers alag hain, jo simple hain wo routes file mein hi handle ho gaye hain.

### Key Controllers:

#### `saleController.js` (38 KB)
- Sabse complex controller.
- `createSale`: Auto-creates customer if not exists, records sale, updates product stock, handles multiple vehicles/transport ledgers, calculates labour wages, processes payment (cash/bank), aur WhatsApp receipt send karta hai.
- `returnSale`: Reverts stock, adjusts customer balance, updates ledgers.

#### `bankController.js` (23 KB)
- `getBalances`: Dynamically calculates live bank and cash balances by aggregating ALL system tables (sales, expenses, rent, salaries, supplier payments, investments).
- `closeout`: Galla Closeout operation (transfers day-end cash from counter to admin bank).

#### `authController.js` (23 KB)
- Login/Register.
- Records device info (IP, OS, Browser) in `user_devices` table and marks as `is_approved = false` for new devices (triggering pending approval flow).

### Key Complex Routes (Logic in route files):

#### `profitRoutes.js`
- `GET /api/profit/summary`: Parallel DB queries chalata hai saare counters (Wholesale, Retail 1, Retail 2) ka P&L nikalne ke liye. Aggregates Sales, Expenses, Salary, Rent, Purchases.

#### `purchaseRoutes.js`
- Handles supplier purchases (Bills) and supplier ledger payments. Calculates running balance for suppliers.

#### `salaryRoutes.js`
- Handles staff payroll AND the advance deduction scheduler (`target_month` deductions that auto-apply during payroll).

## 6. External Integrations (`utils/`)

### `whatsapp.js`
- Uses **UltraMsg API**.
- `sendWhatsAppMessage`: Text messages send karta hai.
- `sendWhatsAppBill`: Base64 PDF frontend se receive karke `/temp` folder mein save karta hai, phir UltraMsg ko URL pass karta hai takay wo customer ko PDF file forward kar sake.

### `emailService.js`
- Uses **Nodemailer**.
- Handles password reset links, admin alerts, aur daily automated backup reports.

---

## 🔑 Key Patterns & Workflows

| Pattern | Description |
|---|---|
| **Counter Isolation** | Har table mein `module_type` column hai (Wholesale, Retail 1, Retail 2). Har query `req.user.module_type` check karke sirif relevant data return karti hai (except for Admin). |
| **Real-time Balances** | ERP database mein "Bank Balance" ka koi direct column nahi hai. Balance on-the-fly calculate hota hai by summing all cash inflows (sales, admin payments) and outflows (expenses, salaries, purchases). |
| **PDF Generation** | Server PDF generate nahi karta. Frontend `html2pdf.js` se PDF banata hai, usko base64 encode karke server ko bhejta hai, server usay temporary file mein likh kar WhatsApp API ko de deta hai. |
| **Device Security** | JWT is not enough. A valid JWT on an unapproved device/browser is rejected by the auth middleware. |
