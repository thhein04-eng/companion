'use client';

import type {
  SensitivityCell,
  SensitivityGrid as SensitivityGridData,
  SensitivityMeasure,
} from 'deal-analyzer-calculations';
import { currency, percent1, percent2, useGridNavigation } from 'shared-ui';
import { dollars0 } from './sensitivity-format';

export interface SensitivityGridProps {
  grid: SensitivityGridData;
  /** The measure shown in the cells. */
  measure: SensitivityMeasure;
  'data-testid'?: string;
}

/** The app's minus sign for visible figures (U+2212), so a negative never hides in a hyphen. */
const minus = (text: string) => text.replace('-', '−');

/** The compact text in a cell: whole dollars, or one decimal of a percent. */
function cellText(cell: SensitivityCell, measure: SensitivityMeasure): string {
  const value = measure === 'cashFlow' ? cell.cashFlowMonthly : cell.cashOnCash;
  if (value == null) return 'n/a';
  if (measure === 'cashFlow') {
    return Math.round(value) === 0 ? '$0' : minus(dollars0.format(value));
  }
  return minus(percent1.format(value));
}

const cellValue = (cell: SensitivityCell, measure: SensitivityMeasure) =>
  measure === 'cashFlow' ? cell.cashFlowMonthly : cell.cashOnCash;

type CellState = 'current' | 'below-target' | 'negative' | 'ok';

/** The full-precision sentence a screen reader hears for a cell (contracts/ui.md). */
function cellLabel(
  cell: SensitivityCell,
  measure: SensitivityMeasure,
  variable: 'price' | 'rent',
  columnLabel: string,
  amountText: string,
  isCurrent: boolean,
): string {
  const where = `Rate ${cell.ratePct}%, ${variable} change ${columnLabel} (${amountText})`;
  const value = cellValue(cell, measure);
  let what: string;
  if (value == null) {
    const name = measure === 'cashFlow' ? 'Cash flow' : 'Cash-on-Cash';
    what = `${name} not available: ${cell.naReason ?? 'not valid'}`;
  } else if (measure === 'cashFlow') {
    what = `cash flow ${minus(currency.format(value))} per month`;
  } else {
    what = `Cash-on-Cash ${minus(percent2.format(value))}`;
  }
  const flags = [
    value != null && value < 0 ? 'negative' : null,
    cell.meetsTarget === false ? 'below target' : null,
    isCurrent ? 'current deal' : null,
  ].filter(Boolean);
  return [`${where}: ${what}`, ...flags].join(', ');
}

/**
 * The sensitivity grid (spec 017 US1, contracts/ui.md): interest-rate rows by price-or-rent-change
 * columns, one measure per cell. Cells are tinted on a diverging scale around 0 (research R6), and
 * never by color alone: a minus sign marks a negative, "▼" a cell below the target, and a ring plus
 * the words "current deal" the unchanged deal. The grid is read cell by cell with the arrow keys.
 */
export function SensitivityGrid({
  grid,
  measure,
  'data-testid': testId,
}: SensitivityGridProps) {
  const { cellProps } = useGridNavigation(
    grid.rows.length + 1,
    grid.columns.length + 1,
  );
  const variable = grid.columnVariable;
  const measureName =
    measure === 'cashFlow' ? 'Monthly cash flow' : 'Cash-on-Cash';

  // The largest absolute figure sets the full tint (30%); smaller ones fade toward the surface.
  const values = grid.cells
    .flat()
    .map((c) => cellValue(c, measure))
    .filter((v): v is number => v != null);
  const largest = Math.max(0, ...values.map((v) => Math.abs(v)));

  const amountText = (amount: number) =>
    variable === 'price'
      ? dollars0.format(amount)
      : `${dollars0.format(amount)}/mo`;

  return (
    <div
      data-testid={testId}
      className="overflow-x-auto rounded-xl border border-line bg-surface"
    >
      <table
        role="grid"
        className="num w-full border-collapse text-center text-[13px] text-fg"
      >
        <caption className="sr-only">
          {measureName} by interest rate and {variable} change
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 bg-surface p-1 text-[11px] font-medium text-muted"
            >
              <span aria-hidden="true">Rate ↓</span>
              <span className="sr-only">Interest rate</span>
            </th>
            {grid.columns.map((column, c) => (
              <th
                key={column.pct}
                scope="col"
                data-testid="sensitivity-column-header"
                data-mao={grid.maoColumn?.index === c ? '' : undefined}
                className="min-w-14 px-1 py-1.5 text-[11px] font-medium leading-tight text-muted"
                {...cellProps(0, c + 1)}
              >
                <span className="block text-[12px] font-semibold text-fg">
                  {column.label}
                </span>
                <span className="block">{amountText(column.amount)}</span>
                {grid.maoColumn?.index === c ? (
                  <span className="mt-0.5 block font-semibold text-accent">
                    ≈ max offer
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row, r) => (
            <tr key={row.ratePct} className="border-t border-line">
              <th
                scope="row"
                data-testid="sensitivity-row-header"
                className="sticky left-0 min-w-14 bg-surface px-1 py-2 text-[12px] font-semibold text-fg"
                {...cellProps(r + 1, 0)}
              >
                {row.ratePct}%
              </th>
              {grid.cells[r].map((cell, c) => {
                const isCurrent =
                  grid.current.row === r && grid.current.column === c;
                const value = cellValue(cell, measure);
                const below = cell.meetsTarget === false;
                const state: CellState = isCurrent
                  ? 'current'
                  : below
                    ? 'below-target'
                    : value != null && value < 0
                      ? 'negative'
                      : 'ok';
                const share =
                  value != null && largest > 0
                    ? Math.round((30 * Math.abs(value)) / largest)
                    : 0;
                const tint =
                  share > 0
                    ? `color-mix(in srgb, var(${value != null && value > 0 ? '--good' : '--bad'}) ${share}%, var(--surface))`
                    : undefined;
                const column = grid.columns[c];
                return (
                  <td
                    key={cell.columnPct}
                    role="gridcell"
                    data-testid="sensitivity-cell"
                    data-row={r}
                    data-col={c}
                    data-state={state}
                    aria-label={cellLabel(
                      cell,
                      measure,
                      variable,
                      column.label,
                      amountText(column.amount),
                      isCurrent,
                    )}
                    style={tint ? { backgroundColor: tint } : undefined}
                    className={`min-w-14 px-1 py-2 font-medium outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-accent ${
                      isCurrent ? 'outline-2 outline-accent' : ''
                    }`}
                    {...cellProps(r + 1, c + 1)}
                  >
                    {below ? (
                      <span aria-hidden="true" className="mr-0.5 text-[10px]">
                        ▼
                      </span>
                    ) : null}
                    {cellText(cell, measure)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
