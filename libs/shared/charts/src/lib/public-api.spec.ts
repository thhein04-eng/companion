import * as api from '../index';

// Guards the public API (contracts/charts-api.md). Adding an export is a deliberate change:
// update this list in the same PR. Removing or renaming one is breaking for every consumer.
describe('@companion/charts public API', () => {
  it('exports exactly the documented runtime members', () => {
    expect(Object.keys(api).sort()).toEqual(
      [
        'LineChart',
        'StackedBarChart',
        'ChartFrame',
        'Legend',
        'ChartTooltip',
        'ChartDataTable',
        'useElementWidth',
        'usePlotKeyboard',
        'linearScale',
        'bandScale',
        'niceTicks',
        'yExtent',
        'linePath',
        'roundedTopRect',
        'formatCompactCurrency',
        'capSeries',
        'colorVar',
        'SegmentedBar',
      ].sort(),
    );
  });
});
