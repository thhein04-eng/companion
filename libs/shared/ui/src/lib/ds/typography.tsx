import type { ElementType, ReactNode } from 'react';

/** The reference `.eyebrow`: 12px, 600, uppercase, 0.08em, muted. */
export function Eyebrow({
  children,
  as: As = 'span',
  className,
  id,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  id?: string;
}) {
  return (
    <As id={id} className={`eyebrow ${className ?? ''}`}>
      {children}
    </As>
  );
}

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  note?: ReactNode;
}

/** The page's h1 block: eyebrow, `text-title` heading, lede (reference header). */
export function PageHeader({ eyebrow, title, lede, note }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h1
        tabIndex={-1}
        className="m-0 font-display text-title font-semibold text-fg focus:outline-none"
      >
        {title}
      </h1>
      {lede ? <p className="m-0 text-lede text-muted">{lede}</p> : null}
      {note ? <p className="m-0 text-small text-muted">{note}</p> : null}
    </header>
  );
}

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  actions?: ReactNode;
  /** h2 by default; h3 for a nested block. */
  level?: 2 | 3;
  id?: string;
}

/** A section's eyebrow + heading (+ optional lede and actions), as in the reference sections. */
export function SectionHeader({
  eyebrow,
  title,
  lede,
  actions,
  level = 2,
  id,
}: SectionHeaderProps) {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <div className="flex flex-col gap-1.5">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <H
          id={id}
          className={`m-0 font-display font-semibold text-fg ${level === 2 ? 'text-h2' : 'text-h3'}`}
        >
          {title}
        </H>
        {actions}
      </div>
      {lede ? <p className="m-0 text-small text-muted">{lede}</p> : null}
    </div>
  );
}

/** A page section: heading → content at the reference's 18px rhythm (FR-033). */
export function Section({
  children,
  className,
  'aria-labelledby': labelledBy,
  'data-testid': testId,
}: {
  children: ReactNode;
  className?: string;
  'aria-labelledby'?: string;
  'data-testid'?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      data-testid={testId}
      className={`flex flex-col gap-[var(--space-section)] ${className ?? ''}`}
    >
      {children}
    </section>
  );
}
