import { useCallback, useEffect, useRef, useState } from 'react';
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
  Modal,
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
  type TeamMember,
  updateTeam,
} from '@/features/teams/team-api';
import { initials } from '@/features/teams/team-display';
import { OnboardingForm } from '@/features/teams/onboarding-form';
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
  const { session } = useAuth();
  const { activeTeam, error: teamsError, refreshTeams, status } = useTeams();
  const navigate = useNavigate();
  const location = useLocation();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(true);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [teamMessage, setTeamMessage] = useState<string | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [editingField, setEditingField] = useState<'name' | 'timezone' | null>(
    null,
  );
  const [editingValue, setEditingValue] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{
    color: 'error' | 'success';
    text: string;
  } | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [deleteName, setDeleteName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const activeTeamIdRef = useRef(activeTeam?.id ?? null);
  const inviteStatusRequestId = useRef(0);
  const inviteCreateRequestId = useRef(0);
  const membersRequestId = useRef(0);

  useEffect(() => {
    activeTeamIdRef.current = activeTeam?.id ?? null;
  }, [activeTeam?.id]);

  const isOwner = Boolean(
    activeTeam && session?.user.id === activeTeam.owner_id,
  );

  const loadMembers = useCallback(async () => {
    if (!activeTeam) return;

    const teamId = activeTeam.id;
    const requestId = ++membersRequestId.current;
    setMembersLoading(true);
    setMembersError(null);
    try {
      const nextMembers = await fetchTeamMembers(teamId);
      if (
        requestId === membersRequestId.current &&
        activeTeamIdRef.current === teamId
      ) {
        setMembers(nextMembers);
      }
    } catch (error) {
      if (
        requestId === membersRequestId.current &&
        activeTeamIdRef.current === teamId
      ) {
        setMembersError(
          error instanceof Error
            ? error.message
            : 'Не вдалося завантажити учасників.',
        );
      }
    } finally {
      if (
        requestId === membersRequestId.current &&
        activeTeamIdRef.current === teamId
      ) {
        setMembersLoading(false);
      }
    }
  }, [activeTeam]);

  const loadInviteStatus = useCallback(async () => {
    if (!activeTeam || !isOwner) return;

    const teamId = activeTeam.id;
    const requestId = ++inviteStatusRequestId.current;
    try {
      const invite = await fetchCurrentTeamInvite(teamId);
      if (
        requestId === inviteStatusRequestId.current &&
        activeTeamIdRef.current === teamId
      ) {
        setInviteExpiry(invite?.expires_at ?? null);
      }
    } catch (error) {
      if (
        requestId === inviteStatusRequestId.current &&
        activeTeamIdRef.current === teamId
      ) {
        setInviteMessage(
          error instanceof Error
            ? error.message
            : 'Не вдалося перевірити запрошення.',
        );
      }
    }
  }, [activeTeam, isOwner]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setName(activeTeam?.name ?? '');
      setTimezone(activeTeam?.timezone ?? '');
      setDeleteName('');
      setInviteLink(null);
      setInviteDialogOpen(false);
      setInviteFeedback(null);
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

  const { retry: retryRealtime, status: realtimeStatus } = useTeamRealtime({
    isOwner,
    onInviteChange: loadInviteStatus,
    onMembersChange: loadMembers,
    onTeamChange: refreshActiveTeam,
    teamId: activeTeam?.id ?? null,
  });

  const openTeamEditor = (field: 'name' | 'timezone') => {
    setTeamMessage(null);
    setEditingField(field);
    setEditingValue(field === 'name' ? name : timezone);
  };

  const closeTeamEditor = () => {
    if (savingTeam) return;
    setEditingField(null);
    setEditingValue('');
    setTeamMessage(null);
  };

  const saveTeam = async () => {
    if (!activeTeam) return;

    const teamId = activeTeam.id;
    setSavingTeam(true);
    setTeamMessage(null);
    try {
      const nextName = editingField === 'name' ? editingValue : name;
      const nextTimezone =
        editingField === 'timezone' ? editingValue : timezone;
      await updateTeam(teamId, { name: nextName, timezone: nextTimezone });
      if (activeTeamIdRef.current !== teamId) return;
      setName(nextName);
      setTimezone(nextTimezone);
      await refreshTeams();
      if (activeTeamIdRef.current !== teamId) return;
      setEditingField(null);
      setEditingValue('');
      toast('Зміни збережено');
    } catch (error) {
      if (activeTeamIdRef.current === teamId) {
        setTeamMessage(
          error instanceof Error ? error.message : 'Не вдалося зберегти зміни.',
        );
      }
    } finally {
      setSavingTeam(false);
    }
  };

  const createInvite = async () => {
    if (!activeTeam) return;

    const teamId = activeTeam.id;
    const requestId = ++inviteCreateRequestId.current;
    setInviteLoading(true);
    setInviteMessage(null);
    try {
      const invite = await createTeamInvite(teamId);
      if (
        requestId !== inviteCreateRequestId.current ||
        activeTeamIdRef.current !== teamId
      ) {
        return;
      }
      setInviteLink(buildAppUrl(joinPath(invite.token)));
      setInviteExpiry(invite.expires_at);
      setInviteFeedback(null);
      setInviteDialogOpen(true);
    } catch (error) {
      if (
        requestId === inviteCreateRequestId.current &&
        activeTeamIdRef.current === teamId
      ) {
        setInviteMessage(
          error instanceof Error
            ? error.message
            : 'Не вдалося створити посилання-запрошення.',
        );
      }
    } finally {
      if (
        requestId === inviteCreateRequestId.current &&
        activeTeamIdRef.current === teamId
      ) {
        setInviteLoading(false);
      }
    }
  };

  const shareInvite = async () => {
    if (!inviteLink) return;

    const teamId = activeTeamIdRef.current;
    const createRequestId = inviteCreateRequestId.current;

    setInviteFeedback(null);
    try {
      const result = await shareLink({
        text: 'Приєднуйтесь до моєї команди у Checklister.',
        title: 'Запрошення до команди',
        url: inviteLink,
      });
      if (
        activeTeamIdRef.current !== teamId ||
        inviteCreateRequestId.current !== createRequestId
      ) {
        return;
      }
      setInviteFeedback({
        color: 'success',
        text:
          result === 'copied'
            ? 'Посилання скопійовано.'
            : 'Запрошення передано для поширення.',
      });
    } catch (error) {
      if (
        activeTeamIdRef.current !== teamId ||
        inviteCreateRequestId.current !== createRequestId
      ) {
        return;
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'AbortError'
      ) {
        return;
      }
      setInviteFeedback({
        color: 'error',
        text: 'Не вдалося поділитися запрошенням.',
      });
    }
  };

  const closeInviteDialog = () => {
    inviteCreateRequestId.current += 1;
    setInviteDialogOpen(false);
    setInviteFeedback(null);
    setInviteLink(null);
  };

  const removeMember = async (userId: string) => {
    if (!activeTeam) return;

    const teamId = activeTeam.id;
    setMemberActionId(userId);
    setMembersError(null);
    try {
      await removeTeamMember(teamId, userId);
      if (activeTeamIdRef.current !== teamId) return;
      await loadMembers();
    } catch (error) {
      if (activeTeamIdRef.current === teamId) {
        setMembersError(
          error instanceof Error
            ? error.message
            : 'Не вдалося видалити учасника.',
        );
      }
    } finally {
      if (activeTeamIdRef.current === teamId) setMemberActionId(null);
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

  if (status === 'idle' || status === 'loading') {
    return (
      <Page title="Команда">
        <Skeleton />
      </Page>
    );
  }

  if (!activeTeam) {
    return (
      <Page title="Команда">
        {teamsError ? (
          <Alert color="error">
            <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
              <span>{teamsError}</span>
              <Button
                onClick={() => void refreshTeams()}
                size="sm"
                variant="ghost"
              >
                Повторити
              </Button>
            </div>
          </Alert>
        ) : (
          <section
            aria-labelledby="create-team-title"
            className="flex flex-col gap-4"
          >
            <div>
              <AppText as="h2" id="create-team-title" variant="heading">
                Створіть команду
              </AppText>
              <AppText variant="caption">
                Після цього можна додати чеклісти та запросити учасників.
              </AppText>
            </div>
            <OnboardingForm />
          </section>
        )}
      </Page>
    );
  }

  return (
    <Page title="Команда">
      {teamsError ? (
        <Alert color="error">
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
            <span>{teamsError}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void refreshTeams()}
            >
              Повторити
            </Button>
          </div>
        </Alert>
      ) : null}
      {realtimeStatus !== 'connected' ? (
        <Alert color="warning">
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
            <span>
              {realtimeStatus === 'connecting'
                ? 'Підключаємо оновлення команди…'
                : 'Оновлення команди тимчасово недоступні.'}
            </span>
            {realtimeStatus === 'degraded' ? (
              <Button size="sm" variant="ghost" onClick={retryRealtime}>
                Повторити
              </Button>
            ) : null}
          </div>
        </Alert>
      ) : null}
      {!isOwner && teamMessage ? (
        <Alert color="error">{teamMessage}</Alert>
      ) : null}

      <section className="flex flex-col gap-1 border-t border-base-300 pt-5">
        <AppText as="h2" variant="overline">
          Команда
        </AppText>
        <ul className="list">
          {(
            [
              ['name', 'Назва', name, 'Редагувати назву команди'],
              ['timezone', 'Timezone', timezone, 'Редагувати часовий пояс'],
            ] as const
          ).map(([field, label, value, editLabel]) => (
            <li
              className="flex min-h-14 items-center justify-between gap-3 border-b border-base-300/60 px-0"
              key={field}
            >
              <div className="min-w-0">
                <div className="text-sm text-base-content/60">{label}</div>
                <div className="truncate text-base">{value}</div>
              </div>
              {isOwner ? (
                <IconButton
                  icon="pencil"
                  label={editLabel}
                  onClick={() => openTeamEditor(field)}
                  size="sm"
                />
              ) : null}
            </li>
          ))}
        </ul>
        {teamMessage && !editingField ? (
          <Alert color="error">{teamMessage}</Alert>
        ) : null}
      </section>

      <section className="flex flex-col gap-1 border-t border-base-300 pt-5">
        <div className="flex items-center gap-2">
          <AppText as="h2" variant="overline">
            Учасники
          </AppText>
          {isOwner ? (
            <button
              aria-label={
                inviteExpiry
                  ? 'Створити нове запрошення'
                  : 'Створити запрошення'
              }
              className="btn btn-circle btn-sm"
              disabled={inviteLoading}
              onClick={() => void createInvite()}
              type="button"
            >
              {inviteLoading ? (
                <span className="loading loading-sm loading-spinner" />
              ) : (
                <Icon name="user-plus" />
              )}
            </button>
          ) : null}
        </div>
        {inviteMessage ? <Alert color="error">{inviteMessage}</Alert> : null}
        {membersLoading ? <Skeleton rows={2} /> : null}
        {membersError ? (
          <Alert color="error">
            <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
              <span>{membersError}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void loadMembers()}
              >
                Повторити
              </Button>
            </div>
          </Alert>
        ) : null}
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
            <div className="divider my-2" />
            {isOwner ? (
              <Button
                className="btn-block"
                color="error"
                onClick={() => setDeleteSheetOpen(true)}
                variant="outline"
              >
                Видалити команду
              </Button>
            ) : (
              <Button
                className="btn-block"
                color="error"
                disabled={leaveLoading}
                loading={leaveLoading}
                onClick={() => void leave()}
                variant="outline"
              >
                Вийти з команди
              </Button>
            )}
          </>
        ) : null}
      </section>

      <InviteSheet
        formatExpiry={formatExpiry}
        inviteFeedback={inviteFeedback}
        inviteExpiry={inviteExpiry}
        inviteLink={inviteLink}
        onClose={closeInviteDialog}
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

      {isOwner ? (
        <Modal
          description={
            editingField === 'name'
              ? 'Змініть назву, яку бачать учасники команди.'
              : 'Вкажіть IANA timezone, наприклад Europe/Kyiv.'
          }
          onClose={closeTeamEditor}
          open={editingField !== null}
          title={
            editingField === 'name'
              ? 'Редагувати назву команди'
              : 'Редагувати часовий пояс'
          }
        >
          <div className="flex flex-col gap-4">
            <Input
              autoFocus
              label={editingField === 'name' ? 'Назва' : 'Timezone'}
              onChangeText={setEditingValue}
              spellCheck={editingField !== 'timezone'}
              value={editingValue}
            />
            {teamMessage ? <Alert color="error">{teamMessage}</Alert> : null}
            <div className="modal-action">
              <Button
                disabled={savingTeam}
                onClick={closeTeamEditor}
                variant="ghost"
              >
                Скасувати
              </Button>
              <Button loading={savingTeam} onClick={() => void saveTeam()}>
                Зберегти
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </Page>
  );
}
