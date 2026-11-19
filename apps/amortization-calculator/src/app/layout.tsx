import './global.css';
import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { DealEditsProvider, ScenariosProvider } from 'shared-data-access';
import { AppShell, DealSheetProvider, ThemePreferences } from 'shared-ui';
import { NAV_ITEMS } from './_nav';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-space-grotesk',
  display: 'swap',
});
const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: { default: 'Companion', template: '%s · Companion' },
  description:
    'Real-estate calculators: mortgage amortization and rental deal analysis.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-bg font-body text-fg antialiased"
        suppressHydrationWarning
      >
        <ThemePreferences>
          <ScenariosProvider>
            <DealEditsProvider>
              <DealSheetProvider>
                <AppShell navItems={NAV_ITEMS}>
                  <main id="main-content" className="page-grid w-full pt-10 pb-10">
                    {children}
                  </main>
                </AppShell>
              </DealSheetProvider>
            </DealEditsProvider>
          </ScenariosProvider>
        </ThemePreferences>
      </body>
    </html>
  );
}
