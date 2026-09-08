import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@/lib/router-hooks';

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
  leaveTeam,
  removeTeamMember,
  updateTeam,
} from '@/features/teams/team-api';
import { initials } from '@/features/teams/team-display';
import { OnboardingForm } from '@/features/teams/onboarding-form';
import { DeleteTeamSheet, InviteSheet } from '@/features/teams/team-sheets';
import { joinPath } from '@/features/teams/team-routes';
import { teamMembersQueryOptions } from '@/features/teams/team-queries';
import { useTeams } from '@/features/teams/team-context';
import { useTeamRealtimeStatus } from '@/features/teams/team-realtime-context';
import { buildAppUrl, shareLink } from '@/lib/platform';
import { queryKeys } from '@/lib/query-client';

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
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [teamMessage, setTeamMessage] = useState<string | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [editingField, setEditingField] = useState<'name' | 'timezone' | null>(
    null,
  );
  const [editingValue, setEditingValue] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
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
  const inviteTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const editTriggerRef = useRef<HTMLElement | null>(null);
  const queryClient = useQueryClient();
  const invalidateTeams = async () => {
    if (session)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teams(session.user.id),
      });
  };
  const updateTeamMutation = useMutation({
    mutationFn: ({
      teamId,
      name,
      timezone,
    }: {
      teamId: string;
      name: string;
      timezone: string;
    }) => updateTeam(teamId, { name, timezone }),
    onSuccess: invalidateTeams,
  });
  const inviteMutation = useMutation({ mutationFn: createTeamInvite });
  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      removeTeamMember(teamId, userId),
  });
  const leaveMutation = useMutation({
    mutationFn: leaveTeam,
    onSuccess: invalidateTeams,
  });
  const deleteTeamMutation = useMutation({
    mutationFn: deleteTeam,
    onSuccess: invalidateTeams,
  });
  const inviteCreateRequestId = useRef(0);
  const membersQuery = useQuery({
    ...teamMembersQueryOptions(activeTeam?.id ?? 'none'),
    enabled: Boolean(activeTeam),
  });
  const inviteQuery = useQuery({
    enabled: Boolean(activeTeam && session?.user.id === activeTeam?.owner_id),
    queryFn: () => fetchCurrentTeamInvite(activeTeam!.id),
    queryKey: queryKeys.teamInvite(activeTeam?.id ?? 'none'),
  });
  const members = membersQuery.data ?? [];
  const membersError =
    membersQuery.error instanceof Error ? membersQuery.error.message : null;
  const membersLoading = membersQuery.isLoading;
  const inviteExpiry = inviteQuery.data?.expires_at ?? null;

  useEffect(() => {
    activeTeamIdRef.current = activeTeam?.id ?? null;
  }, [activeTeam?.id]);

  const isOwner = Boolean(
    activeTeam && session?.user.id === activeTeam.owner_id,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setName(activeTeam?.name ?? '');
      setTimezone(activeTeam?.timezone ?? '');
      setDeleteName('');
      setInviteLink(null);
      setInviteDialogOpen(false);
      setInviteFeedback(null);
      setInviteMessage(null);
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTeam?.id, activeTeam?.name, activeTeam?.timezone, location.href]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void membersQuery.refetch();
        void inviteQuery.refetch();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [inviteQuery, membersQuery]);

  const { retry: retryRealtime, status: realtimeStatus } =
    useTeamRealtimeStatus();

  const openTeamEditor = (field: 'name' | 'timezone', trigger: HTMLElement) => {
    editTriggerRef.current = trigger;
    setTeamMessage(null);
    setEditingField(field);
    setEditingValue(
      field === 'name'
        ? (activeTeam?.name ?? name)
        : (activeTeam?.timezone ?? timezone),
    );
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
      await updateTeamMutation.mutateAsync({
        teamId,
        name: nextName,
        timezone: nextTimezone,
      });
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
      const invite = await inviteMutation.mutateAsync(teamId);
      if (
        requestId !== inviteCreateRequestId.current ||
        activeTeamIdRef.current !== teamId
      ) {
        return;
      }
      setInviteLink(buildAppUrl(joinPath(invite.token)));
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
    try {
      await removeMemberMutation.mutateAsync({ teamId, userId });
      if (activeTeamIdRef.current !== teamId) return;
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teamMembers(teamId),
      });
    } catch (error) {
      if (activeTeamIdRef.current === teamId) {
        setTeamMessage(
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
      await leaveMutation.mutateAsync(activeTeam.id);
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
      await deleteTeamMutation.mutateAsync(activeTeam.id);
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

      <section
        aria-label="Налаштування команди"
        className="flex flex-col gap-1 border-t border-base-300 pt-5"
      >
        <ul className="list">
          {(
            [
              [
                'name',
                'Назва',
                name || activeTeam.name,
                'Редагувати назву команди',
              ],
              [
                'timezone',
                'Timezone',
                timezone || activeTeam.timezone,
                'Редагувати часовий пояс',
              ],
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
                  onClick={(event) =>
                    openTeamEditor(field, event.currentTarget)
                  }
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
        <div className="flex items-center justify-between gap-2">
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
              ref={inviteTriggerRef}
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
                onClick={() => void membersQuery.refetch()}
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
                ref={deleteTriggerRef}
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
        triggerRef={inviteTriggerRef}
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
          triggerRef={deleteTriggerRef}
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
          triggerRef={editTriggerRef}
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
