import type {
  RateDropBreakeven,
  RateDropResult,
} from 'deal-analyzer-calculations';
import { currency } from 'shared-ui';
import { ResultTable, type ResultRow } from './refinance-result-table';
import { signedMoney } from './sale-summary';

/** "1 yr 6 mo", "2 yr" or "7 mo". */
export function yearsMonthsLabel(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} mo`;
  return rest === 0 ? `${years} yr` : `${years} yr ${rest} mo`;
}

/** The breakeven as text: a month with its years and loan month, or the reason there is none. */
export function breakevenText(b: RateDropBreakeven): {
  value: string;
  note?: string;
} {
  switch (b.kind) {
    case 'month':
      return {
        value: `Month ${b.months}`,
        note: `${yearsMonthsLabel(b.months)} · loan month ${b.loanMonth}`,
      };
    case 'immediate':
      return { value: 'Immediate' };
    case 'none':
      return { value: 'No breakeven', note: b.reason };
    case 'beyond-term':
      return { value: 'Not within the loan term' };
  }
}

/** The Deal Strip headline for Rate-drop mode: the breakeven in months, or why there is none. */
export function breakevenHeadline(result: RateDropResult): {
  value: number | null;
  naReason: string | null;
} {
  const b = result.breakeven;
  if (b.kind === 'month') return { value: b.months, naReason: null };
  if (b.kind === 'immediate') return { value: 0, naReason: null };
  return { value: null, naReason: breakevenText(b).value };
}

/** The rows of the rate-drop comparison (spec 014 US3, contracts/refinance-ui.md). */
export function rateDropRows(result: RateDropResult): ResultRow[] {
  const breakeven = breakevenText(result.breakeven);
  return [
    {
      id: 'refi-pi-current',
      label: 'Current monthly P&I',
      value: currency.format(result.currentPi),
    },
    {
      id: 'refi-pi-new',
      label: 'New monthly P&I',
      value: currency.format(result.newPi),
    },
    {
      id: 'refi-savings',
      label: 'Monthly savings',
      value: signedMoney(result.monthlySavings),
      note:
        result.monthlySavings < 0
          ? 'The new payment is higher than your current payment'
          : undefined,
      tone: 'total',
    },
    { id: 'refi-breakeven', label: 'Breakeven', ...breakeven },
    {
      id: 'refi-net-savings',
      label: 'Net savings over the remaining term',
      value: signedMoney(result.netSavings),
      tone: 'total',
    },
  ];
}

/** Keep the current mortgage, or refinance it at a lower rate (spec 014 US3). */
export function RateDropSummary({ result }: { result: RateDropResult }) {
  return (
    <div data-testid="refinance-summary" className="flex flex-col gap-3">
      <ResultTable
        caption="Rate drop: monthly savings, breakeven month and net savings"
        rows={rateDropRows(result)}
      />
      {result.termExtended ? (
        <p
          data-testid="refi-extended-note"
          className="m-0 text-small text-muted"
        >
          Part of this saving comes from the longer term. The net savings figure
          still counts the balance owed on the new loan when your current
          loan&apos;s term ends.
        </p>
      ) : null}
    </div>
  );
}
