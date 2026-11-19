'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DEAL_FIELD_LABELS,
  readDealField,
  type FieldError,
} from 'shared-calculations';
import { useScenarios, useSetupMode } from 'shared-data-access';
import { Chip } from '../ds/chip';
import { dealErrors } from './deal-errors';
import { Button } from '../ds/button';
import type { ChipTone } from '../ds/chip';
import { ScenarioTabs } from '../scenario-tabs';
import { ChipPopover } from './chip-popover';
import { DealSheet, type DealSheetProps } from './deal-sheet';
import { useDealSheet } from './deal-sheet-context';
import {
  chipOrder,
  type DealChipKey,
  type DealPayment,
  type Headline,
  type PageProfile,
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

function toneFor(profile: PageProfile, chip: DealChipKey): ChipTone {
  if (chip === 'total') return 'total';
  if (profile.pinned.includes(chip)) return 'pin';
  if (profile.muted.includes(chip)) return 'muted';
  return 'default';
}

/**
 * The sticky Deal Strip (spec 010 US1): scenario tabs, a chip per shared input ordered by the
 * page's profile, and Edit deal, which opens the sheet. Replaces the per-page input sections.
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
  const stripRef = useRef<HTMLElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const [nowrap, setNowrap] = useState(false);
  const setup = useSetupMode();
  const fixable = dealErrors(errors);
  const missing = profile.requires.filter(
    (r) => readDealField(store.activeScenario, r.field) == null,
  );

  // First run (FR-020): open the sheet in setup mode for a scenario with no home price, once
  // saved scenarios have loaded, and again whenever such a scenario becomes active.
  const { open: openSheet, state: sheetState } = dealSheet;
  useEffect(() => {
    if (setup.ready && setup.needsSetup && !sheetState.open) {
      openSheet({ mode: 'setup' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup.ready, setup.needsSetup, store.activeScenarioId]);

  // Cap the strip at a third of the viewport: past that, chips scroll sideways in one line.
  useLayoutEffect(() => {
    const measure = () => {
      const strip = stripRef.current;
      const row = chipsRef.current;
      if (!strip || !row) return;
      const top = strip.offsetHeight - row.offsetHeight;
      const widths = Array.from(row.children).reduce(
        (sum, el) => sum + (el as HTMLElement).offsetWidth + 6,
        0,
      );
      const rows = Math.max(
        1,
        Math.ceil(widths / Math.max(1, row.clientWidth)),
      );
      const wrappedHeight = rows * 30 + (rows - 1) * 6;
      setNowrap(top + wrappedHeight > window.innerHeight * 0.33);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [profile]);

  return (
    <>
      <section
        ref={stripRef}
        aria-label="Deal"
        data-testid="deal-strip"
        className="sticky top-14 z-20 flex max-h-[33vh] flex-col gap-2.5 rounded-lg border border-line bg-surface p-3 lg:top-0"
      >
        <div className="flex flex-wrap items-center gap-2">
          <ScenarioTabs
            scenarios={store.scenarios}
            activeScenarioId={store.activeScenarioId}
            onActiveScenarioIdChange={store.setActiveScenarioId}
            onAddScenario={store.addScenario}
            onRemoveScenario={store.removeScenario}
          />
          <span className="flex-1" />
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
            size="sm"
            onClick={(event) =>
              dealSheet.open({
                returnFocus: event.currentTarget as HTMLElement,
              })
            }
          >
            Edit deal
          </Button>
        </div>
        <div
          ref={chipsRef}
          data-testid="deal-chips"
          className={`flex gap-1.5 ${nowrap ? 'flex-nowrap overflow-x-auto pb-1' : 'flex-wrap'}`}
        >
          {chipOrder(profile).map((chip) => (
            <ChipPopover
              key={chip}
              chip={chip}
              tone={toneFor(profile, chip)}
              headline={headline}
              payment={payment}
              errors={errors}
            />
          ))}
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
