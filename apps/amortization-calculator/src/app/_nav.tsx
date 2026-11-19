import {
  BankIcon,
  BookIcon,
  BuildingIcon,
  CalculatorIcon,
  KeyIcon,
  TagIcon,
  TrendingUpIcon,
  type NavItem,
} from 'shared-ui';

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
  {
    id: 'financing',
    label: 'DSCR & Financing',
    href: '/financing',
    icon: <BankIcon />,
  },
  {
    id: 'wealth',
    label: 'Wealth Projection',
    href: '/wealth',
    icon: <TrendingUpIcon />,
  },
  {
    id: 'pro-forma',
    label: 'Hold & Exit',
    href: '/pro-forma',
    icon: <KeyIcon />,
  },
  {
    id: 'sale',
    label: 'Sale Profit',
    href: '/sale',
    icon: <TagIcon />,
  },
  {
    id: 'glossary',
    label: 'Glossary',
    href: '/glossary',
    icon: <BookIcon />,
  },
];
