'use client';

import { useState, type FormEvent } from 'react';
import type { ExtraPaymentRule } from 'shared-calculations';
import {
  Button,
  Card,
  currency,
  DateField,
  formatIsoDate,
  NumberField,
  SegmentedControl,
} from 'shared-ui';

export interface ExtraPaymentPanelProps {
  extraPayments: ExtraPaymentRule[];
  onChange: (next: ExtraPaymentRule[]) => void;
}

type Kind = 'recurring' | 'oneTime';

const KINDS = [
  { value: 'recurring', label: 'Recurring' },
  { value: 'oneTime', label: 'One-time' },
] as const;

const timing = (rule: ExtraPaymentRule) =>
  rule.kind === 'recurring'
    ? `Monthly from payment ${rule.startPeriod}`
    : `On ${formatIsoDate(rule.date)}`;

/**
 * Add, list and remove recurring or one-time extra principal payments (spec 001 FR-007),
 * as a labeled, aligned form and a tidy list (spec 011 US2, FR-004–FR-009).
 */
export function ExtraPaymentPanel({
  extraPayments,
  onChange,
}: ExtraPaymentPanelProps) {
  const [kind, setKind] = useState<Kind>('recurring');
  const [amount, setAmount] = useState<number | null>(100);
  const [date, setDate] = useState<string | null>(
    new Date().toISOString().slice(0, 10),
  );

  const addRule = (event?: FormEvent) => {
    event?.preventDefault();
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
    <div className="flex flex-col gap-[var(--space-grid)]">
      <Card
        as="form"
        padding="md"
        onSubmit={addRule}
        aria-label="Add an extra payment"
      >
        <div className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-[auto_minmax(12rem,1fr)_minmax(12rem,1fr)_auto] sm:items-end">
          <SegmentedControl
            label="Type"
            showLabel
            value={kind}
            options={KINDS}
            onValueChange={setKind}
          />
          <NumberField
            label="Amount"
            variant="currency"
            min={0}
            value={amount}
            onValueChange={setAmount}
          />
          {kind === 'oneTime' ? (
            <DateField label="Date" value={date} onValueChange={setDate} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-label font-medium text-muted">When</span>
              <span className="flex min-h-[42px] items-center rounded-sm bg-sunk px-3 text-[14px] text-fg">
                Every month, starting with payment 1
              </span>
            </div>
          )}
          <Button type="submit" variant="primary" className="h-[42px] px-5">
            Add
          </Button>
        </div>
      </Card>

      {extraPayments.length > 0 ? (
        <ul
          aria-label="Extra payments"
          className="m-0 flex list-none flex-col p-0"
        >
          {extraPayments.map((rule) => {
            const money = currency.format(rule.amount);
            return (
              <li
                key={rule.id}
                data-testid="extra-payment-row"
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-2.5 last:border-b-0"
              >
                <span className="rounded-full bg-sunk px-2.5 py-0.5 text-[12px] font-semibold text-fg">
                  {rule.kind === 'recurring' ? 'Monthly' : 'One-time'}
                </span>
                <span className="num text-[15px] font-semibold text-fg">
                  {money}
                </span>
                <span className="text-small text-muted">{timing(rule)}</span>
                <span className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove extra payment of ${money}`}
                  onClick={() => removeRule(rule.id)}
                >
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p
          data-testid="extra-payments-empty"
          className="m-0 text-small text-muted"
        >
          Add a recurring or one-time payment to pay the loan down faster.
        </p>
      )}
    </div>
  );
}
