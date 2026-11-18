import type { WealthProjection, WealthYear } from 'deal-analyzer-calculations';
import { currency } from 'shared-ui';

function Tile({
  label,
  value,
  caption,
  negative = false,
  testId,
}: {
  label: string;
  value: string;
  caption?: string;
  negative?: boolean;
  testId: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-neutral-200 bg-white p-3">
      <span className="text-sm font-medium text-neutral-900">{label}</span>
      <span
        data-testid={testId}
        className={`text-lg font-semibold tabular-nums ${negative ? 'text-red-700' : ''}`}
      >
        {value}
      </span>
      {caption ? (
        <span className="text-xs text-neutral-500">{caption}</span>
      ) : null}
    </div>
  );
}

/** Horizon-year summary (spec 008 FR-011). */
export function WealthSummary({
  projection,
}: {
  projection: WealthProjection & { years: WealthYear[] };
}) {
  const last = projection.years[projection.years.length - 1];
  const { multiple, taxNaReason } = projection;
  return (
    <div data-testid="wealth-summary" className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-neutral-700">
        In year {last.year}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Tile
          label="Net worth"
          testId="wealth-net-worth"
          value={currency.format(last.netWorth)}
          caption="Equity + cumulative cash flow"
          negative={last.netWorth < 0}
        />
        <Tile
          label="Equity"
          testId="wealth-equity"
          value={currency.format(last.equity)}
          negative={last.equity < 0}
        />
        <Tile
          label="Cumulative cash flow"
          testId="wealth-cum-cash-flow"
          value={currency.format(last.cumulativeCashFlow)}
          negative={last.cumulativeCashFlow < 0}
        />
        <Tile
          label="Cumulative tax effect"
          testId="wealth-cum-tax"
          value={
            taxNaReason || last.cumulativeTaxEffect == null
              ? '—'
              : currency.format(last.cumulativeTaxEffect)
          }
          caption={taxNaReason ?? 'Positive = tax saved'}
          negative={(last.cumulativeTaxEffect ?? 0) < 0}
        />
        <Tile
          label="Multiple on cash invested"
          testId="wealth-multiple"
          value={multiple.value != null ? `${multiple.value.toFixed(1)}×` : 'N/A'}
          caption={
            multiple.naReason ??
            `Net worth ÷ ${currency.format(projection.totalCashInvested)} invested`
          }
        />
      </div>
    </div>
  );
}
