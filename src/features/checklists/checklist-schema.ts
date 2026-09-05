import { z } from 'zod';

export const MAX_ACTIVE_CHECKLISTS_PER_TEAM = 20;
export const MAX_ACTIVE_TASKS_PER_CHECKLIST = 100;

export const ISO_WEEKDAYS = [
  { label: 'Пн', name: 'Понеділок', value: 1 },
  { label: 'Вт', name: 'Вівторок', value: 2 },
  { label: 'Ср', name: 'Середа', value: 3 },
  { label: 'Чт', name: 'Четвер', value: 4 },
  { label: 'Пт', name: 'Пʼятниця', value: 5 },
  { label: 'Сб', name: 'Субота', value: 6 },
  { label: 'Нд', name: 'Неділя', value: 7 },
] as const;

const isoWeekdaySchema = z.number().int().min(1).max(7);

export const checklistFormSchema = z
  .object({
    cadence: z.enum(['daily', 'weekly']),
    name: z
      .string()
      .trim()
      .min(1, 'Назва має містити щонайменше 1 символ.')
      .max(120, 'Назва не може перевищувати 120 символів.'),
    weekdays: z.array(isoWeekdaySchema),
  })
  .superRefine((values, ctx) => {
    if (new Set(values.weekdays).size !== values.weekdays.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Дні тижня не можуть повторюватися.',
        path: ['weekdays'],
      });
    }

    if (values.cadence === 'daily' && values.weekdays.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Щоденний чекліст не має днів розкладу.',
        path: ['weekdays'],
      });
    }

    if (values.cadence === 'weekly' && values.weekdays.length < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Оберіть щонайменше один день тижня.',
        path: ['weekdays'],
      });
    }
  });

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Назва задачі має містити щонайменше 1 символ.')
    .max(240, 'Назва задачі не може перевищувати 240 символів.'),
});

export type ChecklistFormValues = z.infer<typeof checklistFormSchema>;
export type TaskFormValues = z.infer<typeof taskFormSchema>;
