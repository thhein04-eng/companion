import type { FieldError, LoanScenario } from './types';

export type ValidateScenarioResult =
  | { valid: true; scenario: LoanScenario }
  | { valid: false; errors: FieldError[] };

/**
 * Input-boundary validation per FR-009. Returns every offending field (not
 * just the first) so the UI can surface all errors at once.
 */
export function validateScenario(input: unknown): ValidateScenarioResult {
  const errors: FieldError[] = [];
  const scenario = input as LoanScenario;

  if (!(scenario.principal > 0)) {
    errors.push({
      field: 'principal',
      message: 'Loan amount must be greater than 0.',
    });
  }
  if (!(scenario.termMonths > 0)) {
    errors.push({
      field: 'termMonths',
      message: 'Loan term must be greater than 0.',
    });
  }
  if (!(scenario.annualInterestRatePct >= 0)) {
    errors.push({
      field: 'annualInterestRatePct',
      message: 'Interest rate cannot be negative.',
    });
  }

  if (scenario.downPayment && scenario.homePrice != null) {
    if ('amount' in scenario.downPayment) {
      if (!(
        scenario.downPayment.amount >= 0 &&
        scenario.downPayment.amount < scenario.homePrice
      )) {
        errors.push({
          field: 'downPayment',
          message: 'Down payment must be less than the home price.',
        });
      }
    } else if ('percent' in scenario.downPayment) {
      if (!(
        scenario.downPayment.percent >= 0 && scenario.downPayment.percent < 100
      )) {
        errors.push({
          field: 'downPayment',
          message: 'Down payment percentage must be between 0 and 100.',
        });
      }
    }
  }

  const nonNegativeFields: (keyof LoanScenario)[] = [
    'annualPropertyTax',
    'annualInsurance',
    'pmiAnnualRatePct',
    'monthlyHoa',
  ];
  for (const field of nonNegativeFields) {
    const value = scenario[field] as number | null | undefined;
    if (value != null && value < 0) {
      errors.push({ field, message: `${field} cannot be negative.` });
    }
  }

  (scenario.extraPayments ?? []).forEach((rule, index) => {
    if (!(rule.amount > 0)) {
      errors.push({
        field: `extraPayments.${index}.amount`,
        message: 'Extra payment amount must be greater than 0.',
      });
    }
  });

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true, scenario };
}
