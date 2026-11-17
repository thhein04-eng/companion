'use client';

import { useState } from 'react';
import type { LoanScenario } from 'shared-calculations';
import { NumberField } from './number-field';
import { Tabs, TabsList, TabsTab } from '@ui-sdk/react/tabs';
import { currency } from './formatters';


export interface CostBreakdownPanelProps {
  scenario: LoanScenario;
  onChange: (patch: Partial<LoanScenario>) => void;
  monthlyPrincipalAndInterest: number;
  totalMonthlyPayment: number;
  pmiDropPeriod: number | null;
}

/**
 * Real-estate-specific costs (FR-005): home price, down payment, tax,
 * insurance, PMI, and HOA, with a "total estimated monthly payment" clearly
 * separated from the principal & interest figure (SC-006).
 */
export function CostBreakdownPanel({
  scenario,
  onChange,
  monthlyPrincipalAndInterest,
  totalMonthlyPayment,
  pmiDropPeriod,
}: CostBreakdownPanelProps) {
  const [downPaymentMode, setDownPaymentMode] = useState<'amount' | 'percent'>('amount');
  const downPaymentValue =
    scenario.downPayment && 'amount' in scenario.downPayment
      ? scenario.downPayment.amount
      : scenario.downPayment && 'percent' in scenario.downPayment
        ? scenario.downPayment.percent
        : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Home price"
          variant="currency"
          min={0}
          value={scenario.homePrice}
          onValueChange={(value) => onChange({ homePrice: value })}
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Down payment</span>
            <Tabs
              value={downPaymentMode}
              onValueChange={(mode) => {
                if (!mode) return;
                setDownPaymentMode(mode as 'amount' | 'percent');
                onChange({ downPayment: null });
              }}
            >
              <TabsList aria-label="Down payment mode" className="flex gap-1 text-xs">
                <TabsTab
                  value="amount"
                  className="rounded px-2 py-0.5 text-neutral-500 data-selected:bg-neutral-900 data-selected:text-white"
                >
                  $
                </TabsTab>
                <TabsTab
                  value="percent"
                  className="rounded px-2 py-0.5 text-neutral-500 data-selected:bg-neutral-900 data-selected:text-white"
                >
                  %
                </TabsTab>
              </TabsList>
            </Tabs>
          </div>
          <NumberField
            label="Down payment"
            visuallyHiddenLabel
            variant={downPaymentMode === 'amount' ? 'currency' : 'plain'}
            suffix={downPaymentMode === 'percent' ? '%' : undefined}
            min={0}
            value={downPaymentValue}
            onValueChange={(value) =>
              onChange({
                downPayment:
                  value == null
                    ? null
                    : downPaymentMode === 'amount'
                      ? { amount: value }
                      : { percent: value },
              })
            }
          />
        </div>
        <NumberField
          label="Annual property tax"
          variant="currency"
          min={0}
          value={scenario.annualPropertyTax}
          onValueChange={(value) => onChange({ annualPropertyTax: value })}
        />
        <NumberField
          label="Annual homeowner's insurance"
          variant="currency"
          min={0}
          value={scenario.annualInsurance}
          onValueChange={(value) => onChange({ annualInsurance: value })}
        />
        <NumberField
          label="PMI rate"
          suffix="%"
          min={0}
          step={0.05}
          value={scenario.pmiAnnualRatePct}
          onValueChange={(value) => onChange({ pmiAnnualRatePct: value })}
          description="Applies only while the loan balance is above 80% of the home price."
        />
        <NumberField
          label="Monthly HOA fee"
          variant="currency"
          min={0}
          value={scenario.monthlyHoa}
          onValueChange={(value) => onChange({ monthlyHoa: value })}
        />
      </div>

      <div className="flex flex-col gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-neutral-600">Principal &amp; interest only</span>
          <span className="text-sm">{currency.format(monthlyPrincipalAndInterest)}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-neutral-900">
            Total estimated monthly payment
          </span>
          <span className="text-lg font-semibold">{currency.format(totalMonthlyPayment)}</span>
        </div>
        {pmiDropPeriod != null ? (
          <p className="text-xs text-neutral-500">
            PMI drops off automatically at payment #{pmiDropPeriod}, once equity reaches 20%.
          </p>
        ) : null}
      </div>
    </div>
  );
}
