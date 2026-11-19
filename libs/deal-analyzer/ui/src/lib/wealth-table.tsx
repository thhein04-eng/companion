import type { WealthProjection, WealthYear } from 'deal-analyzer-calculations';
import { currency } from 'shared-ui';

const COLUMNS: {
  key: string;
  label: string;
  get: (y: WealthYear) => number | null;
}[] = [
  { key: 'value', label: 'Property value', get: (y) => y.propertyValue },
  { key: 'balance', label: 'Loan balance', get: (y) => y.loanBalance },
  { key: 'equity', label: 'Equity', get: (y) => y.equity },
  {
    key: 'initial-equity',
    label: 'Initial equity',
    get: (y) => y.initialEquity,
  },
  {
    key: 'principal-paid',
    label: 'Principal paid',
    get: (y) => y.principalPaid,
  },
  {
    key: 'market-appreciation',
    label: 'Market appreciation',
    get: (y) => y.marketAppreciation,
  },
  {
    key: 'forced-appreciation',
    label: 'Forced appreciation',
    get: (y) => y.forcedAppreciation,
  },
  { key: 'cash-flow', label: 'Cash flow', get: (y) => y.cashFlow },
  {
    key: 'cum-cash-flow',
    label: 'Cumulative cash flow',
    get: (y) => y.cumulativeCashFlow,
  },
  { key: 'interest', label: 'Interest', get: (y) => y.interest },
  { key: 'depreciation', label: 'Depreciation', get: (y) => y.depreciation },
  { key: 'taxable', label: 'Taxable income', get: (y) => y.taxableIncome },
  { key: 'tax-effect', label: 'Tax effect', get: (y) => y.taxEffect },
  { key: 'net-worth', label: 'Net worth', get: (y) => y.netWorth },
  {
    key: 'net-worth-after-tax',
    label: 'Net worth after tax',
    get: (y) => y.netWorthAfterTax,
  },
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
        className="overflow-x-auto rounded-xl border border-line bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <table className="num w-full border-collapse text-[14px]">
          <caption className="sr-only">
            Year-by-year wealth projection, purchase through year{' '}
            {projection.horizonYears}
          </caption>
          <thead className="text-left">
            <tr>
              <th
                scope="col"
                className="border-b border-line px-3 py-2.5 text-[13px] font-medium text-muted"
              >
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
                className="border-t border-line"
              >
                <th
                  scope="row"
                  className="whitespace-nowrap px-3 py-2 text-left font-medium text-fg"
                >
                  {y.year === 0 ? 'Purchase' : y.year}
                  {y.year === projection.moveOutYear ? (
                    <span
                      data-testid="move-out-marker"
                      className="ml-2 rounded-full bg-sunk px-2 py-0.5 text-[11.5px] font-semibold text-fg"
                    >
                      Move out
                    </span>
                  ) : null}
                </th>
                {COLUMNS.map((c) => {
                  const value = c.get(y);
                  return (
                    <td
                      key={c.key}
                      data-testid={c.key}
                      className={`whitespace-nowrap px-3 py-2 text-right num ${
                        value != null && value < 0 ? 'text-bad' : ''
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
      <p className="text-xs text-muted">
        Tax effect: positive = tax saved, negative = tax owed. Depreciation:
        27.5-year straight-line on the building value. Simplified model; not tax
        advice.
      </p>
      {hasExtraPayments ? (
        <p data-testid="wealth-extra-note" className="text-xs text-muted">
          Cash flow excludes extra principal payments; they show up as faster
          principal paydown in equity.
        </p>
      ) : null}
    </div>
  );
}
