'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  applyScenarioPatch,
  DEAL_FIELD_LABELS,
  dealFieldPatch,
  DEFAULT_RENTAL_ASSUMPTIONS,
  formatDealField,
  readDealField,
  type DealFieldKey,
  type LoanScenario,
  type RentalAssumptions,
  type RentalDealField,
  type SaleAssumptions,
} from 'shared-calculations';
import { useScenarios } from './scenarios-provider';

export type DealEditSource =
  'chip' | 'sheet' | 'sentence' | 'payment-bar' | 'scrub' | 'setup';

/**
 * `'rental'` names a rental-panel change that touched no single-number field (e.g. custom
 * expenses); `'sale'` names any Sale Profit & Exit Analyzer input change (spec 013).
 */
export type ChangeField = DealFieldKey | 'rental' | 'sale';

/** A rental edit: a patch, `null` to remove rental analysis, or an updater of the latest rental. */
export type RentalPatch =
  | Partial<RentalAssumptions>
  | null
  | ((rental: RentalAssumptions | null) => Partial<RentalAssumptions> | null);

/** The last shared-input change (spec 010 data-model §B). In memory only. */
export interface ChangeRecord {
  scenarioId: string;
  field: ChangeField;
  label: string;
  /** The raw previous value. For rental fields, the whole previous `rental` (possibly `null`). */
  oldValue: unknown;
  newValue: unknown;
  oldDisplay: string;
  newDisplay: string;
  source: DealEditSource;
  /** ms timestamp of the latest edit in this record, for 800ms coalescing. */
  at: number;
  /** The scenario before the first edit in this record, restored exactly by undo. */
  before: LoanScenario;
  /** The scenario this record produced. Undo only restores `before` while this is still current. */
  after: LoanScenario;
}

export interface DealEdits {
  /** The one write path the deal UI uses for a single shared input. */
  editDeal(field: DealFieldKey, value: unknown, source: DealEditSource): void;
  /**
   * Rental-panel writes (several fields at once, or `null` to remove rental analysis). An updater
   * function gets the latest rental at write time, so an edit right after another (e.g. checking
   * "I live here" just after typing a rent) never builds on a stale copy (spec 012).
   */
  editRental(patch: RentalPatch, source: DealEditSource): void;
  /** Sale Profit & Exit Analyzer writes (spec 013 R10), merged into `scenario.sale`. */
  editSale(patch: Partial<SaleAssumptions>, source: DealEditSource): void;
  /** Ends a scrub gesture, so the next scrub starts a new record. */
  endGesture(): void;
  lastChange: ChangeRecord | null;
  /** Moves on every recorded, coalesced and undone change, never on a scenario switch. */
  changeSeq: number;
  undo(): void;
  dismiss(): void;
}

const COALESCE_MS = 800;
const RENTAL_FIELDS: RentalDealField[] = [
  'grossMonthlyRent',
  'otherMonthlyIncome',
  'vacancyPct',
  'managementPct',
  'maintenanceReservePct',
  'capexReservePct',
  'closingCosts',
  'rehabBudget',
];

const DealEditsContext = createContext<DealEdits | null>(null);

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

function displayOf(field: ChangeField, scenario: LoanScenario): string {
  if (field === 'rental' || field === 'sale') return '';
  return formatDealField(field, readDealField(scenario, field));
}

function rawOf(field: ChangeField, scenario: LoanScenario): unknown {
  if (field === 'rental' || field.startsWith('rental.')) {
    return scenario.rental ?? null;
  }
  if (field === 'sale') return scenario.sale ?? null;
  return readDealField(scenario, field);
}

/** Records every shared-input edit for the change toast, ripple and undo (spec 010 R7). */
export function DealEditsProvider({ children }: { children: ReactNode }) {
  const {
    scenarios,
    activeScenario,
    activeScenarioId,
    updateActiveScenario,
    restoreScenario,
  } = useScenarios();
  const [lastChange, setLastChange] = useState<ChangeRecord | null>(null);
  const [changeSeq, setChangeSeq] = useState(0);

  // Event handlers can fire several edits before a re-render, so keep the
  // newest known scenario and record in refs.
  const scenarioRef = useRef(activeScenario);
  scenarioRef.current = activeScenario;
  const recordRef = useRef<ChangeRecord | null>(null);
  recordRef.current = lastChange;
  const gestureOpen = useRef(false);

  // Switching or removing the scenario drops the record (data-model §B).
  useEffect(() => {
    const record = recordRef.current;
    if (
      record &&
      (record.scenarioId !== activeScenarioId ||
        !scenarios.some((s) => s.id === record.scenarioId))
    ) {
      recordRef.current = null;
      setLastChange(null);
    }
  }, [activeScenarioId, scenarios]);

  const record = useCallback(
    (
      field: ChangeField,
      patch: Partial<LoanScenario>,
      source: DealEditSource,
    ) => {
      const current = scenarioRef.current;
      const after = applyScenarioPatch(current, patch);
      if (same(after, current)) return;
      updateActiveScenario(patch);
      scenarioRef.current = after;

      const now = Date.now();
      const prev = recordRef.current;
      // A scrub merges only within its own gesture; other edits from the same control merge within 800ms.
      const coalesce =
        prev != null &&
        prev.scenarioId === current.id &&
        prev.field === field &&
        // A change from another control (sheet vs. card popover) is a new change, not a merge.
        prev.source === source &&
        (source === 'scrub'
          ? prev.source === 'scrub' && gestureOpen.current
          : now - prev.at < COALESCE_MS);
      if (source === 'scrub') gestureOpen.current = true;

      const next: ChangeRecord = coalesce
        ? {
            ...prev,
            newValue: rawOf(field, after),
            newDisplay: displayOf(field, after),
            at: now,
            after,
          }
        : {
            scenarioId: current.id,
            field,
            label:
              field === 'rental'
                ? 'Rental inputs'
                : field === 'sale'
                  ? 'Sale inputs'
                  : DEAL_FIELD_LABELS[field],
            oldValue: rawOf(field, current),
            newValue: rawOf(field, after),
            oldDisplay: displayOf(field, current),
            newDisplay: displayOf(field, after),
            source,
            at: now,
            before: current,
            after,
          };
      recordRef.current = next;
      setLastChange(next);
      setChangeSeq((n) => n + 1);
    },
    [updateActiveScenario],
  );

  const editDeal = useCallback<DealEdits['editDeal']>(
    (field, value, source) => {
      record(field, dealFieldPatch(scenarioRef.current, field, value), source);
    },
    [record],
  );

  const editRental = useCallback<DealEdits['editRental']>(
    (input, source) => {
      const current = scenarioRef.current;
      const patch =
        typeof input === 'function' ? input(current.rental ?? null) : input;
      let rentalPatch: Partial<LoanScenario>;
      if (patch === null) {
        rentalPatch = { rental: null };
      } else if (current.rental == null) {
        // Same seeding rule as useRentalEditor (spec 002 FR-002).
        if (patch.grossMonthlyRent == null) return;
        rentalPatch = {
          rental: {
            ...DEFAULT_RENTAL_ASSUMPTIONS,
            ...patch,
          } as RentalAssumptions,
        };
      } else {
        rentalPatch = { rental: patch as RentalAssumptions };
      }
      const after = applyScenarioPatch(current, rentalPatch);
      const changed = RENTAL_FIELDS.filter(
        (k) => (current.rental?.[k] ?? null) !== (after.rental?.[k] ?? null),
      );
      const field: ChangeField = changed.includes('grossMonthlyRent')
        ? 'rental.grossMonthlyRent'
        : changed[0]
          ? `rental.${changed[0]}`
          : 'rental';
      record(field, rentalPatch, source);
    },
    [record],
  );

  const editSale = useCallback<DealEdits['editSale']>(
    (patch, source) => record('sale', { sale: patch }, source),
    [record],
  );

  const endGesture = useCallback(() => {
    gestureOpen.current = false;
  }, []);

  const undo = useCallback(() => {
    const rec = recordRef.current;
    if (!rec) return;
    const current = scenarioRef.current;
    if (current.id === rec.scenarioId && same(current, rec.after)) {
      restoreScenario(rec.before);
      scenarioRef.current = rec.before;
    } else if (rec.field === 'rental' || rec.field.startsWith('rental.')) {
      updateActiveScenario({
        rental: rec.oldValue as RentalAssumptions | null,
      });
    } else if (rec.field === 'sale') {
      // `sale` merges shallowly, so blank every current key before laying the old value over it.
      const old = rec.oldValue as SaleAssumptions | null;
      const blank = Object.fromEntries(
        Object.keys(current.sale ?? {}).map((k) => [k, undefined]),
      );
      updateActiveScenario({
        sale: old == null && !current.sale ? null : { ...blank, ...old },
      });
    } else {
      updateActiveScenario({
        [rec.field]: rec.oldValue,
      } as Partial<LoanScenario>);
    }
    recordRef.current = null;
    gestureOpen.current = false;
    setLastChange(null);
    setChangeSeq((n) => n + 1);
  }, [restoreScenario, updateActiveScenario]);

  const dismiss = useCallback(() => {
    recordRef.current = null;
    setLastChange(null);
  }, []);

  const value = useMemo<DealEdits>(
    () => ({
      editDeal,
      editRental,
      editSale,
      endGesture,
      lastChange,
      changeSeq,
      undo,
      dismiss,
    }),
    [
      editDeal,
      editRental,
      editSale,
      endGesture,
      lastChange,
      changeSeq,
      undo,
      dismiss,
    ],
  );

  return (
    <DealEditsContext.Provider value={value}>
      {children}
    </DealEditsContext.Provider>
  );
}

export function useDealEdits(): DealEdits {
  const ctx = useContext(DealEditsContext);
  if (!ctx) {
    throw new Error('useDealEdits must be used inside <DealEditsProvider>');
  }
  return ctx;
}

/** Like `useDealEdits`, but `null` outside a provider (for generic fields that may scrub). */
export function useDealEditsOptional(): DealEdits | null {
  return useContext(DealEditsContext);
}
