import Link from 'next/link';
import { PageHeader } from 'shared-ui';

export const metadata = {
  title: 'Not found',
};

export default function NotFound() {
  return (
    <PageHeader
      eyebrow="404"
      title="Page not found"
      lede={
        <>
          That page doesn&apos;t exist.{' '}
          <Link
            href="/amortization"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Go to the Amortization Calculator
          </Link>
          .
        </>
      }
    />
  );
}
