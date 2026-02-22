# Net Zero Tracker — Build Progress

## Phase 1 — MVP Foundation ✅ Complete

- ✅ Next.js 16 + TypeScript + Tailwind + shadcn/ui scaffolded
- ✅ Full Prisma schema (Company, User, Baseline, Target, Intervention, Scenario, etc.)
- ✅ NextAuth v5 with email/password credentials + JWT strategy
- ✅ Multi-tenant middleware (`getTenantContext()` enforced on all API routes)
- ✅ Role-based permissions (`requireEdit`, `requireAdmin`) in all mutations
- ✅ Company self-serve registration (first user → Admin)
- ✅ Baseline page: Scope 1/2/3 by category + growth rate
- ✅ Targets page: add/edit/delete with scope combination + SBTi flag
- ✅ Interventions: basic CRUD (name, category, scopes, reduction, timeline, status, owner)
- ✅ Scenarios: create/delete, assign interventions, start/end year
- ✅ Glide path chart (Recharts): residual emissions, BAU trajectory, target line
- ✅ Audit log infrastructure (`writeAuditLog()`)
- ✅ `/review` Chief Code Reviewer skill created
- ✅ Phase 1 /review: **PASS WITH WARNINGS** — 0 Critical, 1 High (open redirect — fixed), 2 Medium, 3 Low

### Post-Phase 1 Fixes
- ✅ Switched database from Prisma Postgres (`prisma+postgres://`) to **SQLite** for local dev
- ✅ Updated schema: Asset model + Site address/location fields (Phase 2 schema work)
- ✅ `@prisma/adapter-libsql` + `@libsql/client` for Prisma v7 SQLite driver
- ✅ `scopesAffected` stored as JSON string (SQLite has no native array type); serialised/deserialised in API layer

---

## Phase 2 — Full Feature Set 🔄 In Progress

### 2a — Full Intervention Fields
- ⬜ Annual reduction table (year-by-year tCO2e)
- ⬜ Documents/links editor
- ⬜ Site and business unit assignment
- ⬜ Scenario intervention financial editor (capex, opex, pace, execution %, quarters, personnel)

### 2b — Role-Based Access Control
- ✅ Server-side permission checks on all mutations (in place since Phase 1)
- ⬜ `RoleGuard` client component
- ⬜ User management page (Admin only)

### 2c — All Four Charts
- ✅ Glide path chart (from Phase 1)
- ⬜ Baseline breakdown chart (Recharts stacked bar)
- ⬜ Wedge chart (D3 stacked area)
- ⬜ MACC chart (D3 bar)
- ⬜ Chart export (PNG/PDF)
- ⬜ Data export (CSV/Excel via /api/export)

### 2d — Scenario Comparison
- ⬜ Side-by-side comparison of two scenarios

### 2e — Asset Register
- ✅ Asset model in schema (site, type, condition, EOL, scope, linked intervention, alert threshold)
- ⬜ Asset CRUD pages and API routes

### 2f — Excel Import
- ⬜ Downloadable Excel template
- ⬜ Upload + validate + bulk import

### 2g — Portfolio Overview
- ⬜ League table (site, tCO2e, assets, EOL count, interventions)
- ⬜ Map view (OpenStreetMap via react-leaflet)

### 2h — Alerts Dashboard
- ⬜ Assets approaching end of life
- ⬜ Overdue interventions

---

## Phase 3 — Compliance & Export ⬜ Upcoming

- ⬜ Audit trail page (Admin only)
- ⬜ Multi-language (i18n with next-intl)
- ⬜ SBTi badge in glide path legend
- ⬜ Second language (fr.json)

---

## Phase 4 — Polish & SaaS Readiness ⬜ Upcoming

- ⬜ Freemium gate (plan field on Company)
- ⬜ Settings page (company profile, personal preferences)
- ⬜ Print-ready combined report
- ⬜ Accessibility pass (Lighthouse ≥ 90)
- ⬜ Performance optimisation
