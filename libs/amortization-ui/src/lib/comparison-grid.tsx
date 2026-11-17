import type { ScenarioComparison } from 'amortization-calculations';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
const percent = (digits: number) =>
  new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent1 = percent(1);
const percent2 = percent(2);

function orDash(value: number | null, format: (v: number) => string): string {
  return value == null ? '—' : format(value);
}

export interface ComparisonGridProps {
  comparison: ScenarioComparison;
  /** Scenario id → display name, so rows read as "30yr @ 6.5%" rather than a raw id. */
  scenarioNames: Record<string, string>;
}

/**
 * A single aligned view of each compared scenario's monthly payment, total
 * interest, total cost, and payoff date (FR-010, User Story 4).
 */
export function ComparisonGrid({ comparison, scenarioNames }: ComparisonGridProps) {
  // Deal columns (FR-014) appear only once at least one scenario is analyzed as a rental.
  const showDeal = comparison.rows.some(
    (row) =>
      row.monthlyCashFlow != null || row.annualNoi != null || row.capRate != null || row.cashOnCashReturn != null
  );
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="text-left text-neutral-600">
        <tr>
          <th className="px-3 py-2 font-medium">Scenario</th>
          <th className="px-3 py-2 font-medium">Monthly Payment</th>
          <th className="px-3 py-2 font-medium">Total Interest</th>
          <th className="px-3 py-2 font-medium">Total Cost</th>
          <th className="px-3 py-2 font-medium">Payoff Date</th>
          {showDeal ? (
            <>
              <th className="px-3 py-2 font-medium">Cash Flow /mo</th>
              <th className="px-3 py-2 font-medium">NOI /yr</th>
              <th className="px-3 py-2 font-medium">Cap Rate</th>
              <th className="px-3 py-2 font-medium">CoC</th>
            </>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {comparison.rows.map((row) => (
          <tr key={row.scenarioId} className="border-t border-neutral-100">
            <td className="px-3 py-1.5 font-medium">
              {scenarioNames[row.scenarioId] ?? row.scenarioId}
            </td>
            <td className="px-3 py-1.5">{currency.format(row.monthlyPayment)}</td>
            <td className="px-3 py-1.5">{currency.format(row.totalInterest)}</td>
            <td className="px-3 py-1.5">{currency.format(row.totalCost)}</td>
            <td className="px-3 py-1.5">{date.format(new Date(`${row.payoffDate}T00:00:00`))}</td>
            {showDeal ? (
              <>
                <td className="px-3 py-1.5">{orDash(row.monthlyCashFlow, (v) => currency.format(v))}</td>
                <td className="px-3 py-1.5">{orDash(row.annualNoi, (v) => currency.format(v))}</td>
                <td className="px-3 py-1.5">{orDash(row.capRate, (v) => percent2.format(v))}</td>
                <td className="px-3 py-1.5">{orDash(row.cashOnCashReturn, (v) => percent1.format(v))}</td>
              </>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
