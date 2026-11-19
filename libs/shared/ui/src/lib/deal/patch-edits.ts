import type { DealFieldKey, LoanScenario } from 'shared-calculations';
import type { DealEditSource } from 'shared-data-access';

/** Sends each key of a form patch through `editDeal`, so every edit is recorded (R7). */
export function patchEdits(
  editDeal: (
    field: DealFieldKey,
    value: unknown,
    source: DealEditSource,
  ) => void,
  source: DealEditSource,
) {
  return (patch: Partial<LoanScenario>) => {
    for (const [key, value] of Object.entries(patch)) {
      editDeal(key as DealFieldKey, value, source);
    }
  };
}
