/**
 * Pure, framework-free pagination math for the amortization schedule
 * (specs/004-amortization-schedule-pagination/data-model.md). View state only:
 * these helpers never touch a calculated value (FR-008).
 */

export type SchedulePageSize = 12 | 24 | 60 | 120 | 'all';

export const SCHEDULE_PAGE_SIZES = [12, 24, 60, 120, 'all'] as const satisfies readonly SchedulePageSize[];

/** One year of monthly payments per page. */
export const DEFAULT_SCHEDULE_PAGE_SIZE: SchedulePageSize = 12;

export interface SchedulePaginationState {
  /** 1-based. May exceed the page count after a recalculation; clamped on read. */
  page: number;
  pageSize: SchedulePageSize;
}

export interface SchedulePageRange {
  page: number;
  pageCount: number;
  /** 0-based, inclusive. */
  startIndex: number;
  /** 0-based, exclusive. */
  endIndex: number;
  /** 1-based display value; 0 when the schedule is empty. */
  firstRow: number;
  /** 1-based display value. */
  lastRow: number;
}

/** The rows on `page` of a `total`-row schedule. Clamps `page` into [1, pageCount]. */
export function getSchedulePage(
  total: number,
  page: number,
  pageSize: SchedulePageSize,
): SchedulePageRange {
  const count = Math.max(0, Math.floor(total));
  const size = pageSize === 'all' ? Math.max(count, 1) : pageSize;
  const pageCount = Math.max(1, Math.ceil(count / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const startIndex = (current - 1) * size;
  const endIndex = Math.min(startIndex + size, count);

  return {
    page: current,
    pageCount,
    startIndex,
    endIndex,
    firstRow: count === 0 ? 0 : startIndex + 1,
    lastRow: endIndex,
  };
}

/** The 1-based page that contains the 0-based `rowIndex` at `pageSize`. */
export function pageContainingRow(rowIndex: number, pageSize: SchedulePageSize): number {
  if (pageSize === 'all') return 1;
  return Math.floor(Math.max(0, rowIndex) / pageSize) + 1;
}
