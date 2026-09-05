import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  Alert,
  AppText,
  Badge,
  Button,
  Card,
  Input,
  Loading,
  Modal,
  Screen,
} from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import {
  createTeamInvite,
  deleteTeam,
  fetchCurrentTeamInvite,
  fetchTeamMembers,
  leaveTeam,
  removeTeamMember,
  revokeTeamInvite,
  type TeamMember,
  updateTeam,
} from '@/features/teams/team-api';
import { joinPath } from '@/features/teams/team-routes';
import { useTeams } from '@/features/teams/team-context';
import { useTeamRealtime } from '@/features/teams/use-team-realtime';
import { cn } from '@/lib/cn';
import { buildAppUrl, shareLink } from '@/lib/platform';

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function TeamRoute() {
  const { session, signOut } = useAuth();
  const {
    activeTeam,
    error: teamsError,
    refreshTeams,
    selectTeam,
    status,
    teams,
  } = useTeams();
  const navigate = useNavigate();
  const location = useLocation();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(true);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [teamMessage, setTeamMessage] = useState<string | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteDialogMessage, setInviteDialogMessage] = useState<string | null>(
    null,
  );
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [deleteName, setDeleteName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isOwner = Boolean(
    activeTeam && session?.user.id === activeTeam.owner_id,
  );

  const loadMembers = useCallback(async () => {
    if (!activeTeam) return;

    setMembersLoading(true);
    setMembersError(null);
    try {
      setMembers(await fetchTeamMembers(activeTeam.id));
    } catch (error) {
      setMembersError(
        error instanceof Error
          ? error.message
          : 'Не вдалося завантажити учасників.',
      );
    } finally {
      setMembersLoading(false);
    }
  }, [activeTeam]);

  const loadInviteStatus = useCallback(async () => {
    if (!activeTeam || !isOwner) return;

    try {
      const invite = await fetchCurrentTeamInvite(activeTeam.id);
      setInviteExpiry(invite?.expires_at ?? null);
    } catch (error) {
      setInviteMessage(
        error instanceof Error
          ? error.message
          : 'Не вдалося перевірити запрошення.',
      );
    }
  }, [activeTeam, isOwner]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setName(activeTeam?.name ?? '');
      setTimezone(activeTeam?.timezone ?? '');
      setDeleteName('');
      setInviteLink(null);
      setInviteDialogOpen(false);
      setInviteDialogMessage(null);
      setInviteMessage(null);
      void loadMembers();
      void loadInviteStatus();
    }, 0);

    return () => clearTimeout(timer);
  }, [
    activeTeam?.id,
    activeTeam?.name,
    activeTeam?.timezone,
    loadInviteStatus,
    loadMembers,
    location.key,
  ]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadMembers();
        void loadInviteStatus();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadInviteStatus, loadMembers]);

  const refreshActiveTeam = useCallback(() => {
    void refreshTeams();
  }, [refreshTeams]);

  useTeamRealtime({
    isOwner,
    onInviteChange: loadInviteStatus,
    onMembersChange: loadMembers,
    onTeamChange: refreshActiveTeam,
    teamId: activeTeam?.id ?? null,
  });

  const saveTeam = async () => {
    if (!activeTeam) return;

    setSavingTeam(true);
    setTeamMessage(null);
    try {
      await updateTeam(activeTeam.id, { name, timezone });
      await refreshTeams();
      setTeamMessage('Зміни збережено.');
    } catch (error) {
      setTeamMessage(
        error instanceof Error ? error.message : 'Не вдалося зберегти зміни.',
      );
    } finally {
      setSavingTeam(false);
    }
  };

  const createInvite = async () => {
    if (!activeTeam) return;

    setInviteLoading(true);
    setInviteMessage(null);
    try {
      const invite = await createTeamInvite(activeTeam.id);
      setInviteLink(buildAppUrl(joinPath(invite.token)));
      setInviteExpiry(invite.expires_at);
      setInviteDialogMessage(null);
      setInviteDialogOpen(true);
    } catch (error) {
      setInviteMessage(
        error instanceof Error
          ? error.message
          : 'Не вдалося створити посилання-запрошення.',
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteDialogMessage('Посилання скопійовано.');
    } catch {
      setInviteDialogMessage('Скопіюйте посилання вручну з поля вище.');
    }
  };

  const shareInvite = async () => {
    if (!inviteLink) return;

    setInviteDialogMessage(null);
    try {
      await shareLink({
        text: 'Приєднуйтесь до моєї команди у Bar Checklist.',
        title: 'Запрошення до команди',
        url: inviteLink,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setInviteDialogMessage('Не вдалося відкрити меню поширення.');
    }
  };

  const closeInviteDialog = () => {
    setInviteDialogOpen(false);
    setInviteDialogMessage(null);
    setInviteLink(null);
  };

  const revokeInvite = async () => {
    if (!activeTeam) return;

    setInviteLoading(true);
    setInviteMessage(null);
    try {
      await revokeTeamInvite(activeTeam.id);
      closeInviteDialog();
      setInviteExpiry(null);
      setInviteMessage('Запрошення відкликано.');
    } catch (error) {
      setInviteMessage(
        error instanceof Error
          ? error.message
          : 'Не вдалося відкликати запрошення.',
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!activeTeam) return;

    setMemberActionId(userId);
    setMembersError(null);
    try {
      await removeTeamMember(activeTeam.id, userId);
      await loadMembers();
    } catch (error) {
      setMembersError(
        error instanceof Error
          ? error.message
          : 'Не вдалося видалити учасника.',
      );
    } finally {
      setMemberActionId(null);
    }
  };

  const leave = async () => {
    if (!activeTeam) return;

    setLeaveLoading(true);
    setTeamMessage(null);
    try {
      await leaveTeam(activeTeam.id);
      await refreshTeams();
      navigate('/', { replace: true });
    } catch (error) {
      setTeamMessage(
        error instanceof Error ? error.message : 'Не вдалося вийти з команди.',
      );
    } finally {
      setLeaveLoading(false);
    }
  };

  const removeTeam = async () => {
    if (!activeTeam || deleteName !== activeTeam.name) return;

    setDeleteLoading(true);
    setTeamMessage(null);
    try {
      await deleteTeam(activeTeam.id);
      await refreshTeams();
      navigate('/', { replace: true });
    } catch (error) {
      setTeamMessage(
        error instanceof Error ? error.message : 'Не вдалося видалити команду.',
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const teamButtons = useMemo(
    () =>
      teams.map((team) => (
        <Button
          className={cn(
            'join-item',
            team.id === activeTeam?.id && 'btn-active',
          )}
          key={team.id}
          onClick={() => selectTeam(team.id)}
          size="sm"
        >
          {team.name}
        </Button>
      )),
    [activeTeam?.id, selectTeam, teams],
  );

  if (status === 'loading' || !activeTeam) {
    return (
      <Screen inset scroll={false}>
        <Loading label="Завантажуємо команду…" size="lg" />
      </Screen>
    );
  }

  return (
    <Screen inset>
      <header className="sticky -top-4 z-20 -mx-4 -mt-4 border-b border-base-300 bg-base-100 px-4 py-2 shadow-sm">
        <div className="navbar min-h-0 px-0">
          <div className="navbar-start">
            <div>
              <h1 className="text-xl font-semibold">{activeTeam.name}</h1>
              <p className="text-sm text-base-content/60">
                {session?.user.email}
              </p>
            </div>
          </div>
          <div className="navbar-end">
            <Button onClick={() => void signOut()} size="sm" variant="ghost">
              Вийти
            </Button>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-full h-5 bg-linear-to-b from-base-100 to-transparent"
        />
      </header>

      {teamsError ? <Alert color="error">{teamsError}</Alert> : null}

      {teams.length > 1 ? (
        <Card
          description="Виберіть команду, дані якої хочете переглянути."
          title="Активна команда"
        >
          <div className="join join-horizontal flex-wrap">{teamButtons}</div>
        </Card>
      ) : null}

      <Card
        description="Timezone використовується для визначення робочого дня команди."
        title="Налаштування команди"
      >
        <div className="flex flex-col gap-5">
          <Input
            disabled={!isOwner}
            label="Назва"
            onChangeText={setName}
            value={name}
          />
          <Input
            disabled={!isOwner}
            helperText="IANA timezone, наприклад Europe/Kyiv."
            label="Timezone"
            onChangeText={setTimezone}
            spellCheck={false}
            value={timezone}
          />
          {teamMessage ? (
            <Alert
              color={teamMessage === 'Зміни збережено.' ? 'success' : 'error'}
            >
              {teamMessage}
            </Alert>
          ) : null}
          {isOwner ? (
            <Button
              className="btn-block"
              color="primary"
              loading={savingTeam}
              onClick={() => void saveTeam()}
            >
              Зберегти зміни
            </Button>
          ) : (
            <AppText tone="muted">Лише owner може змінювати ці дані.</AppText>
          )}
        </div>
      </Card>

      <Card
        description="Усі учасники можуть переглядати командні дані."
        title="Учасники"
      >
        <div className="flex flex-col gap-4">
          {membersLoading ? <Loading label="Завантажуємо учасників…" /> : null}
          {membersError ? <Alert color="error">{membersError}</Alert> : null}
          <ul className="list">
            {members.map((member) => {
              const memberIsOwner = member.user_id === activeTeam.owner_id;
              return (
                <li className="list-row" key={member.user_id}>
                  <div className="list-col-grow">
                    <AppText variant="label">{member.displayName}</AppText>
                    <Badge
                      className={memberIsOwner ? undefined : 'badge-ghost'}
                    >
                      {memberIsOwner ? 'Owner' : 'Учасник'}
                    </Badge>
                  </div>
                  {isOwner && !memberIsOwner ? (
                    <Button
                      color="error"
                      loading={memberActionId === member.user_id}
                      onClick={() => void removeMember(member.user_id)}
                      size="sm"
                    >
                      Видалити
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {!membersLoading && members.length === 0 ? (
            <AppText tone="muted">У команді поки немає учасників.</AppText>
          ) : null}
          {!isOwner ? (
            <Button
              className="btn-block"
              loading={leaveLoading}
              onClick={() => void leave()}
            >
              Вийти з команди
            </Button>
          ) : null}
        </div>
      </Card>

      {isOwner ? (
        <Card
          description="Посилання дійсне 7 днів і може бути використане багатьма людьми."
          title="Запрошення"
        >
          <div className="flex flex-col gap-4">
            {inviteExpiry ? (
              <AppText tone="muted">
                Активне запрошення до {formatExpiry(inviteExpiry)}.
              </AppText>
            ) : (
              <AppText tone="muted">Активного запрошення немає.</AppText>
            )}
            {inviteMessage ? <Alert>{inviteMessage}</Alert> : null}
            <div className="flex flex-col gap-2">
              <Button
                className="btn-block"
                loading={inviteLoading}
                onClick={() => void createInvite()}
              >
                {inviteExpiry
                  ? 'Створити нове посилання'
                  : 'Створити посилання'}
              </Button>
              {inviteExpiry ? (
                <Button
                  className="btn-block"
                  color="error"
                  loading={inviteLoading}
                  onClick={() => void revokeInvite()}
                >
                  Відкликати
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <Modal
        description="Скопіюйте або поширте посилання зараз. Після закриття цього вікна його не можна буде відновити."
        onClose={closeInviteDialog}
        open={inviteDialogOpen}
        title="Запрошення до команди"
      >
        <div className="flex flex-col gap-4">
          {inviteLink ? (
            <Input readOnly label="Посилання" value={inviteLink} />
          ) : null}
          {inviteExpiry ? (
            <AppText tone="muted">
              Дійсне до {formatExpiry(inviteExpiry)}.
            </AppText>
          ) : null}
          {inviteDialogMessage ? <Alert>{inviteDialogMessage}</Alert> : null}
          <div className="modal-action flex-wrap">
            <Button onClick={() => void shareInvite()}>Поділитися</Button>
            <Button color="primary" onClick={() => void copyInvite()}>
              Копіювати
            </Button>
            <Button onClick={closeInviteDialog} variant="ghost">
              Закрити
            </Button>
          </div>
        </div>
      </Modal>

      {isOwner ? (
        <Card
          description="Ця дія назавжди видалить команду й усі її дочірні дані."
          title="Видалити команду"
        >
          <div className="flex flex-col gap-4">
            <Input
              error={
                deleteName.length > 0 && deleteName !== activeTeam.name
                  ? 'Введіть точну назву команди.'
                  : undefined
              }
              label={`Введіть «${activeTeam.name}» для підтвердження`}
              onChangeText={setDeleteName}
              value={deleteName}
            />
            <Button
              className="btn-block"
              color="error"
              disabled={deleteName !== activeTeam.name}
              loading={deleteLoading}
              onClick={() => void removeTeam()}
            >
              Видалити назавжди
            </Button>
          </div>
        </Card>
      ) : null}
    </Screen>
  );
}
