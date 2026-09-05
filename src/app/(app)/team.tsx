import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Share, View } from 'react-native';

import { AppText, Button, Card, Input, Loading, Screen } from '@/components/ui';
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

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function TeamScreen() {
  const { session, signOut } = useAuth();
  const {
    activeTeam,
    error: teamsError,
    refreshTeams,
    selectTeam,
    status,
    teams,
  } = useTeams();
  const router = useRouter();
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
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadMembers();
      void loadInviteStatus();
    }, [loadInviteStatus, loadMembers]),
  );

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
      setInviteLink(Linking.createURL(joinPath(invite.token)));
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
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share({
          text: 'Приєднуйтесь до моєї команди у Bar Checklist.',
          title: 'Запрошення до команди',
          url: inviteLink,
        });
      } else {
        await Share.share({
          message: inviteLink,
          title: 'Запрошення до команди',
        });
      }
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
      router.replace('/');
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
      router.replace('/');
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
          key={team.id}
          onPress={() => selectTeam(team.id)}
          size="sm"
          color={team.id === activeTeam?.id ? 'primary' : 'secondary'}
        >
          {team.name}
        </Button>
      )),
    [activeTeam?.id, selectTeam, teams],
  );

  if (status === 'loading' || !activeTeam) {
    return (
      <Screen scroll={false}>
        <Loading label="Завантажуємо команду…" size="lg" />
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-row flex-wrap items-start justify-between gap-4">
        <View className="gap-1">
          <AppText variant="title">Команда</AppText>
          <AppText tone="muted">{session?.user.email}</AppText>
        </View>
        <Button onPress={() => void signOut()} variant="ghost">
          Вийти
        </Button>
      </View>

      {teamsError ? <AppText tone="error">{teamsError}</AppText> : null}

      {teams.length > 1 ? (
        <Card
          description="Виберіть команду, дані якої хочете переглянути."
          title="Активна команда"
        >
          <View className="flex-row flex-wrap gap-3">{teamButtons}</View>
        </Card>
      ) : null}

      <Card
        description="Timezone використовується для визначення робочого дня команди."
        title="Налаштування команди"
      >
        <View className="gap-5">
          <Input
            editable={isOwner}
            label="Назва"
            onChangeText={setName}
            value={name}
          />
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            editable={isOwner}
            helperText="IANA timezone, наприклад Europe/Kyiv."
            label="Timezone"
            onChangeText={setTimezone}
            value={timezone}
          />
          {teamMessage ? (
            <AppText
              tone={teamMessage === 'Зміни збережено.' ? 'success' : 'error'}
            >
              {teamMessage}
            </AppText>
          ) : null}
          {isOwner ? (
            <Button
              loading={savingTeam}
              onPress={() => void saveTeam()}
              color="primary"
            >
              Зберегти зміни
            </Button>
          ) : (
            <AppText tone="muted">Лише owner може змінювати ці дані.</AppText>
          )}
        </View>
      </Card>

      <Card
        description="Усі учасники можуть переглядати командні дані."
        title="Учасники"
      >
        <View className="gap-4">
          {membersLoading ? <Loading label="Завантажуємо учасників…" /> : null}
          {membersError ? <AppText tone="error">{membersError}</AppText> : null}
          {members.map((member) => {
            const memberIsOwner = member.user_id === activeTeam.owner_id;
            return (
              <View
                key={member.user_id}
                className="flex-row flex-wrap items-center justify-between gap-3 border-b border-base-300 pb-4"
              >
                <View className="gap-1">
                  <AppText variant="label">{member.displayName}</AppText>
                  <AppText tone="muted" variant="caption">
                    {memberIsOwner ? 'Owner' : 'Учасник'}
                  </AppText>
                </View>
                {isOwner && !memberIsOwner ? (
                  <Button
                    loading={memberActionId === member.user_id}
                    onPress={() => void removeMember(member.user_id)}
                    size="sm"
                    color="error"
                  >
                    Видалити
                  </Button>
                ) : null}
              </View>
            );
          })}
          {!membersLoading && members.length === 0 ? (
            <AppText tone="muted">У команді поки немає учасників.</AppText>
          ) : null}
          {!isOwner ? (
            <Button
              loading={leaveLoading}
              onPress={() => void leave()}
              color="secondary"
            >
              Вийти з команди
            </Button>
          ) : null}
        </View>
      </Card>

      {isOwner ? (
        <Card
          description="Посилання дійсне 7 днів і може бути використане багатьма людьми."
          title="Запрошення"
        >
          <View className="gap-4">
            {inviteExpiry ? (
              <AppText tone="muted">
                Активне запрошення до {formatExpiry(inviteExpiry)}.
              </AppText>
            ) : (
              <AppText tone="muted">Активного запрошення немає.</AppText>
            )}
            {inviteMessage ? (
              <AppText tone="muted">{inviteMessage}</AppText>
            ) : null}
            <View className="flex-row flex-wrap gap-3">
              <Button
                loading={inviteLoading}
                onPress={() => void createInvite()}
                color="primary"
              >
                {inviteExpiry
                  ? 'Створити нове посилання'
                  : 'Створити посилання'}
              </Button>
              {inviteExpiry ? (
                <Button
                  loading={inviteLoading}
                  onPress={() => void revokeInvite()}
                  color="error"
                >
                  Відкликати
                </Button>
              ) : null}
            </View>
          </View>
        </Card>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={closeInviteDialog}
        transparent
        visible={inviteDialogOpen}
      >
        <View className="flex-1 items-center justify-center bg-neutral/50 p-5">
          <Card
            className="w-full max-w-xl"
            description="Скопіюйте або поширте посилання зараз. Після закриття цього вікна його не можна буде відновити."
            title="Запрошення до команди"
          >
            <View className="gap-4">
              {inviteLink ? (
                <Input editable={false} label="Посилання" value={inviteLink} />
              ) : null}
              {inviteExpiry ? (
                <AppText tone="muted">
                  Дійсне до {formatExpiry(inviteExpiry)}.
                </AppText>
              ) : null}
              {inviteDialogMessage ? (
                <AppText tone="muted">{inviteDialogMessage}</AppText>
              ) : null}
              <View className="flex-row flex-wrap justify-end gap-3">
                <Button onPress={() => void shareInvite()} color="secondary">
                  Поділитися
                </Button>
                <Button onPress={() => void copyInvite()} color="primary">
                  Копіювати
                </Button>
                <Button onPress={closeInviteDialog} variant="ghost">
                  Закрити
                </Button>
              </View>
            </View>
          </Card>
        </View>
      </Modal>

      {isOwner ? (
        <Card
          description="Ця дія назавжди видалить команду й усі її дочірні дані."
          title="Видалити команду"
        >
          <View className="gap-4">
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
              disabled={deleteName !== activeTeam.name}
              loading={deleteLoading}
              onPress={() => void removeTeam()}
              color="error"
            >
              Видалити назавжди
            </Button>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
