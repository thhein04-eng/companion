'use client';

import { useCallback, useEffect, useState } from 'react';
import { validateScenario } from 'shared-calculations';
import { useScenarios } from './scenarios-provider';

/** Session-only list of scenario ids whose first-run setup is done or skipped (data-model §E). */
export const SETUP_DONE_KEY = 'companion.setupDone';

function readDone(): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(SETUP_DONE_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(
      Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

// One in-memory copy shared by every hook instance, so a skip on one page holds on the next,
// even when storage is blocked.
let memory: Set<string> | null = null;
const listeners = new Set<() => void>();

/**
 * First-run setup (spec 010 US3, FR-020/021): a scenario with no home price opens the Edit deal
 * sheet in setup mode until setup is finished or skipped, once per scenario per session.
 */
export function useSetupMode() {
  const { activeScenario, ready } = useScenarios();
  const [done, setDone] = useState<Set<string>>(() => memory ?? new Set());

  useEffect(() => {
    memory ??= readDone();
    setDone(new Set(memory));
    const onChange = () => setDone(new Set(memory ?? []));
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  const markDone = useCallback((id: string) => {
    memory = new Set(memory ?? readDone());
    memory.add(id);
    try {
      window.sessionStorage.setItem(
        SETUP_DONE_KEY,
        JSON.stringify([...memory]),
      );
    } catch {
      /* storage unavailable: keep it in memory for this visit */
    }
    for (const l of listeners) l();
  }, []);

  // `*` marks setup done for every scenario this session (used by tests of other stories).
  const needsSetup =
    activeScenario.homePrice == null &&
    !done.has(activeScenario.id) &&
    !done.has('*');
  const canFinish =
    validateScenario(activeScenario).valid &&
    activeScenario.homePrice != null &&
    activeScenario.downPayment != null;

  const finish = useCallback(
    () => markDone(activeScenario.id),
    [markDone, activeScenario.id],
  );
  const skip = useCallback(
    () => markDone(activeScenario.id),
    [markDone, activeScenario.id],
  );

  return { needsSetup, canFinish, finish, skip, ready };
}

/** Test-only: forget the shared in-memory copy between tests. */
export function resetSetupModeForTests() {
  memory = null;
}
