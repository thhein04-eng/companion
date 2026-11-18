import { FinancingView } from 'deal-analyzer-ui';

export const metadata = {
  title: 'DSCR & Financing',
  description:
    "Check a rental's debt service coverage ratio against a lender minimum and compare conventional, ARM and DSCR loans side by side.",
};

export default function FinancingPage() {
  return <FinancingView />;
}
