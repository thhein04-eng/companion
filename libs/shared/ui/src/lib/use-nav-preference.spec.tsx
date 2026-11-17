import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NAV_PREFERENCE_KEY, useNavPreference } from './use-nav-preference';

describe('useNavPreference', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('defaults to expanded with empty storage', () => {
    const { result } = renderHook(() => useNavPreference());
    expect(result.current.collapsed).toBe(false);
  });

  it('reads a stored collapsed preference after mount', () => {
    window.localStorage.setItem(NAV_PREFERENCE_KEY, '{"collapsed":true}');
    const { result } = renderHook(() => useNavPreference());
    expect(result.current.collapsed).toBe(true);
  });

  it('writes the preference when it changes', () => {
    const { result } = renderHook(() => useNavPreference());
    act(() => result.current.setCollapsed(true));
    expect(result.current.collapsed).toBe(true);
    expect(window.localStorage.getItem(NAV_PREFERENCE_KEY)).toBe('{"collapsed":true}');

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(false);
    expect(window.localStorage.getItem(NAV_PREFERENCE_KEY)).toBe('{"collapsed":false}');
  });

  it('falls back to the default on invalid JSON', () => {
    window.localStorage.setItem(NAV_PREFERENCE_KEY, '{not json');
    const { result } = renderHook(() => useNavPreference());
    expect(result.current.collapsed).toBe(false);
  });

  it('never throws when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useNavPreference());
    expect(result.current.collapsed).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(true);
  });
});
