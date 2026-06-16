# eFPS Master — Frontend

> **Fair Price Shop (FPS) Management System** — A full-featured web application for managing ration shop operations under the Gujarat Public Distribution System (PDS).

---

## 📌 Table of Contents

1. [Project Overview](#-project-overview)
2. [Tech Stack](#-tech-stack)
3. [Project Structure](#-project-structure)
4. [Pages & Routes](#-pages--routes)
   - [Authentication Pages](#authentication-pages)
   - [Dashboard Pages](#dashboard-pages)
5. [Design System](#-design-system)
6. [Getting Started](#-getting-started)
7. [Available Scripts](#-available-scripts)
8. [Key Features](#-key-features)
9. [Git Workflow](#-git-workflow)
10. [Sidebar Navigation](#-sidebar-navigation)

---

## 🧾 Project Overview

**eFPS Master** is a web-based management system designed for Fair Price Shop (FPS) dealers operating under the Gujarat Government's Public Distribution System. It enables dealers to:

- Track monthly grain distribution and stock records
- Manage customer registers and pending allocations
- Generate and print monthly compliance reports
- Import bulk sales data from the Gujarat PDS Social Audit portal
- Monitor income and expenses through a ledger system
- View the complete list of Gujarat FPS dealers
- Access operational dashboards with real-time POS device status

This frontend was designed with a **strictly flat, professional UI** — no gradients, no drop shadows, no glassmorphism — maintaining a clean and government-grade aesthetic consistent across all pages.

---

## 🛠 Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.9 | App Router-based React framework |
| **React** | 19.2.4 | UI rendering |
| **TypeScript** | ^5 | Type safety |
| **Vanilla CSS Modules** | — | Component-scoped styles |
| **Lucide React** | ^1.18.0 | Icon library |
| **ESLint** | ^9 | Code linting |

> ❌ **No Tailwind CSS** — All styling is done with Vanilla CSS Modules for maximum control.

---

## 📁 Project Structure

```
frontend/
├── public/                     # Static assets
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (font & global metadata)
│   │   ├── page.tsx            # Root redirect → /dashboard
│   │   ├── globals.css         # Global CSS variables & base styles
│   │   │
│   │   ├── (auth)/             # Auth route group (no sidebar)
│   │   │   ├── layout.tsx      # Centered auth layout
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   ├── verify-otp/
│   │   │   ├── set-password/
│   │   │   ├── password-success/
│   │   │   ├── verify-identity/
│   │   │   └── change-profile/
│   │   │
│   │   └── (dashboard)/        # Dashboard route group (with sidebar)
│   │       ├── layout.tsx      # Sidebar layout wrapper
│   │       ├── dashboard/
│   │       ├── incoming-stock/
│   │       ├── monthly-record/
│   │       ├── stock-record/
│   │       ├── sales/
│   │       ├── calculator/
│   │       ├── manual-sale/
│   │       ├── customers/
│   │       ├── pending-customers/
│   │       ├── updates/
│   │       ├── ads/
│   │       ├── mdm-record/
│   │       ├── profile/edit/
│   │       ├── bank-commission/
│   │       ├── social-audit/
│   │       ├── income-expense/
│   │       ├── dealers/
│   │       ├── monthly-sales-report/
│   │       └── operational-dashboard/
│   │
│   └── components/
│       ├── Sidebar.tsx          # Persistent sidebar navigation component
│       └── Sidebar.module.css   # Sidebar styles
│
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

---

## 📄 Pages & Routes

### Authentication Pages

These pages use a **centered, minimal layout** (no sidebar).

| Route | File | Description |
|---|---|---|
| `/login` | `(auth)/login/page.tsx` | Main login form with email & password |
| `/register` | `(auth)/register/page.tsx` | New account registration with password strength indicator |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | Step 1 of password recovery — enter email |
| `/verify-otp` | `(auth)/verify-otp/page.tsx` | Step 2 — 6-digit OTP verification with auto-focus |
| `/set-password` | `(auth)/set-password/page.tsx` | Step 3 — Set a new password |
| `/password-success` | `(auth)/password-success/page.tsx` | Success confirmation screen |
| `/verify-identity` | `(auth)/verify-identity/page.tsx` | Identity verification gateway |
| `/change-profile` | `(auth)/change-profile/page.tsx` | Change profile credentials |

---

### Dashboard Pages

All these pages use the **persistent sidebar layout** defined in `(dashboard)/layout.tsx`.

| Route | File | Description |
|---|---|---|
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | Main dashboard: monthly distribution summary, system alerts |
| `/incoming-stock` | `(dashboard)/incoming-stock/page.tsx` | Stock entry & new intake form |
| `/monthly-record` | `(dashboard)/monthly-record/page.tsx` | Printable monthly Fair Price Shop record document |
| `/stock-record` | `(dashboard)/stock-record/page.tsx` | Date-wise stock record ledger |
| `/sales` | `(dashboard)/sales/page.tsx` | Item-wise sales report |
| `/calculator` | `(dashboard)/calculator/page.tsx` | Commission calculator tool |
| `/manual-sale` | `(dashboard)/manual-sale/page.tsx` | CBDC / Manual sale entry |
| `/customers` | `(dashboard)/customers/page.tsx` | Customer register — full beneficiary list |
| `/pending-customers` | `(dashboard)/pending-customers/page.tsx` | Pending customer allocation list |
| `/updates` | `(dashboard)/updates/page.tsx` | eFPS system updates & announcements |
| `/ads` | `(dashboard)/ads/page.tsx` | My Ads management panel |
| `/mdm-record` | `(dashboard)/mdm-record/page.tsx` | MDM & ICDS (mid-day meal) record |
| `/profile/edit` | `(dashboard)/profile/edit/page.tsx` | Edit shop and dealer profile details |
| `/bank-commission` | `(dashboard)/bank-commission/page.tsx` | Bank commission tracking |
| `/social-audit` | `(dashboard)/social-audit/page.tsx` | Bulk import of monthly sales via paste buffer from Gujarat PDS portal |
| `/income-expense` | `(dashboard)/income-expense/page.tsx` | Daily ledger: Income vs Expense entries with running summary |
| `/dealers` | `(dashboard)/dealers/page.tsx` | Searchable list of all 16,885+ Gujarat FPS dealers |
| `/monthly-sales-report` | `(dashboard)/monthly-sales-report/page.tsx` | Monthly sales data report with filters |
| `/operational-dashboard` | `(dashboard)/operational-dashboard/page.tsx` | Real-time operational dashboard: POS device status & transactions |

---

## 🎨 Design System

The design system is defined in [`src/app/globals.css`](./src/app/globals.css) using CSS custom properties:

```css
:root {
  --primary-navy:       #1B3A6B;   /* Primary brand color */
  --accent-amber:       #F59E0B;   /* CTA buttons, highlights */
  --accent-amber-hover: #D97706;   /* Hover state for amber */
  --surface-gray:       #F0F4F8;   /* Page backgrounds */
  --background:         #FFFFFF;   /* Card / panel backgrounds */
  --text-dark:          #0F172A;   /* Primary text */
  --text-muted:         #64748B;   /* Secondary / helper text */
  --border-light:       #E2E8F0;   /* Card & table borders */
  --border-input:       #CBD5E1;   /* Form input borders */
  --online-green:       #10B981;   /* Online/active status */
  --offline-red:        #EF4444;   /* Offline/error status */
  --info-amber-bg:      #FEF3C7;   /* Info banner backgrounds */
  --info-amber-text:    #92400E;   /* Info banner text */
}
```

### Design Principles

- ✅ **Strictly flat** — zero gradients, zero drop shadows, zero glassmorphism
- ✅ **Clean typography** — system font stack with clear hierarchy
- ✅ **Consistent spacing** — 8px base grid throughout
- ✅ **Component-scoped CSS** — each component/page has its own `.module.css` file
- ✅ **Accessible** — clear focus states, proper semantic HTML

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- **Git**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/chauhand2463/efps-intelligence.git

# 2. Switch to the NISHIL branch
git checkout NISHIL

# 3. Navigate to the frontend directory
cd frontend

# 4. Install dependencies
npm install

# 5. Start the development server
npm run dev
```

The application will be available at **`http://localhost:3000`**.

> ℹ️ The root route `/` automatically redirects to `/dashboard`.

---

## 📜 Available Scripts

| Script | Command | Description |
|---|---|---|
| **Dev Server** | `npm run dev` | Starts Next.js in development mode with hot reloading |
| **Production Build** | `npm run build` | Compiles and optimizes the app for production |
| **Production Server** | `npm run start` | Runs the production build locally |
| **Lint** | `npm run lint` | Runs ESLint to check code quality |

---

## ✨ Key Features

### 🔐 Authentication Flow
- Secure login with email and password
- Multi-step password recovery: Email → OTP → New Password → Confirmation
- Registration with real-time password strength indicator
- Identity verification gateway

### 📊 Dashboard & Monitoring
- **Main Dashboard**: Monthly distribution summary cards and system alerts
- **Operational Dashboard**: Live POS device status monitoring, recent transactions table

### 📦 Stock & Distribution Management
- **Incoming Stock**: New grain intake entry with commodity type and quantity fields
- **Stock Record**: Date-wise stock movement ledger
- **Item-wise Sales**: Breakdown of sales per commodity

### 📋 Monthly Record
- **Printable Fair Price Shop Monthly Record** — a government-formatted document with dealer info, item table (Opening Stock, New Income, Total Qty, Total Sales, Closing Stock), dealer signature area, and generation timestamp

### 👥 Customer Management
- Full **Customer Register** with search and pagination
- **Pending Customers** list for allocation processing

### 💰 Financial Tools
- **Income & Expense (Hisab)**: Daily ledger entries with Income/Expense type toggle, category dropdown, and running transaction summary table
- **Commission Calculator**: Calculate dealer commission based on commodity type and quantity
- **Bank Commission**: Track bank-linked commission records

### 📥 Social Audit Import
- **Bulk import tool** — paste data directly from the Gujarat PDS Social Audit portal
- Intelligent column detection (Bill No, Date, Scheme, Product, Quantity)
- Target month/year selectors with one-click sync

### 🗂️ Data & Records
- **MDM & ICDS Record**: Mid-day meal and ICDS scheme tracking
- **Monthly Sales Report**: Filter by month/year with tabular distribution data
- **eFPS Updates**: System-wide announcements and notices
- **My Ads**: Dealer advertisement panel

### 🗺️ Gujarat FPS Dealer Directory
- Complete searchable directory of **16,885+ Gujarat FPS dealers**
- Columns: FPS Code, License Number, Dealer Name, Area ID, Shop Address, Main Village, Linked Shops
- Real-time search filtering and pagination

### 👤 Profile Management
- Edit shop information and dealer personal details
- Change profile credentials

---

## 🌿 Git Workflow

```
Repository: https://github.com/chauhand2463/efps-intelligence
Active Branch: NISHIL
```

### Branch Strategy

| Branch | Purpose |
|---|---|
| `NISHIL` | Main development branch for this frontend |

### Commit Convention

```
feat:     New feature or page
fix:      Bug fix or UI correction
style:    CSS-only changes
refactor: Code structure improvements
docs:     README or documentation updates
```

---

## 🧩 Sidebar Navigation

The sidebar is a reusable React component located at [`src/components/Sidebar.tsx`](./src/components/Sidebar.tsx).

It is automatically included in **all dashboard pages** via the shared layout at `src/app/(dashboard)/layout.tsx`.

> ✅ **To add a new page with the sidebar**, simply create a new folder inside `src/app/(dashboard)/` and add a `page.tsx` file. The sidebar will be inherited automatically — no extra configuration needed.

### Sidebar Navigation Items

| # | Label | Route |
|---|---|---|
| 01 | Dashboard | `/dashboard` |
| 02 | Stock Entry / New Intake | `/incoming-stock` |
| 03 | Monthly Record | `/monthly-record` |
| 04 | Stock Record (Date-wise) | `/stock-record` |
| 05 | Item-wise Sales | `/sales` |
| 06 | Commission Calculator | `/calculator` |
| 07 | CBDC / Manual Sale | `/manual-sale` |
| 08 | Customer Register | `/customers` |
| 09 | Pending Customers List | `/pending-customers` |
| 10 | eFPS Updates | `/updates` |
| 11 | My Ads | `/ads` |
| 12 | MDM & ICDS Record | `/mdm-record` |
| 13 | FPS Profile | `/profile/edit` |
| 14 | Bank Commission | `/bank-commission` |
| 15 | Social Audit Import | `/social-audit` |
| 16 | Income & Expense | `/income-expense` |
| 17 | Gujarat FPS Dealer List | `/dealers` |

---

## 📝 License

This project is part of the **eFPS Intelligence** platform developed for managing Gujarat's Fair Price Shop network under the Public Distribution System (PDS).

---

*Built with ❤️ using Next.js App Router & Vanilla CSS Modules*
