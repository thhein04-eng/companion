# Research: Real Estate Amortization Calculator

## 1. Monorepo tooling — Nx + Next.js

**Decision**: Use an Nx workspace with the `@nx/next` plugin to generate the application via `nx g @nx/next:app apps/amortization-calculator`, choosing the App Router and a `src/` directory when prompted.

**Rationale**: Nx's official Next.js guide (nx.dev/docs/technologies/react/next) is built around the `@nx/next` generator, which scaffolds a Next.js app pre-wired into Nx's task graph (`build`, `dev`/`serve`, `lint`, `test`, `e2e` targets) and wraps `next.config.js` with `composePlugins(withNx, ...)` so Nx-specific build concerns (module graph, caching, remote computation caching) stay compatible with Next.js's own compiler. This is the path Nx explicitly recommends over a manually-wired `create-next-app` project inside a workspace, because the generator keeps Nx's dependency graph and affected-command caching accurate.

**Approach**:

- Create the workspace: `npx create-nx-workspace@latest amortization --preset=apps` (empty monorepo preset), or start from an existing workspace.
- Add the plugin and app: `nx add @nx/next` then `nx g @nx/next:app amortization-calculator --directory=apps/amortization-calculator --appDir=true --src=true --style=tailwind --e2eTestRunner=playwright --unitTestRunner=vitest`.
- Keep pure business logic (amortization math) and shared UI in `libs/` so it is independently unit-testable and reusable, per Nx's "thin apps, fat libs" convention — the app itself only composes routes/pages from library code.
- Use `nx dev amortization-calculator`, `nx build amortization-calculator`, `nx test`, and `nx e2e` as the standard task entry points; Nx's task cache and `nx affected` apply automatically because the app was generated (not hand-rolled).

**Alternatives considered**:

- _Plain `create-next-app` with no Nx_: simpler for a single app, but the user explicitly asked for an Nx workspace, and Nx adds value here (task caching, enforced module boundaries between calculation logic and UI, room to add a second app such as a marketing site or Storybook later without re-architecting).
- _Nx `integrated` preset with a pre-selected Next preset at workspace creation (`--preset=next`)_: works but is less flexible for also carving out `libs/`; generating the workspace empty and then running the `@nx/next:app` generator explicitly is the pattern Nx's own docs lead with and keeps the structure visible/intentional.

## 2. Application framework — Next.js App Router

**Decision**: Use the Next.js App Router (not the Pages Router), with TypeScript, ESLint, Tailwind CSS, and Turbopack — i.e., the current `create-next-app` recommended defaults, applied through the Nx generator's equivalent flags.

**Rationale**: Next.js's own docs mark the App Router as "the newer router that supports new React features like Server Components" and present it as the default/recommended choice for new applications; the Pages Router is positioned as legacy-maintained. Turbopack is now the default bundler for both `next dev` and `next build`. Since this calculator's core computation (amortization schedules) is pure client-side math driven by live user input, most interactive views will be Client Components (`"use client"`), while the outer route shell (`layout.tsx`, static marketing/help content) can remain Server Components — matching Next.js's guidance to push interactivity to the leaves of the tree and keep layouts as Server Components by default.

**Approach**:

- `app/layout.tsx`: root layout (Server Component) — HTML shell, global styles, metadata.
- `app/page.tsx`: the calculator route; renders a Client Component tree for the interactive form, schedule, and comparison views.
- Co-locate route-level UI in `app/`, and import shared, reusable pieces (inputs, schedule table, scenario cards) from `libs/amortization-ui`.
- No server-side data fetching or persistence is required (per spec Assumptions: client/session-only), so this app uses no Route Handlers or Server Actions for the MVP — all state lives in React state plus `sessionStorage`/`localStorage` for FR-012's in-session retention.

**Alternatives considered**:

- _Pages Router_: rejected — Next.js's docs steer new projects to the App Router, and this project has no legacy constraint pulling the other way.
- _Server Actions for calculation_: rejected for v1 — the amortization math has no secrets or server-only dependencies, so running it in the browser (recalculates instantly as the user types, per SC-005's <1s requirement) is simpler and avoids a network round-trip on every keystroke. Documented as an assumption; can be revisited if scenario persistence grows beyond the browser.

## 3. UI component SDK — vercel-labs/ui (`@ui-sdk/*`)

**Decision**: Adopt `@ui-sdk/core` + `@ui-sdk/react` (the vercel-labs/ui "UI SDK") as the behavior layer for interactive controls, and build this app's visual components (number/currency fields, sliders, date picker, tabs for scenario switching, schedule table) on top of its behaviors, styled with Tailwind CSS.

**Rationale**: As of its Nov 13, 2026 public beta (v0.1.0-beta.1, Apache-2.0), vercel-labs/ui is **not** a pre-styled component kit like shadcn/ui — it is a headless _behavior_ library ("a library of behaviors for agents to build the next generation of user interfaces"), providing primitives such as `createRovingFocus`, `createTypeahead`, `createPopup`, `createSelection`, `createReorder`, plus framework adapters (`createParts()` for React) and higher-level prebuilt behavior sets for Select, Combobox, Date Picker, Menu, Tree, Color Picker, Tabs, Accordion, Resizable, Scroll Area, Carousel, and Slider/Number/OTP/File inputs. Because it ships behavior + ARIA wiring but no visual styling, "using their components" in practice means composing these behavior primitives into this app's own styled React components (consistent with how the SDK's own docs demonstrate usage, e.g. building a styled search field from focus + state behaviors).

**Approach**:

- Install: `npm install @ui-sdk/react @ui-sdk/core` in the Next.js app (or the shared `libs/amortization-ui` library if components are factored there).
- Optionally register the agent-facing skill for future development sessions: `npx skills@latest add vercel-labs/ui --skill ui-sdk` (this teaches coding agents the SDK's APIs; it is not a runtime dependency).
- Build this feature's controls directly on the relevant behavior/prebuilt sets:
  - Loan amount / rate / term / tax / insurance / PMI / HOA inputs → Number Input behavior, styled as currency/percent fields.
  - Loan term unit and extra-payment type toggles → Tabs / Select behaviors.
  - Loan start date and one-time extra-payment date → Date Picker behavior.
  - Scenario switching / comparison tabs → Tabs behavior.
  - Amortization schedule display → Scroll Area behavior (virtualized long list of up to 360+ rows) wrapping a plain styled `<table>`.
- Style everything with Tailwind CSS (already the default from the Next.js/Nx generators), since the SDK deliberately leaves visual styling to the consuming app.

**Alternatives considered**:

- _shadcn/ui or another pre-styled kit_: would deliver visual components faster, but the user explicitly named vercel-labs/ui; using it means accepting the headless-behavior model rather than importing ready-made styled buttons/inputs.
- _Rolling fully custom widgets with no behavior library_: rejected — would mean re-implementing keyboard navigation, focus management, and ARIA roles for sliders/date pickers/selects by hand, which is exactly what vercel-labs/ui exists to avoid, and would risk accessibility gaps SC-006 and FR-009 depend on.
- _Treating vercel-labs/ui as a hard requirement for every single control_: rejected — plain semantic HTML (`<table>`, `<input type="text">` for simple text display) is used where no interactive behavior is needed, reserving the SDK for genuinely interactive primitives.

## 4. Testing strategy

**Decision**: Unit-test the amortization calculation library with Vitest (pure functions, no DOM), and cover key user flows end-to-end with Playwright, matching the Nx generator's `--unitTestRunner=vitest --e2eTestRunner=playwright` options for `@nx/next:app`.

**Rationale**: The calculation engine (payment formula, schedule generation, extra-payment application, PMI cutoff, rounding) is the highest-risk, highest-value code to test (SC-002 requires cent-accurate results across combinations) and is pure TypeScript with no React/DOM dependency, so a fast unit runner is sufficient. UI flows (entering a loan, adding extra payments, comparing scenarios) are better validated end-to-end against a real rendered app, which is what Playwright is for and is Nx's supported e2e runner for Next.js apps.

**Alternatives considered**: Jest — still Nx's long-standing default and fully supported — was considered but Vitest is lighter-weight and faster for a calculation-heavy unit suite with no strong reason here to prefer Jest's feature set (e.g., no existing Jest-only tooling in this fresh workspace).

## 5. Persistence

**Decision**: No backend/database. Scenario inputs persist only in the browser (component state plus `sessionStorage` for FR-012's "retained for the duration of the browser session").

**Rationale**: Spec Assumptions explicitly scope this to a single-user, no-login tool with no cross-device sync. All financial figures the user enters are hypothetical "what-if" inputs, not account data, so there is no server-side storage requirement to design for.

**Alternatives considered**: `localStorage` for persistence beyond a single session — deferred; noted as a natural v2 enhancement but out of scope per the spec's assumptions (no cross-device or long-term storage requirement was raised).
