import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { z } from 'zod';

import { AppText, Button, Input } from '@/components/ui';

import { useAuth } from './auth-context';

const schema = z.object({
  email: z.string().trim().email('Введіть коректний email.'),
  password: z.string().min(8, 'Пароль має містити щонайменше 8 символів.'),
});

type FormValues = z.infer<typeof schema>;

type SignInFormProps = {
  returnTo?: string | null;
};

export function SignInForm({ returnTo = null }: SignInFormProps) {
  const { signIn } = useAuth();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
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
      await signIn(values.email, values.password);
      router.replace((returnTo ?? '/') as Href);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Не вдалося увійти.',
      );
    }
  });

  return (
    <View className="gap-5">
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
            autoComplete="current-password"
            error={fieldState.error?.message}
            label="Пароль"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            secureTextEntry
            value={field.value}
          />
        )}
      />
      {submitError ? (
        <AppText accessibilityLiveRegion="polite" tone="error">
          {submitError}
        </AppText>
      ) : null}
      <Button
        loading={isSubmitting}
        onPress={() => void onSubmit()}
        color="primary"
      >
        Увійти
      </Button>
    </View>
  );
}
