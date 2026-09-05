export type TaskSchedule =
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

export function isTaskScheduled(
  schedule: TaskSchedule,
  date: Date,
  timeZone: string,
): boolean {
  if (schedule.cadence === 'daily') return true;
  return schedule.weekdays.includes(isoWeekday(date, timeZone));
}

export type LogicalDateWatcherOptions = {
  now?: () => Date;
  intervalMs?: number;
  setInterval?: (
    callback: () => void,
    ms: number,
  ) => ReturnType<typeof globalThis.setInterval>;
  clearInterval?: (id: ReturnType<typeof globalThis.setInterval>) => void;
};

/** Watches the team's logical date and invokes the callback once it changes. */
export function watchLogicalDate(
  timeZone: string,
  onChange: (date: string) => void,
  options: LogicalDateWatcherOptions = {},
): () => void {
  const now = options.now ?? (() => new Date());
  const setTimer = options.setInterval ?? globalThis.setInterval;
  const clearTimer = options.clearInterval ?? globalThis.clearInterval;
  let current = logicalDate(now(), timeZone);

  const check = () => {
    const next = logicalDate(now(), timeZone);
    if (next !== current) {
      current = next;
      onChange(next);
    }
  };
  const timer = setTimer(check, options.intervalMs ?? 30_000);
  const onVisibilityChange = () => {
    if (
      typeof document === 'undefined' ||
      document.visibilityState === 'visible'
    )
      check();
  };
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    clearTimer(timer);
    if (typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
