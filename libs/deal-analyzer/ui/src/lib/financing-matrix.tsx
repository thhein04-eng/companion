'use client';

import type { ReactNode } from 'react';
import type {
  DscrResult,
  FinancingMatrix as FinancingMatrixData,
  FinancingOptionResult,
  FinancingPhase,
} from 'deal-analyzer-calculations';
import type {
  ArmTerms,
  FieldError,
  FinancingOptionId,
} from 'shared-calculations';
import { currency, percent1 } from 'shared-ui';
import { dscrStatus } from './dscr-card';
import { FinancingTermsEditor } from './financing-terms-editor';
import { formatDscr, formatDscrMinimum } from './format-dscr';
import { StatusPill } from './rule-indicator';
import { SegmentedOptions } from './segmented-options';

export interface FinancingMatrixProps {
  matrix: FinancingMatrixData;
  scenarioName: string;
  /** The Deal Analyzer's monthly NOI, for the cash-flow breakdown. */
  noiMonthly: number;
  errors: FieldError[];
  onSelect: (id: FinancingOptionId) => void;
  onTermsChange: (id: FinancingOptionId, patch: Partial<ArmTerms>) => void;
  onReset: () => void;
}

const TOGGLE_OPTIONS = [
  { value: 'conventional', label: 'Conventional' },
  { value: 'arm', label: 'ARM' },
  { value: 'dscr', label: 'DSCR loan' },
] as const satisfies readonly { value: FinancingOptionId; label: string }[];

type RowKey =
  | 'rate'
  | 'term'
  | 'down-payment'
  | 'loan-amount'
  | 'cash-invested'
  | 'monthly-pi'
  | 'monthly-pmi'
  | 'cash-flow'
  | 'coc'
  | 'dscr'
  | 'rent-needed';

interface RowDef {
  key: RowKey;
  label: string;
  /** Per-phase rows render one value per phase (the ARM has two). */
  phase?: (phase: FinancingPhase) => ReactNode;
  option?: (option: FinancingOptionResult) => ReactNode;
}

function money(value: number): ReactNode {
  return value < 0 ? (
    <span className="text-red-700">{currency.format(value)}</span>
  ) : (
    currency.format(value)
  );
}

function DscrValue({ dscr }: { dscr: DscrResult }) {
  const { status, text } = dscrStatus(dscr);
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span
        className={`tabular-nums ${status === 'fail' ? 'font-medium text-red-700' : ''}`}
      >
        {dscr.value != null ? formatDscr(dscr.value) : 'N/A'}
      </span>
      <StatusPill status={status} text={text} />
      {dscr.coversDebtService === false ? (
        <span className="text-xs text-red-700">NOI doesn&apos;t cover P&amp;I</span>
      ) : null}
    </span>
  );
}

function rentNeeded(dscr: DscrResult): ReactNode {
  if (dscr.minimum == null) return '—';
  if (dscr.meetsMinimum) return 'Met';
  return dscr.rentForMinimum != null
    ? `${currency.format(dscr.rentForMinimum)}/mo`
    : 'N/A';
}

function rowsFor(dscrMinimum: number | null): RowDef[] {
  return [
    {
      key: 'rate',
      label: 'Rate',
      option: (o) =>
        o.id === 'arm'
          ? `${(o.terms as ArmTerms).annualRatePct}% → ${(o.terms as ArmTerms).adjustedRatePct}%`
          : `${o.terms.annualRatePct}%`,
    },
    { key: 'term', label: 'Term', option: (o) => `${o.terms.termYears} years` },
    {
      key: 'down-payment',
      label: 'Down payment',
      option: (o) =>
        `${currency.format(o.downPayment)} (${o.terms.downPaymentPct}%)`,
    },
    {
      key: 'loan-amount',
      label: 'Loan amount',
      option: (o) => currency.format(o.loanAmount),
    },
    {
      key: 'cash-invested',
      label: 'Cash invested',
      option: (o) => currency.format(o.totalCashInvested),
    },
    {
      key: 'monthly-pi',
      label: 'Monthly P&I',
      phase: (p) => currency.format(p.monthlyPrincipalAndInterest),
    },
    {
      key: 'monthly-pmi',
      label: 'Monthly PMI',
      phase: (p) => currency.format(p.monthlyPmi),
    },
    {
      key: 'cash-flow',
      label: 'Monthly cash flow',
      phase: (p) => money(p.monthlyCashFlow),
    },
    {
      key: 'coc',
      label: 'Cash-on-cash',
      phase: (p) =>
        p.cashOnCashReturn.value != null
          ? percent1.format(p.cashOnCashReturn.value)
          : 'N/A',
    },
    { key: 'dscr', label: 'DSCR', phase: (p) => <DscrValue dscr={p.dscr} /> },
    {
      key: 'rent-needed',
      label:
        dscrMinimum != null
          ? `Rent for ${formatDscrMinimum(dscrMinimum)}`
          : 'Rent for minimum',
      phase: (p) => rentNeeded(p.dscr),
    },
  ];
}

function phaseTag(phase: FinancingPhase): string {
  return `Yrs ${phase.fromYear}–${phase.toYear}`;
}

/** One matrix cell's content; `idPrefix` keeps the narrow layout's test ids distinct. */
function CellContent({
  row,
  option,
  idPrefix,
}: {
  row: RowDef;
  option: FinancingOptionResult;
  idPrefix: string;
}) {
  // An option with invalid terms shows "—" everywhere (FR-011).
  if (!option.phases) return <>—</>;
  if (row.option) return <>{row.option(option)}</>;
  if (!row.phase) return <>—</>;
  if (option.phases.length === 1) return <>{row.phase(option.phases[0])}</>;
  return (
    <span className="flex flex-col gap-1">
      {option.phases.map((phase, i) => (
        <span
          key={phase.label}
          data-testid={`${idPrefix}${row.key}-${option.id}-${i === 0 ? 'initial' : 'reset'}`}
          className="flex flex-col"
        >
          <span className="text-xs text-neutral-500">{phaseTag(phase)}</span>
          <span>{row.phase?.(phase)}</span>
        </span>
      ))}
    </span>
  );
}

function Breakdown({
  option,
  noiMonthly,
}: {
  option: FinancingOptionResult;
  noiMonthly: number;
}) {
  if (!option.phases) return null;
  return (
    <div
      data-testid="financing-breakdown"
      className="flex flex-col gap-1 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
    >
      {option.phases.map((phase) => (
        <p key={phase.label} className="tabular-nums">
          {option.phases && option.phases.length > 1 ? (
            <span className="font-medium">{phase.label}: </span>
          ) : null}
          NOI {currency.format(noiMonthly)} − P&amp;I{' '}
          {currency.format(phase.monthlyPrincipalAndInterest)} − PMI{' '}
          {currency.format(phase.monthlyPmi)} = Cash flow{' '}
          <span
            className={
              phase.monthlyCashFlow < 0 ? 'font-medium text-red-700' : 'font-medium'
            }
          >
            {currency.format(phase.monthlyCashFlow)}
          </span>{' '}
          /mo
        </p>
      ))}
    </div>
  );
}

/**
 * Conventional vs. ARM vs. DSCR loan on the same property (spec 006 User
 * Story 2). A segmented toggle picks the structure in focus; ≥ sm shows a
 * comparison table, narrower screens only the selected structure (FR-010).
 */
export function FinancingMatrix({
  matrix,
  scenarioName,
  noiMonthly,
  errors,
  onSelect,
  onTermsChange,
  onReset,
}: FinancingMatrixProps) {
  if (matrix.options === null) {
    return (
      <div data-testid="financing-matrix">
        <p data-testid="financing-matrix-na" className="text-sm text-neutral-500">
          {matrix.naReason}
        </p>
      </div>
    );
  }

  const options = matrix.options;
  const selected =
    options.find((o) => o.id === matrix.selected) ?? options[0];
  const rows = rowsFor(matrix.dscrMinimum);
  const highlight = (id: FinancingOptionId) =>
    id === selected.id ? 'bg-sky-50' : '';

  return (
    <div data-testid="financing-matrix" className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">
        Same property, rent and expenses — only the debt changes. DSCR lenders
        qualify on the property&apos;s income instead of yours.
      </p>
      <SegmentedOptions
        label="Loan structure"
        value={selected.id}
        options={TOGGLE_OPTIONS}
        onValueChange={onSelect}
        data-testid="financing-toggle"
      />

      <div className="hidden overflow-x-auto rounded-md border border-neutral-200 bg-white sm:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Financing options for {scenarioName}
          </caption>
          <thead className="text-left">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium text-neutral-600">
                <span className="sr-only">Metric</span>
              </th>
              {options.map((o) => (
                <th
                  key={o.id}
                  scope="col"
                  data-testid={`financing-col-${o.id}`}
                  data-selected={o.id === selected.id ? 'true' : undefined}
                  aria-current={o.id === selected.id ? 'true' : undefined}
                  className={`px-3 py-2 align-bottom ${highlight(o.id)} ${
                    o.id === selected.id ? 'border-b-2 border-sky-500' : ''
                  }`}
                >
                  <span className="block font-semibold text-neutral-900">
                    {o.name}
                  </span>
                  <span className="block text-xs font-normal text-neutral-500">
                    {o.phases ? o.description : 'Fix the terms below'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-neutral-100">
                <th
                  scope="row"
                  className="px-3 py-2 text-left font-medium text-neutral-600"
                >
                  {row.label}
                </th>
                {options.map((o) => (
                  <td
                    key={o.id}
                    data-testid={`${row.key}-${o.id}`}
                    className={`px-3 py-2 align-top tabular-nums ${highlight(o.id)}`}
                  >
                    <CellContent row={row} option={o} idPrefix="" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow screens: the selected structure only, so the page never scrolls sideways. */}
      <dl
        data-testid="financing-narrow"
        aria-label={`${selected.name} financing for ${scenarioName}`}
        className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border border-neutral-200 bg-white p-3 text-sm sm:hidden"
      >
        {rows.map((row) => (
          <div key={row.key} className="contents">
            <dt className="font-medium text-neutral-600">{row.label}</dt>
            <dd
              data-testid={`narrow-${row.key}-${selected.id}`}
              className="tabular-nums"
            >
              <CellContent row={row} option={selected} idPrefix="narrow-" />
            </dd>
          </div>
        ))}
      </dl>

      <Breakdown option={selected} noiMonthly={noiMonthly} />

      <FinancingTermsEditor
        key={selected.id}
        option={selected}
        errors={errors}
        isCustomized={matrix.isCustomized}
        onChange={(patch) => onTermsChange(selected.id, patch)}
        onReset={onReset}
      />
    </div>
  );
}
