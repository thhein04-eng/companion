'use client';

import {
  currentView,
  hasOwnerUnit,
  type OccupancyView,
} from 'shared-calculations';
import { useRentRoll, useScenarios } from 'shared-data-access';
import { SegmentedControl } from './ds/segmented-control';

const VIEWS = [
  { value: 'living', label: 'Living there' },
  { value: 'afterMoveOut', label: 'After move-out' },
] as const satisfies readonly { value: OccupancyView; label: string }[];

/**
 * "Living there / After move-out" for a house-hacked deal (spec 012 FR-013, contracts/ui.md).
 * Renders nothing without an owner-occupied unit. The choice is stored on the scenario, so the
 * deal card, Deal Analyzer and DSCR & Financing all show the same view; it makes no undo entry.
 */
export function OccupancyViewSwitch({
  showLabel = false,
}: {
  showLabel?: boolean;
}) {
  const { activeScenario } = useScenarios();
  const { setOccupancyView } = useRentRoll();
  const rental = activeScenario.rental;
  if (rental == null || !hasOwnerUnit(rental)) return null;
  return (
    <SegmentedControl
      label="Income view"
      showLabel={showLabel}
      value={currentView(rental)}
      options={VIEWS}
      onValueChange={setOccupancyView}
      data-testid="occupancy-view"
    />
  );
}
