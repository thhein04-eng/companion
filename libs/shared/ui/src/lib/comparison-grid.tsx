import type { ComparisonRow } from 'shared-calculations';
import { currency, formatIsoDate } from './formatters';

/** One column of a `ComparisonGrid`, after the fixed "Scenario" column. */
export interface ComparisonColumn<Row> {
  id: string;
  header: string;
  render: (row: Row) => string;
}

export interface ComparisonGridProps<Row extends ComparisonRow> {
  comparison: { rows: Row[] };
  columns: ComparisonColumn<Row>[];
  /** Scenario id → display name, so rows read as "30yr @ 6.5%" rather than a raw id. */
  scenarioNames: Record<string, string>;
}

/** The loan columns every comparison starts with (spec 001 FR-010). */
export const LOAN_COMPARISON_COLUMNS: ComparisonColumn<ComparisonRow>[] = [
  {
    id: 'monthlyPayment',
    header: 'Monthly Payment',
    render: (row) => currency.format(row.monthlyPayment),
  },
  {
    id: 'totalInterest',
    header: 'Total Interest',
    render: (row) => currency.format(row.totalInterest),
  },
  {
    id: 'totalCost',
    header: 'Total Cost',
    render: (row) => currency.format(row.totalCost),
  },
  {
    id: 'payoffDate',
    header: 'Payoff Date',
    render: (row) => formatIsoDate(row.payoffDate),
  },
];

/**
 * A single aligned view of each compared scenario. Columns are supplied by the
 * caller, so each feature adds its own without this grid knowing about them
 * (spec 003 research R3).
 */
export function ComparisonGrid<Row extends ComparisonRow>({
  comparison,
  columns,
  scenarioNames,
}: ComparisonGridProps<Row>) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="num w-full border-collapse text-[14px]">
        <thead className="text-left">
          <tr>
            <th className="border-b border-line px-3.5 py-2.5 text-[13px] font-medium text-muted">
              Scenario
            </th>
            {columns.map((column) => (
              <th
                key={column.id}
                className="border-b border-line px-3.5 py-2.5 text-[13px] font-medium text-muted"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row) => (
            <tr
              key={row.scenarioId}
              className="border-t border-line first:border-t-0"
            >
              <td className="px-3.5 py-2.5 font-medium">
                {scenarioNames[row.scenarioId] ?? row.scenarioId}
              </td>
              {columns.map((column) => (
                <td key={column.id} className="px-3.5 py-2.5">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
