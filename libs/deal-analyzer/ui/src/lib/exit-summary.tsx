import type { ExitResult, ExitReturns } from 'deal-analyzer-calculations';
import { currency, Eyebrow, Kpi, percent2 } from 'shared-ui';

const money = (n: number) => currency.format(n);
const negated = (n: number) => (n === 0 ? money(0) : `−${money(n)}`);

function irrText(r: ExitReturns | null): { value: string; caption?: string } {
  if (!r) return { value: '—' };
  return r.irr.value == null
    ? { value: 'N/A', caption: r.irr.naReason ?? undefined }
    : { value: percent2.format(r.irr.value) };
}
function multipleText(r: ExitReturns | null): string {
  if (!r) return '—';
  return r.equityMultiple.value == null
    ? 'N/A'
    : `${r.equityMultiple.value.toFixed(2)}×`;
}

function Returns({
  returns,
  suffix,
  caption,
}: {
  returns: ExitReturns | null;
  suffix: '' | '-after-tax';
  caption?: string;
}) {
  const irr = irrText(returns);
  const negativeProfit = returns != null && returns.totalNetProfit < 0;
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      <Kpi
        data-testid={`exit-irr${suffix}`}
        label="IRR"
        value={irr.value}
        hint={irr.caption ?? caption}
        tone={
          returns?.irr.value != null && returns.irr.value < 0
            ? 'bad'
            : 'neutral'
        }
      />
      <Kpi
        data-testid={`exit-profit${suffix}`}
        label="Total net profit"
        value={returns ? money(returns.totalNetProfit) : '—'}
        tone={negativeProfit ? 'bad' : 'neutral'}
      />
      <Kpi
        data-testid={`exit-multiple${suffix}`}
        label="Equity multiple"
        value={multipleText(returns)}
      />
    </div>
  );
}

/** The sale and its returns at the chosen hold (spec 009 contracts § ExitSummary). */
export function ExitSummary({ result }: { result: ExitResult }) {
  return (
    <div
      data-testid="exit-summary"
      className="flex flex-col gap-[var(--space-section)]"
    >
      <h3 className="m-0 font-display text-h3 font-semibold text-fg">
        Sale at end of year {result.holdYears}
      </h3>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Kpi
          data-testid="exit-sale-price"
          label="Sale price"
          value={money(result.salePrice)}
        />
        <Kpi
          data-testid="exit-selling-costs"
          label="Selling costs"
          value={negated(result.sellingCosts)}
        />
        <Kpi
          data-testid="exit-loan-payoff"
          label="Loan payoff"
          value={negated(result.loanPayoff)}
        />
        <Kpi
          data-testid="exit-net-proceeds"
          label="Net sale proceeds"
          value={money(result.netSaleProceeds)}
          tone={result.netSaleProceeds < 0 ? 'bad' : 'neutral'}
        />
      </div>
      {result.forcedAppreciation > 0 ? (
        <p data-testid="exit-forced-note" className="m-0 text-small text-muted">
          Sale price includes {money(result.forcedAppreciation)} forced
          appreciation set on Wealth Projection.
        </p>
      ) : null}
      <Eyebrow>Pre-tax returns</Eyebrow>
      <Returns returns={result.preTax} suffix="" />
      <Eyebrow>After-tax returns</Eyebrow>
      <Returns
        returns={result.afterTax}
        suffix="-after-tax"
        caption={
          result.taxNaReason ?? 'After-tax cash flow; excludes tax on sale'
        }
      />
    </div>
  );
}
