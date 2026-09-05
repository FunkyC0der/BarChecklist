import { describe, expect, it } from 'vitest';

import { formatTaskSchedule } from './checklist-schedule';

describe('formatTaskSchedule', () => {
  it('formats daily and ordered weekly task schedules', () => {
    expect(formatTaskSchedule({ cadence: 'daily', weekdays: [] })).toBe(
      'Щодня',
    );
    expect(formatTaskSchedule({ cadence: 'weekly', weekdays: [5, 1, 3] })).toBe(
      'Пн, Ср, Пт',
    );
  });
});
