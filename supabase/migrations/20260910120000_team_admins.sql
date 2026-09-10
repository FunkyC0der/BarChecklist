alter table public.team_members
  add column role text not null default 'member'
  check (role in ('member', 'admin'));

create or replace function private.protect_team_owner_membership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.teams where id = old.team_id and owner_id = old.user_id
  ) then
    raise exception 'The team owner cannot be removed from team_members.' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    return new;
  end if;
  return old;
end;
$$;

create or replace function private.can_manage_team(requested_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teams
    where id = requested_team_id and owner_id = auth.uid()
  ) or exists (
    select 1 from public.team_members
    where team_id = requested_team_id and user_id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function private.can_manage_team(uuid) to authenticated;

create or replace function public.set_team_member_role(
  p_team_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  owner_id uuid;
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if not private.can_manage_team(p_team_id) then
    raise exception 'Only the team owner or an admin can manage member roles.' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('member', 'admin') then
    raise exception 'Role must be member or admin.' using errcode = '22023';
  end if;
  select teams.owner_id into owner_id from public.teams where id = p_team_id;
  if owner_id = p_user_id then
    raise exception 'The team owner role cannot be changed.' using errcode = '23514';
  end if;
  update public.team_members set role = p_role
  where team_id = p_team_id and user_id = p_user_id;
  if not found then
    raise exception 'The user is not a member of this team.' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.create_team_invite(p_team_id uuid)
returns table (token text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); raw_token text; invitation_expiry timestamptz := now() + interval '7 days';
begin
  if actor is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  if not private.can_manage_team(p_team_id) then raise exception 'Only the team owner or an admin can create an invite.' using errcode = '42501'; end if;
  update public.team_invites set revoked_at = now() where team_id = p_team_id and revoked_at is null;
  raw_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.team_invites (team_id, token_hash, created_by, expires_at)
  values (p_team_id, pg_catalog.encode(extensions.digest(raw_token, 'sha256'), 'hex'), actor, invitation_expiry);
  return query select raw_token, invitation_expiry;
end;
$$;

create or replace function public.revoke_team_invite(p_team_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  if not private.can_manage_team(p_team_id) then raise exception 'Only the team owner or an admin can revoke an invite.' using errcode = '42501'; end if;
  update public.team_invites set revoked_at = now() where team_id = p_team_id and revoked_at is null;
end;
$$;

create or replace function public.remove_team_member(p_team_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); deleted_count integer;
begin
  if actor is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  if not private.can_manage_team(p_team_id) then raise exception 'Only the team owner or an admin can remove members.' using errcode = '42501'; end if;
  if exists (select 1 from public.teams where id = p_team_id and owner_id = p_user_id) then
    raise exception 'The team owner cannot be removed from team_members.' using errcode = '23514';
  end if;
  delete from public.team_members where team_id = p_team_id and user_id = p_user_id;
  get diagnostics deleted_count = row_count;
  if deleted_count = 0 then raise exception 'The user is not a member of this team.' using errcode = '22023'; end if;
end;
$$;

create or replace function public.create_checklist_task(p_checklist_id uuid, p_title text, p_cadence public.task_cadence, p_weekdays smallint[])
returns setof public.tasks language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); checklist_row public.checklists%rowtype; next_position integer;
begin
  if actor is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  select * into checklist_row from public.checklists where id = p_checklist_id for update;
  if not found then raise exception 'Checklist not found.' using errcode = '22023'; end if;
  if checklist_row.deleted_at is not null then raise exception 'The checklist is inactive.' using errcode = '23514'; end if;
  if not private.can_manage_team(checklist_row.team_id) then raise exception 'Only the team owner or an admin can manage tasks.' using errcode = '42501'; end if;
  select coalesce(max(position) + 1, 0) into next_position from public.tasks where checklist_id = p_checklist_id and deleted_at is null;
  return query insert into public.tasks (checklist_id, title, cadence, weekdays, position)
    values (p_checklist_id, btrim(p_title), p_cadence, p_weekdays, next_position) returning *;
end;
$$;

create or replace function public.reorder_checklist_tasks(p_checklist_id uuid, p_task_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); checklist_row public.checklists%rowtype; temporary_start integer;
begin
  if actor is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  select * into checklist_row from public.checklists where id = p_checklist_id for update;
  if not found then raise exception 'Checklist not found.' using errcode = '22023'; end if;
  if checklist_row.deleted_at is not null then raise exception 'The checklist is inactive.' using errcode = '23514'; end if;
  if not private.can_manage_team(checklist_row.team_id) then raise exception 'Only the team owner or an admin can manage tasks.' using errcode = '42501'; end if;
  if p_task_ids is null or cardinality(p_task_ids) <> (select count(*) from public.tasks where checklist_id = p_checklist_id and deleted_at is null)
    or cardinality(p_task_ids) <> (select count(distinct task_id) from unnest(p_task_ids) as task_id)
    or exists (select 1 from unnest(p_task_ids) as task_id where not exists (select 1 from public.tasks where id = task_id and checklist_id = p_checklist_id and deleted_at is null)) then
    raise exception 'Task order must list every active task exactly once.' using errcode = '22023';
  end if;
  select coalesce(max(position), -1) + 1 into temporary_start from public.tasks where checklist_id = p_checklist_id and deleted_at is null;
  if temporary_start > 2147483547 then raise exception 'Task positions are outside the supported range.' using errcode = '22003'; end if;
  update public.tasks as task set position = temporary.position from (select id, (temporary_start + row_number() over (order by position, id))::integer as position from public.tasks where checklist_id = p_checklist_id and deleted_at is null) as temporary where task.id = temporary.id;
  update public.tasks as task set position = ordered.new_position from (select task_id, (ordinality - 1)::integer as new_position from unnest(p_task_ids) with ordinality as listed (task_id, ordinality)) as ordered where task.id = ordered.task_id;
end;
$$;

create or replace function public.soft_delete_checklist(p_checklist_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); checklist_row public.checklists%rowtype;
begin
  if actor is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  select * into checklist_row from public.checklists where id = p_checklist_id for update;
  if not found then raise exception 'Checklist not found.' using errcode = '22023'; end if;
  if not private.can_manage_team(checklist_row.team_id) then raise exception 'Only the team owner or an admin can delete a checklist.' using errcode = '42501'; end if;
  if checklist_row.deleted_at is not null then return; end if;
  update public.checklists set deleted_at = now() where id = p_checklist_id and deleted_at is null;
  update public.tasks set deleted_at = now() where checklist_id = p_checklist_id and deleted_at is null;
end;
$$;

create or replace function public.soft_delete_task(p_task_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); task_row public.tasks%rowtype; task_checklist_id uuid; checklist_team_id uuid;
begin
  if actor is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  select checklist_id into task_checklist_id from public.tasks where id = p_task_id;
  if not found then raise exception 'Task not found.' using errcode = '22023'; end if;
  select team_id into checklist_team_id from public.checklists where id = task_checklist_id for update;
  if checklist_team_id is null then raise exception 'Checklist not found.' using errcode = '22023'; end if;
  select * into task_row from public.tasks where id = p_task_id and checklist_id = task_checklist_id for update;
  if not found then raise exception 'Task changed while it was being deleted.' using errcode = '40001'; end if;
  if not private.can_manage_team(checklist_team_id) then raise exception 'Only the team owner or an admin can delete a task.' using errcode = '42501'; end if;
  if task_row.deleted_at is not null then return; end if;
  update public.tasks set deleted_at = now() where id = p_task_id and deleted_at is null;
end;
$$;

create or replace function public.uncomplete_task(p_completion_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); completion public.task_completions%rowtype; allowed boolean;
begin
  if actor is null then perform private.log_event('uncomplete_task', 'unauthenticated', jsonb_build_object('completionId', p_completion_id)); raise exception 'Authentication is required.' using errcode = '42501'; end if;
  select * into completion from public.task_completions where id = p_completion_id for update;
  if not found then return jsonb_build_object('status', 'already_uncompleted'); end if;
  if not exists (select 1 from public.team_members where team_id = completion.team_id and user_id = actor) then
    perform private.log_event('uncomplete_task', 'not_a_member', jsonb_build_object('actor', actor, 'completionId', p_completion_id, 'teamId', completion.team_id));
    raise exception 'The user is not a member of this team.' using errcode = '42501';
  end if;
  if completion.undone_at is not null then return jsonb_build_object('status', 'already_uncompleted'); end if;
  select completion.completed_by = actor or private.can_manage_team(completion.team_id) into allowed;
  if not allowed then
    perform private.log_event('uncomplete_task', 'not_author_or_manager', jsonb_build_object('actor', actor, 'completionId', p_completion_id, 'teamId', completion.team_id));
    raise exception 'Only the completion author, team owner, or an admin can undo it.' using errcode = '42501';
  end if;
  update public.task_completions set undone_at = pg_catalog.now(), undone_by = actor where id = p_completion_id;
  return jsonb_build_object('status', 'removed', 'completionId', p_completion_id);
end;
$$;

alter policy team_invites_select_owner on public.team_invites using (private.can_manage_team(team_id));
alter policy teams_update_owner on public.teams using (private.can_manage_team(id)) with check (private.can_manage_team(id));
alter policy checklists_insert_owner on public.checklists with check (private.can_manage_team(team_id) and created_by = (select auth.uid()));
alter policy checklists_update_owner on public.checklists using (deleted_at is null and private.can_manage_team(team_id)) with check (deleted_at is null and private.can_manage_team(team_id));
alter policy tasks_update_owner on public.tasks using (deleted_at is null and exists (select 1 from public.checklists as checklist where checklist.id = checklist_id and checklist.deleted_at is null and private.can_manage_team(checklist.team_id))) with check (deleted_at is null and exists (select 1 from public.checklists as checklist where checklist.id = checklist_id and checklist.deleted_at is null and private.can_manage_team(checklist.team_id)));

revoke update on public.teams from authenticated;
grant update (name, timezone) on public.teams to authenticated;
revoke all on function public.set_team_member_role(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_team_member_role(uuid, uuid, text) to authenticated;

comment on function public.create_checklist_task(uuid, text, public.task_cadence, smallint[]) is 'Owner/admin-only task insert that validates the task schedule and assigns the next active position under a checklist lock.';
comment on function public.reorder_checklist_tasks(uuid, uuid[]) is 'Owner/admin-only two-phase rewrite of active task positions.';
comment on function public.soft_delete_checklist(uuid) is 'Owner/admin-only soft-delete of a checklist and its active tasks.';
comment on function public.soft_delete_task(uuid) is 'Owner/admin-only soft-delete of a single task.';
