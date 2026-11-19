import { describe, expect, it } from 'vitest';
import type { LoanScenario, SaleAssumptions } from 'shared-calculations';
import { referenceScenario } from './__fixtures__/dscr-reference';
import { resolveSaleAssumptions, validateSale } from './validate-sale';

const EXAMPLE = { rentGrowthPct: 3, expenseGrowthPct: 2.5, appreciationPct: 3.5 };
const REF = (overrides: Partial<LoanScenario> = {}) =>
  referenceScenario(overrides, EXAMPLE);
const REF_NR = (sale: SaleAssumptions | null = { appreciationPct: 3.5 }) =>
  referenceScenario({ rental: null, sale });

const fields = (s: LoanScenario) => validateSale(s).map((e) => e.field);

describe('resolveSaleAssumptions (spec 013 R1, R2)', () => {
  it('(a) defaults: 84 months from the 7-year hold, years, 7% selling costs', () => {
    expect(resolveSaleAssumptions(REF())).toEqual({
      mode: 'rental',
      exitMonth: 84,
      clampedFrom: null,
      exitUnit: 'years',
      appreciationPct: 3.5,
      sellingCostsPct: 7,
      tax: {
        enabled: false,
        capitalGainsRatePct: 15,
        recaptureRatePct: 25,
        landValuePct: 20,
      },
    });
    expect(resolveSaleAssumptions(REF_NR(null))).toEqual({
      mode: 'non-rental',
      exitMonth: 84,
      clampedFrom: null,
      exitUnit: 'years',
      appreciationPct: 0,
      sellingCostsPct: 7,
      tax: {
        enabled: false,
        capitalGainsRatePct: 15,
        recaptureRatePct: 25,
        landValuePct: null,
      },
    });
  });

  it('(b) defaults to the stored valid hold, and to 84 when that hold is invalid', () => {
    const withHold = (holdYears: number) =>
      referenceScenario({}, { ...EXAMPLE, exit: { holdYears } });
    expect(resolveSaleAssumptions(withHold(5)).exitMonth).toBe(60);
    for (const bad of [40, 7.5]) {
      const r = resolveSaleAssumptions(withHold(bad));
      expect(r.exitMonth).toBe(84);
      expect(r.clampedFrom).toBeNull();
    }
  });

  it('(c) a rental uses the shared fields; a non-rental uses sale.*', () => {
    const rental = referenceScenario(
      {
        sale: { appreciationPct: 9, sellingCostsPct: 2 },
      },
      { ...EXAMPLE, exit: { sellingCostsPct: 6 } },
    );
    expect(resolveSaleAssumptions(rental)).toMatchObject({
      appreciationPct: 3.5,
      sellingCostsPct: 6,
    });
    expect(
      resolveSaleAssumptions(REF_NR({ appreciationPct: 2, sellingCostsPct: 5 })),
    ).toMatchObject({ appreciationPct: 2, sellingCostsPct: 5 });
  });

  it('(d) clamps to the loan term and reports the stored value', () => {
    const over = resolveSaleAssumptions(REF({ sale: { exitMonth: 400 } }));
    expect(over.exitMonth).toBe(360);
    expect(over.clampedFrom).toBe(400);
    const at = resolveSaleAssumptions(REF({ sale: { exitMonth: 360 } }));
    expect(at.exitMonth).toBe(360);
    expect(at.clampedFrom).toBeNull();
  });

  it('(d) clamps a defaulted exit silently when the term is shorter', () => {
    const r = resolveSaleAssumptions(REF({ termMonths: 60 }));
    expect(r.exitMonth).toBe(60);
    expect(r.clampedFrom).toBeNull();
  });

  it('(e) an unknown exitUnit falls back to years', () => {
    const s = REF({
      sale: { exitUnit: 'weeks' as unknown as SaleAssumptions['exitUnit'] },
    });
    expect(resolveSaleAssumptions(s).exitUnit).toBe('years');
    expect(
      resolveSaleAssumptions(REF({ sale: { exitUnit: 'months' } })).exitUnit,
    ).toBe('months');
  });

  it('uses stored tax rates and the shared land share', () => {
    const s = referenceScenario(
      {
        sale: {
          tax: { enabled: true, capitalGainsRatePct: 20, recaptureRatePct: 22 },
        },
      },
      { ...EXAMPLE, wealth: { landValuePct: 30 } },
    );
    expect(resolveSaleAssumptions(s).tax).toEqual({
      enabled: true,
      capitalGainsRatePct: 20,
      recaptureRatePct: 22,
      landValuePct: 30,
    });
  });
});

describe('validateSale (spec 013 data-model §A)', () => {
  it('(f) exitMonth must be a whole number ≥ 1; above the term is not an error', () => {
    for (const bad of [0, 7.5, Number.NaN, -1]) {
      expect(fields(REF({ sale: { exitMonth: bad } }))).toEqual([
        'sale.exitMonth',
      ]);
    }
    expect(fields(REF({ sale: { exitMonth: 400 } }))).toEqual([]);
  });

  it('(g) appreciation must be within −10…25', () => {
    expect(fields(REF_NR({ appreciationPct: 26 }))).toEqual([
      'sale.appreciationPct',
    ]);
    expect(fields(REF_NR({ appreciationPct: -11 }))).toEqual([
      'sale.appreciationPct',
    ]);
    expect(fields(REF_NR({ appreciationPct: -10 }))).toEqual([]);
  });

  it('(h) selling costs must be within 0…15', () => {
    expect(fields(REF_NR({ sellingCostsPct: 16 }))).toEqual([
      'sale.sellingCostsPct',
    ]);
    expect(fields(REF_NR({ sellingCostsPct: -1 }))).toEqual([
      'sale.sellingCostsPct',
    ]);
    expect(fields(REF_NR({ sellingCostsPct: 15 }))).toEqual([]);
  });

  it('(i) tax rates must be within 0…40, even while the estimate is off', () => {
    expect(
      fields(
        REF({
          sale: {
            tax: { enabled: false, capitalGainsRatePct: 41, recaptureRatePct: -1 },
          },
        }),
      ),
    ).toEqual(['sale.tax.capitalGainsRatePct', 'sale.tax.recaptureRatePct']);
  });

  it('(i) messages name the rule', () => {
    expect(validateSale(REF({ sale: { exitMonth: 0 } }))[0].message).toBe(
      'Exit must be a whole number of months, at least 1.',
    );
  });

  it('(j) missing fields are fine and garbage never throws', () => {
    expect(validateSale(REF())).toEqual([]);
    expect(validateSale(REF({ sale: null }))).toEqual([]);
    const garbage = {
      exitMonth: 'soon',
      appreciationPct: {},
      tax: { capitalGainsRatePct: 'x' },
    } as unknown as SaleAssumptions;
    expect(() => validateSale(REF({ sale: garbage }))).not.toThrow();
    expect(fields(REF({ sale: garbage }))).toEqual([
      'sale.exitMonth',
      'sale.appreciationPct',
      'sale.tax.capitalGainsRatePct',
    ]);
  });
});
