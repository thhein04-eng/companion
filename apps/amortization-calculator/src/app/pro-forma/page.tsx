import { ProFormaView } from 'deal-analyzer-ui';

export const metadata = {
  title: 'Hold & Exit Pro Forma',
  description:
    'Model a sale after a 1–30 year hold: net sale proceeds, IRR, total net profit and equity multiple, before and after tax.',
};

export default function ProFormaPage() {
  return <ProFormaView />;
}
