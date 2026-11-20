import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GlossaryLink } from './glossary-link';
import { MetricCard } from './metric-card';

afterEach(cleanup);

describe('MetricCard (spec 011 US3)', () => {
  it('renders label, info, value, status and explanation in that order', () => {
    render(
      <MetricCard
        data-testid="rule-1-rule"
        label="1% Rule"
        info="Monthly rent should be at least 1% of the price."
        value="0.71%"
        status="fail"
        explanation="Rent $3,200.00 vs. target $4,500.00"
      />,
    );
    const card = screen.getByTestId('rule-1-rule');
    const text = card.textContent ?? '';
    const order = ['1% Rule', '0.71%', 'Fail', 'Rent $3,200.00'].map((t) =>
      text.indexOf(t),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(
      screen.getByRole('button', { name: 'About the 1% Rule' }),
    ).toBeTruthy();
  });

  it('shows status by icon and text, not color alone', () => {
    render(
      <MetricCard
        data-testid="x"
        label="50% Rule"
        info="i"
        value="45.5%"
        status="pass"
        explanation="e"
      />,
    );
    const pill = screen.getByTestId('x').querySelector('[data-status="pass"]');
    expect(pill?.textContent).toContain('✓');
    expect(pill?.textContent).toContain('Pass');
  });

  it('keeps the layout for N/A', () => {
    render(
      <MetricCard
        data-testid="na"
        label="Cap rate"
        info="i"
        value="N/A"
        status="na"
        explanation="Enter rent to see the cap rate."
      />,
    );
    const card = screen.getByTestId('na');
    expect(card.textContent).toContain('N/A');
    expect(card.textContent).toContain('Enter rent to see the cap rate.');
  });
});

describe('MetricCard glossary link (spec 015 US3)', () => {
  const base = {
    'data-testid': 'cap-rate',
    label: 'Cap rate',
    info: 'NOI ÷ price.',
    value: '7.19%',
    status: 'info' as const,
    explanation: 'Independent of financing',
  };

  it('GlossaryLink points at /glossary#id', () => {
    render(<GlossaryLink id="cap-rate" />);
    expect(
      screen.getByRole('link', { name: 'Full definition' }).getAttribute('href'),
    ).toBe('/glossary#cap-rate');
  });

  it('still renders with and without glossaryId (the popover itself opens in a browser; see glossary.spec.ts e2e)', () => {
    const { rerender } = render(<MetricCard {...base} />);
    expect(screen.getByRole('button', { name: 'About the Cap rate' })).toBeTruthy();
    rerender(<MetricCard {...base} glossaryId="cap-rate" />);
    expect(screen.getByRole('button', { name: 'About the Cap rate' })).toBeTruthy();
  });
});
