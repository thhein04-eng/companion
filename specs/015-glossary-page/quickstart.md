# Quickstart: validating the Glossary page

Run from the worktree `.claude/worktrees/015-glossary-page`.

1. **Unit**: `npm exec nx -- test deal-analyzer-ui` and `npm exec nx -- test deal-analyzer-calculations` (entry integrity, filter, worked examples vs real calculations).
2. **Lint/typecheck**: `npm exec nx -- run-many -t lint,typecheck`.
3. **E2E** (prod build on a non-3000 port, set `BASE_URL`): `npm exec nx -- build amortization-calculator`, serve on :3200, run `glossary.spec.ts`, `a11y.spec.ts`, `navigation.spec.ts`.
4. **Manual**:
   - Nav shows "Glossary"; `/glossary` lists all categories.
   - Search "coc" → Cash-on-Cash; "zzz" → empty state with Clear search works.
   - Pick category "Financing & DSCR" combined with search "min".
   - Open `/glossary#dscr` → entry highlighted. On `/financing`, open the DSCR info popover → "Full definition" lands on it.
   - 375 px width: no horizontal scroll. Toggle dark theme: contrast intact.
   - Spot-check three formulas against the Deal Analyzer, Financing and Sale pages.

Expected: all green; every worked example matches the app to the cent.
