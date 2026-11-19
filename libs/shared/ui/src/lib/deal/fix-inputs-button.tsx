'use client';

import type { FieldError } from 'shared-calculations';
import { Button } from '../ds/button';
import { useDealSheet } from './deal-sheet-context';
import { dealErrors, errorLabel } from './deal-errors';

/**
 * Names what is wrong and opens the Edit deal sheet at it (spec 010 FR-024). Replaces every
 * "Fix the highlighted fields above" message: the fields are no longer on the page.
 */
export function FixInputsButton({
  errors,
  message,
  'data-testid': testId,
}: {
  errors: FieldError[];
  /** e.g. "Fix the loan inputs to see the amortization schedule." */
  message: string;
  'data-testid'?: string;
}) {
  const sheet = useDealSheet();
  const fixable = dealErrors(errors);
  const first = fixable[0];
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-transparent bg-bad-soft px-3.5 py-3"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          data-testid={testId}
          className="m-0 text-[14px] font-medium text-bad"
        >
          {message}
        </p>
        {first ? (
          <p className="m-0 text-small text-fg">
            {errorLabel(first.field)}: {first.message}
          </p>
        ) : null}
      </div>
      {first ? (
        <Button
          size="sm"
          onClick={(event) =>
            sheet.open({
              focusField: first.key,
              returnFocus: event.currentTarget as HTMLElement,
            })
          }
        >
          Fix inputs
        </Button>
      ) : null}
    </div>
  );
}

/**
 * A page's "can't show this yet" line: a `FixInputsButton` when a shared input the sheet can
 * fix is the cause, otherwise a plain muted note (e.g. "Add rent to …", or a page-only input).
 */
export function InputsMessage({
  errors,
  message,
  'data-testid': testId,
}: {
  errors: FieldError[];
  message: string | null;
  'data-testid'?: string;
}) {
  if (!message) return null;
  if (dealErrors(errors).length > 0 && message.startsWith('Fix')) {
    return (
      <FixInputsButton errors={errors} message={message} data-testid={testId} />
    );
  }
  return (
    <p data-testid={testId} className="m-0 text-[14px] text-muted">
      {message}
    </p>
  );
}
