'use client';

import { SegmentedBar } from '@companion/charts';
import type { DealFieldKey } from 'shared-calculations';
import { currency } from '../formatters';
import type { PaymentPart } from './page-profiles';

/** Series per part, as in the reference payment bar (P&I seg1, tax seg2, ins seg4, HOA seg5, PMI seg3). */
const COLOR: Record<PaymentPart['field'] & string, 1 | 2 | 3 | 4 | 5> = {
  principalAndInterest: 1,
  annualPropertyTax: 2,
  annualInsurance: 4,
  pmiAnnualRatePct: 3,
  monthlyHoa: 5,
} as Record<string, 1 | 2 | 3 | 4 | 5>;

const SWATCH: Record<number, string> = {
  1: 'bg-seg-1',
  2: 'bg-seg-2',
  3: 'bg-seg-3',
  4: 'bg-seg-4',
  5: 'bg-seg-5',
};

/**
 * The total monthly payment as a stacked bar of its parts, used as the cost editor
 * (spec 010 US4, FR-026): activating a cost segment or its legend entry focuses that field.
 * Every part is listed, including $0 ones. Light seg3/seg4 are under 3:1 against the surface,
 * so the legend and the data table stay on (FR-035).
 */
export function PaymentBar({
  parts,
  total,
  downPaymentPct,
  onActivate,
}: {
  parts: PaymentPart[];
  total: number;
  /** For the "PMI $0 at 20% down" note. */
  downPaymentPct: number | null;
  onActivate: (field: DealFieldKey) => void;
}) {
  const activate = (key: string) => {
    if (key !== 'principalAndInterest') onActivate(key as DealFieldKey);
  };
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-bg p-3.5">
      <SegmentedBar
        title="Monthly payment"
        description="Select a cost to edit it."
        variant="bare"
        headingLevel={4}
        hideLegend
        segments={parts.map((p) => ({
          key: p.field,
          label: p.label,
          value: p.monthly,
          color: COLOR[p.field] ?? 1,
        }))}
        total={total}
        formatValue={(v) => currency.format(v)}
        onSegmentActivate={activate}
      />
      <ul
        data-testid="payment-legend"
        aria-label="Payment parts"
        className="m-0 flex list-none flex-wrap items-center gap-x-[14px] gap-y-1 p-0 text-[13px] text-muted"
      >
        {parts.map((p) => {
          const swatch = (
            <span
              aria-hidden="true"
              className={`inline-block size-2 shrink-0 rounded-xs ${SWATCH[COLOR[p.field] ?? 1]}`}
            />
          );
          const text =
            p.field === 'pmiAnnualRatePct' && p.monthly === 0
              ? `PMI ${currency.format(0).replace('.00', '')}${
                  downPaymentPct != null && downPaymentPct >= 20
                    ? ` at ${downPaymentPct}% down`
                    : ''
                }`
              : null;
          return (
            <li key={p.field} className="flex items-center gap-1.5">
              {swatch}
              {p.field === 'principalAndInterest' ? (
                <span>{p.label}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => activate(p.field)}
                  className="cursor-pointer rounded-xs text-fg underline decoration-line decoration-dotted underline-offset-2 hover:decoration-accent"
                >
                  {text ? 'PMI' : p.label}
                </button>
              )}{' '}
              <span className="num">
                {text ? text.replace(/^PMI /, '') : currency.format(p.monthly)}
              </span>
            </li>
          );
        })}
        <li className="ml-auto font-semibold text-fg">
          <span className="num">{currency.format(total)}</span>/mo
        </li>
      </ul>
    </div>
  );
}
