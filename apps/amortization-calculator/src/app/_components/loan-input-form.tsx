'use client';

import { useState } from 'react';
import type { FieldError, LoanScenario } from 'amortization-calculations';
import { DateField, NumberField } from 'amortization-ui';
import { Tabs, TabsList, TabsTab } from '@ui-sdk/react/tabs';

export interface LoanInputFormProps {
  scenario: LoanScenario;
  errors: FieldError[];
  onChange: (patch: Partial<LoanScenario>) => void;
}

function errorFor(errors: FieldError[], field: string): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

/**
 * The core loan inputs (FR-001): principal, rate, term, and start date. The
 * term has an explicit years/months unit toggle so the unit is never
 * ambiguous (Edge Cases), converting to `termMonths` internally.
 */
export function LoanInputForm({ scenario, errors, onChange }: LoanInputFormProps) {
  const [termUnit, setTermUnit] = useState<'years' | 'months'>('years');
  const termValue = termUnit === 'years' ? scenario.termMonths / 12 : scenario.termMonths;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <NumberField
        label="Loan amount"
        variant="currency"
        min={0}
        value={scenario.principal}
        onValueChange={(value) => onChange({ principal: value ?? 0 })}
        error={errorFor(errors, 'principal')}
      />
      <NumberField
        label="Annual interest rate"
        suffix="%"
        min={0}
        step={0.125}
        value={scenario.annualInterestRatePct}
        onValueChange={(value) => onChange({ annualInterestRatePct: value ?? 0 })}
        error={errorFor(errors, 'annualInterestRatePct')}
      />
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700">Loan term</span>
          <Tabs
            value={termUnit}
            onValueChange={(unit) => unit && setTermUnit(unit as 'years' | 'months')}
          >
            <TabsList aria-label="Term unit" className="flex gap-1 text-xs">
              <TabsTab
                value="years"
                className="rounded px-2 py-0.5 text-neutral-500 data-selected:bg-neutral-900 data-selected:text-white"
              >
                Years
              </TabsTab>
              <TabsTab
                value="months"
                className="rounded px-2 py-0.5 text-neutral-500 data-selected:bg-neutral-900 data-selected:text-white"
              >
                Months
              </TabsTab>
            </TabsList>
          </Tabs>
        </div>
        <NumberField
          label="Loan term"
          visuallyHiddenLabel
          min={1}
          value={termValue}
          onValueChange={(value) => {
            const months = termUnit === 'years' ? Math.round((value ?? 0) * 12) : Math.round(value ?? 0);
            onChange({ termMonths: months });
          }}
          error={errorFor(errors, 'termMonths')}
        />
      </div>
      <DateField
        label="First payment date"
        value={scenario.startDate}
        onValueChange={(value) => value && onChange({ startDate: value })}
        description="Payment dates roll to each month's own end for short months."
      />
    </div>
  );
}
