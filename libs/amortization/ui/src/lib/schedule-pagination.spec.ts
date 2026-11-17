import {
  getSchedulePage,
  pageContainingRow,
  type SchedulePageSize,
} from './schedule-pagination';

describe('getSchedulePage', () => {
  // data-model.md "Examples" table.
  it.each([
    {
      total: 360,
      size: 12,
      page: 1,
      expected: { page: 1, pageCount: 30, firstRow: 1, lastRow: 12 },
    },
    {
      total: 360,
      size: 12,
      page: 30,
      expected: { page: 30, pageCount: 30, firstRow: 349, lastRow: 360 },
    },
    {
      total: 100,
      size: 12,
      page: 9,
      expected: { page: 9, pageCount: 9, firstRow: 97, lastRow: 100 },
    },
    {
      total: 180,
      size: 12,
      page: 25,
      expected: { page: 15, pageCount: 15, firstRow: 169, lastRow: 180 },
    },
    {
      total: 360,
      size: 'all',
      page: 4,
      expected: { page: 1, pageCount: 1, firstRow: 1, lastRow: 360 },
    },
    {
      total: 12,
      size: 12,
      page: 1,
      expected: { page: 1, pageCount: 1, firstRow: 1, lastRow: 12 },
    },
  ] as const)(
    'total=$total size=$size page=$page',
    ({ total, size, page, expected }) => {
      expect(getSchedulePage(total, page, size)).toMatchObject(expected);
    },
  );

  it('returns a single empty page for an empty schedule', () => {
    expect(getSchedulePage(0, 3, 12)).toEqual({
      page: 1,
      pageCount: 1,
      startIndex: 0,
      endIndex: 0,
      firstRow: 0,
      lastRow: 0,
    });
  });

  it('clamps a page below 1 to the first page', () => {
    expect(getSchedulePage(360, 0, 12)).toMatchObject({
      page: 1,
      firstRow: 1,
      lastRow: 12,
    });
    expect(getSchedulePage(360, -4, 24)).toMatchObject({
      page: 1,
      firstRow: 1,
      lastRow: 24,
    });
  });

  // SC-003: every period appears exactly once, in order, across all pages.
  it.each([1, 12, 100, 360])(
    'covers 0..%i exactly once at every numeric page size',
    (total) => {
      for (const size of [12, 24, 60, 120] as const) {
        const { pageCount } = getSchedulePage(total, 1, size);
        const seen: number[] = [];
        for (let page = 1; page <= pageCount; page += 1) {
          const range = getSchedulePage(total, page, size);
          expect(range.lastRow - range.firstRow + 1).toBeLessThanOrEqual(size);
          for (let i = range.startIndex; i < range.endIndex; i += 1)
            seen.push(i);
        }
        expect(seen).toEqual(Array.from({ length: total }, (_, i) => i));
      }
    },
  );

  // research R5: recalculation stores the page as-is and clamps only when read.
  it('clamps on read when the schedule shrinks, and keeps the page when it does not', () => {
    expect(getSchedulePage(180, 25, 12).page).toBe(15);
    expect(getSchedulePage(360, 25, 12).page).toBe(25);
  });
});

describe('pageContainingRow', () => {
  it.each<[number, SchedulePageSize, number]>([
    [24, 60, 1],
    [24, 12, 3],
    [359, 12, 30],
    [0, 12, 1],
    [108, 24, 5],
    [200, 'all', 1],
  ])('row index %i at size %s is on page %i', (rowIndex, size, expected) => {
    expect(pageContainingRow(rowIndex, size)).toBe(expected);
  });
});
