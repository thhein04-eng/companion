import { AmortizationCalculatorView } from 'amortization-ui';

export const metadata = {
  title: 'Amortization Calculator',
  description:
    'Calculate a mortgage payment, its full amortization schedule, real-estate costs, and extra-payment savings, and compare loan scenarios side by side.',
};

export default function AmortizationPage() {
  return <AmortizationCalculatorView />;
}
