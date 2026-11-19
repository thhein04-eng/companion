import { SaleView } from 'deal-analyzer-ui';

export const metadata = {
  title: 'Sale Profit & Exit Analyzer',
  description:
    'Sell at a chosen month: net sale proceeds, total net profit, break-even sale price and an optional tax estimate.',
};

export default function SalePage() {
  return <SaleView />;
}
