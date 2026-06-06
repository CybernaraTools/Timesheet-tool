# Cybernara Timesheet Portal — Frontend Client Documentation

This directory contains the production-grade frontend application for the **Cybernara Timesheet Portal**. It is a modern single-page dashboard built using **Next.js 16 (App Router)**, **React 19**, **Zustand** (for global client-side state), and **TanStack Query v5** (for state synchronization, polling, and cache management).

---

## 1. Design System & Aesthetics

Following premium design specifications, the portal implements a striking dark-first aesthetic tailored to professional workflows:

* **Color Palette:**
  * **Canvas Background:** True Black (`#000000`)
  * **Card Surface:** Dark Charcoal (`#1a1a1a`)
  * **Elevated Card Surface:** Charcoal Muted (`#262626`)
  * **Hairline Borders:** Fine Dark Gray (`#3c3c3c`)
  * **Accents:** Vibrant Coral (`#cc785c`), Deep Blue (`#1a365d`), Emerald Success (`#0fa336`), and Warning Orange (`#f4b400`).
* **Typography:**
  * Clean, geometric sans-serif typeface (Inter/Outfit) for system layouts, stats, tables, and buttons.
  * Serif typeface (Cormorant Garamond) for primary section headings, creating a premium balance of editorial and administrative layout.
* **Silhouettes:** Zero-radius borders (`rounded-none`) on core layout components (buttons, headers, inputs) to enforce sharp, modern rectangular silhouettes.
* **Dark Mode Sync:** Tailwind CSS is configured with class-based toggles (`.dark` class injected into the root node) rather than standard system media queries, guaranteeing a consistent visual state across different operating systems.

---

## 2. Key Architecture & Utilities

### 2.1 State Management
* **Zustand (`src/lib/stores/`)**:
  * `authStore.js`: Persistent localStorage store tracking the active session (`accessToken`, `refreshToken`) and active user profile.
  * `uiStore.js`: UI context tracking sidebar toggles and active overlay modals.
* **TanStack Query (`src/lib/hooks/`)**:
  * Manages all CRUD caching, garbage collection, and queries.
  * Automated mutations: Successful updates (like logging entries, updating status, or marking notifications as read) trigger `queryClient.invalidateQueries` to automatically refresh stale screen data in the background.
  * Stale-time configuration configured for static dropdown lists (clients, categories, managers) to prevent duplicate API fetches on page toggles.

### 2.2 Reusable UI Components (`src/components/ui/`)
* **`Table.js`**: Enforces strict cell alignment using `border-separate border-spacing-0` and explicit rounding rules to prevent overlapping borders.
* **`Modal.js`**: Robust overlay dialog featuring a complete focus trap, keyboard `Escape` dismissals, background click dismissals, and smart autofocus that targets input fields over header close buttons.
* **`Select.js` & `MultiSelect.js`**: Custom searchable dropdowns styled to blend into the core design system. Supports dynamic searches (on options list $>5$) and upward-expanding dropdown layouts (`openUp` prop) to prevent clipping in compact table rows.
* **`Button.js`**: Standardized buttons with outline, primary, secondary, and loading spinner integrations.

---

## 3. Setup & Installation

### Prerequisites
* Node.js v18.0.0 or higher
* npm or pnpm package manager

### 3.1 Installation Steps
1. Navigate into the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install all dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```
3. Create a local environment variables file named `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

### 3.2 Running the Application
* **Development Mode (Hot-Reloading):**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the portal.
   
* **Production Build Verification:**
   Compile and optimize the bundle to ensure zero ESM/routing syntax errors:
   ```bash
   npm run build
   ```

---

## 4. Page Routing Layout
* `/login` - Simple and clean username + password credentials gate.
* `/signup` - OTP activation route verifying corporate `@cybernara.com` emails before opening final profile setup.
* `/dashboard` - Weekly aggregate metrics, pending tasks summaries, and locked hours charts.
* `/timesheet` - Grid layout showcasing logged task rows. Includes a **Create Entry** form and inline request edit triggers.
* `/timesheet/bulk` - Row-based card deck to log multiple client-specific timesheet logs in one submit action.
* `/edit-requests` - Employee history view and Manager/Admin request approval board.
* `/team` - Interactive reporting metrics dashboard for Managers.
* `/notifications` - Complete system notification logs.
* `/users` - User roles, manager hierarchy setups, and status suspension toggles.
* `/clients` & `/categories` - Portfolio registries for administrative staff.
