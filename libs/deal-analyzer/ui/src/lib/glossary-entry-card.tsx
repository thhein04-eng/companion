import Link from 'next/link';
import { GLOSSARY_ENTRIES } from './glossary-entries';
import { GLOSSARY_ROUTES, type GlossaryEntry } from './glossary-types';

const BY_ID = new Map(GLOSSARY_ENTRIES.map((e) => [e.id, e]));

const LABEL =
  'm-0 text-[12px] font-semibold uppercase tracking-wide text-muted';

/** One glossary term (spec 015 contracts/glossary-ui.md). `id` is the URL hash target. */
export function GlossaryEntryCard({
  entry,
  highlighted,
}: {
  entry: GlossaryEntry;
  highlighted: boolean;
}) {
  return (
    <article
      id={entry.id}
      data-testid={`glossary-entry-${entry.id}`}
      data-highlighted={highlighted ? 'true' : undefined}
      aria-current={highlighted ? 'true' : undefined}
      className={`flex scroll-mt-24 flex-col gap-3 rounded-xl border bg-surface p-[18px] ${
        highlighted ? 'border-accent ring-2 ring-accent' : 'border-line'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 font-display text-h3 font-semibold text-fg">
          {entry.name}
        </h3>
        {entry.abbreviation && entry.abbreviation !== entry.name ? (
          <span className="rounded-full border border-line bg-sunk px-2 py-0.5 text-[12px] font-medium text-muted">
            {entry.abbreviation}
          </span>
        ) : null}
      </div>

      <p className="m-0 text-fg">{entry.definition}</p>

      <div className="flex flex-col gap-1">
        <h4 className={LABEL}>Why it matters</h4>
        <p className="m-0 text-small text-muted">{entry.purpose}</p>
      </div>

      {entry.formula ? (
        <div className="flex flex-col gap-1">
          <h4 className={LABEL}>Formula</h4>
          <pre className="m-0 whitespace-pre-wrap break-words rounded-lg bg-sunk p-3 font-mono text-[13px] text-fg">
            {entry.formula.join('\n')}
          </pre>
        </div>
      ) : null}

      {entry.example ? (
        <div className="flex flex-col gap-1">
          <h4 className={LABEL}>Example</h4>
          <p className="m-0 text-small text-fg">
            {entry.example.inputs}: <strong>{entry.example.result}</strong>
          </p>
        </div>
      ) : null}

      {entry.notes?.length ? (
        <div className="flex flex-col gap-1">
          <h4 className={LABEL}>Notes</h4>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-small text-muted">
            {entry.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-1 text-small">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted">Used on:</span>
          {entry.usedOn.map((r) => (
            <Link
              key={r}
              href={GLOSSARY_ROUTES[r].href}
              className="text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {GLOSSARY_ROUTES[r].label}
            </Link>
          ))}
        </div>
        {entry.related?.length ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted">Related:</span>
            {entry.related.map((id) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {BY_ID.get(id)?.name ?? id}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
