'use client';

import { useEffect } from 'react';
import { useDealEditsOptional } from 'shared-data-access';
import { dismissToast, showToast } from '../ds/toast';

const TOAST_ID = 'deal-change';

/**
 * "Rent changed $3,200 → $3,500 · Undo" after every shared-input change (spec 010 FR-030/031).
 * One toast id, so a coalesced edit updates the toast in place; switching or removing the
 * scenario (record dropped) or undoing dismisses it. Rendered once in AppShell, so it survives
 * client-side navigation.
 */
export function DealChangeToast() {
  const edits = useDealEditsOptional();
  const change = edits?.lastChange ?? null;
  const undo = edits?.undo;
  const dismiss = edits?.dismiss;

  useEffect(() => {
    if (!change) {
      dismissToast(TOAST_ID);
      return;
    }
    const title =
      change.field === 'rental'
        ? 'Rental inputs changed'
        : `${change.label} changed ${change.oldDisplay} → ${change.newDisplay}`;
    showToast({
      id: TOAST_ID,
      title,
      actionLabel: 'Undo',
      onAction: () => undo?.(),
      duration: 6000,
      onDismiss: () => dismiss?.(),
    });
  }, [change, undo, dismiss]);

  return null;
}
