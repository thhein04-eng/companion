# Implementation Plan: Real Estate Amortization Calculator

**Branch**: `001-real-estate-amortization-calculator` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-real-estate-amortization-calculator/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A client-side, no-login real estate amortization calculator: users enter a loan (amount, rate, term, start date), optionally layer in real-estate costs (down payment, property tax, insurance, PMI, HOA) and extra-payment plans, and view a full period-by-period schedule plus side-by-side comparisons of multiple scenarios. The loan amount itself is auto-calculated from home price minus down payment whenever both are present, but stays directly editable — a manual override is discarded (recalculated) the next time home price or down payment changes (FR-014, 2026-11-16 clarification). Technical approach: a single Next.js (App Router) application generated inside an Nx workspace via `@nx/next`, with amortization math isolated in a pure, independently-tested Nx library, and interactive controls built on vercel-labs/ui's headless `@ui-sdk/react` behaviors styled with Tailwind CSS. All computation runs in the browser; there is no backend.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20.9+ (Next.js's minimum supported Node version); React 19 (App Router's built-in canary channel)

**Primary Dependencies**: Next.js (latest, App Router, Turbopack), Nx + `@nx/next` plugin, `@ui-sdk/core` + `@ui-sdk/react` (vercel-labs/ui, v0.1.0-beta.1), Tailwind CSS, Playwright (e2e), Vitest (unit)

**Storage**: N/A (no database/backend) — scenario inputs live in React state plus browser `sessionStorage` for in-session retention only (FR-012)

**Testing**: Vitest for the amortization calculation library (pure functions: payment formula, schedule generation, extra payments, PMI cutoff, rounding); Playwright for end-to-end coverage of the four user stories

**Target Platform**: Web browser (Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+ per Next.js's supported-browsers baseline); deployable as a standard Next.js app (e.g., Vercel)

**Project Type**: Web application — single frontend app (no separate backend service needed; all logic is client-side)

**Performance Goals**: Schedule of up to 360+ monthly periods recalculates and re-renders in under 1 second on input change (SC-005); initial calculator interaction understandable within 30 seconds (SC-001)

**Constraints**: Client-side only — no server-side storage of user-entered financial figures (spec Assumptions); must remain keyboard-accessible and screen-reader friendly (ARIA) via the behavior SDK, supporting SC-006's usability bar; currency/date formatting must be locale-consistent (FR-013)

**Scale/Scope**: Single-user tool, no accounts; 4 prioritized user stories (P1 baseline schedule, P2 real-estate costs, P2 extra payments, P3 multi-scenario comparison); one Next.js app with a handful of composed views (calculator form, schedule table, cost breakdown, comparison grid)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

`.specify/memory/constitution.md` is ratified at v1.0.0. This plan satisfies all five principles: (I) calculation logic is isolated as pure, unit-tested functions in `libs/amortization-calculations`; (II) `apps/amortization-calculator` only composes routes from `libs/*`, enforced via `@nx/enforce-module-boundaries`; (III) no backend/server storage is introduced — client state + `sessionStorage` only; (IV) all interactive controls are built on `@ui-sdk/react` behaviors per the Technology Stack Constraints; (V) this feature followed the full specify → plan → tasks → analyze workflow. No violations; Complexity Tracking remains not applicable.

**Post-design re-check**: Unchanged — Phase 1 design (data-model.md, contracts/, quickstart.md) introduced one app + two libraries and no backend, server, or external data store. Still compliant with all five ratified principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-real-estate-amortization-calculator/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/
└── amortization-calculator/           # Next.js App Router app (generated via `nx g @nx/next:app`)
    ├── src/
    │   └── app/
    │       ├── layout.tsx              # Root layout (Server Component)
    │       ├── page.tsx                 # Calculator route — composes libs/amortization-ui
    │       └── globals.css              # Tailwind entry
    ├── next.config.js                   # composePlugins(withNx, ...)
    └── tests/                           # Playwright e2e specs (one per user story)

libs/
├── amortization-calculations/          # Pure TS: payment formula, schedule, extra payments,
│   ├── src/                            # PMI cutoff, rounding — no React/DOM dependency
│   │   └── lib/
│   └── tests/                          # Vitest unit tests (SC-002 cent-accuracy coverage)
└── amortization-ui/                    # Shared React components built on @ui-sdk/react,
    └── src/                            # styled with Tailwind: currency/number fields, date
        └── lib/                        # picker, scenario tabs, schedule table, comparison grid

nx.json, package.json, tsconfig.base.json   # Workspace config (root)
```

**Structure Decision**: Single Next.js application (`apps/amortization-calculator`) inside an Nx workspace, with business logic split into two libraries per Nx's "thin app, fat libs" convention: `libs/amortization-calculations` (framework-free, unit-tested math — this is where SC-002's cent-accuracy guarantee is enforced) and `libs/amortization-ui` (the vercel-labs/ui-based components shared across the app's views). The app itself only wires routes/pages together from these libraries. No backend project is needed — all computation and state are client-side (see Technical Context: Storage).

## Complexity Tracking

Not applicable — the Constitution Check found no violations against the ratified v1.0.0 constitution, and the structure above (one app, two libraries) introduces no additional complexity beyond Nx's standard convention.
