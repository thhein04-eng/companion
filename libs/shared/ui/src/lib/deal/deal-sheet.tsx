'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { FieldError } from 'shared-calculations';
import { useDealEdits, useScenarios } from 'shared-data-access';
import { Button } from '../ds/button';
import { Eyebrow } from '../ds/typography';
import { Sheet } from '../ds/sheet';
import { MonthlyCostFields, PropertyFields } from '../cost-breakdown-panel';
import { isPrincipalDerived, LoanFields } from '../loan-input-form';
import { RentalInputsPanel } from '../rental-inputs-panel';
import { focusDealField, useDealSheet } from './deal-sheet-context';
import { DealSentence } from './deal-sentence';
import { PaymentBar } from './payment-bar';
import { patchEdits } from './patch-edits';
import type { DealPayment, Headline } from './page-profiles';

export interface DealSheetProps {
  headline: Headline;
  payment: DealPayment | null;
  /** Loan + rental validation for the active scenario (data-model §G). */
  errors: FieldError[];
  /** Setup-mode footer and finish rules (US3); omitted until then. */
  setup?: {
    canFinish: boolean;
    finish(): void;
    skip(): void;
  };
  /** Rendered at the top of the body (US4 deal sentence). */
  intro?: ReactNode;
  /** Rendered above the monthly cost fields (US4 payment bar). */
  paymentEditor?: ReactNode;
  /** Turns on drag-to-adjust labels (US5). */
  scrub?: boolean;
  /** Down payment + closing + rehab, shown in the Rental group when the page has it. */
  totalCashInvested?: number | null;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = `deal-group-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <Eyebrow as="h3" id={id} className="m-0">
        {title}
      </Eyebrow>
      {children}
    </section>
  );
}

/**
 * The Edit deal sheet (spec 010 FR-006): every shared input, grouped Property → Loan →
 * Monthly costs → Rental. Every write goes through `useDealEdits` so it is recorded (R7).
 */
export function DealSheet({
  headline,
  payment,
  errors,
  setup,
  intro,
  paymentEditor,
  scrub = true,
  totalCashInvested,
}: DealSheetProps) {
  const { activeScenario: scenario } = useScenarios();
  const { editDeal, editRental, endGesture } = useDealEdits();
  const { state, close } = useDealSheet();
  const onChange = patchEdits(
    editDeal,
    state.mode === 'setup' ? 'setup' : 'sheet',
  );
  const setupMode = state.mode === 'setup' && setup != null;
  const focusHeading = useRef(false);

  // Focus the requested field once the sheet has opened (FR-022, FR-023).
  useEffect(() => {
    if (!state.open || !state.focusField) return;
    const field = state.focusField;
    const t = window.setTimeout(() => focusDealField(field), 80);
    return () => window.clearTimeout(t);
  }, [state.open, state.focusField, state.openSeq]);

  const done = () => {
    endGesture();
    if (setupMode) {
      setup.finish();
      focusHeading.current = true;
      close();
      return;
    }
    close();
  };

  return (
    <Sheet
      data-testid="deal-sheet"
      initialFocus={
        state.focusField
          ? () =>
              document.querySelector<HTMLElement>(
                `[data-deal-field="${state.focusField}"] input`,
              )
          : undefined
      }
      finalFocus={() => {
        if (focusHeading.current) {
          focusHeading.current = false;
          return document.querySelector<HTMLElement>('#main-content h1');
        }
        return state.returnFocus?.isConnected ? state.returnFocus : null;
      }}
      open={state.open}
      onOpenChange={(open) => {
        if (open) return;
        endGesture();
        if (setupMode) setup.skip();
        close();
      }}
      title={
        setupMode ? 'Welcome, set up this deal' : `${scenario.name} · deal`
      }
      description={
        setupMode
          ? 'Enter the property and loan. You can change anything later from the strip.'
          : undefined
      }
      headerActions={
        setupMode ? null : (
          <Button variant="primary" size="sm" onClick={done}>
            Done
          </Button>
        )
      }
      footer={
        setupMode ? (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setup.skip();
                close();
              }}
            >
              Skip for now
            </Button>
            <Button
              variant="primary"
              onClick={done}
              disabled={!setup.canFinish}
            >
              Done
            </Button>
          </>
        ) : null
      }
    >
      {intro ?? <DealSentence />}
      {headline.value != null || headline.naReason ? (
        <p
          data-testid="sheet-headline"
          className="m-0 flex items-baseline justify-between gap-3 rounded-sm bg-sunk px-3 py-2 text-[13.5px]"
        >
          <span className="text-muted">{headline.label}</span>
          <b className="num font-semibold text-fg">
            {headline.value != null
              ? headline.format(headline.value)
              : headline.naReason}
          </b>
        </p>
      ) : null}
      <Group title="Property">
        <PropertyFields
          scenario={scenario}
          errors={errors}
          onChange={onChange}
          scrub={scrub}
        />
      </Group>
      <Group title="Loan">
        <LoanFields
          scenario={scenario}
          errors={errors}
          onChange={onChange}
          derivedPrincipal={isPrincipalDerived(scenario)}
          scrub={scrub}
        />
      </Group>
      <Group title="Monthly costs">
        <MonthlyCostFields
          scenario={scenario}
          errors={errors}
          onChange={onChange}
          monthlyPrincipalAndInterest={payment?.principalAndInterest ?? 0}
          totalMonthlyPayment={payment?.total ?? 0}
          pmiDropPeriod={payment?.pmiDropPeriod ?? null}
          before={
            paymentEditor ??
            (payment ? (
              <PaymentBar
                parts={payment.parts}
                total={payment.total}
                downPaymentPct={
                  scenario.downPayment == null
                    ? null
                    : 'percent' in scenario.downPayment
                      ? scenario.downPayment.percent
                      : scenario.homePrice
                        ? Math.round(
                            (scenario.downPayment.amount / scenario.homePrice) *
                              100,
                          )
                        : null
                }
                onActivate={(field) => focusDealField(field)}
              />
            ) : null)
          }
          scrub={scrub}
        />
      </Group>
      <Group title="Rental">
        <RentalInputsPanel
          rental={scenario.rental ?? null}
          errors={errors.filter((e) => e.field.startsWith('rental.'))}
          onChange={(patch) =>
            editRental(patch, state.mode === 'setup' ? 'setup' : 'sheet')
          }
          totalCashInvested={totalCashInvested ?? null}
          hideGrowth
        />
      </Group>
    </Sheet>
  );
}
