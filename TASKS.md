# Net Zero Tracker — Master Task Tracker

> Updated automatically at the end of each build session.
> This is a living document separate from PROGRESS.md — it covers all features built, in-flight, and outstanding.

---

## ✅ Completed

### Foundation & Auth
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- Prisma v7 + SQLite via `@prisma/adapter-libsql` (`@libsql/client`)
- Full Prisma schema: Company, User, Baseline, BaselineEntry, Target, Intervention, InterventionAnnualReduction, InterventionDocument, ScenarioIntervention, Scenario, Site, BusinessUnit, Asset, AuditLog, ActualEmission, EnergyReading, GrowthRate, CompanyEmissionFactor, Account, Session
- NextAuth v5 credentials (email/password, bcrypt hashed)
- Multi-tenant middleware: `getTenantContext()` enforced on all API routes; every query scoped to `companyId`
- Role-based permissions: `requireEdit()` / `requireAdmin()` on all mutations; RoleGuard client component
- Company self-serve registration (first user → Admin)
- Audit log infrastructure: `writeAuditLog()` called on all mutations

### Data Entry
- Baseline page: Scope 1/2/3 entries by category + annual growth rate editor
- Targets page: add/edit/delete with scope combination, reduction %, target year, SBTi flag, interim flag
- Interventions: full CRUD with annual reduction table, documents/links, site + business unit assignment, status, owner, scopes, category
- Asset Register: CRUD (asset type, condition rating RED/AMBER/GREEN, installation year, expected useful life, alert threshold, replacement priority, linked intervention)
- Energy readings: per-site actual consumption data entry (kWh, fuel type, emission factor)
- Actual emissions: year-by-year actual S1/S2/S3 entry

### Scenarios
- Scenario CRUD: create, rename, delete
- Assign interventions to scenarios from library
- **Scenario page restructure** (two-tab layout): Overview tab (all three charts + intervention list) + Financials tab (CAPEX/OPEX/ext. funding/MAC per row, totals)
- Side-panel editor (`ScenarioInterventionEditor`): all financial and timing fields including `startQuarter`/`endQuarter`, `technicalAssetLife`, CAPEX, OPEX, financial lifetime, external funding, personnel time/rate, notes
- Add-intervention dialog (replaces left sidebar) with toggle Add/Remove per library item
- Live chart updates on save (local state — no page refresh needed)
- Scenario comparison view: side-by-side chart/metric comparison

### Charts
- Glide path chart (Recharts): residual emissions bars, BAU trajectory line, target line, actual emissions scatter, SBTi badge in legend
- Wedge chart (D3): stacked area abatement per intervention
- MACC chart (D3): negative-to-positive MAC bars with colour scale, staggered enter animation
- Baseline breakdown chart (Recharts): stacked bar by scope × category
- PNG export via html2canvas (scoped to active chart tab)
- Excel data export via `/api/export` (xlsx)

### Analytics & Alerts
- Portfolio overview: league table (site × tCO₂e × assets × EOL count) + OpenStreetMap via react-leaflet
- Alerts dashboard:
  - End-of-life alerts (assets within threshold of EOL year)
  - Overdue interventions (PLANNED status, start year passed)
  - Stalled in-progress interventions (fullBenefitYear passed)
  - **Replacement alerts**: ScenarioIntervention records where `startYear + technicalAssetLife < 2050`

### Admin
- Audit log page (Admin only): full before/after change trail
- User management page (Admin): invite, role assignment
- Settings pages: company profile, emission factors, branding
- i18n with next-intl: English + French (fr.json), locale switcher in header

### Seed Data
- **Comprehensive reseed**: 32 interventions across all 13 sites (Sheffield, Manchester, Bristol, Chicago, Houston, LA, Seattle, Atlanta, Denver, Toronto, Vancouver, Calgary, Warsaw) + company-wide
- `ramp()` helper: linear ramp from start → full benefit year, constant through 2050
- 64 ScenarioIntervention records (32 per scenario): Ambitious (2040) + Conservative (2050)
- All ScenarioIntervention records have `technicalAssetLife` populated
- ~12 negative-MAC interventions (LED retrofits, insulation, compressed air, BMS) for visual MACC interest
- 10 assets (2× RED, 4× AMBER, 4× GREEN)
- Actual emissions 2022–2024, energy readings for Sheffield + Manchester
- Second tenant: Apex Composites Ltd (isolation testing)

### Visual Polish
- **Navy sidebar** (`bg-slate-900`) with emerald active states
- **Dark mode toggle** in header via `next-themes` ThemeProvider (class-based)
- **Animated KPI cards**: count-up animation (1.4s ease-out cubic), hover lift (`-translate-y-0.5 + shadow-lg`)
- **StatusBadge / ConditionBadge / PriorityBadge** components — pill style with leading dot
- **Progress bars** on intervention rows (emerald green, % of timeline elapsed)
- **Chart animations**: `animationDuration={800}` on all Recharts Bar/Line; D3 MACC enter transition with staggered delay per bar
- Dark mode variants (`dark:bg-slate-800`, `dark:border-slate-700`, `dark:text-white`) across all pages
- Page titles upgraded to `text-2xl font-bold` across all dashboard pages
- Rounded-xl table containers, consistent hover states on table rows

### Infrastructure
- `/review` skill (`.claude/skills/review/SKILL.md`)
- `PROGRESS.md` build diary
- Azure AD / Microsoft Entra SSO (NextAuth Microsoft Entra provider)
- Energy readings API + page
- Reports page (basic)

---

## 🔄 In Progress

_Nothing currently in-flight — all recent tasks pushed to main._

---

## ⬜ Outstanding

### Phase 3 Remaining
_All Phase 3 items complete._ ✅

### Phase 4 Remaining
- **Company settings page** — company profile edit (name, slug, logo upload), personal preferences (language, theme), danger zone (delete account)
- **Freemium gates** — `plan` field on Company (`FREE` / `PAID`); paywall for multi-scenario, MACC chart, export features; upgrade prompt UI
- **Empty states + onboarding** — guided first-run flow: baseline → targets → first intervention → first scenario; empty-state illustrations/prompts on each page

### Extra / Stretch
- **Azure AD SSO full test** — provider is configured; needs end-to-end test with a real Entra tenant
- **Skeleton loaders** — loading UI for server-fetched pages (currently shows nothing during navigation)
- **Accessibility pass** — keyboard navigation audit, ARIA labels on charts, Lighthouse score ≥ 90
- **Performance optimisation** — Prisma query analysis, DB index review, React Query caching strategy
- **Print-ready report layout** — CSS `@media print` polish, page breaks, header/footer on printed output
- **/review Phase 3+4 gate** — run security + quality review before considering the app launch-ready
- **Gradient accents** — subtle emerald gradient on dashboard hero / page header (partial — dark mode added but gradient accents not applied to page headers)
- **Skeleton loaders** — per-page loading skeletons for deferred server data

---

## Session Log (most recent last)

| Date | Work Done |
|------|-----------|
| Earlier sessions | Phases 1–2 complete, Phase 3 audit log, i18n, SSO |
| This session | Scenario page restructure (two-tab layout + side panel), comprehensive 32-intervention reseed across all 13 sites, /review pass + 3 fixes (audit log on SI mutations, fmtCurrency $0 fix, chartRef scoping), visual polish pass (navy sidebar, dark mode, KPI count-up, status badges, progress bars, chart animations, typography) |
| This session (continued) | Fix RSC serialization error (KPI icon functions across server/client boundary). Phase 3: SBTi net-zero year ReferenceLine on glidepath, PDF multi-page slicing + financial summary card, i18n live (NextIntlClientProvider + sidebar useTranslations + LanguageSwitcher cookie sync), oklch→hex color fix for html2canvas compatibility |
