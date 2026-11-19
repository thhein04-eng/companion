'use client';

import { useState, type KeyboardEvent } from 'react';
import {
  DEAL_FIELD_LABELS,
  formatDealField,
  readDealField,
  type DealFieldKey,
  type DownPayment,
} from 'shared-calculations';
import { useDealEdits, useScenarios } from 'shared-data-access';
import { isPrincipalDerived } from '../loan-input-form';

const tokenClass =
  'num cursor-pointer rounded-xs border-b-[1.5px] border-dashed border-accent bg-transparent px-px font-semibold text-accent';

/** One editable value in the sentence: a button that swaps to an inline field (FR-025). */
function Token({
  field,
  display,
  placeholder,
  initial,
  commit,
}: {
  field: DealFieldKey;
  display: string | null;
  placeholder: string;
  initial: number | null;
  commit: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const label = DEAL_FIELD_LABELS[field];
  if (editing) {
    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const n = Number(draft.replace(/[$,%\s]/g, ''));
        if (draft.trim() !== '' && Number.isFinite(n)) commit(n);
        setEditing(false);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setEditing(false);
      }
    };
    return (
      <input
        aria-label={label}
        autoFocus
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          const n = Number(draft.replace(/[$,%\s]/g, ''));
          if (draft.trim() !== '' && Number.isFinite(n)) commit(n);
          setEditing(false);
        }}
        className="num inline-block w-24 rounded-xs border border-accent bg-surface px-1 text-[15px] text-fg outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      aria-label={`${label} ${display ?? placeholder}`}
      className={tokenClass}
      onClick={() => {
        setDraft(initial == null ? '' : String(initial));
        setEditing(true);
      }}
    >
      {display ?? placeholder}
    </button>
  );
}

/**
 * The deal as an editable sentence (spec 010 US4, FR-025): "Buying a $450,000 home with 20%
 * down, so borrowing $360,000 at 6.5% for 30 years, renting it for $3,200/mo." Derived values
 * are plain text.
 */
export function DealSentence() {
  const { activeScenario: s } = useScenarios();
  const { editDeal } = useDealEdits();
  const dp = s.downPayment as DownPayment | null;
  const rent = s.rental?.grossMonthlyRent ?? null;
  const derived = isPrincipalDerived(s);
  const fmt = (k: DealFieldKey) => {
    const v = readDealField(s, k);
    return v == null ? null : formatDealField(k, v);
  };

  return (
    <p
      data-testid="deal-sentence"
      className="m-0 max-w-none rounded-lg bg-bg p-4 text-[16px] leading-[2.1] text-fg"
    >
      Buying a{' '}
      <Token
        field="homePrice"
        display={fmt('homePrice')}
        placeholder="add price"
        initial={s.homePrice}
        commit={(n) => editDeal('homePrice', n, 'sentence')}
      />{' '}
      home with{' '}
      <Token
        field="downPayment"
        display={fmt('downPayment')}
        placeholder="add down payment"
        initial={dp == null ? null : 'percent' in dp ? dp.percent : dp.amount}
        commit={(n) =>
          editDeal(
            'downPayment',
            dp != null && 'amount' in dp ? { amount: n } : { percent: n },
            'sentence',
          )
        }
      />{' '}
      down, so borrowing{' '}
      {derived ? (
        <b
          className="num font-semibold"
          aria-description="Calculated from home price and down payment"
        >
          {formatDealField('principal', s.principal)}
        </b>
      ) : (
        <Token
          field="principal"
          display={fmt('principal')}
          placeholder="add loan amount"
          initial={s.principal}
          commit={(n) => editDeal('principal', n, 'sentence')}
        />
      )}{' '}
      at{' '}
      <Token
        field="annualInterestRatePct"
        display={fmt('annualInterestRatePct')}
        placeholder="add rate"
        initial={s.annualInterestRatePct}
        commit={(n) => editDeal('annualInterestRatePct', n, 'sentence')}
      />{' '}
      for{' '}
      <Token
        field="termMonths"
        display={
          s.termMonths % 12 === 0
            ? `${s.termMonths / 12} years`
            : `${s.termMonths} months`
        }
        placeholder="add term"
        initial={s.termMonths % 12 === 0 ? s.termMonths / 12 : s.termMonths}
        commit={(n) =>
          editDeal(
            'termMonths',
            s.termMonths % 12 === 0 ? Math.round(n * 12) : Math.round(n),
            'sentence',
          )
        }
      />
      , renting it for{' '}
      <Token
        field="rental.grossMonthlyRent"
        display={
          rent == null ? null : formatDealField('rental.grossMonthlyRent', rent)
        }
        placeholder="add rent"
        initial={rent}
        commit={(n) => editDeal('rental.grossMonthlyRent', n, 'sentence')}
      />
      {rent == null ? '.' : '/mo.'}
    </p>
  );
}
