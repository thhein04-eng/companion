# Research: Glossary & Formulas Page

## Decisions

**R1 Content source.** Decision: hand-curated static entries. Rationale: definitions and "purpose" are prose;
generating from code cannot produce them. Alternatives: JSDoc extraction (rejected: no purpose text, couples build to parsing); Markdown/MDX (rejected: no search typing, extra tooling).

**R2 Location.** Decision: `libs/deal-analyzer/ui` (already hosts every page view and depends on both calculation libs for example tests). Alternatives: new `glossary` lib (rejected: generator and boundary overhead for ~4 files); `shared-ui` (rejected: would need to depend on deal-analyzer-calculations for example tests, inverting the dependency).

**R3 Drift control.** Decision: each entry may carry an `example` ({inputs, result text}); a spec recomputes it with the real functions. Alternative: no tests (rejected: Constitution I spirit, formulas are the value).

**R4 Search.** Decision: client-side case-insensitive substring over name, abbreviation, aliases, definition; rank name/abbreviation hits first; normalise "&", "-", "x" punctuation. Alternative: fuzzy library (rejected: ~80 entries, no new dependency).

**R5 Deep links.** Decision: `id="entry-id"` anchors plus hash read on mount and `hashchange`; highlight with a ring and `aria-current="true"`. Popover links use `next/link` to `/glossary#id`.

**R6 Layout.** Decision: sticky search + category chips, single column of cards (definition, purpose, formula in a monospace block, notes, used-on links), a "jump to" category list. Matches PageHeader/Section patterns from specs 010/013.

**R7 Scope boundaries.** APR, escrow, GRM, DTI, NPV and the 2% rule are not in the app. Decision: do not list them as metrics. Optionally a short "Related terms not calculated here" group is out of scope.

## Term inventory (source: code read-through, worktree at 4008d18)

Categories and entries. Formula shorthand: NOI = GSI + RUBS − opex.

**Loan**: P&I (`P·i·(1+i)^n / ((1+i)^n − 1)`, i = rate/12, 0% → P/n); Amortization schedule; Remaining balance (`P(1+i)^k − PMT((1+i)^k − 1)/i`); Loan term; Interest rate; Loan amount (price − down payment); Down payment ($ or %); Home price; LTV (loan ÷ price, N/A with no price); PMI (annual rate × original loan ÷ 12 while balance ÷ price > 80%, strict); Property tax; Insurance; HOA; Total monthly payment (P&I + tax/12 + insurance/12 + PMI + HOA); Extra payments (recurring / one-time; interest saved, periods saved); Total interest; Total cost (sum of P&I payments); Payoff date.

**Rental income & expenses**: Rent roll (up to 4 units); Gross scheduled income, GSI ((Σ rent + other income) × rent growth); Other income; Vacancy (overall or per unit); Property management %; Maintenance reserve %; CapEx; Operating expenses (excludes debt service); Custom operating expenses; RUBS (reimbursement = bill × recovered % × Σ paying units (1/N)(1 − vacancy)); House hacking ("I live here", Living there / After move-out, move-out year); Net housing cost (−cash flow while living there); NOI; Debt service (P&I × months + PMI months, extra principal excluded); Pre-tax cash flow (NOI − debt service); Total cash invested (down + closing + rehab); Closing costs; Rehab budget; Rent / expense growth (factor (1+g)^(year−1)).

**Return metrics**: Cap rate (annual NOI ÷ price); Cash-on-Cash, CoC (annual cash flow ÷ cash invested; N/A if ≤ 0); Pro forma.

**Rules of thumb**: 1% Rule (full rent roll rent ≥ 1% of price; other income excluded); 50% Rule (opex ÷ GSI ≤ 50%; rule estimate = 0.5 × GSI − debt service).

**Financing & DSCR**: DSCR (annual NOI ÷ annual P&I, PMI excluded; N/A if no P&I); Minimum DSCR (default 1.25, range 1.00–2.00, presets 1.15 / 1.20 / 1.25); Rent needed for minimum (solves NOI = min × annual P&I; N/A if reserves ≥ 100%); Conventional, ARM (N/1 ARM: reset balance re-amortised at adjusted rate), DSCR loan (defaults 25% down, rate +1); Financing options matrix.

**Hold & Exit**: Hold period (1–30 years, presets 5/7/10); Selling costs (default 7%, 0–15%); Projected sale price ((price + forced appreciation) × (1+g)^years); Loan payoff; Net sale proceeds (price − selling costs − payoff); Cash to investor (NOI − debt service − extra principal); Total net profit (Σ cash + net proceeds − invested); Equity multiple; IRR (annual, year-end flows, bisection on [−99%, 1000%], N/A if no root); Pre-tax vs after-tax returns.

**Wealth**: Projection horizon (1–30, default 10); Property value; Loan balance; Equity (value − balance; decomposed into initial equity, principal paid, market and forced appreciation); Appreciation; Forced appreciation; Cumulative cash flow (ignores extra principal here); Net worth (equity + cumulative cash flow); Multiple on cash invested; Depreciation (27.5-year straight line on price × (1 − land share) + rehab); Land value share (default 20%); Marginal tax rate (default 24%); Interest (annual); Taxable income (NOI − interest − depreciation); Tax effect (−taxable income × rate).

**Sale & tax**: Exit timing (months, clamped to term; default hold × 12 or 84); Projected sale price (months/12 exponent, no forced appreciation); Cumulative cash flow (after extra principal; 0 for non-rental); Return on cash invested (profit ÷ cash invested, not annualised); Verdict (Profit / Loss / Break-even); Break-even sale price (`(balance + invested − cumulative cash) ÷ (1 − selling%)`, floored at 0 → "profitable at any price"); Price cushion; Depreciation taken; Adjusted basis (price + closing + rehab − depreciation taken); Taxable gain; Depreciation recapture tax (rate default 25%, min(gain, depreciation taken)); Capital gains tax (default 15%); After-tax net profit; short-term warning (exit ≤ 12 months).

**Quirks to state accurately** (from report): DSCR uses P&I only while "Debt service" includes PMI; 1% rule excludes other income; PMI drops on strict > 80% against original price; wealth ignores extra principal, pro-forma and sale subtract it; closing costs are in adjusted basis but not in depreciable basis; the sale model applies no loss benefit and uses long-term rates even for ≤ 12 months.

## Open items
None blocking. Exact line citations were not captured by the survey; implementers must re-read each source function while writing the entry and its example (task-level step).
