# @companion/charts

Domain-free SVG chart components for this Nx workspace: line charts, stacked column charts and a
segmented bar, plus the frame, legend, tooltip, data-table and keyboard parts they share. The
library knows nothing about loans. Any app or library in the workspace can import it. It is not
published to npm.

It has no charting dependencies. The only runtime dependencies are React and `@ui-sdk/react`
(for the "Show data" toggle). Nx tags (`scope:shared`) enforce that it never imports an
`amortization-*` project.

## Using it from another project

1. Add the workspace dependency to the consumer's `package.json`, then run `npm install`:
   ```json
   "dependencies": { "@companion/charts": "*" }
   ```
2. Import the color tokens once, in the app's global CSS:
   ```css
   @import '@companion/charts/theme.css';
   ```
3. Let Tailwind see the library's class names (path relative to the CSS file):
   ```css
   @source '../../../../libs/shared/charts/src';
   ```

## Examples

```tsx
import { LineChart, StackedBarChart } from '@companion/charts';

// Two series with negative values; the y-axis includes 0 and a baseline.
<LineChart
  title="Average temperature"
  data={[
    { x: 0, oslo: -4, lisbon: 11 },
    { x: 1, oslo: -4, lisbon: 12 },
    { x: 2, oslo: 0, lisbon: 14 },
  ]}
  series={[
    { key: 'oslo', label: 'Oslo', color: 1 },
    { key: 'lisbon', label: 'Lisbon', color: 2 },
  ]}
  yDomain="auto"
  formatters={{ x: (i) => ['Jan', 'Feb', 'Mar'][i], y: (v) => `${v}°` }}
/>

// Signed stacked columns: positives stack up, negatives stack down from 0.
<StackedBarChart
  title="Profit by quarter"
  data={[
    { x: 'Q1', apples: 40, pears: 25 },
    { x: 'Q2', apples: 55, pears: -15 },
  ]}
  series={[
    { key: 'apples', label: 'Apples', color: 1 },
    { key: 'pears', label: 'Pears', color: 2 },
  ]}
/>
```

Every chart includes a title, a legend when there are 2 or more series, a hover and keyboard
tooltip (focus the plot, then use ←/→, Shift+←/→, Home/End and Esc) and a "Show data" table.

## Color rules

- Series take a **slot** (`1`–`8`) or `'muted'`, never a hex value. Slots map to the validated
  palette in `theme.css`, with selected dark-mode steps.
- Use slots in their fixed order and never cycle them. **Color follows the entity**: assign a
  slot by what the series *is* (for example, its position in a user's list), not by its rank
  after filtering. Otherwise the colors of the remaining series change when one is filtered out.
- More than 8 entities: fold the extras into "Other", or cap them with `capSeries` (or a
  position cap) and tell the reader how many were not drawn.
- Use `'muted'` with `emphasis: 'context'` for a reference line such as a baseline.
- In light mode, slots 3, 4 and 5 have less than 3:1 contrast against the surface. Keep the
  legend or direct labels, and the data table, so no information depends on those colors alone.

## Stability

Only what `src/index.ts` exports is public. Deep imports are blocked by
`@nx/enforce-module-boundaries` and the package `exports` map. `src/lib/public-api.spec.ts` lists
every export. Adding to that list is a minor change. Renaming or removing an export is a
breaking change: update every consumer in the same PR.

## Tests

`npx nx test charts`. The render tests use non-loan data, so they also show the library works
outside the amortization domain.
