import { describe, expect, it } from 'vitest';

import { checklistFormSchema, taskFormSchema } from './checklist-schema';

describe('checklistFormSchema', () => {
  it('accepts only a trimmed name at the configured boundaries', () => {
    expect(checklistFormSchema.safeParse({ name: 'Відкриття' }).success).toBe(
      true,
    );
    expect(
      checklistFormSchema.safeParse({ name: 'а'.repeat(120) }).success,
    ).toBe(true);
  });

  it('rejects empty and too-long names', () => {
    expect(checklistFormSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(
      checklistFormSchema.safeParse({ name: 'а'.repeat(121) }).success,
    ).toBe(false);
  });
});

describe('taskFormSchema', () => {
  it('accepts daily and weekly task schedules at title bounds', () => {
    expect(
      taskFormSchema.safeParse({ cadence: 'daily', title: 'А', weekdays: [] })
        .success,
    ).toBe(true);
    expect(
      taskFormSchema.safeParse({
        cadence: 'weekly',
        title: 'А'.repeat(240),
        weekdays: [1, 3, 5],
      }).success,
    ).toBe(true);
  });

  it('rejects invalid title and weekday combinations', () => {
    for (const values of [
      { cadence: 'daily', title: '   ', weekdays: [] },
      { cadence: 'daily', title: 'А'.repeat(241), weekdays: [] },
      { cadence: 'daily', title: 'Щодня', weekdays: [1] },
      { cadence: 'weekly', title: 'Порожній', weekdays: [] },
      { cadence: 'weekly', title: 'Дублі', weekdays: [1, 1] },
      { cadence: 'weekly', title: 'Нуль', weekdays: [0] },
      { cadence: 'weekly', title: 'Вісім', weekdays: [8] },
    ]) {
      expect(taskFormSchema.safeParse(values).success).toBe(false);
    }
  });
});
