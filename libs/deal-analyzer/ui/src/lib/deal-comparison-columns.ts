import type { DealComparisonRow } from 'deal-analyzer-calculations';
import {
  currency,
  LOAN_COMPARISON_COLUMNS,
  orDash,
  percent1,
  percent2,
  type ComparisonColumn,
} from 'shared-ui';
import { formatDscr } from './format-dscr';

/**
 * The shared loan columns plus the Deal Analyzer's own (spec 002 FR-014).
 * Always shown on `/deal-analyzer`, with "—" for scenarios without rent
 * (spec 003 FR-005).
 */
export const DEAL_COMPARISON_COLUMNS: ComparisonColumn<DealComparisonRow>[] = [
  ...LOAN_COMPARISON_COLUMNS,
  {
    id: 'monthlyCashFlow',
    header: 'Cash Flow /mo',
    render: (row) => orDash(row.monthlyCashFlow, (v) => currency.format(v)),
  },
  {
    id: 'annualNoi',
    header: 'NOI /yr',
    render: (row) => orDash(row.annualNoi, (v) => currency.format(v)),
  },
  {
    id: 'capRate',
    header: 'Cap Rate',
    render: (row) => orDash(row.capRate, (v) => percent2.format(v)),
  },
  {
    id: 'dscr',
    header: 'DSCR',
    render: (row) => orDash(row.dscr, formatDscr),
  },
  {
    id: 'cashOnCashReturn',
    header: 'CoC',
    render: (row) => orDash(row.cashOnCashReturn, (v) => percent1.format(v)),
  },
];
