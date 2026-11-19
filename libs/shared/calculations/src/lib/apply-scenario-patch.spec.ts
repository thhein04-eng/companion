import { describe, expect, it } from 'vitest';
import { applyScenarioPatch } from './apply-scenario-patch';
import type { LoanScenario } from './types';

function baseScenario(overrides: Partial<LoanScenario> = {}): LoanScenario {
  return {
    id: 'scenario-1',
    name: 'Baseline',
    principal: 300_000,
    annualInterestRatePct: 6.5,
    termMonths: 360,
    startDate: '2027-01-01',
    paymentFrequency: 'monthly',
    homePrice: null,
    downPayment: null,
    annualPropertyTax: null,
    annualInsurance: null,
    pmiAnnualRatePct: null,
    monthlyHoa: null,
    extraPayments: [],
    principalIsOverridden: false,
    ...overrides,
  };
}

describe('applyScenarioPatch', () => {
  it('rule 1: a patch touching principal directly keeps that value and sets principalIsOverridden', () => {
    const result = applyScenarioPatch(baseScenario(), { principal: 310_000 });
    expect(result.principal).toBe(310_000);
    expect(result.principalIsOverridden).toBe(true);
  });

  it('rule 2: a homePrice/downPayment patch recomputes principal and clears the override once both are present', () => {
    const overridden = baseScenario({
      principal: 310_000,
      principalIsOverridden: true,
      homePrice: 350_000,
    });
    const result = applyScenarioPatch(overridden, {
      downPayment: { amount: 50_000 },
    });
    expect(result.principal).toBe(300_000);
    expect(result.principalIsOverridden).toBe(false);
  });

  it('rule 3: a downPayment patch with homePrice still missing leaves principal/override unchanged', () => {
    const scenario = baseScenario({
      principal: 310_000,
      principalIsOverridden: true,
    });
    const result = applyScenarioPatch(scenario, {
      downPayment: { amount: 50_000 },
    });
    expect(result.principal).toBe(310_000);
    expect(result.principalIsOverridden).toBe(true);
    expect(result.downPayment).toEqual({ amount: 50_000 });
  });

  it('rule 3: a patch touching neither principal nor homePrice/downPayment leaves principal/override unchanged', () => {
    const scenario = baseScenario({
      principal: 310_000,
      principalIsOverridden: true,
    });
    const result = applyScenarioPatch(scenario, { annualInterestRatePct: 7 });
    expect(result.principal).toBe(310_000);
    expect(result.principalIsOverridden).toBe(true);
    expect(result.annualInterestRatePct).toBe(7);
  });

  it('rule 4: a patch touching both principal and homePrice/downPayment at once lets principal win', () => {
    const result = applyScenarioPatch(baseScenario(), {
      principal: 999_999,
      homePrice: 350_000,
      downPayment: { amount: 35_000 },
    });
    expect(result.principal).toBe(999_999);
    expect(result.principalIsOverridden).toBe(true);
    expect(result.homePrice).toBe(350_000);
  });

  it('never mutates the input scenario', () => {
    const scenario = baseScenario();
    const snapshot = { ...scenario };
    applyScenarioPatch(scenario, { principal: 1 });
    expect(scenario).toEqual(snapshot);
  });
});

describe('applyScenarioPatch — rental assumptions (Deal Analyzer)', () => {
  const rental = {
    grossMonthlyRent: 2_400,
    otherMonthlyIncome: 0,
    vacancyPct: 5,
    managementPct: 8,
    maintenanceReservePct: 5,
    capexReservePct: 5,
    closingCosts: 0,
    rehabBudget: 0,
  };

  it('merges a partial rental patch without dropping other rental fields', () => {
    const result = applyScenarioPatch(baseScenario({ rental }), {
      rental: { vacancyPct: 10 } as typeof rental,
    });
    expect(result.rental).toEqual({ ...rental, vacancyPct: 10 });
  });

  it('starts from the patch as-is when the scenario has no rental yet', () => {
    const result = applyScenarioPatch(baseScenario({ rental: null }), {
      rental,
    });
    expect(result.rental).toEqual(rental);
  });

  it('clears rental on an explicit rental: null', () => {
    const result = applyScenarioPatch(baseScenario({ rental }), {
      rental: null,
    });
    expect(result.rental).toBeNull();
  });

  it('does not touch principal or principalIsOverridden', () => {
    const scenario = baseScenario({
      principal: 310_000,
      principalIsOverridden: true,
      rental,
    });
    const result = applyScenarioPatch(scenario, {
      rental: { ...rental, grossMonthlyRent: 3_000 },
    });
    expect(result.principal).toBe(310_000);
    expect(result.principalIsOverridden).toBe(true);
  });
});

describe('applyScenarioPatch — sale (spec 013 T003)', () => {
  const withSale = baseScenario({
    sale: {
      exitMonth: 84,
      exitUnit: 'years',
      tax: { enabled: true, capitalGainsRatePct: 20 },
    },
  });

  it('merges a sale patch one level deep, keeping the other fields', () => {
    const result = applyScenarioPatch(withSale, { sale: { exitMonth: 90 } });
    expect(result.sale).toEqual({
      exitMonth: 90,
      exitUnit: 'years',
      tax: { enabled: true, capitalGainsRatePct: 20 },
    });
  });

  it('sets sale when the scenario has none', () => {
    const result = applyScenarioPatch(baseScenario(), {
      sale: { exitMonth: 12 },
    });
    expect(result.sale).toEqual({ exitMonth: 12 });
  });

  it('an explicit sale: null clears it', () => {
    expect(applyScenarioPatch(withSale, { sale: null }).sale).toBeNull();
  });

  it('a patch without sale leaves it untouched', () => {
    const result = applyScenarioPatch(withSale, { name: 'Renamed' });
    expect(result.sale).toBe(withSale.sale);
  });

  it('keeps the principal rules unchanged alongside a sale patch', () => {
    const result = applyScenarioPatch(withSale, {
      sale: { exitMonth: 60 },
      principal: 250_000,
    });
    expect(result.principal).toBe(250_000);
    expect(result.principalIsOverridden).toBe(true);
    expect(result.sale?.exitMonth).toBe(60);
  });
});
