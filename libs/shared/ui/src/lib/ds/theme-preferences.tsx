'use client';

import type { ReactNode } from 'react';
import { Preferences } from '@ui-sdk/react/preferences';
import { colorScheme } from './color-scheme';

/**
 * Writes `data-color-scheme` on `<html>` from the saved choice before hydration, so the first
 * paint already has the right theme (FR-012). Rendered once, first thing in `<body>`.
 */
export function ThemePreferences({ children }: { children: ReactNode }) {
  return <Preferences preferences={[colorScheme]}>{children}</Preferences>;
}
