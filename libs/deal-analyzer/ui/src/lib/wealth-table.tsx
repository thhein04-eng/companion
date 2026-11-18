import type { WealthProjection, WealthYear } from 'deal-analyzer-calculations';
import { currency } from 'shared-ui';

const COLUMNS: { key: string; label: string; get: (y: WealthYear) => number | null }[] = [
  { key: 'value', label: 'Property value', get: (y) => y.propertyValue },
  { key: 'balance', label: 'Loan balance', get: (y) => y.loanBalance },
  { key: 'equity', label: 'Equity', get: (y) => y.equity },
  { key: 'initial-equity', label: 'Initial equity', get: (y) => y.initialEquity },
  { key: 'principal-paid', label: 'Principal paid', get: (y) => y.principalPaid },
  { key: 'market-appreciation', label: 'Market appreciation', get: (y) => y.marketAppreciation },
  { key: 'forced-appreciation', label: 'Forced appreciation', get: (y) => y.forcedAppreciation },
  { key: 'cash-flow', label: 'Cash flow', get: (y) => y.cashFlow },
  { key: 'cum-cash-flow', label: 'Cumulative cash flow', get: (y) => y.cumulativeCashFlow },
  { key: 'interest', label: 'Interest', get: (y) => y.interest },
  { key: 'depreciation', label: 'Depreciation', get: (y) => y.depreciation },
  { key: 'taxable', label: 'Taxable income', get: (y) => y.taxableIncome },
  { key: 'tax-effect', label: 'Tax effect', get: (y) => y.taxEffect },
  { key: 'net-worth', label: 'Net worth', get: (y) => y.netWorth },
  { key: 'net-worth-after-tax', label: 'Net worth after tax', get: (y) => y.netWorthAfterTax },
];

/** Year-by-year projection table (spec 008 FR-012). Scrolls inside its own region. */
export function WealthTable({
  projection,
  hasExtraPayments,
}: {
  projection: WealthProjection & { years: WealthYear[] };
  hasExtraPayments: boolean;
}) {
  return (
    <div data-testid="wealth-table" className="flex flex-col gap-2">
      <div
        role="region"
        aria-label="Year-by-year projection"
        tabIndex={0}
        className="overflow-x-auto rounded-md border border-neutral-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
      >
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Year-by-year wealth projection, purchase through year{' '}
            {projection.horizonYears}
          </caption>
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Year
              </th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2 text-right font-medium"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projection.years.map((y) => (
              <tr
                key={y.year}
                data-testid={`wealth-row-${y.year}`}
                className="border-t border-neutral-100"
              >
                <th
                  scope="row"
                  className="whitespace-nowrap px-3 py-1.5 text-left font-medium text-neutral-700"
                >
                  {y.year === 0 ? 'Purchase' : y.year}
                </th>
                {COLUMNS.map((c) => {
                  const value = c.get(y);
                  return (
                    <td
                      key={c.key}
                      data-testid={c.key}
                      className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                        value != null && value < 0 ? 'text-red-700' : ''
                      }`}
                    >
                      {value == null ? '—' : currency.format(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">
        Tax effect: positive = tax saved, negative = tax owed. Depreciation:
        27.5-year straight-line on the building value. Simplified model; not
        tax advice.
      </p>
      {hasExtraPayments ? (
        <p data-testid="wealth-extra-note" className="text-xs text-neutral-500">
          Cash flow excludes extra principal payments; they show up as faster
          principal paydown in equity.
        </p>
      ) : null}
    </div>
  );
}
