import {
  DEAL_FIELD_LABELS,
  type DealFieldKey,
  type FieldError,
} from 'shared-calculations';

/** Sheet group order (Property → Loan → Monthly costs → Rental), for "first invalid" (FR-023). */
const ORDER = Object.keys(DEAL_FIELD_LABELS) as DealFieldKey[];

/** The errors on shared inputs the sheet can fix, in sheet order. Page-only errors are left out. */
export function dealErrors(
  errors: FieldError[],
): (FieldError & { key: DealFieldKey })[] {
  // Only fields the sheet shows: the shared inputs plus the rental panel's custom expenses.
  // Growth, wealth, exit and DSCR inputs are page-only, so they are never routed to the sheet.
  const rank = (field: string) => {
    const i = ORDER.indexOf(field as DealFieldKey);
    if (i >= 0) return i;
    return field.startsWith('rental.customExpenses') ? ORDER.length : -1;
  };
  return errors
    .filter((e) => rank(e.field) >= 0)
    .sort((a, b) => rank(a.field) - rank(b.field))
    .map((e) => ({
      ...e,
      key: (ORDER.includes(e.field as DealFieldKey)
        ? e.field
        : 'rental.grossMonthlyRent') as DealFieldKey,
    }));
}

/** "Rate" for a shared field, or a readable fallback for nested rental fields. */
export function errorLabel(field: string): string {
  return DEAL_FIELD_LABELS[field as DealFieldKey] ?? 'Rental input';
}
