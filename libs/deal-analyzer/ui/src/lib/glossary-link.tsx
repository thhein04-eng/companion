import Link from 'next/link';

/**
 * "Full definition" link shown inside a metric info popover (spec 015 US3). A normal link, so it
 * is reachable with Tab once the popover is open.
 */
export function GlossaryLink({ id }: { id: string }) {
  return (
    <Link
      href={`/glossary#${id}`}
      data-testid={`glossary-link-${id}`}
      className="mt-1.5 block text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Full definition
    </Link>
  );
}
