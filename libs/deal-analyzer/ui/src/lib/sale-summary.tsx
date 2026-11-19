import type { SaleResult } from 'deal-analyzer-calculations';
import { currency, percent2, tableClass, tdClass } from 'shared-ui';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "Sale after 7 years", "Sale after 7 yr 6 mo" or "Sale after 90 months" (contracts § SaleSummary). */
export function saleHeading(exitMonth: number, unit: 'years' | 'months'): string {
  if (unit === 'months') return `Sale after ${plural(exitMonth, 'month')}`;
  const y = Math.floor(exitMonth / 12);
  const m = exitMonth % 12;
  if (m === 0) return `Sale after ${plural(y, 'year')}`;
  return y === 0 ? `Sale after ${m} mo` : `Sale after ${y} yr ${m} mo`;
}

/** Signed currency with a true minus sign; −0 (a negated $0) shows as "$0.00". */
export function signedMoney(n: number): string {
  const v = n + 0;
  return v < 0 ? `−${currency.format(-v)}` : currency.format(Math.abs(v));
}

const VERDICT: Record<
  SaleResult['verdict'],
  { label: string; className: string }
> = {
  profit: { label: 'Profit', className: 'bg-good-soft text-good' },
  loss: { label: 'Loss', className: 'bg-bad-soft text-bad' },
  'break-even': { label: 'Break-even', className: 'border-line bg-sunk text-fg' },
};

type Row = {
  id: string;
  label: string;
  value: string;
  note?: string;
  tone?: 'bad' | 'total';
};

/** The sale waterfall, profit, return and verdict (spec 013 US1). */
export function SaleSummary({
  result,
  unit,
}: {
  result: SaleResult;
  unit: 'years' | 'months';
}) {
  const nonRental = result.mode === 'non-rental';
  const verdict = VERDICT[result.verdict];
  const ret = result.returnOnCash;
  const rows: Row[] = [
    { id: 'sale-price', label: 'Projected sale price', value: currency.format(result.salePrice) },
    { id: 'sale-selling-costs', label: 'Selling costs', value: signedMoney(-result.sellingCosts) },
    { id: 'sale-balance', label: 'Remaining loan balance', value: signedMoney(-result.remainingBalance) },
    { id: 'sale-net-proceeds', label: 'Net sale proceeds', value: signedMoney(result.netSaleProceeds), tone: 'total' },
    {
      id: 'sale-cash-flow',
      label: 'Cumulative cash flow',
      value: signedMoney(result.cumulativeCashFlow),
      note: nonRental ? 'No rental: cash flow not included' : 'After debt service and extra principal',
    },
    { id: 'sale-invested', label: 'Total cash invested', value: signedMoney(-result.totalCashInvested) },
    { id: 'sale-profit', label: 'Total net profit', value: signedMoney(result.totalNetProfit), tone: 'total' },
    {
      id: 'sale-return',
      label: 'Return on cash invested',
      value: ret.value == null ? 'N/A' : percent2.format(ret.value),
      note: ret.naReason ?? undefined,
    },
  ];

  return (
    <div data-testid="sale-summary" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="m-0 font-display text-h3 font-semibold text-fg">
          {saleHeading(result.exitMonth, unit)}
        </h3>
        <span
          data-testid="sale-verdict"
          className={`inline-flex items-center rounded-full border border-transparent px-3 py-1 text-[13px] font-semibold ${verdict.className}`}
        >
          {verdict.label}
        </span>
      </div>
      <div className="min-w-0 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className={tableClass}>
          <caption className="sr-only">
            Sale waterfall: from sale price to total net profit
          </caption>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                data-testid={row.id}
                className={row.tone === 'total' ? 'font-semibold' : undefined}
              >
                <th
                  scope="row"
                  className={`${tdClass} text-left font-medium text-fg`}
                >
                  {row.label}
                  {row.note ? (
                    <span className="block text-[12.5px] font-normal text-muted">
                      {row.note}
                    </span>
                  ) : null}
                </th>
                <td
                  data-value=""
                  className={`${tdClass} text-right ${
                    // Deductions read as minus signs; only a negative result is red.
                    row.tone === 'total' && row.value.startsWith('−')
                      ? 'text-bad'
                      : 'text-fg'
                  }`}
                >
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nonRental ? (
        <p className="m-0 text-small text-muted">
          Excludes holding costs (mortgage payments, tax, insurance, HOA).
        </p>
      ) : null}
      {result.forcedAppreciationNote ? (
        <p className="m-0 text-small text-muted">
          Hold &amp; Exit&apos;s sale price also includes forced appreciation;
          this page compounds the purchase price only.
        </p>
      ) : null}
    </div>
  );
}
