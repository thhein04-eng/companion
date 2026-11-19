'use client';

import { usePreference } from '@ui-sdk/react/preferences';
import { MonitorIcon, MoonIcon, SunIcon } from '../icons';
import { Button } from './button';
import { colorScheme } from './color-scheme';

type Choice = 'system' | 'light' | 'dark';
const NEXT: Record<Choice, Choice> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};
const NAME: Record<Choice, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

/**
 * The System → Light → Dark theme button (spec 010 FR-012). The choice is kept by ui-sdk's
 * color-scheme preference, which `ThemePreferences` applies to `<html>` before first paint.
 */
export function ThemeSwitcher({ showLabel = false }: { showLabel?: boolean }) {
  const { value } = usePreference(colorScheme);
  const current = (value ?? 'system') as Choice;
  const label = `Theme: ${NAME[current]}`;
  const Icon =
    current === 'light' ? SunIcon : current === 'dark' ? MoonIcon : MonitorIcon;
  return (
    <Button
      variant={showLabel ? 'ghost' : 'icon'}
      size="sm"
      aria-label={label}
      title={`${label} (click for ${NAME[NEXT[current]]})`}
      data-testid="theme-switcher"
      data-theme-value={current}
      onClick={() => colorScheme.set(NEXT[current])}
      className={
        showLabel ? 'w-full justify-start gap-3 px-3 py-2 text-[14px]' : ''
      }
    >
      <Icon className="size-5 shrink-0" />
      {showLabel ? <span>{label}</span> : null}
    </Button>
  );
}
