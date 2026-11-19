import { roundCents, type LoanScenario } from 'shared-calculations';
import { referenceScenario } from './dscr-reference';

/** A small deterministic PRNG so the invariant scenarios are reproducible. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

export function generatedScenarios(count: number): LoanScenario[] {
  const rand = seeded(42);
  const pick = (lo: number, hi: number) =>
    Math.round((lo + rand() * (hi - lo)) * 10) / 10;
  return Array.from({ length: count }, (_, i) => {
    const down = pick(10, 40);
    const price = 400_000;
    return referenceScenario(
      {
        id: `gen-${i}`,
        annualInterestRatePct: pick(3, 9),
        downPayment: { percent: down },
        principal: roundCents(price * (1 - down / 100)),
        pmiAnnualRatePct: down < 20 ? 0.5 : null,
        extraPayments:
          i % 2 === 0
            ? [{ id: 'x', kind: 'recurring', amount: 300, startPeriod: 1 }]
            : [],
      },
      {
        appreciationPct: pick(-2, 6),
        rentGrowthPct: pick(-1, 5),
        expenseGrowthPct: pick(0, 4),
        rehabBudget: i % 3 === 0 ? 15_000 : 0,
        wealth: {
          horizonYears: 1 + Math.floor(rand() * 30),
          forcedAppreciation: i % 4 === 0 ? 25_000 : 0,
        },
      },
    );
  });
}
