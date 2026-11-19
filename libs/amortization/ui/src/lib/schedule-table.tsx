'use client';

import { useState } from 'react';
import type { SchedulePeriod } from 'shared-calculations';
import {
  Pagination,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from '@ui-sdk/react/pagination';
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@ui-sdk/react/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@ui-sdk/react/select';
import { currency, formatIsoDate, NumberField } from 'shared-ui';
import {
  DEFAULT_SCHEDULE_PAGE_SIZE,
  getSchedulePage,
  pageContainingRow,
  SCHEDULE_PAGE_SIZES,
  type SchedulePageSize,
  type SchedulePaginationState,
} from './schedule-pagination';

const count = new Intl.NumberFormat('en-US');

const PERIODS_PER_YEAR = 12;

const stepClass =
  'rounded px-2 py-1 text-muted hover:bg-sunk data-[disabled]:cursor-default data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent';
const linkClass =
  'min-w-8 rounded px-2 py-1 text-center text-fg hover:bg-sunk data-[current]:bg-ink data-[current]:text-ink-fg';

function parsePageSize(value: string): SchedulePageSize {
  return value === 'all' ? 'all' : (Number(value) as SchedulePageSize);
}

export interface ScheduleTableProps {
  periods: SchedulePeriod[];
  /** Controlled pagination state. Omit to let the table manage its own (page 1, 12 rows). */
  pagination?: SchedulePaginationState;
  onPaginationChange?: (next: SchedulePaginationState) => void;
}

/**
 * The period-by-period amortization schedule (001 FR-003), one page at a time
 * (004 FR-001): 12 rows per page by default, with First/Previous/Next/Last and
 * numbered page links, a live "Payments X–Y of N" range, a rows-per-page select
 * (12/24/60/120/All) and a Go to year field. Values are formatted with
 * `Intl.NumberFormat`/`Intl.DateTimeFormat` (001 FR-013) and never altered by
 * paging (004 FR-008).
 *
 * Controlled when `pagination` is passed; resetting to page 1 on a scenario
 * switch is the caller's job. A page past the end (after the schedule shrinks)
 * is read as the last page without being written back.
 */
export function ScheduleTable({
  periods,
  pagination,
  onPaginationChange,
}: ScheduleTableProps) {
  const [internal, setInternal] = useState<SchedulePaginationState>({
    page: 1,
    pageSize: DEFAULT_SCHEDULE_PAGE_SIZE,
  });
  const [goToYear, setGoToYear] = useState<number | null>(null);

  const state = pagination ?? internal;
  const setState = (next: SchedulePaginationState) => {
    if (pagination === undefined) setInternal(next);
    onPaginationChange?.(next);
  };

  const total = periods.length;
  const range = getSchedulePage(total, state.page, state.pageSize);
  const numericSize =
    state.pageSize === 'all' ? Math.max(total, 1) : state.pageSize;
  const rows = periods.slice(range.startIndex, range.endIndex);
  const paged = state.pageSize !== 'all';

  return (
    <div className="flex flex-col gap-3">
      <ScrollArea className="max-h-96 rounded-xl border border-line bg-surface">
        <ScrollAreaViewport
          role="region"
          aria-label="Amortization schedule"
          className="max-h-96 w-full"
        >
          <ScrollAreaContent>
            <table className="num w-full border-collapse text-[14px]">
              <thead className="sticky top-0 z-[1] bg-surface text-left">
                <tr>
                  <th className="border-b border-line px-3 py-2.5 text-[13px] font-medium text-muted">
                    #
                  </th>
                  <th className="border-b border-line px-3 py-2.5 text-[13px] font-medium text-muted">
                    Date
                  </th>
                  <th className="border-b border-line px-3 py-2.5 text-[13px] font-medium text-muted">
                    Payment
                  </th>
                  <th className="border-b border-line px-3 py-2.5 text-[13px] font-medium text-muted">
                    Principal
                  </th>
                  <th className="border-b border-line px-3 py-2.5 text-[13px] font-medium text-muted">
                    Interest
                  </th>
                  <th className="border-b border-line px-3 py-2.5 text-[13px] font-medium text-muted">
                    Remaining Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((period) => (
                  <tr
                    key={period.periodNumber}
                    className="border-t border-line"
                  >
                    <td className="px-3 py-2 text-muted">
                      {period.periodNumber}
                    </td>
                    <td className="px-3 py-2">{formatIsoDate(period.date)}</td>
                    <td className="px-3 py-2">
                      {currency.format(period.paymentAmount)}
                    </td>
                    <td className="px-3 py-2">
                      {currency.format(period.principalPortion)}
                    </td>
                    <td className="px-3 py-2">
                      {currency.format(period.interestPortion)}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {currency.format(period.remainingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollAreaContent>
        </ScrollAreaViewport>
        <ScrollAreaScrollbar className="w-2 bg-transparent p-0.5">
          <ScrollAreaThumb
            className="rounded-full bg-line"
            data-slot="scroll-area-scroll-to-end"
          />
        </ScrollAreaScrollbar>
      </ScrollArea>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p aria-live="polite" className="text-muted">
          Payments {count.format(range.firstRow)}–{count.format(range.lastRow)}{' '}
          of {count.format(total)}
        </p>

        {paged ? (
          <Pagination
            aria-label="Schedule pages"
            total={total}
            pageSize={numericSize}
            page={range.page}
            siblings={1}
            onPageChange={(page) => setState({ ...state, page })}
          >
            <PaginationList className="flex flex-wrap items-center gap-1">
              {({ items }) => (
                <>
                  <PaginationItem>
                    <PaginationFirst
                      aria-label="First page"
                      className={stepClass}
                    >
                      «
                    </PaginationFirst>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationPrevious
                      aria-label="Previous page"
                      className={stepClass}
                    >
                      ‹
                    </PaginationPrevious>
                  </PaginationItem>
                  {items.map((item) => (
                    <PaginationItem key={item}>
                      {typeof item === 'number' ? (
                        <PaginationLink page={item} className={linkClass} />
                      ) : (
                        <PaginationEllipsis className="px-1 text-muted" />
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      aria-label="Next page"
                      className={stepClass}
                    >
                      ›
                    </PaginationNext>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLast
                      aria-label="Last page"
                      className={stepClass}
                    >
                      »
                    </PaginationLast>
                  </PaginationItem>
                </>
              )}
            </PaginationList>
          </Pagination>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          {paged ? (
            <div className="w-36">
              <NumberField
                label="Go to year"
                min={1}
                max={Math.max(1, Math.ceil(total / PERIODS_PER_YEAR))}
                value={goToYear}
                onValueChange={(year) => {
                  setGoToYear(year);
                  if (year !== null && year >= 1) {
                    setState({
                      ...state,
                      page: pageContainingRow(
                        (year - 1) * PERIODS_PER_YEAR,
                        state.pageSize,
                      ),
                    });
                  }
                }}
              />
            </div>
          ) : null}

          <Select
            value={String(state.pageSize)}
            onValueChange={(value) => {
              if (value === null) return;
              const next = parsePageSize(String(value));
              setState({
                pageSize: next,
                page: pageContainingRow(range.startIndex, next),
              });
            }}
          >
            <div className="flex flex-col gap-1">
              <SelectLabel className="text-label font-medium text-muted">
                Rows per page
              </SelectLabel>
              <SelectTrigger className="flex min-w-20 items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                <SelectValue />
                <span aria-hidden="true" className="text-muted">
                  ▾
                </span>
              </SelectTrigger>
            </div>
            <SelectContent className="z-10 min-w-20 rounded-lg border border-line bg-surface p-1 text-[14px] shadow-float">
              {SCHEDULE_PAGE_SIZES.map((size) => (
                <SelectItem
                  key={size}
                  value={String(size)}
                  className="cursor-default rounded-xs px-2 py-1 data-[highlighted]:bg-sunk data-[selected]:font-medium"
                >
                  {size === 'all' ? 'All' : size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
