# 📁 Auth Folder — Complete Documentation

> **Path:** `client/src/Pages/Auth/`
> **Total Files:** 3
> **Purpose:** Yeh folder poora authentication system handle karta hai — Admin login, Counter user login, aur Forgot Password (email verification + OTP + reset) ka flow. Device approval mechanism bhi yahan handle hota hai.

---

## 📊 Folder Architecture Overview

```
Auth/
├── AdminLoginPage.jsx   ──► Admin Portal Login (ShieldCheck icon, /dashboard)
├── LoginPage.jsx        ──► Counter User Login (Building2 icon, /dashboard)
└── ForgotPassword.jsx   ──► 4-Step Password Reset (OTP via Email)
```

---

## 1. `AdminLoginPage.jsx`

**Lines:** 154 | **Size:** 5.5 KB
**Purpose:** **Admin Portal Login Page.** Yeh sirf admin users ke liye hai. Admin credentials (email + password) se login hota hai. Agar device pehli baar hai toh **device approval** mechanism activate hota hai — admin ko wait karna padta hai jab tak dusre admin approve na kare.

### Imports:
- `React`, `useState`, `useEffect`, `useContext` — React core
- `useNavigate`, `Link` — React Router navigation
- `AuthContext` — login/autoLogin functions
- `api` — Axios instance for API calls
- `LoginPage.scss` — Shared login styling
- `ShieldCheck` — Lucide icon (admin badge)

### State Variables:

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `email` | string | `""` | Admin email input |
| `password` | string | `""` | Admin password input |
| `rememberMe` | boolean | `false` | Persistent session (localStorage vs sessionStorage) |
| `error` | string | `""` | Error message display |
| `isPendingApproval` | boolean | `false` | Device approval waiting state |
| `pollEmail` | string | `""` | Email for polling device approval status |

### Functions:

---

### `useEffect` — Device Approval Polling (Lines 19-38)
- **Purpose:** Jab device pending approval state mein ho, toh har 3 seconds mein server check karta hai ke approve hua ya nahi.
- **Dependencies:** `[isPendingApproval, pollEmail, rememberMe, autoLogin, navigate]`
- **Logic:**
  1. `setInterval(3000ms)` se polling start karta hai
  2. `GET /auth/check-device-status?email={email}` call karta hai
  3. **Approved:** Interval clear, `autoLogin()` call with token + user, navigate to `/dashboard`
  4. **Not yet:** Polling continue
- **Cleanup:** Component unmount pe interval clear hota hai
- **Deep Detail:** Yeh mechanism ensure karta hai ke unverified devices se koi admin login na kar sake. Server side pe device fingerprint store hota hai, aur existing admin ko notification jaata hai approval ke liye.

---

### `getCoordinates()` — Geolocation Helper (Lines 40-58)
- **Purpose:** User ka GPS location (latitude/longitude) get karta hai login ke waqt.
- **Return:** Promise → `{latitude, longitude}` ya `null`
- **Logic:**
  1. `navigator.geolocation` support check
  2. `getCurrentPosition()` se coordinates get karta hai
  3. **Success:** `{latitude, longitude}` resolve
  4. **Failure/Denied:** `null` resolve (login continue hota hai bina location ke)
  5. **Settings:** `enableHighAccuracy: true`, `timeout: 5000ms`
- **Why:** Server pe login location log hoti hai — security audit trail ke liye.

---

### `handleSubmit(e)` — Login Form Handler (Lines 60-77)
- **Purpose:** Admin login form submit karta hai.
- **Async:** Yes
- **Parameters:** `e` — form event
- **Logic:**
  1. Error clear karta hai
  2. `getCoordinates()` se GPS location leta hai
  3. `login(email, password, rememberMe, true, coords)` call karta hai
     - `true` = `isAdminLogin` flag (admin endpoint hit hota hai)
  4. **Success:** Navigate to `/dashboard`
  5. **403 + isPendingApproval:** Device approval pending → polling state activate
  6. **Other Error:** Error message display

### JSX Output:
- **Normal State:** Login form (email, password, remember me, forgot password link, "Access Dashboard" button)
- **Pending Approval State:** Spinner + "Waiting for Admin Approval" message + Go Back button
- **Error State:** Red error box above form

---

## 2. `LoginPage.jsx`

**Lines:** 161 | **Size:** 5.6 KB
**Purpose:** **Counter User Login Page.** Yeh counter operators (Wholesale, Retail 1, Retail 2, Retail 3) ke liye hai. Structure bilkul same hai `AdminLoginPage` se — sirf differences mentioned below hain.

### Differences from AdminLoginPage:

| Aspect | AdminLoginPage | LoginPage |
|---|---|---|
| Icon | `ShieldCheck` (purple) | `Building2` (blue) |
| Heading | "Admin Portal" | "Data Waley Cement" |
| Description | "Secure administrative access" | "Welcome back! Please enter your details" |
| CSS Theme | `admin-theme` class | Default theme |
| Login Call | `login(email, pw, rm, true, coords)` | `login(email, pw, rm, false, coords)` |
| isAdminLogin | `true` | `false` |
| Button Text | "Access Dashboard" | "Sign In" |
| Spinner Text Color | `#f8fafc` (light) | `#1e293b` (dark) |
| Geolocation Timeout | 5s (no fallback timer) | 2s fallback timer + 5s GPS timeout |

### Functions:

---

### `getCoordinates()` — Enhanced Geolocation (Lines 40-66)
- **Extra Feature vs AdminLoginPage:** 2-second fallback timer — agar user ne geolocation permission prompt abhi decide nahi kiya toh 2 seconds baad `null` return karke login continue karta hai (user ka time waste nahi hota).
- **Logic:**
  1. 2s `setTimeout` set karta hai (fallback)
  2. `getCurrentPosition()` call
  3. **GPS Success:** Timer clear + coordinates resolve
  4. **GPS Fail:** Timer clear + null resolve
  5. **Timer Expires:** null resolve + console log "permission prompt timed out"

---

### `handleSubmit(e)` — Login Handler (Lines 68-84)
- Same as AdminLoginPage but `isAdminLogin = false`
- Sends to regular counter login endpoint

Baqi saare functions (useEffect polling, JSX structure) bilkul same hain.

---

## 3. `ForgotPassword.jsx`

**Lines:** 271 | **Size:** 9 KB
**Purpose:** **4-Step Password Reset Flow.** Yeh component multi-step wizard hai — (1) Account details verify karo, (2) Email pe aaya OTP code enter karo, (3) Naya password set karo, (4) Success confirmation.

### Imports:
- `React`, `useState` — React core
- `useNavigate` — React Router
- `api` — Axios instance
- `ForgotPassword.scss` — Dedicated styling
- Lucide Icons: `KeyRound`, `Mail`, `User`, `Lock`, `ArrowLeft`, `CheckCircle2`, `ShieldCheck`

### State Variables:

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `step` | number | `1` | Current wizard step (1-4) |
| `formData` | object | `{email, username, role, code, password, confirmPassword}` | All form fields |
| `loading` | boolean | `false` | API call loading state |
| `error` | string | `""` | Error message |
| `successMsg` | string | `""` | Success message |

### `formData` Object Fields:

| Field | Default | Used In Step |
|---|---|---|
| `email` | `""` | Step 1 (request code) |
| `username` | `""` | Step 1 (account verification) |
| `role` | `"Wholesale"` | Step 1 (module selection) |
| `code` | `""` | Step 2 (OTP entry) |
| `password` | `""` | Step 3 (new password) |
| `confirmPassword` | `""` | Step 3 (confirm new password) |

### Functions:

---

### `handleChange(e)` — Generic Input Handler (Line 22-24)
- **Purpose:** Kisi bhi form field ko update karta hai using dynamic key.
- **Logic:** `setFormData({ ...formData, [e.target.name]: e.target.value })`
- **Deep Detail:** Single handler for sab inputs — `name` attribute se pata chalta hai kaunsa field update karna hai.

---

### `handleRequestCode(e)` — Step 1: Request OTP Code (Lines 26-43)
- **Purpose:** Email, username, aur role verify karke server se OTP code request karta hai.
- **Async:** Yes
- **Logic:**
  1. Loading ON, error clear
  2. `POST /auth/forgot-password` → `{email, username, role}`
  3. **Success:** Success message set, `step = 2`
  4. **Failure:** Error message display
  5. Loading OFF (finally block)
- **API Detail:** Server check karta hai ke yeh email + username + role combination valid hai. Agar valid hai toh 6-digit OTP email pe bhejta hai.

---

### `handleVerifyCode(e)` — Step 2: Verify OTP Code (Lines 45-61)
- **Purpose:** User ka entered 6-digit code verify karta hai server pe.
- **Async:** Yes
- **Logic:**
  1. `POST /auth/verify-code` → `{email, code}`
  2. **Success:** Success message, `step = 3` (password entry)
  3. **Failure:** "Invalid or expired verification code"
- **Deep Detail:** OTP codes time-limited hote hain (typically 10-15 minutes). Expired codes rejected hote hain.

---

### `handleResetPassword(e)` — Step 3: Set New Password (Lines 63-84)
- **Purpose:** Naya password set karta hai verified user ke liye.
- **Async:** Yes
- **Logic:**
  1. **Client-side validation:** password === confirmPassword check
  2. `POST /auth/reset-password` → `{email, code, password}`
  3. **Success:** `step = 4` (success screen)
  4. **Failure:** Error message
- **Deep Detail:** Code dobara verify hota hai server pe (double security) taake koi tamper na kar sake between steps.

### JSX Output — 4 Steps:

| Step | Icon | Heading | Content |
|---|---|---|---|
| 1 | `KeyRound` | "Forgot Password" | Email, Username, Role dropdown (Wholesale/Retail 1/Retail 2/Admin), Submit button |
| 2 | `Mail` | "Enter Code" | 6-digit code input (centered, letter-spaced), Verify button, Back link |
| 3 | `Lock` | "New Password" | Password + Confirm Password inputs, Reset button |
| 4 | `CheckCircle2` (green) | "Password Reset!" | Success message + "Log In Now" button → navigates to `/` |

---

## 📋 Complete Function Index

| File | Function | Line | Purpose |
|---|---|---|---|
| `AdminLoginPage.jsx` | `AdminLoginPage()` | 8 | Admin login component with device approval |
| `AdminLoginPage.jsx` | `useEffect` (polling) | 19 | 3-second device approval status polling |
| `AdminLoginPage.jsx` | `getCoordinates()` | 40 | GPS location capture for security logging |
| `AdminLoginPage.jsx` | `handleSubmit(e)` | 60 | Admin login form submission + error handling |
| `LoginPage.jsx` | `LoginPage()` | 8 | Counter user login component |
| `LoginPage.jsx` | `useEffect` (polling) | 19 | Same device approval polling |
| `LoginPage.jsx` | `getCoordinates()` | 40 | Enhanced GPS with 2s fallback timer |
| `LoginPage.jsx` | `handleSubmit(e)` | 68 | Counter login form submission |
| `ForgotPassword.jsx` | `ForgotPassword()` | 7 | 4-step password reset wizard |
| `ForgotPassword.jsx` | `handleChange(e)` | 22 | Generic form field updater |
| `ForgotPassword.jsx` | `handleRequestCode(e)` | 26 | Step 1: Request OTP via email |
| `ForgotPassword.jsx` | `handleVerifyCode(e)` | 45 | Step 2: Verify 6-digit OTP code |
| `ForgotPassword.jsx` | `handleResetPassword(e)` | 63 | Step 3: Set new password |

---

## 🔐 Security Flow Diagram

```
User Login Attempt
       │
       ▼
   ┌───────────────────┐
   │  Email + Password  │
   │  + GPS Coordinates │
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │  Server validates  │
   │  credentials       │
   └─────────┬─────────┘
             │
        ┌────┴────┐
        │         │
   Known Device  New Device
        │         │
        ▼         ▼
   ┌─────────┐  ┌──────────────────┐
   │  Login   │  │  403 Response    │
   │  Success │  │  isPendingApproval│
   └─────────┘  └────────┬─────────┘
                         │
                         ▼
                ┌────────────────┐
                │ Polling every  │
                │ 3 seconds      │
                │ /check-device- │
                │  status        │
                └────────┬───────┘
                         │
                    Approved?
                    ┌────┴────┐
                    │         │
                   Yes       No
                    │         │
                    ▼         ▼
              Auto Login   Continue
              → Dashboard  Polling...
```
