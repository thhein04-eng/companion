'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ui-sdk/react/tooltip';

/** One feature entry in the menu (spec 003 data-model "NavItem"). */
export interface NavItem {
  /** Unique; used as the React key and `data-testid="nav-<id>"`. */
  id: string;
  /** The link's accessible name in every state. */
  label: string;
  /** An app route, also used to decide which link is current. */
  href: `/${string}`;
  /**
   * Decorative only, as a rendered element (e.g. `<CalculatorIcon />`) so the
   * item list can be passed from a server component to this client menu.
   */
  icon: ReactNode;
}

export interface SideNavProps {
  items: NavItem[];
  /** Icon-only rail: labels stay available to screen readers and as a tooltip. */
  collapsed: boolean;
  /** Called when a link is activated, e.g. so a drawer can close. */
  onNavigate?: (href: NavItem['href']) => void;
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkClass =
  'flex items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-sm text-neutral-700 ' +
  'hover:bg-neutral-100 hover:text-neutral-900 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ' +
  'aria-[current=page]:border-neutral-900 aria-[current=page]:bg-neutral-100 ' +
  'aria-[current=page]:font-medium aria-[current=page]:text-neutral-900';

/** The list of feature links, shared by the docked menu and the mobile drawer. */
export function SideNav({ items, collapsed, onNavigate }: SideNavProps) {
  const pathname = usePathname() ?? '';

  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ id, label, href, icon }) => {
        const linkProps = {
          href,
          'data-testid': `nav-${id}`,
          'aria-current': isActive(pathname, href)
            ? ('page' as const)
            : undefined,
          onClick: () => onNavigate?.(href),
          className: collapsed ? `${linkClass} justify-center px-0` : linkClass,
        };
        const content = (
          <>
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center [&>svg]:size-5"
            >
              {icon}
            </span>
            <span className={collapsed ? 'sr-only' : 'truncate'}>{label}</span>
          </>
        );

        return (
          <li key={id}>
            {collapsed ? (
              <Tooltip type="label">
                <TooltipTrigger render={<Link {...linkProps} />}>
                  {content}
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded bg-neutral-900 px-2 py-1 text-xs text-white shadow"
                >
                  {label}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link {...linkProps}>{content}</Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
