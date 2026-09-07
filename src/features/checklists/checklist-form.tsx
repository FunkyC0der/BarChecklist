import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Alert, Button } from '@/components/ui';
import { getErrorMessage } from '@/lib/errors';

import {
  checklistFormSchema,
  type ChecklistFormValues,
} from './checklist-schema';

const defaultValues: ChecklistFormValues = {
  name: '',
};

export function ChecklistForm({
  initialValues,
  onSubmit,
  submitLabel,
}: {
  initialValues?: Partial<ChecklistFormValues>;
  onSubmit: (values: ChecklistFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
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
      className="flex flex-col gap-4"
      onSubmit={(event) => void submit(event)}
    >
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <>
            <input
              aria-label="Назва чекліста"
              autoFocus
              className="input w-full input-ghost px-0 text-base font-semibold input-sm"
              onBlur={field.onBlur}
              onChange={field.onChange}
              placeholder="Назва чекліста"
              value={field.value}
            />
            {fieldState.error?.message ? (
              <p className="label text-error">{fieldState.error.message}</p>
            ) : null}
          </>
        )}
      />
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
