import { ISO_WEEKDAYS, type ChecklistFormValues } from './checklist-schema';

export function cadenceLabel(cadence: ChecklistFormValues['cadence']) {
  return cadence === 'daily' ? 'Щодня' : 'Щотижня';
}

export function formatChecklistSchedule(values: {
  cadence: ChecklistFormValues['cadence'];
  weekdays: readonly number[];
}) {
  if (values.cadence === 'daily') return 'Щодня';

  const labels = values.weekdays
    .slice()
    .sort((left, right) => left - right)
    .map(
      (weekday) =>
        ISO_WEEKDAYS.find((item) => item.value === weekday)?.label ?? weekday,
    );

  return labels.length > 0 ? labels.join(', ') : 'Дні не вибрані';
}

export function taskCountLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} задача`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} задачі`;
  }
  return `${count} задач`;
}
