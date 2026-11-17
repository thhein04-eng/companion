import './global.css';
import type { ReactNode } from 'react';
import { ScenariosProvider } from 'shared-data-access';

export const metadata = {
  title: { default: 'Companion', template: '%s · Companion' },
  description:
    'Real-estate calculators: mortgage amortization and rental deal analysis.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <ScenariosProvider>
          <main
            id="main-content"
            className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10"
          >
            {children}
          </main>
        </ScenariosProvider>
      </body>
    </html>
  );
}
