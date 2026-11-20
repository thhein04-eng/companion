import { RefinanceView } from 'deal-analyzer-ui';

export const metadata = {
  title: 'Refinance & BRRRR Modeling',
  description:
    'Cash-out refinance proceeds, cash left in the deal, post-refinance cash-on-cash and the rate-drop breakeven month.',
};

export default function RefinancePage() {
  return <RefinanceView />;
}
