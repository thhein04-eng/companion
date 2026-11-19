import type { SaleResult } from 'deal-analyzer-calculations';
import { currency, Kpi, percent1 } from 'shared-ui';

/**
 * The minimum sale price for $0 profit and the cushion against it (spec 013 US2,
 * contracts § BreakEvenCard). Wording avoids "above"/"below" (spec 010 setup-mode copy rule).
 */
export function BreakEvenCard({ result }: { result: SaleResult }) {
  const be = result.breakEven;
  const cushion = be.cushion;
  return (
    <div
      data-testid="sale-break-even"
      className="grid grid-cols-1 gap-3.5 sm:grid-cols-3"
    >
      <Kpi
        data-testid="sale-break-even-price"
        label="Break-even sale price"
        value={be.anyPrice ? '$0' : currency.format(be.salePrice)}
        hint={
          be.anyPrice
            ? 'Profitable at any sale price'
            : 'Lowest price for $0 net profit'
        }
      />
      <Kpi
        data-testid="sale-cushion"
        label="Price cushion"
        value={
          cushion < 0
            ? `−${currency.format(-cushion)}`
            : currency.format(cushion)
        }
        hint={
          cushion < 0
            ? `${currency.format(-cushion)} short of break-even`
            : `${currency.format(cushion)} over break-even`
        }
        tone={cushion < 0 ? 'bad' : 'good'}
      />
      <Kpi
        data-testid="sale-break-even-pct"
        label="Break-even vs. purchase"
        value={`${percent1.format(be.pctOfPurchase)}`}
        hint="of purchase price"
      />
    </div>
  );
}
