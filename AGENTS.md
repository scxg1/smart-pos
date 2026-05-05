# Smart POS - Agent Guidelines

## Project Overview
Smart POS (نقطة البيع الذكية) — A full-featured Arabic RTL point-of-sale system with AI assistant, built as a standalone Windows desktop application.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Zustand + Tailwind CSS + Vite
- **Backend**: Express + sql.js (SQLite in-memory with disk persistence)
- **Desktop**: Electron 28
- **AI**: Z.AI (GLM) API
- **Charts**: Recharts
- **PDF**: jsPDF + html2canvas

## Commands
```bash
npm run dev          # Development (concurrent server + vite + electron)
npm run build        # Vite build only
npm run server       # Start Express server with tsx
npm run server:build # Bundle server with esbuild
npm run build:exe    # Full production build + NSIS installer
npm run build:portable # Full production build + portable exe
npm run lint         # TypeScript type checking (tsc --noEmit)
```

## Architecture
```
src/
  App.tsx              # Root layout, routing, auth gate
  store/
    posStore.ts        # All application state (DO NOT MODIFY)
    themeStore.ts      # Theme state (light/dark)
  lib/
    api.ts             # All API calls with auth (DO NOT MODIFY)
  components/
    Sidebar.tsx        # Navigation sidebar
    CartPanel.tsx       # Shopping cart
    ProductCard.tsx    # Product grid card
    Modal.tsx          # Reusable modal
    Toast.tsx          # Toast notifications
    ReceiptModal.tsx   # Receipt viewer/printer
  pages/
    LoginPage.tsx      # Auth
    CashierPage.tsx    # POS terminal
    ProductsPage.tsx   # Product management
    SalesPage.tsx      # Sales history
    CustomersPage.tsx  # Customer management
    ReportsPage.tsx    # Analytics dashboard
    AIPage.tsx         # AI chat assistant
    ExpensesPage.tsx   # Expense tracking
    SettingsPage.tsx   # System settings
server/
  index.ts             # Express entry
  db.ts                # Database init & queries (DO NOT MODIFY)
  routes/*.ts          # API routes (DO NOT MODIFY)
  middleware/auth.ts   # JWT auth (DO NOT MODIFY)
electron/
  main.js              # Production Electron entry (used by package.json)
  main.ts              # TypeScript source (unused in build)
```

## Critical Rules
- **NEVER modify** `src/store/posStore.ts`, `src/lib/api.ts`, `server/` directory — these contain all business logic and must remain untouched
- **NEVER add comments** unless explicitly requested
- Arabic RTL interface with Cairo font
- All currency in EGP (ج.م)
- Role-based auth: مدير (admin) / كاشير (cashier)

## Design System (Tailwind CSS)
- `.glass-card` — glassmorphism card
- `.btn-primary` — gradient indigo button
- `.btn-ghost` — outlined button
- `.btn-danger` — red button
- `.btn-success` — emerald button
- `.input-field` — styled form input
- `.stat-card` — stats card with hover effect
- `.animate-fade-in-up` / `.animate-scale-in` — entry animations
- `.mic-recording` — mic pulse animation
- Colors: `primary` (indigo-600), `text-primary`, `text-muted`, `card-border` custom tokens
- Dark mode supported via `.dark` class

## Environment Variables (.env)
```
ZAI_API_KEY=          # Required for AI features
JWT_SECRET=           # Optional, defaults to built-in
DATA_DIR=             # Optional, defaults to userData/smart-pos-data
```

## Build Notes
- `electron/main.js` is the production entry (not main.ts)
- `server-build/` must be unpacked from asar
- `sql-wasm.wasm` is bundled as extraResource
- NSIS installer with Arabic language support
- Output goes to `release/` directory
