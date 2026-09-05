import { Link, type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AuthShell } from '@/components/common/auth-shell';
import { AppText, Button, Card, Loading, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import {
  acceptTeamInvite,
  inspectTeamInvite,
  type InviteInspection,
} from '@/features/teams/team-api';
import { isInviteToken, joinPath } from '@/features/teams/team-routes';
import { writeStoredActiveTeamTab } from '@/features/teams/team-tab-storage';
import { useTeams } from '@/features/teams/team-context';

const statusMessages: Record<
  Exclude<InviteInspection['status'], 'active'>,
  string
> = {
  expired: 'Строк дії цього запрошення завершився.',
  invalid: 'Це посилання-запрошення недійсне.',
  revoked: 'Власник команди відкликав це запрошення.',
};

export default function JoinInviteScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { configIssue, session } = useAuth();
  const { refreshTeams } = useTeams();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(session));
  const [joining, setJoining] = useState(false);

  const validToken = isInviteToken(token);
  const returnTo = validToken ? joinPath(token) : null;

  const loadInvite = useCallback(async () => {
    if (!session || !validToken) return;

    setLoading(true);
    setError(null);
    try {
      setInvite(await inspectTeamInvite(token));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Не вдалося перевірити запрошення.',
      );
    } finally {
      setLoading(false);
    }
  }, [session, token, validToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadInvite();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadInvite]);

  if (!validToken) {
    return (
      <Screen>
        <Card title="Недійсне посилання">
          <AppText tone="error">
            Це посилання-запрошення має некоректний формат.
          </AppText>
        </Card>
      </Screen>
    );
  }

  if (!session) {
    return (
      <AuthShell
        description="Увійдіть або створіть акаунт, щоб перевірити та прийняти запрошення."
        footer={
          <AppText>
            Уже маєте акаунт?{' '}
            <Link
              className="font-bold text-primary-content"
              href={{ pathname: '/sign-in', params: { returnTo } }}
            >
              Увійти
            </Link>
            {'\n'}Ще немає акаунта?{' '}
            <Link
              className="font-bold text-primary-content"
              href={{ pathname: '/sign-up', params: { returnTo } }}
            >
              Зареєструватися
            </Link>
          </AppText>
        }
        title="Запрошення до команди"
      >
        <AppText tone="muted">
          Деталі команди стануть доступні після входу.
        </AppText>
      </AuthShell>
    );
  }

  const join = async () => {
    setJoining(true);
    setError(null);
    try {
      const result = await acceptTeamInvite(token);
      await refreshTeams(result.team_id);
      writeStoredActiveTeamTab(session.user.id, '/team');
      router.replace('/team');
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Не вдалося приєднатися до команди.',
      );
    } finally {
      setJoining(false);
    }
  };

  const goToTeams = async (preferredTeamId?: string) => {
    const teams = await refreshTeams(preferredTeamId);
    if (teams.length > 0) {
      writeStoredActiveTeamTab(session.user.id, '/team');
      router.replace('/team');
      return;
    }

    router.replace('/onboarding' as Href);
  };

  if (configIssue) {
    return (
      <Screen>
        <Card title="Supabase не налаштовано">
          <AppText tone="error">{configIssue}</AppText>
        </Card>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading label="Перевіряємо запрошення…" size="large" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Card title="Не вдалося відкрити запрошення">
          <View className="gap-4">
            <AppText tone="error">{error}</AppText>
            <Button onPress={() => void loadInvite()} tone="secondary">
              Спробувати ще раз
            </Button>
            <Button onPress={() => void goToTeams()} tone="ghost">
              До моїх команд
            </Button>
          </View>
        </Card>
      </Screen>
    );
  }

  if (!invite || invite.status !== 'active') {
    const unavailableStatus =
      invite?.status === 'expired' ||
      invite?.status === 'invalid' ||
      invite?.status === 'revoked'
        ? invite.status
        : 'invalid';
    return (
      <Screen>
        <Card title="Запрошення недоступне">
          <View className="gap-4">
            <AppText tone="error">{statusMessages[unavailableStatus]}</AppText>
            <Button onPress={() => void goToTeams()} tone="primary">
              До моїх команд
            </Button>
          </View>
        </Card>
      </Screen>
    );
  }

  if (invite.alreadyMember) {
    return (
      <Screen>
        <Card title="Ви вже в команді">
          <View className="gap-4">
            <AppText>
              Ви вже є учасником команди «{invite.teamName ?? 'Команда'}».
            </AppText>
            <Button
              onPress={() => void goToTeams(invite.teamId ?? undefined)}
              tone="primary"
            >
              Відкрити команду
            </Button>
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card title="Приєднатися до команди">
        <View className="gap-5">
          <AppText>
            Вас запрошують до команди «{invite.teamName ?? 'Команда'}».
          </AppText>
          <AppText tone="muted">
            Після підтвердження ви бачитимете дані команди та поточні задачі.
          </AppText>
          <Button loading={joining} onPress={() => void join()} tone="primary">
            Приєднатися
          </Button>
          <Button onPress={() => void goToTeams()} tone="ghost">
            До моїх команд
          </Button>
        </View>
      </Card>
    </Screen>
  );
}
