'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  applyScenarioPatch,
  DEFAULT_RENTAL_ASSUMPTIONS,
  deserializeScenarios,
  serializeScenarios,
  type LoanScenario,
  type RentalAssumptions,
} from 'amortization-calculations';

const STORAGE_KEY = 'amortization:scenarios';
/** Fixed id for the very first render's placeholder scenario, so server and
 * client produce identical markup (no `crypto.randomUUID()` during render,
 * which would hydration-mismatch). Real scenarios created afterwards get a
 * random id, but only from client-side event handlers. */
const INITIAL_SCENARIO_ID = 'initial-scenario';

function createDefaultScenario(id: string, name = 'Scenario 1'): LoanScenario {
  return {
    id,
    name,
    principal: 300_000,
    annualInterestRatePct: 6.5,
    termMonths: 360,
    startDate: new Date().toISOString().slice(0, 10),
    paymentFrequency: 'monthly',
    homePrice: null,
    downPayment: null,
    annualPropertyTax: null,
    annualInsurance: null,
    pmiAnnualRatePct: null,
    monthlyHoa: null,
    extraPayments: [],
    rental: null,
    principalIsOverridden: false,
  };
}

/**
 * Holds all loan scenarios for the session, backed by `sessionStorage`
 * (FR-012: retained for the duration of the browser session only).
 */
export function useScenarios() {
  const [scenarios, setScenarios] = useState<LoanScenario[]>(() => [
    createDefaultScenario(INITIAL_SCENARIO_ID),
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(INITIAL_SCENARIO_ID);
  const [hasLoadedPersisted, setHasLoadedPersisted] = useState(false);

  // Runs once, client-only, after the server-rendered markup has already
  // hydrated against the deterministic placeholder above.
  useEffect(() => {
    const persisted = deserializeScenarios(window.sessionStorage.getItem(STORAGE_KEY));
    if (persisted?.scenarios?.length) {
      setScenarios(persisted.scenarios);
      setActiveScenarioId(persisted.activeScenarioId);
    }
    setHasLoadedPersisted(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedPersisted) return;
    window.sessionStorage.setItem(STORAGE_KEY, serializeScenarios(scenarios, activeScenarioId));
  }, [scenarios, activeScenarioId, hasLoadedPersisted]);

  const activeScenario =
    scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0];

  const updateActiveScenario = useCallback(
    (patch: Partial<LoanScenario>) => {
      setScenarios((prev) =>
        prev.map((s) => (s.id === activeScenarioId ? applyScenarioPatch(s, patch) : s))
      );
    },
    [activeScenarioId]
  );

  /**
   * Edits the active scenario's rental assumptions. The first rent entry seeds
   * the editable screening defaults (FR-002); `null` removes rental analysis.
   */
  const updateActiveRental = useCallback(
    (patch: Partial<RentalAssumptions> | null) => {
      setScenarios((prev) =>
        prev.map((s) => {
          if (s.id !== activeScenarioId) return s;
          if (patch === null) return applyScenarioPatch(s, { rental: null });
          if (s.rental == null) {
            if (patch.grossMonthlyRent == null) return s;
            return applyScenarioPatch(s, {
              rental: { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: patch.grossMonthlyRent, ...patch },
            });
          }
          return applyScenarioPatch(s, { rental: patch as RentalAssumptions });
        })
      );
    },
    [activeScenarioId]
  );

  // State updaters must stay pure: React StrictMode invokes them twice in
  // development, so ids are generated and the active id is set outside them.
  // (Previously each invocation minted a different UUID, leaving
  // `activeScenarioId` pointing at a scenario that was never stored.)
  const addScenario = useCallback(() => {
    const id = crypto.randomUUID();
    setScenarios((prev) => {
      const source = prev.find((s) => s.id === activeScenarioId) ?? prev[0];
      return [...prev, { ...source, id, name: `${source.name} (copy)` }];
    });
    setActiveScenarioId(id);
  }, [activeScenarioId]);

  const removeScenario = useCallback(
    (id: string) => {
      const remaining = scenarios.filter((s) => s.id !== id);
      const next = remaining.length > 0 ? remaining : [createDefaultScenario(crypto.randomUUID())];
      setScenarios(next);
      setActiveScenarioId((current) => (current === id || !next.some((s) => s.id === current) ? next[0].id : current));
    },
    [scenarios]
  );

  return {
    scenarios,
    activeScenarioId,
    activeScenario,
    setActiveScenarioId,
    updateActiveScenario,
    updateActiveRental,
    addScenario,
    removeScenario,
  };
}
