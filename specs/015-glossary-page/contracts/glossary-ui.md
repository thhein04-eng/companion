# UI Contract: /glossary

**Route**: `/glossary`; metadata title "Glossary & Formulas", description "Definitions, purpose and formulas for every real-estate term and metric in this app." Nav: id `glossary`, label "Glossary", `BookIcon`, last item.

**Page**: `PageHeader` (title "Glossary & Formulas", lede "What each term means, why it matters, and how this app calculates it.") then, no Deal Strip (no scenario data is used).

**Controls**
- Search input, label "Search terms", placeholder "Search, e.g. DSCR or cap rate"; clear button when non-empty.
- Category chips: "All" plus the 8 categories (single-select).
- Live region (`role="status"`): "N terms" / "No terms match "{query}"" with a "Clear search" button.

**Entry card** (`<article id={entry.id}>`, heading level 3 `name` + abbreviation badge): Definition; "Why it matters"; "Formula" (monospace, wraps); "Notes" list; "Example" when present; "Used on" links (route labels from nav); "Related" links (`#id`).

**Deep link**: `#id` on load/hashchange scrolls to and highlights (`data-highlighted`, `aria-current="true"`); if the active filter hides it, the filter resets.

**Popover links**: MetricCard, RuleIndicator and DSCR info popovers add "Full definition" → `/glossary#<id>` via an optional `glossaryId` prop (no change when absent).

**Accessibility**: one `h1`, entry headings `h3` under category `h2`; focus rings; contrast tokens from the existing theme; no horizontal scroll at 375 px.
