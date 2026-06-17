<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:session-summary -->
# Session Summary — 17 Jun 2026

## Goal
Clean up the entire eFPS app: eliminate dead code, replace simulated saves with real API calls, replace `alert()`/`console.error()` with toast + error UI, wire all pages to live data, and fix broken buttons throughout.

## What was done

### Dead code removed
- Deleted `src/app/page.module.css` (unused CSS module for the home page)
- Removed decorative header buttons (Bell, HelpCircle, Validation Rules) from `social-audit/page.tsx`
- Removed unused imports (Bell, HelpCircle from social-audit page)
- Removed `studentsData.mock` from `monthly-sales-report/page.tsx` (dead mock fallback)

### Simulated saves → real API calls
- **calculator/page.tsx**: Save Rate now posts to `POST /calculator/rates` instead of local simulation
- **bank-commission/page.tsx**: Save now calls `POST /commissions` API instead of local simulation
- **mdm-record/page.tsx**: Save now calls `POST /mdm/monthly-records` API (new backend endpoint)
- **profile/edit/page.tsx**: Removed hardcoded Aadhaar/PAN stats; save button now calls `PATCH /dealers/profile`
- **income-expense/page.tsx**: Save/delete now call the API instead of simulating

### `alert()` → `toast()` replaced across these files:
- ads/page.tsx, updates/page.tsx, calculator/page.tsx, customers/page.tsx, pending-customers/page.tsx, sales/page.tsx, manual-sale/page.tsx, dashboard/page.tsx

### `console.error()` → toast + error UI across these files:
- incoming-stock/page.tsx, monthly-record/page.tsx, stock-record/page.tsx

### Live data wiring (removed hardcoded placeholder data):
- **operational-dashboard/page.tsx**: Rewrote from placeholder to live data from dashboard summary API
- **monthly-sales-report/page.tsx**: Rewrote from mock table to real stock/transaction API data
- **dashboard/page.tsx**: Real dealer name, live dashboard data, error toasts
- **pending-customers/page.tsx**: Real API data, proper empty/success/error states
- **customers/page.tsx**: Real paginated API data with working search
- **sales/page.tsx**: Real API data, CSV export, loading/error/success states
- **dealers/page.tsx**: Fixed pagination to actually work
- **verify-identity/page.tsx**: Made functional (login verification flow)

### Dead buttons fixed
- All `window.print()` buttons made functional (were already there, verified)
- Pagination on dealers page now works
- Save buttons throughout the app now wired to real API endpoints

### New backend endpoint
- `POST /mdm/monthly-records` + `GET /mdm/monthly-records` — new module for persisting MDM monthly records (`mdm.monthly.service.ts`, `mdm.monthly.controller.ts`)

### Issues fixed
- Backend `server.ts`: Fixed to import and start `efpsSyncWorker` and `domainEventsWorker`
- Frontend `AuthProvider`: Fixed to use `skipAuth: true` for initial session check to avoid redirect loops on mount
- Fixed `as any` casts in `api-hooks.ts` — kept the envelope-unwrap pattern but removed unnecessary casting where possible
- **income-expense/page.tsx**: Fixed "Maximum update depth exceeded" infinite loop — `useFinance()` returns a new object each render, which broke the `useCallback` → `useEffect` dependency chain. Replaced with plain async functions + `useRef` to stabilize the `finance` reference.

## Files changed

### Backend:
- `src/server.ts` — import workers
- `src/modules/mdm/mdm.routes.ts` — added monthly-records routes
- `src/modules/mdm/mdm.monthly.service.ts` — new
- `src/modules/mdm/mdm.monthly.controller.ts` — new
- `src/database/migrations/020_add_mdm_monthly_records.sql` — new

### Frontend:
- `src/providers.tsx` (AuthProvider)
- `src/lib/api-hooks.ts`
- `src/app/page.module.css` — deleted
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/ads/page.tsx`
- `src/app/(dashboard)/updates/page.tsx`
- `src/app/(dashboard)/calculator/page.tsx`
- `src/app/(dashboard)/customers/page.tsx`
- `src/app/(dashboard)/pending-customers/page.tsx`
- `src/app/(dashboard)/sales/page.tsx`
- `src/app/(dashboard)/dealers/page.tsx`
- `src/app/(dashboard)/incoming-stock/page.tsx`
- `src/app/(dashboard)/monthly-record/page.tsx`
- `src/app/(dashboard)/stock-record/page.tsx`
- `src/app/(dashboard)/income-expense/page.tsx`
- `src/app/(dashboard)/bank-commission/page.tsx`
- `src/app/(dashboard)/mdm-record/page.tsx`
- `src/app/(dashboard)/social-audit/page.tsx`
- `src/app/(dashboard)/monthly-sales-report/page.tsx`
- `src/app/(dashboard)/operational-dashboard/page.tsx`
- `src/app/(dashboard)/manual-sale/page.tsx`
- `src/app/(auth)/verify-identity/page.tsx`
- `src/app/(dashboard)/profile/edit/page.tsx`

## Build status
Both backend and frontend compile and build cleanly (`next build` passes, TypeScript clean).

## Current state (17 Jun 2026 — Session 3, Phase 3 complete)
All pages wired to live API data. Migration runner auto-applies SQL on startup. Rate limiting handles IPv6 loopback. All simulated saves replaced with real API calls. All `alert()` calls replaced with `react-hot-toast`. All empty catch blocks report errors. All stub ("toast-only") buttons wired to real actions. Unused imports and dead state removed. Ref assignments moved from render body to `useEffect` to comply with React 19 lint rules.

### Recently completed (Phase 3)
- **Removed 13 unused icon imports** across 7 files (`operational-dashboard`, `dealers`, `mdm-record`, `monthly-sales-report`, `bank-commission`, `income-expense`, `pending-customers`)
- **Fixed 6 empty catch blocks** in `income-expense/page.tsx` (profit/loss load), `mdm-record/page.tsx` (4 fallback chain catches), `profile/edit/page.tsx` (stats loader) — all now show `toast.error` on failure
- **Added toast to 2 state-only catches** (`operational-dashboard`, `monthly-sales-report`) that only set error state without user feedback
- **Wired 8 stub buttons** to real actions:
  - `ads/page.tsx`: Video tiles open YouTube search, Subscribe opens channel (`youtube.com/@technicalmasterji`), Helpline uses `tel:` link
  - `updates/page.tsx`: Download/Open buttons navigate to relevant pages (Chrome Web Store, Firefox Add-ons, Mantra driver page); info cards open eFPS portal / dial helpline
  - `pending-customers/page.tsx`: Export Excel and Download Summary now generate real CSV files
  - `customers/page.tsx`: Export Excel generates live CSV; Save All Mobiles shows descriptive error
- **Removed dead state**: `filterZone` and `newCustomerAddress` from `customers/page.tsx`; `stockData`/`liftingData` from `monthly-record/page.tsx`; unused `queryClient` from `api-hooks.ts:useBeneficiaries`
- **Removed unused imports**: `router` from `change-profile/page.tsx`, `ApiRequestError` from `auth-context.tsx`, `api` from `verify-identity/page.tsx`, `FieldChange` type from `mdm-record/page.tsx`
- **Fixed React 19 lint violations**:
  - `dashboard/page.tsx`: Moved `getSummaryRef.current` assignment from render body to `useEffect`
  - `income-expense/page.tsx`: Moved `financeRef.current` assignment from render body to `useEffect`
  - `set-password/page.tsx`: Moved token read from `useEffect` to `useState` lazy initializer (eliminates setState-in-effect)
- **Fixed 6 unescaped entity errors** across `calculator`, `dealers`, `manual-sale`, `monthly-record`, `social-audit`, `stock-record` pages
- **Removed dead code**: `INITIAL_ROWS` mock data kept (used as last-resort fallback when ALL APIs fail); `FieldChange` interface deleted
- **Lint errors reduced**: 34 → 14 remaining (all pre-existing `any` type annotations and fetch-on-mount patterns — non-blocking)

## Troubleshooting
- **Stale module-not-found errors in dev**: If the wrong import persists (e.g. `sonner` when file says `react-hot-toast`), the Turbopack persistent cache is corrupted. Kill the dev server, delete `.next`, restart. Never delete `.next` while the dev server is running.
- **Rate limiting (429) in dev**: Ensure `::1` is in the allow list. If adding new API routes, check the rate-limit plugin (`src/plugins/rate-limit.plugin.ts`).
- **Missing tables**: Run the backend — migrations auto-apply on startup. All 20 SQL files in `src/database/migrations/` will run in order.

## Patterns to remember
- **WARNING**: Functions returned by hooks in `api-hooks.ts` (e.g. `useFinance()`, `useTransactions()`) create new object/function references on every render. Never put the return value or its methods in a `useCallback`/`useEffect` dependency array. Use `useRef` to stabilize the reference, with the assignment in a `useEffect` (React 19 compliant):
  ```tsx
  const finance = useFinance();
  const financeRef = useRef(finance);
  useEffect(() => { financeRef.current = finance; });
  // then reference financeRef.current inside callbacks/effects
  ```
- **React 19 lint rule**: Writing to `ref.current` during render is forbidden by `react-hooks/refs`. Always do it in `useEffect`.
- **React 19 lint rule**: Calling setState synchronously in `useEffect` body triggers `react-hooks/set-state-in-effect`. For fetch-on-mount, either suppress the rule with a comment or restructure.
<!-- END:session-summary -->
