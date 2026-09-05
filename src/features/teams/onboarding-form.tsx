import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { AppText, Button, Input } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { getErrorMessage } from '@/lib/errors';

import { createTeam } from './team-api';
import { useTeams } from './team-context';

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Назва має містити щонайменше 2 символи.')
    .max(100, 'Назва не може перевищувати 100 символів.'),
  timezone: z.string().trim().min(1, 'Вкажіть IANA timezone.'),
});

type FormValues = z.infer<typeof schema>;

function detectedTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function OnboardingForm() {
  const { session } = useAuth();
  const { refreshTeams, selectTeam } = useTeams();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { name: '', timezone: detectedTimezone() },
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!session) return;

    setSubmitError(null);
    try {
      await createTeam({
        name: values.name,
        ownerId: session.user.id,
        timezone: values.timezone,
      });
      const teams = await refreshTeams();
      selectTeam(teams.at(-1)?.id ?? null);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Не вдалося створити команду.'));
    }
  });

  return (
    <View className="gap-5">
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            autoCapitalize="words"
            error={fieldState.error?.message}
            label="Назва команди"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Наприклад, Бар на Подолі"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="timezone"
        render={({ field, fieldState }) => (
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldState.error?.message}
            helperText="Використовуйте IANA назву, наприклад Europe/Kyiv."
            label="Timezone команди"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
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
        tone="primary"
      >
        Створити команду
      </Button>
    </View>
  );
}
