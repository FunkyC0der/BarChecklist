export type ChecklistSchedule =
  | { cadence: 'daily'; weekdays?: never }
  | { cadence: 'weekly'; weekdays: readonly number[] };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone,
      weekday: 'short',
      year: 'numeric',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function dateParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    getFormatter(timeZone)
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  if (!parts.year || !parts.month || !parts.day || !parts.weekday) {
    throw new Error(`Не вдалося визначити дату для timezone ${timeZone}.`);
  }

  return parts as Record<'year' | 'month' | 'day' | 'weekday', string>;
}

export function logicalDate(date: Date, timeZone: string): string {
  const parts = dateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isoWeekday(date: Date, timeZone: string): number {
  const weekdays: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const weekday = weekdays[dateParts(date, timeZone).weekday];
  if (!weekday)
    throw new Error(`Невідомий день тижня для timezone ${timeZone}.`);
  return weekday;
}

export function isChecklistScheduled(
  schedule: ChecklistSchedule,
  date: Date,
  timeZone: string,
): boolean {
  if (schedule.cadence === 'daily') return true;
  return schedule.weekdays.includes(isoWeekday(date, timeZone));
}
