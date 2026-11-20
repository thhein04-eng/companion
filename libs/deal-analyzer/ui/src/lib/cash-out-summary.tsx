import type { CashOutResult } from 'deal-analyzer-calculations';
import type { RatioResult } from 'shared-calculations';
import { currency, percent2 } from 'shared-ui';
import { ResultTable, type ResultRow } from './refinance-result-table';
import { signedMoney } from './sale-summary';

/** "+$452.48 a month vs. current" — the new payment against the current one. */
export function piChangeNote(change: number): string {
  if (change === 0) return 'Same as current';
  const amount = signedMoney(Math.abs(change));
  return `${change > 0 ? '+' : '−'}${amount} a month vs. current`;
}

/** A ratio as a percentage with a true minus sign; `N/A` when it has no value. */
export function signedPercent(value: number | null): string {
  if (value == null) return 'N/A';
  const text = percent2.format(Math.abs(value));
  // A value that rounds to 0.00% never shows a minus sign.
  return value < 0 && text !== '0.00%' ? `−${text}` : text;
}

const ratio = (r: RatioResult) => ({
  value: signedPercent(r.value),
  note: r.value == null ? (r.naReason ?? undefined) : undefined,
});

/** The rows of the cash-out table: proceeds (US1), then capital recycled (US2). */
export function cashOutRows(result: CashOutResult): ResultRow[] {
  return [
    {
      id: 'refi-new-loan',
      label: 'New loan amount',
      value: currency.format(result.newLoan),
    },
    {
      id: 'refi-payoff',
      label: 'Payoff of current loan',
      value: signedMoney(-result.payoff),
    },
    {
      id: 'refi-closing',
      label: 'Refinance closing costs',
      value: signedMoney(-result.closingCosts),
    },
    {
      id: 'refi-net-proceeds',
      label: result.isCashIn ? 'Cash-in refinance' : 'Net proceeds',
      value: signedMoney(result.netProceeds),
      note: result.isCashIn ? 'You bring cash to close' : undefined,
      tone: 'total',
    },
    {
      id: 'refi-pi-current',
      label: 'Current monthly P&I',
      value: currency.format(result.currentPi),
    },
    {
      id: 'refi-pi-new',
      label: 'New monthly P&I',
      value: currency.format(result.newPi),
      note: piChangeNote(result.piChange),
    },
    {
      id: 'refi-invested',
      label: 'Total cash invested',
      value: signedMoney(result.totalCashInvested),
    },
    {
      id: 'refi-cash-left',
      label: 'Cash left in deal',
      value: signedMoney(result.cashLeft),
      note: result.allCashRecovered ? 'All cash recovered' : undefined,
      tone: 'total',
    },
    {
      id: 'refi-recycled',
      label: 'Capital recycled',
      ...ratio(result.capitalRecycledPct),
    },
    {
      id: 'refi-coc-before',
      label: 'Cash-on-cash before refinance',
      ...ratio(result.cashOnCashBefore),
    },
    result.allCashRecovered
      ? {
          id: 'refi-coc-after',
          label: 'Cash-on-cash after refinance',
          value: 'All cash recovered',
          note: `Cash surplus ${currency.format(result.cashSurplus)}`,
        }
      : {
          id: 'refi-coc-after',
          label: 'Cash-on-cash after refinance',
          ...ratio(result.cashOnCashAfter),
        },
  ];
}

/** The cash-out refinance proceeds and the capital left in the deal (spec 014 US1, US2). */
export function CashOutSummary({ result }: { result: CashOutResult }) {
  return (
    <div data-testid="refinance-summary" className="flex flex-col gap-3">
      <ResultTable
        caption="Cash-out refinance: net proceeds, cash left in the deal and cash-on-cash"
        rows={cashOutRows(result)}
      />
    </div>
  );
}
