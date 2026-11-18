# Contract: Routes & Navigation UI

## Routes

| Path             | Behavior                                  | `<title>`                             | `<h1>`                    |
| ---------------- | ----------------------------------------- | ------------------------------------- | ------------------------- |
| `/`              | Server redirect (307) to `/amortization`  | —                                     | —                         |
| `/amortization`  | `AmortizationCalculatorView`              | `Amortization Calculator · Companion` | "Amortization Calculator" |
| `/deal-analyzer` | `DealAnalyzerView`                        | `Rental Deal Analyzer · Companion`    | "Rental Deal Analyzer"    |
| `/financing`     | `FinancingView` (added by spec 006)       | `DSCR & Financing · Companion`        | "DSCR & Financing"        |
| `/wealth`        | `WealthView` (added by spec 008)          | `Wealth Projection · Companion`       | "Wealth Projection"       |
| any other path   | `not-found.tsx` rendered inside the shell | `Not found · Companion`               | "Page not found"          |

### Page section contract

The headings below are `<h2>` and are the e2e selectors. Existing section headings and field labels are kept word for word.

| Section                                                               | `/amortization`                | `/deal-analyzer`    |
| --------------------------------------------------------------------- | ------------------------------ | ------------------- |
| Metric badges                                                         | LTV (when a home price is set) | LTV + Cash-on-Cash  |
| Scenario tabs                                                         | ✓                              | ✓                   |
| "Loan" (`LoanInputForm`)                                              | ✓                              | ✓                   |
| "Real-estate costs" (`CostBreakdownPanel`)                            | ✓                              | ✓                   |
| "Deal analyzer" (rental inputs, income/expense card, cap rate, rules) | ✗                              | ✓                   |
| "Extra payments"                                                      | ✓                              | ✗                   |
| "Amortization schedule" + Export CSV                                  | ✓                              | ✗                   |
| "Compare scenarios"                                                   | loan columns                   | loan + deal columns |

## Shell DOM / ARIA contract

These are the e2e test hooks. The structure is shown in its ≥ 1024px form.

```text
<div data-testid="app-shell" data-nav-collapsed="true|false">
  <aside id="primary-nav" class="hidden lg:flex">        ← docked, desktop only
    <button aria-controls="primary-nav" aria-expanded="true|false"
            aria-label="Collapse navigation|Expand navigation" />
    <nav aria-label="Primary"> <SideNav/> </nav>
  </aside>
  <header class="lg:hidden">                               ← mobile only
    <button aria-label="Open navigation" aria-haspopup="dialog" />  (DrawerTrigger)
  </header>
  <Drawer side="left">                                     ← mobile only, role="dialog"
    DrawerTitle "Navigation" · DrawerClose aria-label="Close navigation"
    <nav aria-label="Primary"> <SideNav/> </nav>
  </Drawer>
  <main id="main-content"> {page} </main>
</div>
```

`SideNav` renders the following for each `NavItem`:

```text
<ul><li><a href={href} data-testid="nav-{id}" aria-current="page"?>
  <Icon aria-hidden/> <span class="(collapsed ? sr-only : '')">{label}</span>
</a></li></ul>
```

## Behavior guarantees

1. Exactly one primary `<nav>` is exposed to assistive technology at a time. The docked aside is `display:none` below `lg`, and the drawer content is not rendered while closed.
2. Docked toggle: activating it with click, Enter, or Space flips `aria-expanded`, `aria-label`, and `data-nav-collapsed`, and writes the preference.
3. Collapsed rail: each link keeps its accessible name, and the tooltip shows the label on hover and keyboard focus.
4. Mobile drawer: on open, focus moves into the drawer and stays trapped there. Escape, a backdrop press, the close button, or a pathname change closes it. On close, focus returns to the trigger. If navigation happened, focus goes to `#main-content`'s `<h1>` instead.
5. The current link has `aria-current="page"` and a distinct visual style that does not rely on color alone (it also gets a left border/indicator).
6. Reduced motion: the width and drawer transitions are disabled under `prefers-reduced-motion: reduce`.
7. No horizontal page scroll at ≥ 320px. The schedule and comparison tables scroll inside `overflow-x-auto` wrappers.
