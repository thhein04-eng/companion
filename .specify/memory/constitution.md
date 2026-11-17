<!--
Sync Impact Report
Version change: (template, unratified) → 1.0.0
Rationale for 1.0.0: Initial ratification. This repository had only the placeholder
constitution template (no filled principles, no ratified version), so this is MINOR/MAJOR-free
first adoption — treated as 1.0.0 per semantic versioning's initial-release convention.
Modified principles: n/a (first fill of all 5 slots)
Added sections: Core Principles (5), Technology Stack Constraints, Development Workflow &
  Quality Gates, Governance
Removed sections: none
Derivation basis: no explicit constitution input was supplied with this command invocation, so
  principles were derived from the only concrete project context that exists in this repository —
  specs/001-real-estate-amortization-calculator/{spec.md,plan.md,research.md} — rather than
  invented generically. PROJECT_NAME was set to this feature's domain name since no other
  project identity (package.json, README) exists yet in the repo.
Deferred items / TODOs: none left as bracketed tokens. If this workspace grows beyond the
  amortization calculator into unrelated products, revisit Principle III and the Technology
  Stack Constraints section, which currently assume a single client-side finance-calculation app.
-->

# Real Estate Amortization Calculator Workspace Constitution

## Core Principles

### I. Calculation Correctness Is Non-Negotiable

All financial calculations — payment formulas, schedule generation, extra-payment handling,
PMI cutoff logic, and rounding — MUST be implemented as framework-free, pure functions with no
I/O and no hidden mutable state. Every such function MUST have automated unit tests asserting
cent-level accuracy against known reference values (closed-form amortization math, not just
"looks reasonable") before the feature it belongs to is considered done. A calculation change
without an accompanying or updated test MUST be rejected in review.

**Rationale**: Users make real financial decisions from this tool's numbers. "Tested to the
cent" is a measurable success criterion (not an aspiration) the first time it was defined for
this project, and the only way to keep it true as the codebase grows is to make it a standing
rule rather than a one-time check.

### II. Thin Apps, Fat Libs

Code under `apps/*` MUST contain only routing, page composition, and presentation wiring.
Business logic — calculations, validation, persistence/serialization — MUST live in `libs/*`
and MUST be independently unit-testable without a browser, DOM, or running app. Nx module
boundaries (`@nx/enforce-module-boundaries`) MUST be configured to block an app from importing a
library's internal files instead of its public API.

**Rationale**: This is the structure this workspace's first feature was explicitly planned
around, because it is what keeps the highest-risk code (financial math) both reusable and fast
to test, and it is Nx's own stated convention for exactly this reason.

### III. Client-Side by Default, No Unneeded Server Storage

A feature MUST NOT introduce server-side storage of user-entered financial scenario data unless
its own spec explicitly requires cross-device sync or accounts, with the tradeoff documented in
that spec's Assumptions. The default is: compute entirely in the browser, persist only to
`sessionStorage` for the duration of the current session.

**Rationale**: Nothing about a "what-if" loan calculator requires a server to see a user's
numbers. Treating no-server-storage as the default (not a case-by-case decision) avoids
accidentally creating a data-handling liability for information users never asked to have saved.

### IV. Accessible Interactive Components

Any interactive control (number/date inputs, pickers, tabs, menus, sliders) MUST preserve the
keyboard navigation and ARIA semantics provided by its underlying behavior implementation; a
styling change MUST NOT strip or silently break that behavior. New interactive primitives SHOULD
be built on this workspace's chosen headless behavior SDK (vercel-labs/ui's `@ui-sdk/core` /
`@ui-sdk/react`) rather than hand-rolled focus/keyboard/ARIA management, unless a documented
limitation of the SDK makes that impossible for a specific control.

**Rationale**: Accessibility was a measurable requirement (not an afterthought) in this
project's first feature spec. Headless behavior libraries exist specifically so teams don't
re-solve keyboard/ARIA correctness per component; abandoning that on a per-component basis would
silently regress usability for keyboard and screen-reader users.

### V. Spec-Driven Delivery

Every feature MUST proceed through the Spec Kit workflow — specify, clarify where needed, plan,
tasks, implement — before application code is written for it. A feature's `plan.md` MUST
include a Constitution Check evaluated before Phase 0 research and re-checked after Phase 1
design. Any multi-user-story feature SHOULD run `/speckit-analyze` before `/speckit-implement`.

**Rationale**: This workspace is built and operated through Spec Kit; skipping the workflow for
"quick" changes is how specs and code silently drift apart, which defeats the reason this
tooling was adopted in the first place.

## Technology Stack Constraints

- **Monorepo**: Nx workspace. New applications and libraries MUST be created via the appropriate
  `@nx/*` generator (e.g., `nx g @nx/next:app`, `nx g @nx/js:lib`) rather than hand-assembled, so
  Nx's task graph, caching, and module-boundary enforcement apply uniformly.
- **Frontend framework**: Next.js, App Router only (not the Pages Router), in TypeScript.
- **UI behavior layer**: vercel-labs/ui (`@ui-sdk/core` / `@ui-sdk/react`) for interactive
  primitives, styled with Tailwind CSS. It is a headless behavior library, not a pre-styled kit —
  visual styling is this workspace's own responsibility, not something to wait on the SDK for.
- **Testing**: Vitest for unit tests of framework-free library code; Playwright for end-to-end
  coverage of user-facing flows.

These are binding defaults for this workspace. They may be revisited through a constitution
amendment as the ecosystem evolves (for example, when vercel-labs/ui exits beta) — until amended,
a plan that deviates from them MUST justify the deviation in that plan's Complexity Tracking
section.

## Development Workflow & Quality Gates

- Any change to a calculation library MUST include or update unit tests demonstrating the change
  is correct; a change that cannot be unit-tested without a browser MUST be flagged in review
  rather than merged untested.
- `nx lint`, `nx test`, and `nx e2e` (or the relevant project-specific equivalents) MUST pass
  before a task in `tasks.md` is marked complete.
- Each feature's `quickstart.md` validation scenarios MUST be executed at least once — manually
  or via automation — before that feature is reported done.

## Governance

- **Amendment procedure**: Propose changes via `/speckit-constitution`. Every amendment MUST
  regenerate the Sync Impact Report at the top of this file and bump the version per the
  versioning policy below.
- **Versioning policy** (semantic versioning): MAJOR for backward-incompatible removal or
  redefinition of a principle; MINOR for adding a principle or materially expanding guidance;
  PATCH for wording clarifications or typo fixes with no semantic change.
- **Compliance review**: `/speckit-plan`'s Constitution Check section is the enforcement point.
  A plan that cannot satisfy a MUST in this document must either change its technical approach or
  explicitly document the violation and its justification in that plan's Complexity Tracking
  section — silent non-compliance is not acceptable.

**Version**: 1.0.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16
