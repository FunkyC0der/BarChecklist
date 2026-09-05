import { isoWeekday, isChecklistScheduled, logicalDate } from './dates';

describe('timezone schedule utilities', () => {
  it('crosses the logical date before UTC midnight in Kyiv', () => {
    const instant = new Date('2026-07-15T21:30:00.000Z');
    expect(logicalDate(instant, 'Europe/Kyiv')).toBe('2026-07-16');
    expect(isoWeekday(instant, 'Europe/Kyiv')).toBe(4);
  });

  it('keeps the previous date west of UTC', () => {
    expect(
      logicalDate(new Date('2026-01-01T02:00:00.000Z'), 'America/New_York'),
    ).toBe('2025-12-31');
  });

  it('handles the DST spring transition', () => {
    expect(
      logicalDate(new Date('2026-03-29T00:30:00.000Z'), 'Europe/Kyiv'),
    ).toBe('2026-03-29');
    expect(
      logicalDate(new Date('2026-03-29T21:30:00.000Z'), 'Europe/Kyiv'),
    ).toBe('2026-03-30');
  });

  it('applies daily and ISO-weekday schedules', () => {
    const monday = new Date('2026-09-07T10:00:00.000Z');
    expect(isChecklistScheduled({ cadence: 'daily' }, monday, 'UTC')).toBe(
      true,
    );
    expect(
      isChecklistScheduled(
        { cadence: 'weekly', weekdays: [1, 3, 5] },
        monday,
        'UTC',
      ),
    ).toBe(true);
    expect(
      isChecklistScheduled(
        { cadence: 'weekly', weekdays: [2, 4] },
        monday,
        'UTC',
      ),
    ).toBe(false);
  });
});
