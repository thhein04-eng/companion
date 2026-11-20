import { tableClass, tdClass } from 'shared-ui';

/** One labelled row of a refinance result table (spec 014 contracts/refinance-ui.md). */
export type ResultRow = {
  /** The row's `data-testid`, e.g. `refi-net-proceeds`. */
  id: string;
  label: string;
  value: string;
  note?: string;
  /** `total` rows are bold, and are red when negative. */
  tone?: 'total';
};

/** The label/value table both refinance summaries render (a screen-reader caption is required). */
export function ResultTable({
  caption,
  rows,
}: {
  caption: string;
  rows: ResultRow[];
}) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-line bg-surface">
      <table className={tableClass}>
        <caption className="sr-only">{caption}</caption>
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
                  // Deductions read as minus signs; only a negative total is red.
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
  );
}
