'use client';

import type { LoanScenario } from 'shared-calculations';
import { Tabs, TabsList, TabsTab } from '@ui-sdk/react/tabs';
import { Button } from '@ui-sdk/react/button';

export interface ScenarioTabsProps {
  scenarios: LoanScenario[];
  activeScenarioId: string;
  onActiveScenarioIdChange: (id: string) => void;
  onAddScenario: () => void;
  onRemoveScenario: (id: string) => void;
}

/**
 * Switches between loan scenarios and lets the user duplicate or remove
 * one (FR-010), built on `@ui-sdk/react`'s Tabs behavior.
 */
export function ScenarioTabs({
  scenarios,
  activeScenarioId,
  onActiveScenarioIdChange,
  onAddScenario,
  onRemoveScenario,
}: ScenarioTabsProps) {
  return (
    <Tabs
      value={activeScenarioId}
      onValueChange={(id) => id && onActiveScenarioIdChange(id)}
      className="flex items-center gap-2"
    >
      <TabsList
        aria-label="Loan scenarios"
        className="flex items-center gap-1 overflow-x-auto"
      >
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="group flex items-center">
            <TabsTab
              value={scenario.id}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-600 data-selected:bg-neutral-900 data-selected:text-white hover:bg-neutral-100 data-selected:hover:bg-neutral-900"
            >
              {scenario.name}
            </TabsTab>
            {scenarios.length > 1 ? (
              <button
                type="button"
                aria-label={`Remove ${scenario.name}`}
                onClick={() => onRemoveScenario(scenario.id)}
                className="ml-0.5 rounded px-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
      </TabsList>
      <Button
        onClick={onAddScenario}
        className="rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-50"
      >
        + Add scenario
      </Button>
    </Tabs>
  );
}
