import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  Alert,
  AppText,
  Badge,
  Button,
  Icon,
  IconButton,
  Input,
  ListRow,
  Page,
  Skeleton,
  useToast,
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
import { initials } from '@/features/teams/team-display';
import { DeleteTeamSheet, InviteSheet } from '@/features/teams/team-sheets';
import { joinPath } from '@/features/teams/team-routes';
import { useTeams } from '@/features/teams/team-context';
import { useTeamRealtime } from '@/features/teams/use-team-realtime';
import { buildAppUrl, shareLink } from '@/lib/platform';

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function TeamRoute() {
  const toast = useToast();
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
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);

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
      toast('Зміни збережено');
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
      toast('Посилання скопійовано');
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

  const openInviteSheet = () => {
    setInviteDialogOpen(true);
  };

  const revokeInvite = async () => {
    if (!activeTeam) return;

    setInviteLoading(true);
    setInviteMessage(null);
    try {
      await revokeTeamInvite(activeTeam.id);
      closeInviteDialog();
      setInviteExpiry(null);
      toast('Запрошення відкликано.');
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

  const closeDeleteSheet = () => {
    setDeleteSheetOpen(false);
    setDeleteName('');
  };

  const toolbarActions = (
    <>
      {teams.length > 1 ? (
        <div className="dropdown dropdown-end dropdown-bottom">
          <IconButton
            icon="arrow-left-right"
            label="Змінити команду"
            tabIndex={0}
          />
          <ul
            className="menu dropdown-content z-30 mt-1 w-52 rounded-box bg-base-100 shadow-sm"
            tabIndex={0}
          >
            {teams.map((team) => (
              <li key={team.id}>
                <button
                  className={team.id === activeTeam?.id ? 'menu-active' : ''}
                  onClick={() => selectTeam(team.id)}
                  type="button"
                >
                  {team.name}
                  {team.id === activeTeam?.id ? (
                    <Icon className="size-4" name="check" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <IconButton
        icon="log-out"
        label="Вийти з акаунта"
        onClick={() => void signOut()}
      />
      <div className="dropdown dropdown-end dropdown-bottom">
        <IconButton icon="more-horizontal" label="Ще" tabIndex={0} />
        <ul
          className="menu dropdown-content z-30 mt-1 w-52 rounded-box bg-base-100 shadow-sm"
          tabIndex={0}
        >
          {isOwner ? (
            <li>
              <button
                className="text-error"
                onClick={() => setDeleteSheetOpen(true)}
                type="button"
              >
                Видалити команду
              </button>
            </li>
          ) : (
            <li>
              <button
                className="text-error"
                disabled={leaveLoading}
                onClick={() => void leave()}
                type="button"
              >
                Вийти з команди
              </button>
            </li>
          )}
        </ul>
      </div>
    </>
  );

  if (status === 'loading' || !activeTeam) {
    return (
      <Page title="Команда">
        <Skeleton />
      </Page>
    );
  }

  return (
    <Page actions={toolbarActions} title={activeTeam.name}>
      <AppText className="block max-w-full truncate" variant="caption">
        {session?.user.email}
      </AppText>

      {teamsError ? <Alert color="error">{teamsError}</Alert> : null}
      {!isOwner && teamMessage ? (
        <Alert color="error">{teamMessage}</Alert>
      ) : null}

      <section className="flex flex-col gap-1">
        <AppText as="h2" variant="overline">
          Команда
        </AppText>
        {isOwner ? (
          <div className="flex flex-col gap-4">
            <Input label="Назва" onChangeText={setName} value={name} />
            <Input
              helperText="IANA timezone, наприклад Europe/Kyiv."
              label="Timezone"
              onChangeText={setTimezone}
              spellCheck={false}
              value={timezone}
            />
            {teamMessage ? <Alert color="error">{teamMessage}</Alert> : null}
            <Button
              className="btn-block"
              loading={savingTeam}
              onClick={() => void saveTeam()}
            >
              Зберегти зміни
            </Button>
          </div>
        ) : (
          <ul className="list">
            <ListRow meta={activeTeam.name} title="Назва" />
            <ListRow meta={activeTeam.timezone} title="Timezone" />
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-1">
        <AppText as="h2" variant="overline">
          Учасники
        </AppText>
        {membersLoading ? <Skeleton rows={2} /> : null}
        {membersError ? <Alert color="error">{membersError}</Alert> : null}
        {!membersLoading ? (
          <>
            <ul className="list">
              {members.map((member) => {
                const memberIsOwner = member.user_id === activeTeam.owner_id;
                return (
                  <ListRow
                    key={member.user_id}
                    leading={
                      <div className="avatar avatar-placeholder">
                        <div className="w-10 rounded-full bg-neutral text-neutral-content">
                          <span className="text-sm">
                            {initials(member.displayName)}
                          </span>
                        </div>
                      </div>
                    }
                    title={member.displayName}
                    trailing={
                      memberIsOwner ? (
                        <Badge color="primary" size="sm" soft>
                          Owner
                        </Badge>
                      ) : isOwner ? (
                        <IconButton
                          className="text-error"
                          disabled={memberActionId === member.user_id}
                          icon="trash"
                          label={`Видалити ${member.displayName}`}
                          onClick={() => void removeMember(member.user_id)}
                          size="sm"
                        />
                      ) : undefined
                    }
                  />
                );
              })}
            </ul>
            {members.length === 0 ? (
              <AppText variant="caption">
                У команді поки немає учасників.
              </AppText>
            ) : null}
          </>
        ) : null}
      </section>

      {isOwner ? (
        <section className="flex flex-col gap-1">
          <AppText as="h2" variant="overline">
            Запрошення
          </AppText>
          {inviteMessage ? <Alert color="error">{inviteMessage}</Alert> : null}
          <ul className="list">
            <ListRow
              meta={
                inviteExpiry
                  ? `До ${formatExpiry(inviteExpiry)}`
                  : 'Створіть посилання для нових учасників'
              }
              onClick={openInviteSheet}
              title={
                inviteExpiry ? 'Активне запрошення' : 'Запрошення неактивне'
              }
              trailing={
                <Icon className="text-base-content/40" name="chevron-right" />
              }
            />
          </ul>
        </section>
      ) : null}

      <InviteSheet
        formatExpiry={formatExpiry}
        inviteDialogMessage={inviteDialogMessage}
        inviteExpiry={inviteExpiry}
        inviteLink={inviteLink}
        inviteLoading={inviteLoading}
        onClose={closeInviteDialog}
        onCopyInvite={() => void copyInvite()}
        onCreateInvite={() => void createInvite()}
        onRevokeInvite={() => void revokeInvite()}
        onShareInvite={() => void shareInvite()}
        open={inviteDialogOpen}
      />

      {isOwner ? (
        <DeleteTeamSheet
          deleteError={deleteSheetOpen ? teamMessage : null}
          deleteLoading={deleteLoading}
          deleteName={deleteName}
          onClose={closeDeleteSheet}
          onDelete={() => void removeTeam()}
          onDeleteNameChange={setDeleteName}
          open={deleteSheetOpen}
          teamName={activeTeam.name}
        />
      ) : null}
    </Page>
  );
}
