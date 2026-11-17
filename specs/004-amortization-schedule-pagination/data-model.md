# Data Model: Paginated Amortization Schedule

This feature adds **view state only**. `LoanScenario`, `SchedulePeriod`, and `ScheduleResult`
(feature 001 data-model) are unchanged, and nothing new is persisted or exported.

## SchedulePageSize

`12 | 24 | 60 | 120 | 'all'`. The default is `12`.

## SchedulePaginationState (owned by `apps/amortization-calculator/src/app/page.tsx`)

| Field      | Type               | Rules                                                                                                    |
| ---------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `page`     | integer ≥ 1        | 1-based. May exceed `pageCount` after a recalculation; it is clamped when read (research R5), not when stored. |
| `pageSize` | `SchedulePageSize` | One of the five allowed values.                                                                          |

**Transitions**

| Event                                  | Result                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Pager item, First, Previous, Next, Last | `page` = the requested page (the SDK only offers pages that are in range)                        |
| Rows-per-page changed `old → new`      | `page` = `pageContainingRow(firstVisibleRowIndex, new)` (`1` when `new` is `'all'`)               |
| Schedule recalculated                  | No state change. The effective page is `min(page, pageCount)`                                    |
| `activeScenarioId` changed             | `page` = 1, `pageSize` is kept                                                                   |
| Inputs become invalid or valid again   | No state change. The table unmounts and remounts, and the state survives in `page.tsx`           |

## SchedulePageRange (derived, pure: `getSchedulePage`)

| Field        | Type        | Definition                                                         |
| ------------ | ----------- | ------------------------------------------------------------------ |
| `pageCount`  | integer ≥ 1 | `'all'` or `total = 0` → 1. Otherwise `ceil(total / pageSize)`     |
| `page`       | integer     | `clamp(requestedPage, 1, pageCount)`                               |
| `startIndex` | integer     | 0-based inclusive: `(page − 1) × pageSize` (0 for `'all'`)         |
| `endIndex`   | integer     | 0-based exclusive: `min(startIndex + pageSize, total)` (`total` for `'all'`) |
| `firstRow`   | integer     | `startIndex + 1` for display (0 when `total = 0`)                  |
| `lastRow`    | integer     | `endIndex` for display                                             |

**Invariants** (unit-tested; SC-003): if you step through every page in order, the
concatenated `[startIndex, endIndex)` ranges cover `0..total` exactly once with no gaps.
`lastRow − firstRow + 1 ≤ pageSize`.

**Examples**

| total | pageSize | page | pageCount | rows shown |
| ----- | -------- | ---- | --------- | ---------- |
| 360   | 12       | 1    | 30        | 1–12       |
| 360   | 12       | 30   | 30        | 349–360    |
| 100   | 12       | 9    | 9         | 97–100     |
| 180   | 12       | 25   | 15        | 169–180 (clamped) |
| 360   | 'all'    | 4    | 1         | 1–360      |
| 12    | 12       | 1    | 1         | 1–12       |
