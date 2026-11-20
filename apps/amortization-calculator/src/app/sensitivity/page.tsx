import { SensitivityView } from 'deal-analyzer-ui';

export const metadata = {
  title: 'Sensitivity & Max Offer',
  description:
    'Stress-test a rental deal on a rate by price-or-rent grid and find the highest offer that still meets your target.',
};

export default function SensitivityPage() {
  return <SensitivityView />;
}
