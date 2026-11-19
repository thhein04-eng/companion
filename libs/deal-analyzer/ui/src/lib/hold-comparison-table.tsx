import type { ExitProjection, ExitResult } from 'deal-analyzer-calculations';
import { currency, percent2, tableClass, tdClass, thClass } from 'shared-ui';

const ROWS: { key: string; label: string; get: (r: ExitResult) => string }[] = [
  {
    key: 'irr',
    label: 'IRR',
    get: (r) =>
      r.preTax.irr.value == null ? 'N/A' : percent2.format(r.preTax.irr.value),
  },
  {
    key: 'irr-after-tax',
    label: 'IRR after tax',
    get: (r) =>
      r.afterTax == null
        ? '—'
        : r.afterTax.irr.value == null
          ? 'N/A'
          : percent2.format(r.afterTax.irr.value),
  },
  {
    key: 'profit',
    label: 'Total net profit',
    get: (r) => currency.format(r.preTax.totalNetProfit),
  },
  {
    key: 'multiple',
    label: 'Equity multiple',
    get: (r) =>
      r.preTax.equityMultiple.value == null
        ? 'N/A'
        : `${r.preTax.equityMultiple.value.toFixed(2)}×`,
  },
  {
    key: 'net-proceeds',
    label: 'Net sale proceeds',
    get: (r) => currency.format(r.netSaleProceeds),
  },
];

/** Exit returns side by side for 5, 7, 10 years and the chosen hold (spec 009 FR-013). */
export function HoldComparisonTable({
  projections,
  chosen,
}: {
  projections: ExitProjection[];
  chosen: number;
}) {
  const results = projections
    .map((p) => p.result)
    .filter((r): r is ExitResult => r != null);
  return (
    <div
      role="region"
      aria-label="Hold period comparison"
      tabIndex={0}
      data-testid="hold-comparison"
      className="min-w-0 overflow-x-auto rounded-xl border border-line bg-surface"
    >
      <table className={tableClass}>
        <caption className="sr-only">Exit returns by hold period</caption>
        <thead>
          <tr>
            <th scope="col" className={thClass}>
              <span className="sr-only">Metric</span>
            </th>
            {results.map((r) => (
              <th
                key={r.holdYears}
                scope="col"
                aria-current={r.holdYears === chosen ? 'true' : undefined}
                className={`${thClass} text-right ${r.holdYears === chosen ? 'bg-accent-soft text-accent' : ''}`}
              >
                {r.holdYears} yrs
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.key}>
              <th
                scope="row"
                className={`${tdClass} text-left font-medium text-muted`}
              >
                {row.label}
              </th>
              {results.map((r) => (
                <td
                  key={r.holdYears}
                  data-testid={`hold-${r.holdYears}-${row.key}`}
                  className={`${tdClass} text-right ${r.holdYears === chosen ? 'bg-accent-soft font-semibold' : ''}`}
                >
                  {row.get(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
