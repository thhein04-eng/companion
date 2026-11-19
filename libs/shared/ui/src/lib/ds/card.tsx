import type { ElementType, HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  padding?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const pad = { sm: 'p-3.5', md: 'p-[18px]', lg: 'p-[22px]' };

/**
 * The reference `.card` / `.box`: surface, 1px line, 10px radius, no shadow. Only standalone
 * objects get one (FR-017); plain sections are not cards.
 */
export function Card({
  as: As = 'div',
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <As
      className={`rounded-xl border border-line bg-surface ${pad[padding]} ${className ?? ''}`}
      {...props}
    >
      {children}
    </As>
  );
}
