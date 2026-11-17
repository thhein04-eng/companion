import './global.css';
import type { ReactNode } from 'react';
import { ScenariosProvider } from 'shared-data-access';

export const metadata = {
  title: 'Real Estate Amortization Calculator',
  description:
    'Calculate mortgage payments, full amortization schedules, real-estate costs, extra-payment savings, and compare loan scenarios side by side.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <ScenariosProvider>{children}</ScenariosProvider>
      </body>
    </html>
  );
}
