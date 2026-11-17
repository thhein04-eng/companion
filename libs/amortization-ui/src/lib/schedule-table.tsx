'use client';

import type { SchedulePeriod } from 'amortization-calculations';
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@ui-sdk/react/scroll-area';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

export interface ScheduleTableProps {
  periods: SchedulePeriod[];
}

/**
 * The full period-by-period amortization schedule (FR-003), in a styled
 * scrolling region so a 360+ row schedule stays usable, formatted with
 * `Intl.NumberFormat`/`Intl.DateTimeFormat` for locale-consistent display
 * (FR-013).
 */
export function ScheduleTable({ periods }: ScheduleTableProps) {
  return (
    <ScrollArea className="h-96 rounded-md border border-neutral-200">
      <ScrollAreaViewport
        role="region"
        aria-label="Amortization schedule"
        className="h-full w-full"
      >
        <ScrollAreaContent>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-neutral-100 text-left text-neutral-600">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Payment</th>
                <th className="px-3 py-2 font-medium">Principal</th>
                <th className="px-3 py-2 font-medium">Interest</th>
                <th className="px-3 py-2 font-medium">Remaining Balance</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr
                  key={period.periodNumber}
                  className="border-t border-neutral-100"
                >
                  <td className="px-3 py-1.5 text-neutral-500">
                    {period.periodNumber}
                  </td>
                  <td className="px-3 py-1.5">
                    {date.format(new Date(`${period.date}T00:00:00`))}
                  </td>
                  <td className="px-3 py-1.5">
                    {currency.format(period.paymentAmount)}
                  </td>
                  <td className="px-3 py-1.5">
                    {currency.format(period.principalPortion)}
                  </td>
                  <td className="px-3 py-1.5">
                    {currency.format(period.interestPortion)}
                  </td>
                  <td className="px-3 py-1.5 font-medium">
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
          className="rounded-full bg-neutral-300"
          data-slot="scroll-area-scroll-to-end"
        />
      </ScrollAreaScrollbar>
    </ScrollArea>
  );
}
