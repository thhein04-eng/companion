'use client';

import { useState } from 'react';
import type { ExtraPaymentRule } from 'shared-calculations';
import { currency, DateField, NumberField } from 'shared-ui';
import { Tabs, TabsList, TabsTab } from '@ui-sdk/react/tabs';
import { Button } from '@ui-sdk/react/button';

export interface ExtraPaymentPanelProps {
  extraPayments: ExtraPaymentRule[];
  onChange: (next: ExtraPaymentRule[]) => void;
}

/**
 * Add, list, and remove recurring or one-time extra principal payments
 * (FR-007), each applied to `computeSchedule()`'s extra-payment handling.
 */
export function ExtraPaymentPanel({
  extraPayments,
  onChange,
}: ExtraPaymentPanelProps) {
  const [kind, setKind] = useState<'recurring' | 'oneTime'>('recurring');
  const [amount, setAmount] = useState<number | null>(100);
  const [date, setDate] = useState<string | null>(
    new Date().toISOString().slice(0, 10),
  );

  const addRule = () => {
    if (amount == null || amount <= 0) return;
    const rule: ExtraPaymentRule =
      kind === 'recurring'
        ? { id: crypto.randomUUID(), kind: 'recurring', amount, startPeriod: 1 }
        : {
            id: crypto.randomUUID(),
            kind: 'oneTime',
            amount,
            date: date ?? new Date().toISOString().slice(0, 10),
          };
    onChange([...extraPayments, rule]);
  };

  const removeRule = (id: string) => {
    onChange(extraPayments.filter((rule) => rule.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      {extraPayments.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {extraPayments.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center justify-between rounded-lg border border-line bg-surface px-3.5 py-2 text-[14px]"
            >
              <span>
                {rule.kind === 'recurring'
                  ? `${currency.format(rule.amount)} / month from payment #${rule.startPeriod}`
                  : `${currency.format(rule.amount)} one-time on ${rule.date}`}
              </span>
              <button
                type="button"
                aria-label="Remove extra payment"
                onClick={() => removeRule(rule.id)}
                className="text-muted hover:text-bad"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-line p-[18px]">
        <Tabs
          value={kind}
          onValueChange={(next) =>
            next && setKind(next as 'recurring' | 'oneTime')
          }
        >
          <TabsList
            aria-label="Extra payment type"
            className="flex gap-1 text-xs"
          >
            <TabsTab
              value="recurring"
              className="cursor-pointer rounded-sm border border-transparent px-2 py-1 text-muted hover:bg-sunk data-selected:border-ink data-selected:bg-ink data-selected:text-ink-fg"
            >
              Recurring
            </TabsTab>
            <TabsTab
              value="oneTime"
              className="cursor-pointer rounded-sm border border-transparent px-2 py-1 text-muted hover:bg-sunk data-selected:border-ink data-selected:bg-ink data-selected:text-ink-fg"
            >
              One-time
            </TabsTab>
          </TabsList>
        </Tabs>
        <div className="w-32">
          <NumberField
            label="Amount"
            variant="currency"
            min={0}
            value={amount}
            onValueChange={setAmount}
          />
        </div>
        {kind === 'oneTime' ? (
          <div className="w-44">
            <DateField label="Date" value={date} onValueChange={setDate} />
          </div>
        ) : null}
        <Button
          onClick={addRule}
          className="cursor-pointer rounded-md border border-ink bg-ink px-3 py-2 text-[14px] font-medium text-ink-fg hover:opacity-90"
        >
          Add
        </Button>
      </div>
    </div>
  );
}
