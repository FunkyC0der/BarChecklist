import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Alert, Button, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/errors';

import { taskFormSchema, type TaskFormValues } from './checklist-schema';

export function TaskForm({
  initialTitle = '',
  onCancel,
  onSubmit,
  submitLabel,
}: {
  initialTitle?: string;
  onCancel: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<TaskFormValues>({
    defaultValues: { title: initialTitle },
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
      className="flex flex-col gap-5"
      onSubmit={(event) => void submit(event)}
    >
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <Input
            autoFocus
            error={fieldState.error?.message}
            label="Назва задачі"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Наприклад, Відкрити бар"
            value={field.value}
          />
        )}
      />
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
