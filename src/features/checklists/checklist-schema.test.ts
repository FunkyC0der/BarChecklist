import { describe, expect, it } from 'vitest';

import { checklistFormSchema, taskFormSchema } from './checklist-schema';

describe('checklistFormSchema', () => {
  it('accepts a daily checklist without weekdays', () => {
    const result = checklistFormSchema.safeParse({
      cadence: 'daily',
      name: 'Відкриття',
      weekdays: [],
    });

    expect(result.success).toBe(true);
  });

  it('accepts a weekly checklist with unique ISO weekdays', () => {
    const result = checklistFormSchema.safeParse({
      cadence: 'weekly',
      name: 'Вихідні',
      weekdays: [5, 6],
    });

    expect(result.success).toBe(true);
  });

  it('rejects names that are empty after trim or longer than 120 characters', () => {
    expect(
      checklistFormSchema.safeParse({
        cadence: 'daily',
        name: '   ',
        weekdays: [],
      }).success,
    ).toBe(false);
    expect(
      checklistFormSchema.safeParse({
        cadence: 'daily',
        name: 'а'.repeat(121),
        weekdays: [],
      }).success,
    ).toBe(false);
    expect(
      checklistFormSchema.safeParse({
        cadence: 'daily',
        name: 'а',
        weekdays: [],
      }).success,
    ).toBe(true);
    expect(
      checklistFormSchema.safeParse({
        cadence: 'daily',
        name: 'а'.repeat(120),
        weekdays: [],
      }).success,
    ).toBe(true);
  });

  it('rejects a daily checklist that still has weekdays', () => {
    const result = checklistFormSchema.safeParse({
      cadence: 'daily',
      name: 'Щодня',
      weekdays: [1],
    });

    expect(result.success).toBe(false);
  });

  it('rejects weekly checklists without days, with duplicates, or with days outside 1-7', () => {
    expect(
      checklistFormSchema.safeParse({
        cadence: 'weekly',
        name: 'Порожній',
        weekdays: [],
      }).success,
    ).toBe(false);
    expect(
      checklistFormSchema.safeParse({
        cadence: 'weekly',
        name: 'Дублі',
        weekdays: [1, 1],
      }).success,
    ).toBe(false);
    expect(
      checklistFormSchema.safeParse({
        cadence: 'weekly',
        name: 'Нуль',
        weekdays: [0],
      }).success,
    ).toBe(false);
    expect(
      checklistFormSchema.safeParse({
        cadence: 'weekly',
        name: 'Вісім',
        weekdays: [8],
      }).success,
    ).toBe(false);
  });
});

describe('taskFormSchema', () => {
  it('accepts titles at the database length bounds', () => {
    expect(taskFormSchema.safeParse({ title: 'А' }).success).toBe(true);
    expect(taskFormSchema.safeParse({ title: 'А'.repeat(240) }).success).toBe(
      true,
    );
  });

  it('rejects empty or too-long titles', () => {
    expect(taskFormSchema.safeParse({ title: '   ' }).success).toBe(false);
    expect(taskFormSchema.safeParse({ title: 'А'.repeat(241) }).success).toBe(
      false,
    );
  });
});
