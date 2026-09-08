import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from '@/lib/router-hooks';
import { z } from 'zod';

import { Alert, Button, Input } from '@/components/ui';
import { buildAppUrl } from '@/lib/platform';

import { useAuth } from './auth-context';

const schema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Вкажіть ім’я щонайменше з 2 символів.'),
    email: z.email('Введіть коректний email.'),
    password: z.string().min(8, 'Пароль має містити щонайменше 8 символів.'),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Паролі не збігаються.',
    path: ['passwordConfirmation'],
  });

type FormValues = z.infer<typeof schema>;

type SignUpFormProps = {
  returnTo?: string | null;
};

export function SignUpForm({ returnTo = null }: SignUpFormProps) {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<{
    kind: 'error' | 'success';
    text: string;
  } | null>(null);
  const signUpMutation = useMutation({
    mutationFn: ({
      emailRedirectTo,
      values,
    }: {
      emailRedirectTo: string;
      values: FormValues;
    }) => signUp(values, emailRedirectTo),
  });
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      const result = await signUpMutation.mutateAsync({
        emailRedirectTo: returnTo
          ? buildAppUrl(returnTo)
          : buildAppUrl('/today'),
        values,
      });
      if (result.needsEmailConfirmation) {
        setMessage({
          kind: 'success',
          text: 'Перевірте email і підтвердьте реєстрацію.',
        });
      } else {
        navigate(returnTo ?? '/today', { replace: true });
      }
    } catch (error) {
      setMessage({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Не вдалося зареєструватися.',
      });
    }
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => void onSubmit(event)}
    >
      <Controller
        control={control}
        name="displayName"
        render={({ field, fieldState }) => (
          <Input
            autoComplete="name"
            error={fieldState.error?.message}
            label="Ім’я"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />
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
            autoComplete="new-password"
            error={fieldState.error?.message}
            label="Пароль"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            type="password"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="passwordConfirmation"
        render={({ field, fieldState }) => (
          <Input
            autoComplete="new-password"
            error={fieldState.error?.message}
            label="Повторіть пароль"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            type="password"
            value={field.value}
          />
        )}
      />
      {message ? (
        <Alert
          aria-live="polite"
          color={message.kind === 'success' ? 'success' : 'error'}
        >
          {message.text}
        </Alert>
      ) : null}
      <Button
        className="btn-block"
        color="primary"
        loading={isSubmitting || signUpMutation.isPending}
        size="lg"
        type="submit"
      >
        Створити акаунт
      </Button>
    </form>
  );
}
