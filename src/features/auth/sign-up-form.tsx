import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import * as Linking from 'expo-linking';
import { type Href, useRouter } from 'expo-router';
import { z } from 'zod';

import { AppText, Button, Input } from '@/components/ui';

import { useAuth } from './auth-context';

const schema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Вкажіть ім’я щонайменше з 2 символів.'),
    email: z.string().trim().email('Введіть коректний email.'),
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
  const router = useRouter();
  const [message, setMessage] = useState<{
    kind: 'error' | 'success';
    text: string;
  } | null>(null);
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
      const result = await signUp(
        values,
        returnTo ? Linking.createURL(returnTo) : undefined,
      );
      if (result.needsEmailConfirmation) {
        setMessage({
          kind: 'success',
          text: 'Перевірте email і підтвердьте реєстрацію.',
        });
      } else {
        router.replace((returnTo ?? '/') as Href);
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
    <View className="gap-5">
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
            autoCapitalize="none"
            autoComplete="email"
            error={fieldState.error?.message}
            keyboardType="email-address"
            label="Email"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
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
            secureTextEntry
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
            secureTextEntry
            value={field.value}
          />
        )}
      />
      {message ? (
        <AppText accessibilityLiveRegion="polite" tone={message.kind}>
          {message.text}
        </AppText>
      ) : null}
      <Button
        loading={isSubmitting}
        onPress={() => void onSubmit()}
        tone="primary"
      >
        Створити акаунт
      </Button>
    </View>
  );
}
