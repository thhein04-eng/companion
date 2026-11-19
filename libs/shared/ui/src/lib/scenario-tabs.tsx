'use client';

import type { LoanScenario } from 'shared-calculations';
import { Tabs, TabsList, TabsTab } from '@ui-sdk/react/tabs';
import { Button } from './ds/button';

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
      className="flex min-w-0 items-center gap-1.5"
    >
      <TabsList
        aria-label="Loan scenarios"
        className="flex min-w-0 items-center gap-1 overflow-x-auto"
      >
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="group flex items-center">
            <TabsTab
              value={scenario.id}
              className="cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] text-muted hover:bg-sunk hover:text-fg data-selected:bg-ink data-selected:text-ink-fg data-selected:hover:bg-ink"
            >
              {scenario.name}
            </TabsTab>
            {scenarios.length > 1 ? (
              <button
                type="button"
                aria-label={`Remove ${scenario.name}`}
                onClick={() => onRemoveScenario(scenario.id)}
                className="ml-0.5 cursor-pointer rounded-xs px-1 text-[13px] text-muted hover:bg-bad-soft hover:text-bad"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
      </TabsList>
      <Button
        variant="ghost"
        size="sm"
        onClick={onAddScenario}
        aria-label="Add scenario"
        title="Add scenario"
      >
        +
      </Button>
    </Tabs>
  );
}
