# Contract: `amortization-ui` schedule pagination public API

What `libs/amortization-ui/src/index.ts` exports for this feature. Apps may import only
these names (Constitution II, module boundaries).

## Pure helpers (`schedule-pagination.ts`)

```ts
export type SchedulePageSize = 12 | 24 | 60 | 120 | 'all';
export const SCHEDULE_PAGE_SIZES: readonly SchedulePageSize[]; // [12, 24, 60, 120, 'all']
export const DEFAULT_SCHEDULE_PAGE_SIZE: SchedulePageSize;     // 12

export interface SchedulePaginationState { page: number; pageSize: SchedulePageSize }

export interface SchedulePageRange {
  page: number; pageCount: number;
  startIndex: number; endIndex: number; // 0-based, [start, end)
  firstRow: number; lastRow: number;    // 1-based display values
}

/** Pure. Clamps `page` into [1, pageCount]. Never throws for total >= 0. */
export function getSchedulePage(total: number, page: number, pageSize: SchedulePageSize): SchedulePageRange;

/** Pure. 1-based page that contains the 0-based `rowIndex` at `pageSize` ('all' → 1). */
export function pageContainingRow(rowIndex: number, pageSize: SchedulePageSize): number;
```

The examples and invariants in [data-model.md](../data-model.md) are the expected results for
the unit tests.

## `ScheduleTable` component (extended, backward compatible)

```ts
export interface ScheduleTableProps {
  periods: SchedulePeriod[];
  /** Controlled state. Omit for uncontrolled (internal state, default page 1 / size 12). */
  pagination?: SchedulePaginationState;
  onPaginationChange?: (next: SchedulePaginationState) => void;
}
```

### Rendered UI contract (what e2e tests and assistive technology rely on)

| Element | Contract |
| ------- | -------- |
| Table region | `role="region"`, `aria-label="Amortization schedule"` (unchanged). `tbody tr` count = rows on the current page. |
| Range text | `aria-live="polite"`, text exactly `Payments {firstRow}–{lastRow} of {total}` (en dash, `Intl`-formatted numbers) |
| Pager | `nav` with `aria-label="Schedule pages"`. Links show page numbers, and the current one has `aria-current="page"`. Steps have the accessible names "First page", "Previous page", "Next page", "Last page", and get `aria-disabled="true"` at the ends. Hidden when `pageSize === 'all'`. |
| Rows per page | Select labelled `Rows per page`, with the options `12`, `24`, `60`, `120`, `All` |
| Go to year | `NumberField` labelled `Go to year`, `min={1}`, `max={Math.ceil(total / 12)}`. On commit, sets `page = pageContainingRow((year − 1) × 12, pageSize)` and keeps `pageSize`. Hidden when `pageSize === 'all'`. |

Resetting to page 1 on a scenario switch is the caller's job (see App wiring). In
uncontrolled mode, the component keeps its page until it is remounted.

Columns, headers, and cell formatting are unchanged (spec FR-008).

## App wiring (`apps/amortization-calculator/src/app/page.tsx`)

- Holds `SchedulePaginationState` in `useState` above the `schedule ? … : …` branch.
- Resets `page` to 1 when `activeScenarioId` changes.
- `ExportScheduleButton` still receives the full `schedule` (FR-007).
