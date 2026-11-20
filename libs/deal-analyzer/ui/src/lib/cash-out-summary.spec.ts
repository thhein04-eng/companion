import { describe, expect, it } from 'vitest';
import type { CashOutResult } from 'deal-analyzer-calculations';
import { cashOutRows, piChangeNote, signedPercent } from './cash-out-summary';

const BRRRR: CashOutResult = {
  newLoan: 240_000,
  payoff: 158_374.7,
  closingCosts: 5_000,
  netProceeds: 76_625.3,
  isCashIn: false,
  currentPi: 1_064.48,
  newPi: 1_516.96,
  piChange: 452.48,
  totalCashInvested: 96_000,
  cashLeft: 19_374.7,
  capitalRecycledPct: { value: 0.79818, naReason: null },
  allCashRecovered: false,
  cashSurplus: 0,
  noiAnnual: 22_272,
  cashFlowBefore: 9_498.24,
  cashOnCashBefore: { value: 0.09894, naReason: null },
  cashFlowAfter: 4_068.48,
  cashOnCashAfter: { value: 0.20999, naReason: null },
};

const byId = (rows: ReturnType<typeof cashOutRows>) =>
  Object.fromEntries(rows.map((r) => [r.id, r]));

describe('cashOutRows (spec 014 US1)', () => {
  it('lists the proceeds in order, with deductions as minus signs', () => {
    const rows = cashOutRows(BRRRR);
    expect(rows.map((r) => r.id)).toEqual([
      'refi-new-loan',
      'refi-payoff',
      'refi-closing',
      'refi-net-proceeds',
      'refi-pi-current',
      'refi-pi-new',
      'refi-invested',
      'refi-cash-left',
      'refi-recycled',
      'refi-coc-before',
      'refi-coc-after',
    ]);
    const r = byId(rows);
    expect(r['refi-new-loan'].value).toBe('$240,000.00');
    expect(r['refi-payoff'].value).toBe('−$158,374.70');
    expect(r['refi-closing'].value).toBe('−$5,000.00');
    expect(r['refi-net-proceeds']).toMatchObject({
      label: 'Net proceeds',
      value: '$76,625.30',
      tone: 'total',
    });
    expect(r['refi-pi-current'].value).toBe('$1,064.48');
    expect(r['refi-pi-new'].value).toBe('$1,516.96');
  });

  it('labels a negative net as a cash-in refinance, in words not only colour', () => {
    const r = byId(
      cashOutRows({ ...BRRRR, netProceeds: -13_374.7, isCashIn: true }),
    );
    expect(r['refi-net-proceeds']).toMatchObject({
      label: 'Cash-in refinance',
      value: '−$13,374.70',
      note: 'You bring cash to close',
    });
  });

  it('never shows a negated zero as -$0.00', () => {
    const r = byId(cashOutRows({ ...BRRRR, payoff: 0, closingCosts: 0 }));
    expect(r['refi-payoff'].value).toBe('$0.00');
    expect(r['refi-closing'].value).toBe('$0.00');
  });
});

describe('piChangeNote', () => {
  it('words the change against the current payment', () => {
    expect(piChangeNote(452.48)).toBe('+$452.48 a month vs. current');
    expect(piChangeNote(-120.5)).toBe('−$120.50 a month vs. current');
    expect(piChangeNote(0)).toBe('Same as current');
  });
});

describe('cashOutRows — capital recycled (spec 014 US2)', () => {
  it('shows the BRRRR scorecard', () => {
    const r = byId(cashOutRows(BRRRR));
    expect(r['refi-invested'].value).toBe('$96,000.00');
    expect(r['refi-cash-left']).toMatchObject({
      label: 'Cash left in deal',
      value: '$19,374.70',
      tone: 'total',
    });
    expect(r['refi-recycled'].value).toBe('79.82%');
    expect(r['refi-coc-before'].value).toBe('9.89%');
    expect(r['refi-coc-after'].value).toBe('21.00%');
  });

  it('says "All cash recovered" with the surplus instead of a percentage', () => {
    const r = byId(
      cashOutRows({
        ...BRRRR,
        netProceeds: 136_625.3,
        cashLeft: -40_625.3,
        allCashRecovered: true,
        cashSurplus: 40_625.3,
        cashOnCashAfter: { value: null, naReason: 'All cash recovered' },
      }),
    );
    expect(r['refi-cash-left'].value).toBe('−$40,625.30');
    expect(r['refi-cash-left'].note).toBe('All cash recovered');
    expect(r['refi-coc-after'].value).toBe('All cash recovered');
    expect(r['refi-coc-after'].note).toBe('Cash surplus $40,625.30');
  });

  it('shows N/A with the reason when there is no rental', () => {
    const na = { value: null, naReason: 'Add rent to see cash-on-cash' };
    const r = byId(
      cashOutRows({ ...BRRRR, cashOnCashBefore: na, cashOnCashAfter: na }),
    );
    expect(r['refi-coc-before']).toMatchObject({
      value: 'N/A',
      note: 'Add rent to see cash-on-cash',
    });
    expect(r['refi-coc-after']).toMatchObject({
      value: 'N/A',
      note: 'Add rent to see cash-on-cash',
    });
  });

  it('shows a negative capital recycled and cash-on-cash with a true minus sign', () => {
    const r = byId(
      cashOutRows({
        ...BRRRR,
        capitalRecycledPct: { value: -0.13932, naReason: null },
        cashOnCashAfter: { value: -0.05, naReason: null },
      }),
    );
    expect(r['refi-recycled'].value).toBe('−13.93%');
    expect(r['refi-coc-after'].value).toBe('−5.00%');
  });

  it('shows N/A for capital recycled when nothing was invested', () => {
    const r = byId(
      cashOutRows({
        ...BRRRR,
        capitalRecycledPct: {
          value: null,
          naReason: 'No cash invested — capital recycled is undefined.',
        },
      }),
    );
    expect(r['refi-recycled']).toMatchObject({ value: 'N/A' });
  });
});

describe('signedPercent', () => {
  it('uses a true minus sign and never shows -0.00%', () => {
    expect(signedPercent(0.2)).toBe('20.00%');
    expect(signedPercent(-0.1393)).toBe('−13.93%');
    expect(signedPercent(-0.00001)).toBe('0.00%');
    expect(signedPercent(null)).toBe('N/A');
  });
});
