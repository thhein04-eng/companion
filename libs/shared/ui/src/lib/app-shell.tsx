'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@ui-sdk/react/button';
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '@ui-sdk/react/drawer';
import { CloseIcon, MenuIcon, PanelToggleIcon } from './icons';
import { SideNav, type NavItem } from './side-nav';
import { useNavPreference } from './use-nav-preference';

/** Tailwind's `lg` breakpoint: docked menu at and above, drawer below (spec 003 FR-008/009). */
const DESKTOP_QUERY = '(min-width: 1024px)';

export interface AppShellProps {
  navItems: NavItem[];
  appName?: string;
  children: ReactNode;
}

function focusMainHeading() {
  document.querySelector<HTMLElement>('#main-content h1')?.focus();
}

/**
 * The app frame with the responsive left-side menu
 * (contracts/routes-and-navigation.md "Shell DOM / ARIA contract").
 */
export function AppShell({
  navItems,
  appName = 'Companion',
  children,
}: AppShellProps) {
  const { collapsed, toggle } = useNavPreference();
  const pathname = usePathname();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSettledClosed, setDrawerSettledClosed] = useState(true);
  /** Where a link inside the drawer is taking us, so focus can land on that page's h1. */
  const pendingFocusHref = useRef<string | null>(null);

  const handleOpenChange = useCallback((open: boolean) => {
    setDrawerOpen(open);
    if (open) setDrawerSettledClosed(false);
  }, []);

  const handleOpenChangeComplete = useCallback((open: boolean) => {
    if (!open) setDrawerSettledClosed(true);
  }, []);

  // Let the route change close the drawer (effect below) rather than closing
  // it in the same click, which can race the link's client-side navigation.
  // A link to the page already shown changes no route, so close it here.
  const handleDrawerNavigate = useCallback(
    (href: string) => {
      pendingFocusHref.current = href;
      if (href === pathname) setDrawerOpen(false);
    },
    [pathname],
  );

  // Any route change (link, back/forward) closes the drawer.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // After a drawer link: once the drawer has finished closing (and its own
  // focus restore ran) and the new page is shown, focus the page heading.
  useEffect(() => {
    if (
      pendingFocusHref.current !== null &&
      drawerSettledClosed &&
      pathname === pendingFocusHref.current
    ) {
      pendingFocusHref.current = null;
      focusMainHeading();
    }
  }, [pathname, drawerSettledClosed]);

  // Crossing into the desktop layout closes the drawer.
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawerOpen(false);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return (
    <div
      data-testid="app-shell"
      data-nav-collapsed={String(collapsed)}
      className="min-h-screen lg:grid lg:grid-cols-[auto_minmax(0,1fr)]"
    >
      <aside
        id="primary-nav"
        data-collapsed={String(collapsed)}
        className="sticky top-0 hidden h-screen w-64 flex-col gap-2 overflow-y-auto border-r border-neutral-200 bg-white p-3 transition-[width] duration-200 motion-reduce:transition-none data-[collapsed=true]:w-16 lg:flex"
      >
        <div
          className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between pl-3'}`}
        >
          {collapsed ? null : (
            <span className="text-sm font-semibold text-neutral-900">
              {appName}
            </span>
          )}
          <Button
            onClick={toggle}
            aria-controls="primary-nav"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-900"
          >
            <PanelToggleIcon collapsed={collapsed} className="size-5" />
          </Button>
        </div>
        <nav aria-label="Primary">
          <SideNav items={navItems} collapsed={collapsed} />
        </nav>
      </aside>

      <div className="min-w-0">
        <Drawer
          side="left"
          preventEdgeSwipe
          open={drawerOpen}
          onOpenChange={handleOpenChange}
          onOpenChangeComplete={handleOpenChangeComplete}
        >
          <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2 lg:hidden">
            <DrawerTrigger
              aria-label="Open navigation"
              className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-900"
            >
              <MenuIcon className="size-5" />
            </DrawerTrigger>
            <span className="text-sm font-semibold text-neutral-900">
              {appName}
            </span>
          </header>
          <DrawerBackdrop className="bg-black/30" />
          <DrawerContent className="flex h-full w-72 max-w-[85vw] flex-col gap-4 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between pl-3">
              <DrawerTitle className="text-sm font-semibold text-neutral-900">
                Navigation
              </DrawerTitle>
              <DrawerClose
                aria-label="Close navigation"
                className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-900"
              >
                <CloseIcon className="size-5" />
              </DrawerClose>
            </div>
            <nav aria-label="Primary">
              <SideNav
                items={navItems}
                collapsed={false}
                onNavigate={handleDrawerNavigate}
              />
            </nav>
          </DrawerContent>
        </Drawer>

        {children}
      </div>
    </div>
  );
}
