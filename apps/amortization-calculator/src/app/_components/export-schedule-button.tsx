'use client';

import type { AmortizationSchedule } from 'amortization-calculations';
import { scheduleToCsv } from 'amortization-calculations';
import { Button } from '@ui-sdk/react/button';

export interface ExportScheduleButtonProps {
  schedule: AmortizationSchedule;
}

/** Exports or prints the full amortization schedule (FR-011). */
export function ExportScheduleButton({ schedule }: ExportScheduleButtonProps) {
  const downloadCsv = () => {
    const csv = scheduleToCsv(schedule);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `amortization-schedule-${schedule.scenarioId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={downloadCsv}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
      >
        Download CSV
      </Button>
      <Button
        onClick={() => window.print()}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
      >
        Print
      </Button>
    </div>
  );
}
