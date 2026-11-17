import { DealAnalyzerView } from 'deal-analyzer-ui';

export const metadata = {
  title: 'Rental Deal Analyzer',
  description:
    "Analyze a rental property's cash flow, NOI, cap rate, cash-on-cash return, and rules of thumb, and compare deals side by side.",
};

export default function DealAnalyzerPage() {
  return <DealAnalyzerView />;
}
