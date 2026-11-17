import { BuildingIcon, CalculatorIcon, type NavItem } from 'shared-ui';

/**
 * The app's feature pages, in menu order. Adding a feature means adding its
 * route and one entry here; the menu itself needs no changes (spec 003 FR-013).
 */
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'amortization',
    label: 'Amortization Calculator',
    href: '/amortization',
    icon: <CalculatorIcon />,
  },
  {
    id: 'deal-analyzer',
    label: 'Rental Deal Analyzer',
    href: '/deal-analyzer',
    icon: <BuildingIcon />,
  },
];
