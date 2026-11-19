import type { OnePercentRuleResult } from './types';

/**
 * Monthly rent as a fraction of the purchase price, for the 1% Rule card's headline (spec 011
 * FR-011). The rule's target rent is 1% of the price, so price = targetRent × 100.
 */
export function onePercentRatio(rule: OnePercentRuleResult): number | null {
  return rule.targetRent > 0 ? rule.actualRent / (rule.targetRent * 100) : null;
}
