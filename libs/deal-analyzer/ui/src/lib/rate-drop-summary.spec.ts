import { describe, expect, it } from 'vitest';
import type { RateDropResult } from 'deal-analyzer-calculations';
import {
  breakevenHeadline,
  breakevenText,
  rateDropRows,
  yearsMonthsLabel,
} from './rate-drop-summary';

const REF: RateDropResult = {
  balanceRefinanced: 282_394.77,
  currentPi: 1_995.91,
  newPi: 1_734.15,
  monthlySavings: 261.76,
  breakeven: {
    kind: 'month',
    months: 18,
    years: 1,
    remainderMonths: 6,
    loanMonth: 78,
  },
  netSavings: 74_028,
  horizonMonths: 300,
  newTermMonths: 300,
  termExtended: false,
};
const byId = (rows: ReturnType<typeof rateDropRows>) =>
  Object.fromEntries(rows.map((r) => [r.id, r]));

describe('yearsMonthsLabel', () => {
  it.each([
    [18, '1 yr 6 mo'],
    [12, '1 yr'],
    [24, '2 yr'],
    [7, '7 mo'],
    [1, '1 mo'],
    [0, '0 mo'],
  ])('%d months is %s', (months, label) => {
    expect(yearsMonthsLabel(months)).toBe(label);
  });
});

describe('breakevenText (spec 014 US3)', () => {
  it('shows the month, years and months, and the loan month', () => {
    expect(breakevenText(REF.breakeven)).toEqual({
      value: 'Month 18',
      note: '1 yr 6 mo · loan month 78',
    });
  });

  it('shows the other outcomes in words', () => {
    expect(breakevenText({ kind: 'immediate' })).toEqual({
      value: 'Immediate',
    });
    expect(breakevenText({ kind: 'beyond-term' })).toEqual({
      value: 'Not within the loan term',
    });
    expect(
      breakevenText({
        kind: 'none',
        reason: 'The new payment is not lower than your current payment',
      }),
    ).toEqual({
      value: 'No breakeven',
      note: 'The new payment is not lower than your current payment',
    });
  });
});

describe('breakevenHeadline (Deal Strip)', () => {
  it('is a month count for a breakeven, 0 for immediate, and the reason otherwise', () => {
    expect(breakevenHeadline(REF)).toEqual({ value: 18, naReason: null });
    expect(
      breakevenHeadline({ ...REF, breakeven: { kind: 'immediate' } }),
    ).toEqual({ value: 0, naReason: null });
    expect(
      breakevenHeadline({ ...REF, breakeven: { kind: 'beyond-term' } }),
    ).toEqual({
      value: null,
      naReason: 'Not within the loan term',
    });
    expect(
      breakevenHeadline({
        ...REF,
        breakeven: { kind: 'none', reason: 'No savings' },
      }),
    ).toEqual({ value: null, naReason: 'No breakeven' });
  });
});

describe('rateDropRows', () => {
  it('lists the comparison in order', () => {
    const rows = rateDropRows(REF);
    expect(rows.map((r) => r.id)).toEqual([
      'refi-pi-current',
      'refi-pi-new',
      'refi-savings',
      'refi-breakeven',
      'refi-net-savings',
    ]);
    const r = byId(rows);
    expect(r['refi-pi-current'].value).toBe('$1,995.91');
    expect(r['refi-pi-new'].value).toBe('$1,734.15');
    expect(r['refi-savings']).toMatchObject({
      value: '$261.76',
      tone: 'total',
    });
    expect(r['refi-breakeven'].value).toBe('Month 18');
    expect(r['refi-net-savings']).toMatchObject({
      value: '$74,028.00',
      tone: 'total',
    });
  });

  it('shows negative savings with a true minus sign and in words', () => {
    const r = byId(
      rateDropRows({
        ...REF,
        monthlySavings: -150.25,
        netSavings: -1_472,
        breakeven: {
          kind: 'none',
          reason: 'The new payment is not lower than your current payment',
        },
      }),
    );
    expect(r['refi-savings']).toMatchObject({
      value: '−$150.25',
      note: 'The new payment is higher than your current payment',
    });
    expect(r['refi-net-savings'].value).toBe('−$1,472.00');
  });

  it('never shows a negated zero as -$0.00', () => {
    const r = byId(rateDropRows({ ...REF, monthlySavings: 0, netSavings: 0 }));
    expect(r['refi-savings'].value).toBe('$0.00');
    expect(r['refi-net-savings'].value).toBe('$0.00');
  });
});
