import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Alert, Button, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/errors';

import {
  checklistFormSchema,
  ISO_WEEKDAYS,
  type ChecklistFormValues,
} from './checklist-schema';

const defaultValues: ChecklistFormValues = {
  cadence: 'daily',
  name: '',
  weekdays: [],
};

export function ChecklistForm({
  initialValues,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  initialValues?: Partial<ChecklistFormValues>;
  onCancel: () => void;
  onSubmit: (values: ChecklistFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [weekly, setWeekly] = useState(
    (initialValues?.cadence ?? defaultValues.cadence) === 'weekly',
  );
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<ChecklistFormValues>({
    defaultValues: { ...defaultValues, ...initialValues },
    resolver: zodResolver(checklistFormSchema),
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Не вдалося зберегти чекліст.'));
    }
  });

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => void submit(event)}
    >
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            autoFocus
            error={fieldState.error?.message}
            label="Назва"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Наприклад, Відкриття зміни"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="cadence"
        render={({ field, fieldState }) => (
          <fieldset className="fieldset p-0">
            <legend className="fieldset-legend">Розклад</legend>
            <div className="flex flex-col gap-2">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  checked={field.value === 'daily'}
                  className="radio"
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={() => {
                    field.onChange('daily');
                    setWeekly(false);
                    setValue('weekdays', []);
                  }}
                  type="radio"
                  value="daily"
                />
                <span>Щодня</span>
              </label>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  checked={field.value === 'weekly'}
                  className="radio"
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={() => {
                    field.onChange('weekly');
                    setWeekly(true);
                  }}
                  type="radio"
                  value="weekly"
                />
                <span>Щотижня</span>
              </label>
            </div>
            {fieldState.error?.message ? (
              <p className="label text-error">{fieldState.error.message}</p>
            ) : null}
          </fieldset>
        )}
      />
      {weekly ? (
        <Controller
          control={control}
          name="weekdays"
          render={({ field, fieldState }) => (
            <fieldset className="fieldset p-0">
              <legend className="fieldset-legend">Дні тижня</legend>
              <div className="flex flex-col gap-2">
                {ISO_WEEKDAYS.map((weekday) => (
                  <label
                    className="label cursor-pointer justify-start gap-3"
                    key={weekday.value}
                  >
                    <input
                      checked={field.value.includes(weekday.value)}
                      className="checkbox"
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
                      type="checkbox"
                    />
                    <span>{weekday.name}</span>
                  </label>
                ))}
              </div>
              {fieldState.error?.message ? (
                <p className="label text-error">{fieldState.error.message}</p>
              ) : (
                <p className="label">Оберіть дні, коли чекліст активний.</p>
              )}
            </fieldset>
          )}
        />
      ) : null}
      {submitError ? (
        <Alert aria-live="polite" color="error">
          {submitError}
        </Alert>
      ) : null}
      <div className="modal-action">
        <Button onClick={onCancel} type="button" variant="ghost">
          Скасувати
        </Button>
        <Button color="primary" loading={isSubmitting} type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
