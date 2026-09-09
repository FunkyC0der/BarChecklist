import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Alert, AppText, Button } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { getErrorMessage } from '@/lib/errors';

import {
  ISO_WEEKDAYS,
  taskFormSchema,
  type TaskFormValues,
} from './checklist-schema';

export function TaskForm({
  autoFocus = true,
  checklistName,
  initialValues,
  onSubmit,
  submitLabel,
}: {
  autoFocus?: boolean | undefined;
  checklistName: string;
  initialValues?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [weekly, setWeekly] = useState(initialValues?.cadence === 'weekly');
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<TaskFormValues>({
    defaultValues: {
      cadence: 'daily',
      title: '',
      weekdays: [],
      ...initialValues,
    },
    resolver: zodResolver(taskFormSchema),
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Не вдалося зберегти задачу.'));
    }
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => void submit(event)}
    >
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <div>
            <input
              aria-label="Назва задачі"
              autoFocus={autoFocus}
              className="input w-full input-ghost px-0 text-base font-semibold input-sm"
              onBlur={field.onBlur}
              onChange={field.onChange}
              placeholder="Назва задачі"
              value={field.value}
            />
            {fieldState.error?.message ? (
              <p className="label text-error">{fieldState.error.message}</p>
            ) : null}
          </div>
        )}
      />
      <div className="flex items-center gap-1.5 text-sm text-base-content/60">
        <Icon className="size-4" name="clipboard-list" />
        {checklistName}
      </div>
      <div className="divider my-0" />
      <AppText variant="overline">Розклад</AppText>
      <Controller
        control={control}
        name="cadence"
        render={({ field, fieldState }) => (
          <>
            <div className="flex flex-wrap gap-2">
              <input
                aria-label="Щодня"
                checked={field.value === 'daily'}
                className="btn rounded-full btn-sm"
                name="cadence"
                onBlur={field.onBlur}
                onChange={() => {
                  field.onChange('daily');
                  setValue('weekdays', []);
                  setWeekly(false);
                }}
                type="radio"
                value="daily"
              />
              <input
                aria-label="Щотижня"
                checked={field.value === 'weekly'}
                className="btn rounded-full btn-sm"
                name="cadence"
                onBlur={field.onBlur}
                onChange={() => {
                  field.onChange('weekly');
                  setWeekly(true);
                }}
                type="radio"
                value="weekly"
              />
            </div>
            {fieldState.error?.message ? (
              <p className="label text-error">{fieldState.error.message}</p>
            ) : null}
          </>
        )}
      />
      {weekly ? (
        <Controller
          control={control}
          name="weekdays"
          render={({ field, fieldState }) => (
            <>
              <div className="flex justify-between">
                {ISO_WEEKDAYS.map((weekday) => (
                  <input
                    aria-label={weekday.label}
                    checked={field.value.includes(weekday.value)}
                    className="btn btn-circle"
                    key={weekday.value}
                    onBlur={field.onBlur}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...field.value, weekday.value]
                        : field.value.filter(
                            (value) => value !== weekday.value,
                          );
                      field.onChange(
                        next.slice().sort((left, right) => left - right),
                      );
                    }}
                    title={weekday.name}
                    type="checkbox"
                  />
                ))}
              </div>
              {fieldState.error?.message ? (
                <p className="label text-error">{fieldState.error.message}</p>
              ) : (
                <p className="label">Оберіть дні, коли задача активна.</p>
              )}
            </>
          )}
        />
      ) : null}
      {submitError ? (
        <Alert aria-live="polite" color="error">
          {submitError}
        </Alert>
      ) : null}
      <Button
        className="mt-2 btn-block"
        color="primary"
        loading={isSubmitting}
        size="lg"
        type="submit"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
