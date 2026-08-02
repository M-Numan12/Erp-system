# 📁 Home Folder — Complete Documentation

> **Path:** `client/src/Pages/Home/`
> **Total Files:** 1
> **Purpose:** Public-facing landing page for "Data Waley Cement Depot" business. Yeh page login se pehle dikhta hai — company ki history, products, services, depot locations, supply portfolio, testimonials, CEO message, aur contact form. Premium design with parallax effects, scroll animations, aur animated counters.

---

## 1. `LandingPage.jsx`

**Lines:** 914 | **Size:** 38 KB
**Purpose:** **Full Marketing Landing Page.** Yeh ek multi-section, single-page scrolling website hai Data Waley Cement Depot ke liye. 11 major sections hain — Navigation, Hero, Statistics, Vision, Products, Supply History, ERP Tech, Services, Locations, Supply Logistics, Testimonials, CEO Message, Contact Form, aur Footer.

### Imports:
- `React`, `useState`, `useEffect`, `useRef` — React core + refs
- `Link` — React Router (internal links)
- `LandingPage.scss` — Extensive styling (49 KB!)
- Lucide Icons: `Building2`, `Truck`, `MapPin`, `Phone`, `Mail`, `Clock`, `Star`, `ArrowRight`, `CheckCircle2`, `Database`, `Warehouse`, `ChevronRight`, `ChevronLeft`, `Send`, `Package`, `Menu`, `X`

---

### 🔧 Helper Components (File-Level)

---

### `AnimatedCounter({ target, duration, suffix })` — (Lines 24-67)
- **Purpose:** Number ko 0 se target value tak smoothly animate karke count-up effect deta hai jab element viewport mein aaye.
- **Props:**
  - `target` (number) — Final value (e.g., 50000)
  - `duration` (number) — Animation duration in ms (default: 1500)
  - `suffix` (string) — Value ke baad text (e.g., "+")
- **Logic (detailed):**
  1. `IntersectionObserver` use karta hai (threshold: 0.1) detect karne ke liye ke element viewport mein hai
  2. **Pehli baar visible hone pe:**
     - `requestAnimationFrame` loop start karta hai
     - `easeOutCubic` timing function: `1 - Math.pow(1 - progress, 3)` — slow ending for premium feel
     - Progress 0→1 ke dauran count smoothly 0→target tak jaata hai
     - `hasAnimated` ref ensures sirf ek baar animate ho
  3. **Cleanup:** Observer unobserve on unmount
- **Display:** `{count.toLocaleString()}{suffix}` — e.g., "50,000+"
- **Use Case:** Statistics section mein — 50,000+ Customers, 250+ Retail Partners, 46+ Years, 2 Depots

---

### `ScrollReveal({ children, className, stagger, delay })` — (Lines 69-105)
- **Purpose:** Child elements ko scroll pe fade-in/slide-in animation deta hai jab viewport mein aayein.
- **Props:**
  - `children` — Content to animate
  - `className` — Extra CSS class
  - `stagger` (boolean) — Staggered children animation (items one by one)
  - `delay` (number) — Animation delay in seconds
- **Logic:**
  1. `IntersectionObserver` (threshold: 0.05, rootMargin: "0px 0px -80px 0px") — element 80px viewport ke andar aane pe trigger
  2. **Visible hone pe:** `isActive = true` → CSS class `active` add hota hai
  3. One-time trigger — observer unobserve after first intersection
- **CSS Classes:**
  - `reveal` — Single element fade-in
  - `reveal-stagger` — Parent container whose children animate one by one
  - `active` — Triggers CSS transition
- **Deep Detail:** `rootMargin: -80px` bottom se ensure karta hai ke element thoda viewport mein aaye phir animate ho — user ko natural feel milta hai.

---

### 🏗️ Main Component: `LandingPage()`

### State Variables:

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `scrollY` | number | `0` | Current scroll position (parallax ke liye) |
| `mobileMenuOpen` | boolean | `false` | Mobile hamburger menu toggle |
| `activeProject` | number | `0` | Currently visible project in slider |
| `formData` | object | `{name, email, phone, message}` | Contact form fields |
| `formSubmitted` | boolean | `false` | Form submission success state |

### Data Arrays:

#### `projects` — Supply History (Lines 122-141)
3 featured projects:

| Project | Category | Description |
|---|---|---|
| Lahore Motorway Expansion | Infrastructure | 10,000 tons steel rebars + cement |
| Gulberg Heights Tower | Commercial | OPC cement + Margalla crush for 20-story tower |
| DHA Phase-8 Luxury Villas | Residential | 500,000 bricks + river sand |

#### `testimonials` — Customer Reviews (Lines 152-173)
4 customer testimonials:
- Muhammad Aslam (Civil Contractor)
- Ahmed Khan (Builder & Developer)
- Rashid Mahmood (Retail Partner)
- Zaheer Abbas (Construction Manager)

### Functions:

---

### `useEffect` — Scroll Tracking (Lines 112-118)
- **Purpose:** Scroll position track karta hai parallax zoom effect ke liye hero section mein.
- **Logic:** `window.addEventListener('scroll', handleScroll, { passive: true })`
- **Passive flag:** Performance optimization — browser ko batata hai ke handler `preventDefault()` nahi karega.

---

### `nextProject()` — Slider Next (Lines 143-145)
- **Purpose:** Supply history slider ka next project dikhata hai.
- **Logic:** `(activeProject + 1) % projects.length` — circular navigation (last ke baad first pe)

---

### `prevProject()` — Slider Previous (Lines 147-149)
- **Purpose:** Supply history slider ka previous project dikhata hai.
- **Logic:** `(activeProject - 1 + projects.length) % projects.length` — circular backward

---

### `handleInputChange(e)` — Contact Form Input Handler (Lines 179-182)
- **Purpose:** Contact form ke kisi bhi field ko update karta hai.
- **Logic:** Same dynamic key pattern: `setFormData({ ...formData, [name]: value })`

---

### `handleSubmit(e)` — Contact Form Submit (Lines 184-191)
- **Purpose:** Contact form submit karta hai (currently frontend-only simulation).
- **Logic:**
  1. `formSubmitted = true` — button text changes to "Message Sent!"
  2. 3 seconds baad auto-reset — form clear + submitted state false
- **Note:** Actual API integration nahi hai — sirf frontend simulation. Backend endpoint implement karna hoga real use ke liye.

### JSX Sections (11 Major Sections):

---

#### 1. Navigation Header (Lines 200-241)
- Logo (image + "DATA WALEY — CEMENT —")
- Desktop nav links: Home, Products, Services, Locations, Supply History, Contact
- "Request a Quote" button
- Mobile: Hamburger menu (Menu/X toggle) → mobile dropdown nav

#### 2. Hero Section (Lines 244-270)
- **Parallax Background:** `scale(1 + scrollY * 0.0006)` + `translateY(scrollY * 0.1px)` — zoom-in + upward shift as user scrolls
- **Opacity:** `Math.max(0.15, 1 - scrollY * 0.0018)` — fade out as scroll increases
- Content: "ESTABLISHED 1978" tag, "BUILDING LAHORE SINCE 1978" heading, description, CTA buttons
- **Deep Detail:** Yeh parallax effect hero image ko cinematic feel deta hai — scroll karne pe image slowly zoom in hoti hai aur fade out hoti hai.

#### 3. Statistics Section (Lines 273-300)
4 animated counter cards (using `AnimatedCounter`):
- 50,000+ Customers Served
- 250+ Retail Partners
- 46+ Years of Legacy
- 2 Retail Depots

#### 4. Vision Section (Lines 303-317)
"BUILDING A STRONGER PAKISTAN" — mission statement + description paragraph

#### 5. Products Section (Lines 320-403)
4 product cards (glass-card design):
- **Cement:** DG Khan, Pioneer, Flying, Kohat brands
- **Steel Sariya:** Ravi, Mughal, Islamabad Steel
- **Bricks:** First Class, Second Class
- **Sand & Aggregates:** Margalla Crush, River Sand, Bajri

#### 6. Supply History/Portfolio (Lines 406-450)
Interactive slider with 3 project cards:
- Prev/Next arrow buttons
- Indicator dots (clickable)
- Each card: image, category badge, title, description, "Explore Details" link

#### 7. ERP Tech Section (Lines 453-496)
"POWERED BY TECHNOLOGY. DRIVEN BY TRUST."
- 4 bullet points: Real-time Inventory, Automated Order Processing, Fleet Tracking, Customer Portal
- Dashboard mockup image

#### 8. Services Section (Lines 499-527)
3 service cards:
- Real-time Inventory
- Automated Dispatch
- Digital Billing

#### 9. Depot Locations (Lines 530-596)
2 location cards:
- **Main Depot:** Kot Abdul Malik, Near Motorway Interchange, Lahore — 0334-4294300
- **Sharaqpur Branch:** Adda Tredewali, Main Jaranwala Road — 0311-4105840
- Google Maps direction links

#### 10. Supply Logistics (Lines 599-641)
"SUPPLY ACROSS ALL OF PUNJAB"
- 2 truck images
- 3 cards: Fleet Logistics, Bulk Orders, Distribution Network

#### 11. Testimonials (Lines 644-668)
**Marquee Animation:** Infinite horizontal scroll of testimonial cards (doubled array for seamless loop)
- 5-star ratings (gold filled stars)
- Customer quote, name, designation

#### 12. CEO Message (Lines 671-720)
- CEO photo with animated circular badge ("DATA ESTABLISHED 1978", "46+ YRS")
- "BUILDING TRUST. DELIVERING EXCELLENCE."
- 4 paragraphs of CEO message
- Signature block: "Mian Hassam Ahmad, Chief Executive Officer"

#### 13. Contact Section (Lines 723-817)
Split layout:
- **Left:** Contact details (Address, Phone, Email, Hours)
- **Right:** Contact form (Name, Email, Phone, Message, Submit button)

#### 14. Footer (Lines 820-908)
4-column grid:
- Brand column: Logo, description, social icons (Facebook, Instagram, LinkedIn, Twitter)
- Products column: Cement, Steel Sariya, Bricks, Sand & Aggregates links
- Contact column: Phone + Email
- Locations column: Main + Branch addresses
- Bottom bar: "Staff Portal" login link + copyright

---

## 📋 Complete Function Index

| Function | Line | Type | Purpose |
|---|---|---|---|
| `AnimatedCounter()` | 24 | Component | Scroll-triggered count-up animation with easeOutCubic |
| `ScrollReveal()` | 69 | Component | Scroll-triggered fade-in/slide-in animation wrapper |
| `LandingPage()` | 107 | Component | Main landing page with 11 sections |
| `useEffect` (scroll) | 112 | Effect | Scroll position tracking for parallax |
| `nextProject()` | 143 | Function | Slider next (circular) |
| `prevProject()` | 147 | Function | Slider previous (circular) |
| `handleInputChange(e)` | 179 | Handler | Contact form dynamic field update |
| `handleSubmit(e)` | 184 | Handler | Contact form submit (frontend simulation) |

---

## 🎨 Design Patterns Used

| Pattern | Implementation |
|---|---|
| **Parallax Zoom** | Hero background scales + translates based on scrollY |
| **Scroll Reveal** | IntersectionObserver + CSS transitions for fade-in |
| **Animated Counter** | requestAnimationFrame + easeOutCubic for smooth count-up |
| **Infinite Marquee** | Duplicated testimonials array + CSS animation |
| **Glassmorphism** | `glass-card` class (backdrop-filter: blur + semi-transparent bg) |
| **Staggered Animation** | Children animate one-by-one with CSS transition-delay |
| **Responsive Menu** | Mobile hamburger toggle with X close button |
