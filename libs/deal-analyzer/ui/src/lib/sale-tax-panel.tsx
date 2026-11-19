import type { SaleResult, SaleTaxEstimate } from 'deal-analyzer-calculations';
import { tableClass, tdClass } from 'shared-ui';
import { TAX_DISCLAIMER } from './sale-assumptions-panel';
import { signedMoney } from './sale-summary';

type Row = {
  id: string;
  label: string;
  get: (t: SaleTaxEstimate) => number;
  rentalOnly?: boolean;
  total?: boolean;
};

const ROWS: Row[] = [
  { id: 'sale-tax-depreciation', label: 'Depreciation taken', get: (t) => t.depreciationTaken, rentalOnly: true },
  { id: 'sale-tax-basis', label: 'Adjusted basis', get: (t) => t.adjustedBasis },
  { id: 'sale-tax-gain', label: 'Taxable gain', get: (t) => t.taxableGain },
  { id: 'sale-tax-recapture', label: 'Depreciation recapture tax', get: (t) => -t.recaptureTax, rentalOnly: true },
  { id: 'sale-tax-capital-gains', label: 'Capital gains tax', get: (t) => -t.capitalGainsTax },
  { id: 'sale-tax-total', label: 'Total tax on sale', get: (t) => -t.totalTax },
  { id: 'sale-after-tax-profit', label: 'After-tax net profit', get: (t) => t.afterTaxNetProfit, total: true },
];

/** The illustrative tax-on-sale estimate (spec 013 US3, contracts § SaleTaxPanel). */
export function SaleTaxPanel({ result }: { result: SaleResult }) {
  const tax = result.tax;
  const rows = ROWS.filter((r) => !r.rentalOnly || result.mode === 'rental');
  return (
    <div data-testid="sale-tax" className="flex flex-col gap-3">
      <p className="m-0 text-small font-medium text-muted">{TAX_DISCLAIMER}</p>
      {result.taxNaReason ? (
        <p data-testid="sale-tax-na" className="m-0 text-small text-bad">
          {result.taxNaReason}
        </p>
      ) : null}
      <div className="min-w-0 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className={tableClass}>
          <caption className="sr-only">Estimated tax on the sale</caption>
          <tbody>
            {rows.map((row) => {
              const value = tax ? row.get(tax) : null;
              return (
                <tr
                  key={row.id}
                  data-testid={row.id}
                  className={row.total ? 'font-semibold' : undefined}
                >
                  <th
                    scope="row"
                    className={`${tdClass} text-left font-medium text-fg`}
                  >
                    {row.label}
                  </th>
                  <td
                    className={`${tdClass} text-right ${
                      row.total && value != null && value < 0
                        ? 'text-bad'
                        : 'text-fg'
                    }`}
                  >
                    {value == null ? '—' : signedMoney(value)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {tax?.shortTermWarning ? (
        <p
          data-testid="sale-tax-short-term"
          className="m-0 text-small text-muted"
        >
          Held 1 year or less: gains are usually taxed at ordinary income
          rates — set the capital gains rate accordingly.
        </p>
      ) : null}
    </div>
  );
}
