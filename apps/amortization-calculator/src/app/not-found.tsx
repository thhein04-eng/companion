import Link from 'next/link';

export const metadata = {
  title: 'Not found',
};

export default function NotFound() {
  return (
    <>
      <h1
        tabIndex={-1}
        className="text-2xl font-semibold text-neutral-900 focus:outline-none"
      >
        Page not found
      </h1>
      <p className="text-sm text-neutral-600">
        That page doesn&apos;t exist.{' '}
        <Link
          href="/amortization"
          className="font-medium text-neutral-900 underline underline-offset-2"
        >
          Go to the Amortization Calculator
        </Link>
        .
      </p>
    </>
  );
}
