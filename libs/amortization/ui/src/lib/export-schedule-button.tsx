'use client';

import type { AmortizationSchedule } from 'shared-calculations';
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
        className="cursor-pointer rounded-md border border-line bg-surface px-3 py-2 text-[14px] font-medium text-fg hover:border-faint hover:bg-sunk"
      >
        Download CSV
      </Button>
      <Button
        onClick={() => window.print()}
        className="cursor-pointer rounded-md border border-line bg-surface px-3 py-2 text-[14px] font-medium text-fg hover:border-faint hover:bg-sunk"
      >
        Print
      </Button>
    </div>
  );
}
