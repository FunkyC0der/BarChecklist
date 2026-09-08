import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from '@/lib/router-hooks';
import { z } from 'zod';

import { Alert, Button, Input } from '@/components/ui';

import { useAuth } from './auth-context';

const schema = z.object({
  email: z.email('Введіть коректний email.'),
  password: z.string().min(8, 'Пароль має містити щонайменше 8 символів.'),
});

type FormValues = z.infer<typeof schema>;

type SignInFormProps = {
  returnTo?: string | null;
};

export function SignInForm({ returnTo = null }: SignInFormProps) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const signInMutation = useMutation({
    mutationFn: ({ email, password }: FormValues) => signIn(email, password),
  });
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await signInMutation.mutateAsync(values);
      navigate(returnTo ?? '/', { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Не вдалося увійти.',
      );
    }
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => void onSubmit(event)}
    >
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Input
            autoComplete="email"
            error={fieldState.error?.message}
            label="Email"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            type="email"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <Input
            autoComplete="current-password"
            error={fieldState.error?.message}
            label="Пароль"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            type="password"
            value={field.value}
          />
        )}
      />
      {submitError ? (
        <Alert aria-live="polite" color="error">
          {submitError}
        </Alert>
      ) : null}
      <Button
        className="btn-block"
        color="primary"
        loading={isSubmitting || signInMutation.isPending}
        size="lg"
        type="submit"
      >
        Увійти
      </Button>
    </form>
  );
}
