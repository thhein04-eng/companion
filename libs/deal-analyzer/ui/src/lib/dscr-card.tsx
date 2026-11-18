'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@ui-sdk/react/popover';
import { DSCR_PRESETS, type DscrResult } from 'deal-analyzer-calculations';
import { currency, NumberField } from 'shared-ui';
import { formatDscr, formatDscrMinimum } from './format-dscr';
import { StatusPill, type RuleStatus } from './rule-indicator';
import { SegmentedOptions } from './segmented-options';

export interface DscrCardProps {
  dscr: DscrResult;
  /** Writes `rental.dscrMinimum`. */
  onMinimumChange: (value: number) => void;
  /** The raw stored minimum, for the input (`undefined` = default 1.25). */
  minimumInput: number | undefined;
  minimumError: string | null;
}

type PresetValue = '1.15' | '1.20' | '1.25';
const PRESET_OPTIONS = DSCR_PRESETS.map((preset) => ({
  value: preset.toFixed(2) as PresetValue,
  label: formatDscrMinimum(preset),
}));

/** The pass/fail/N/A status and its words for one DSCR result. */
export function dscrStatus(dscr: DscrResult): {
  status: RuleStatus;
  text: string;
} {
  if (dscr.value == null || dscr.minimum == null || dscr.meetsMinimum == null) {
    return { status: 'na', text: 'N/A' };
  }
  const min = formatDscrMinimum(dscr.minimum);
  return dscr.meetsMinimum
    ? { status: 'pass', text: `Meets ${min} minimum` }
    : { status: 'fail', text: `Below ${min} minimum` };
}

/** DSCR = annual NOI ÷ annual P&I, tested against a lender minimum (spec 006 User Story 1). */
export function DscrCard({
  dscr,
  onMinimumChange,
  minimumInput,
  minimumError,
}: DscrCardProps) {
  const { status, text } = dscrStatus(dscr);
  const minimum = minimumInput ?? 1.25;
  const checkedPreset =
    PRESET_OPTIONS.find((o) => Number(o.value) === minimum)?.value ?? null;

  return (
    <div
      data-testid="dscr"
      className={`flex flex-col gap-2 rounded-md border bg-white p-3 ${
        status === 'fail' ? 'border-red-300' : 'border-neutral-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-neutral-900">DSCR</span>
        <div className="flex items-center gap-1.5">
          <StatusPill status={status} text={text} data-testid="dscr-status" />
          <Popover openOnHover>
            <PopoverTrigger
              aria-label="About DSCR"
              className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 text-xs text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              i
            </PopoverTrigger>
            <PopoverContent
              side="top"
              sideOffset={6}
              className="max-w-xs rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 shadow-md"
            >
              Debt Service Coverage Ratio = annual net operating income ÷ annual
              principal &amp; interest. DSCR lenders typically require
              1.15–1.25×.
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <span
        className={`text-lg font-semibold tabular-nums ${
          status === 'fail' ? 'text-red-700' : ''
        }`}
      >
        {dscr.value != null ? formatDscr(dscr.value) : 'N/A'}
      </span>
      {dscr.naReason ? (
        <p className="text-xs text-neutral-500">{dscr.naReason}</p>
      ) : null}
      {dscr.coversDebtService === false ? (
        <p className="text-xs font-medium text-red-700">
          NOI does not cover the annual principal &amp; interest.
        </p>
      ) : null}
      {dscr.meetsMinimum === false && dscr.minimum != null ? (
        <p data-testid="dscr-rent-needed" className="text-xs text-neutral-700">
          {dscr.rentForMinimum != null
            ? `Rent needed for ${formatDscrMinimum(dscr.minimum)}: ${currency.format(dscr.rentForMinimum)}/mo`
            : dscr.rentForMinimumNaReason}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 border-t border-neutral-100 pt-2">
        <SegmentedOptions
          label="Minimum DSCR"
          value={checkedPreset}
          options={PRESET_OPTIONS}
          onValueChange={(v) => onMinimumChange(Number(v))}
          data-testid="dscr-minimum-presets"
        />
        {/* No min/max: the SDK clamps on commit, which would hide the range error.
            step 0.01 snaps to two decimals (FR-002). */}
        <NumberField
          label="Custom minimum"
          suffix="×"
          step={0.01}
          value={minimum}
          onValueChange={(v) => {
            if (v != null) onMinimumChange(v);
          }}
          error={minimumError ?? undefined}
        />
      </div>
    </div>
  );
}
