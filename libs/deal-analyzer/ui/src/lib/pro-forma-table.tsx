import type { ExitResult, ProFormaYear } from 'deal-analyzer-calculations';
import { currency, tableClass, tdClass, thClass } from 'shared-ui';

const COLUMNS: {
  key: string;
  label: string;
  get: (y: ProFormaYear) => number | null;
}[] = [
  { key: 'gross-income', label: 'Gross income', get: (y) => y.grossIncome },
  { key: 'opex', label: 'Operating expenses', get: (y) => y.operatingExpenses },
  { key: 'noi', label: 'NOI', get: (y) => y.noi },
  { key: 'debt-service', label: 'Debt service', get: (y) => y.debtService },
  {
    key: 'extra-principal',
    label: 'Extra principal',
    get: (y) => y.extraPrincipal,
  },
  {
    key: 'cash-to-investor',
    label: 'Cash to investor',
    get: (y) => y.cashToInvestor,
  },
  { key: 'interest', label: 'Interest', get: (y) => y.interest },
  { key: 'depreciation', label: 'Depreciation', get: (y) => y.depreciation },
  { key: 'taxable', label: 'Taxable income', get: (y) => y.taxableIncome },
  { key: 'tax-effect', label: 'Tax effect', get: (y) => y.taxEffect },
  {
    key: 'after-tax-cf',
    label: 'After-tax cash flow',
    get: (y) => y.afterTaxCashFlow,
  },
  { key: 'balance', label: 'Loan balance', get: (y) => y.loanBalance },
  { key: 'value', label: 'Property value', get: (y) => y.propertyValue },
];

function Money({ value }: { value: number | null }) {
  if (value == null) return <>—</>;
  return value < 0 ? (
    <span className="text-bad">−{currency.format(-value)}</span>
  ) : (
    <>{currency.format(value)}</>
  );
}

/** Year-by-year pro forma with the sale row (spec 009 contracts § ProFormaTable). */
export function ProFormaTable({
  result,
  moveOutYear = null,
}: {
  result: ExitResult;
  /** The owner's move-out year of a house-hacked deal, marked on its row (spec 012 FR-016). */
  moveOutYear?: number | null;
}) {
  const sale: [string, string, number][] = [
    ['sale-price', 'Sale price', result.salePrice],
    ['selling-costs', 'Selling costs', -result.sellingCosts],
    ['payoff', 'Loan payoff', -result.loanPayoff],
    ['net-proceeds', 'Net proceeds', result.netSaleProceeds],
  ];
  return (
    <div data-testid="pro-forma-table" className="flex flex-col gap-2">
      <div
        role="region"
        aria-label="Pro forma by year"
        tabIndex={0}
        className="min-w-0 overflow-x-auto rounded-xl border border-line bg-surface"
      >
        <table className={tableClass}>
          <caption className="sr-only">
            Pro forma for a {result.holdYears}-year hold, with the sale
          </caption>
          <thead>
            <tr>
              <th scope="col" className={thClass}>
                Year
              </th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`${thClass} whitespace-nowrap text-right`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.years.map((y) => (
              <tr key={y.year} data-testid={`pro-forma-row-${y.year}`}>
                <th scope="row" className={`${tdClass} text-left font-medium`}>
                  {y.year}
                  {y.year === moveOutYear ? (
                    <span
                      data-testid="move-out-marker"
                      className="ml-2 rounded-full bg-sunk px-2 py-0.5 text-[11.5px] font-semibold text-fg"
                    >
                      Move out
                    </span>
                  ) : null}
                </th>
                {COLUMNS.map((c) => (
                  <td
                    key={c.key}
                    data-testid={c.key}
                    className={`${tdClass} whitespace-nowrap text-right`}
                  >
                    <Money value={c.get(y)} />
                  </td>
                ))}
              </tr>
            ))}
            <tr data-testid="pro-forma-sale" className="bg-sunk font-semibold">
              <th scope="row" className={`${tdClass} text-left`}>
                Sale
              </th>
              {sale.map(([key, label, value]) => (
                <td
                  key={key}
                  data-testid={key}
                  className={`${tdClass} whitespace-nowrap`}
                >
                  <span className="block text-[12.5px] font-medium text-muted">
                    {label}
                  </span>
                  <Money value={value} />
                </td>
              ))}
              <td colSpan={COLUMNS.length - sale.length} className={tdClass} />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="m-0 text-[12.5px] text-muted">
        Cash to investor includes extra principal payments as an outflow.
      </p>
      <p className="m-0 text-[12.5px] text-muted">
        Depreciation: building value ÷ 27.5 years (land excluded). Simplified
        model; not tax advice.
      </p>
    </div>
  );
}
