# Data Model: Glossary

No persisted data. Static, typed module in `libs/deal-analyzer/ui/src/lib/glossary-entries.ts`.

```ts
type GlossaryCategoryId = 'loan' | 'rental' | 'returns' | 'rules' | 'financing' | 'exit' | 'wealth' | 'sale-tax';

interface GlossaryCategory { id: GlossaryCategoryId; label: string; order: number }

type GlossaryRouteId = 'amortization' | 'deal-analyzer' | 'financing' | 'wealth' | 'pro-forma' | 'sale';

interface GlossaryEntry {
  id: string;                 // kebab slug, unique, used as URL hash
  name: string;               // "Debt Service Coverage Ratio"
  abbreviation?: string;      // "DSCR"
  aliases?: string[];         // extra search words, e.g. "coc", "p and i"
  category: GlossaryCategoryId;
  definition: string;         // plain language, 1-3 sentences
  purpose: string;            // why an investor looks at it
  formula?: string[];         // one line per step; omit for pure concepts
  notes?: string[];           // defaults, ranges, N/A cases, app quirks
  usedOn: GlossaryRouteId[];  // routes where it appears
  related?: string[];         // other entry ids
  example?: { inputs: string; result: string }; // verified by tests
}
```

**Validation (tested)**: ids unique and kebab-case; `related` ids exist; `usedOn` non-empty; every category has at least one entry; entries with `formula` have non-empty lines; inventory terms from research.md all present.

**Derived**: `filterGlossary(entries, {query, category})` returns entries ordered by match rank then category order, name. No state transitions.
