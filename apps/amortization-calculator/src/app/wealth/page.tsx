import { WealthView } from 'deal-analyzer-ui';

export const metadata = {
  title: 'Wealth Projection',
  description:
    'Project a rental’s equity, cash flow, tax effect and net worth over 1–30 years.',
};

export default function WealthPage() {
  return <WealthView />;
}
