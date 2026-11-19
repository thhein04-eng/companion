'use client';

import { useEffect } from 'react';
import {
  DEAL_FIELD_LABELS,
  readDealField,
  type FieldError,
} from 'shared-calculations';
import { useScenarios, useSetupMode } from 'shared-data-access';
import { Button } from '../ds/button';
import { Chip, type ChipTone } from '../ds/chip';
import { Eyebrow } from '../ds/typography';
import { PencilIcon } from '../icons';
import { ScenarioTabs } from '../scenario-tabs';
import { ChipPopover } from './chip-popover';
import { dealErrors } from './deal-errors';
import { DealSheet, type DealSheetProps } from './deal-sheet';
import { useDealSheet } from './deal-sheet-context';
import type {
  DealChipKey,
  DealPayment,
  Headline,
  PageProfile,
} from './page-profiles';

export interface DealStripProps {
  profile: PageProfile;
  headline: Headline;
  /** Loan + rental validation for the active scenario (data-model §G). */
  errors: FieldError[];
  payment: DealPayment | null;
  /** Extra sheet features layered on by US3–US5. */
  sheet?: Omit<DealSheetProps, 'headline' | 'payment' | 'errors'>;
}

/** The value grid's fixed order (spec 011 FR-003a): the same on every page. */
export const DEAL_GRID_ORDER: DealChipKey[] = [
  'homePrice',
  'downPayment',
  'principal',
  'annualInterestRatePct',
  'termMonths',
  'rental.grossMonthlyRent',
];

function toneFor(profile: PageProfile, chip: DealChipKey): ChipTone {
  if (chip === 'total') return 'total';
  if (profile.pinned.includes(chip)) return 'pin';
  if (profile.muted.includes(chip)) return 'muted';
  return 'default';
}

/**
 * The shared deal card (spec 011 US1; first built as spec 010's Deal Strip): scenario tabs and
 * Edit deal in its header, then the deal's values as a labeled grid in a fixed order, the monthly
 * payment, and hints for missing inputs. Each value opens its own editor. It sits above every
 * page's header and stays at the top while scrolling.
 */
export function DealStrip({
  profile,
  headline,
  errors,
  payment,
  sheet,
}: DealStripProps) {
  const store = useScenarios();
  const dealSheet = useDealSheet();
  const setup = useSetupMode();
  const fixable = dealErrors(errors);
  const missing = profile.requires.filter(
    (r) => readDealField(store.activeScenario, r.field) == null,
  );

  // First run (spec 010 FR-020): open the sheet in setup mode for a scenario with no home price,
  // once saved scenarios have loaded, and again whenever such a scenario becomes active.
  const { open: openSheet, state: sheetState } = dealSheet;
  useEffect(() => {
    if (setup.ready && setup.needsSetup && !sheetState.open) {
      openSheet({ mode: 'setup' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup.ready, setup.needsSetup, store.activeScenarioId]);

  return (
    <>
      <section
        aria-label="Deal"
        data-testid="deal-strip"
        className="sticky top-16 z-20 max-h-[33vh] overflow-y-auto rounded-xl border border-line bg-surface lg:top-2"
      >
        {/* DOM order = visual order at every width: tabs → actions → values (FR-003). */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-[18px] py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Eyebrow className="hidden shrink-0 sm:inline">Your deal</Eyebrow>
            <ScenarioTabs
              scenarios={store.scenarios}
              activeScenarioId={store.activeScenarioId}
              onActiveScenarioIdChange={store.setActiveScenarioId}
              onAddScenario={store.addScenario}
              onRemoveScenario={store.removeScenario}
            />
          </div>
          <div data-testid="deal-actions" className="flex items-center gap-2">
            {fixable.length > 0 ? (
              <Button
                variant="danger"
                size="sm"
                data-testid="deal-error-count"
                onClick={(event) =>
                  dealSheet.open({
                    focusField: fixable[0].key,
                    returnFocus: event.currentTarget as HTMLElement,
                  })
                }
              >
                {fixable.length}{' '}
                {fixable.length === 1 ? 'input needs' : 'inputs need'} fixing
              </Button>
            ) : null}
            <Button
              variant="primary"
              size="md"
              data-testid="edit-deal"
              onClick={(event) =>
                dealSheet.open({
                  returnFocus: event.currentTarget as HTMLElement,
                })
              }
            >
              <PencilIcon className="size-4" />
              Edit deal
            </Button>
          </div>
        </div>
        <div
          data-testid="deal-chips"
          className="grid grid-cols-3 gap-x-1 gap-y-0.5 px-2 pt-2 lg:grid-cols-6"
        >
          {DEAL_GRID_ORDER.map((chip) => (
            <ChipPopover
              key={chip}
              chip={chip}
              tone={toneFor(profile, chip)}
              headline={headline}
              payment={payment}
              errors={errors}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-2 pb-2.5 pt-1">
          <ChipPopover
            chip="total"
            tone="total"
            headline={headline}
            payment={payment}
            errors={errors}
          />
          {missing.map((r) => (
            <Chip
              key={`missing-${r.field}`}
              tone="missing"
              data-missing={r.field}
              onClick={(event) =>
                dealSheet.open({
                  focusField: r.field,
                  returnFocus: event.currentTarget,
                })
              }
            >
              + Add {DEAL_FIELD_LABELS[r.field].toLowerCase()} to unlock{' '}
              {r.unlocks}
            </Chip>
          ))}
        </div>
      </section>
      <DealSheet
        headline={headline}
        payment={payment}
        errors={errors}
        setup={{
          canFinish: setup.canFinish,
          finish: setup.finish,
          skip: setup.skip,
        }}
        {...sheet}
      />
    </>
  );
}
