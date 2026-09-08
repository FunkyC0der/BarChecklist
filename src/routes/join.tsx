import { Link } from '@/lib/router';
import { useNavigate, useParams } from '@/lib/router-hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AuthShell } from '@/components/common/auth-shell';
import { ConfigNotice } from '@/components/common/config-notice';
import { Alert, AppText, Button, Loading } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import {
  acceptTeamInvite,
  inspectTeamInvite,
  type InviteInspection,
} from '@/features/teams/team-api';
import { isInviteToken, joinPath } from '@/features/teams/team-routes';
import { writeStoredActiveTeamTab } from '@/features/teams/team-tab-storage';
import { useTeams } from '@/features/teams/team-context';
import { queryKeys } from '@/lib/query-client';

const statusMessages: Record<
  Exclude<InviteInspection['status'], 'active'>,
  string
> = {
  expired: 'Строк дії цього запрошення завершився.',
  invalid: 'Це посилання-запрошення недійсне.',
  revoked: 'Власник команди відкликав це запрошення.',
};

const invalidTokenMessage = 'Це посилання-запрошення має некоректний формат.';

export function JoinRoute() {
  const { token } = useParams<{ token: string }>();
  const { configIssue, session } = useAuth();
  const { refreshTeams } = useTeams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joinError, setJoinError] = useState<string | null>(null);

  const validToken = isInviteToken(token);
  const returnTo = validToken && token ? joinPath(token) : null;
  const returnQuery = returnTo
    ? `?returnTo=${encodeURIComponent(returnTo)}`
    : '';

  const inviteQuery = useQuery({
    enabled: Boolean(session && validToken && token && !configIssue),
    queryFn: () => inspectTeamInvite(token!),
    queryKey: [
      'team-invite-inspection',
      session?.user.id ?? 'anonymous',
      token,
    ] as const,
  });
  const joinMutation = useMutation({
    mutationFn: acceptTeamInvite,
    onSuccess: async (result) => {
      if (!session) return;
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teams(session.user.id),
      });
      await refreshTeams(result.team_id);
      writeStoredActiveTeamTab(session.user.id, '/team');
      navigate('/team', { replace: true });
    },
  });
  const invite = inviteQuery.data ?? null;
  const error =
    inviteQuery.error instanceof Error
      ? inviteQuery.error.message
      : inviteQuery.isError
        ? 'Не вдалося перевірити запрошення.'
        : null;
  const loading = Boolean(session) && inviteQuery.isLoading;

  if (!validToken) {
    return (
      <AuthShell
        description={invalidTokenMessage}
        footer={
          <Link className="link" to={`/sign-in${returnQuery}`}>
            Увійти
          </Link>
        }
        title="Недійсне посилання"
      />
    );
  }

  if (!session) {
    return (
      <AuthShell
        description="Увійдіть або створіть акаунт, щоб перевірити та прийняти запрошення."
        footer={
          <AppText>
            Уже маєте акаунт?{' '}
            <Link className="link" to={`/sign-in${returnQuery}`}>
              Увійти
            </Link>
            <br />
            Ще немає акаунта?{' '}
            <Link className="link" to={`/sign-up${returnQuery}`}>
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
    if (!token) return;
    setJoinError(null);
    try {
      await joinMutation.mutateAsync(token);
    } catch (nextError) {
      setJoinError(
        nextError instanceof Error
          ? nextError.message
          : 'Не вдалося приєднатися до команди.',
      );
    }
  };

  const goToTeams = async (preferredTeamId?: string) => {
    const teams = await refreshTeams(preferredTeamId);
    if (teams.length > 0) {
      writeStoredActiveTeamTab(session.user.id, '/team');
      navigate('/team', { replace: true });
      return;
    }

    navigate('/team', { replace: true });
  };

  if (configIssue) {
    return (
      <AuthShell
        brand={false}
        description="Додайте локальні або hosted development значення Supabase."
        footer={<span />}
        title="Supabase не налаштовано"
      >
        <ConfigNotice message={configIssue} />
      </AuthShell>
    );
  }

  if (loading) {
    return (
      <AuthShell
        brand={false}
        description="Зачекайте, будь ласка."
        footer={<span />}
        title="Запрошення до команди"
      >
        <Loading label="Перевіряємо запрошення…" size="lg" />
      </AuthShell>
    );
  }

  if (error) {
    return (
      <AuthShell
        brand={false}
        description="Спробуйте ще раз або поверніться до своїх команд."
        footer={<span />}
        title="Не вдалося відкрити запрошення"
      >
        <Alert color="error">{error}</Alert>
        <Button
          className="btn-block"
          onClick={() => void inviteQuery.refetch()}
          size="lg"
        >
          Спробувати ще раз
        </Button>
        <Button
          className="btn-block"
          onClick={() => void goToTeams()}
          variant="ghost"
        >
          До моїх команд
        </Button>
      </AuthShell>
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
      <AuthShell
        brand={false}
        description={statusMessages[unavailableStatus]}
        footer={<span />}
        title="Запрошення недоступне"
      >
        <Alert color="error">{statusMessages[unavailableStatus]}</Alert>
        <Button
          className="btn-block"
          color="primary"
          onClick={() => void goToTeams()}
          size="lg"
        >
          До моїх команд
        </Button>
      </AuthShell>
    );
  }

  if (invite.alreadyMember) {
    return (
      <AuthShell
        brand={false}
        description={`Ви вже є учасником команди «${invite.teamName ?? 'Команда'}».`}
        footer={<span />}
        title="Ви вже в команді"
      >
        <Button
          className="btn-block"
          color="primary"
          onClick={() => void goToTeams(invite.teamId ?? undefined)}
          size="lg"
        >
          Відкрити команду
        </Button>
        <Button
          className="btn-block"
          onClick={() => void goToTeams()}
          variant="ghost"
        >
          До моїх команд
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      brand={false}
      description="Після підтвердження ви бачитимете дані команди та поточні задачі."
      footer={<span />}
      title="Приєднатися до команди"
    >
      <AppText>
        Вас запрошують до команди «{invite.teamName ?? 'Команда'}».
      </AppText>
      {joinError ? <Alert color="error">{joinError}</Alert> : null}
      <Button
        className="btn-block"
        color="primary"
        loading={joinMutation.isPending}
        onClick={() => void join()}
        size="lg"
      >
        Приєднатися
      </Button>
      <Button
        className="btn-block"
        onClick={() => void goToTeams()}
        variant="ghost"
      >
        До моїх команд
      </Button>
    </AuthShell>
  );
}
