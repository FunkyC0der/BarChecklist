create or replace function private.enforce_active_checklist_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.deleted_at is null
    and old.team_id = new.team_id
  then
    return new;
  end if;

  perform 1
  from public.teams
  where id = new.team_id
  for update;

  if (
    select count(*)
    from public.checklists
    where team_id = new.team_id
      and deleted_at is null
      and (tg_op = 'INSERT' or id <> new.id)
  ) >= 20 then
    raise exception 'A team can have at most 20 active checklists.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_active_task_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.deleted_at is null
    and old.checklist_id = new.checklist_id
  then
    return new;
  end if;

  perform 1
  from public.checklists
  where id = new.checklist_id
  for update;

  if (
    select count(*)
    from public.tasks
    where checklist_id = new.checklist_id
      and deleted_at is null
      and (tg_op = 'INSERT' or id <> new.id)
  ) >= 100 then
    raise exception 'A checklist can have at most 100 active tasks.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger checklists_enforce_active_limit
before insert or update on public.checklists
for each row execute function private.enforce_active_checklist_limit();

create trigger tasks_enforce_active_limit
before insert or update on public.tasks
for each row execute function private.enforce_active_task_limit();

create or replace function public.create_checklist_task(
  p_checklist_id uuid,
  p_title text
)
returns setof public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  checklist_row public.checklists%rowtype;
  next_position integer;
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select *
  into checklist_row
  from public.checklists
  where id = p_checklist_id
  for update;

  if not found then
    raise exception 'Checklist not found.' using errcode = '22023';
  end if;

  if checklist_row.deleted_at is not null then
    raise exception 'The checklist is inactive.' using errcode = '23514';
  end if;

  if not private.is_team_owner(checklist_row.team_id) then
    raise exception 'Only the team owner can manage tasks.' using errcode = '42501';
  end if;

  select coalesce(max(position) + 1, 0)
  into next_position
  from public.tasks
  where checklist_id = p_checklist_id and deleted_at is null;

  return query
  insert into public.tasks (checklist_id, title, position)
  values (p_checklist_id, btrim(p_title), next_position)
  returning *;
end;
$$;

create or replace function public.reorder_checklist_tasks(
  p_checklist_id uuid,
  p_task_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  checklist_row public.checklists%rowtype;
  temporary_start integer;
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select *
  into checklist_row
  from public.checklists
  where id = p_checklist_id
  for update;

  if not found then
    raise exception 'Checklist not found.' using errcode = '22023';
  end if;

  if checklist_row.deleted_at is not null then
    raise exception 'The checklist is inactive.' using errcode = '23514';
  end if;

  if not private.is_team_owner(checklist_row.team_id) then
    raise exception 'Only the team owner can manage tasks.' using errcode = '42501';
  end if;

  if p_task_ids is null
    or cardinality(p_task_ids)
      <> (
        select count(*)
        from public.tasks
        where checklist_id = p_checklist_id and deleted_at is null
      )
    or cardinality(p_task_ids)
      <> (
        select count(distinct task_id)
        from unnest(p_task_ids) as task_id
      )
    or exists (
      select 1
      from unnest(p_task_ids) as task_id
      where not exists (
        select 1
        from public.tasks
        where id = task_id
          and checklist_id = p_checklist_id
          and deleted_at is null
      )
    )
  then
    raise exception 'Task order must list every active task exactly once.'
      using errcode = '22023';
  end if;

  select coalesce(max(position), -1) + 1
  into temporary_start
  from public.tasks
  where checklist_id = p_checklist_id and deleted_at is null;

  if temporary_start > 2147483547 then
    raise exception 'Task positions are outside the supported range.'
      using errcode = '22003';
  end if;

  update public.tasks as task
  set position = temporary.position
  from (
    select
      id,
      (temporary_start + row_number() over (order by position, id))::integer as position
    from public.tasks
    where checklist_id = p_checklist_id and deleted_at is null
  ) as temporary
  where task.id = temporary.id;

  update public.tasks as task
  set position = ordered.new_position
  from (
    select task_id, (ordinality - 1)::integer as new_position
    from unnest(p_task_ids) with ordinality as listed (task_id, ordinality)
  ) as ordered
  where task.id = ordered.task_id;
end;
$$;

create or replace function public.soft_delete_checklist(p_checklist_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  checklist_row public.checklists%rowtype;
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select *
  into checklist_row
  from public.checklists
  where id = p_checklist_id
  for update;

  if not found then
    raise exception 'Checklist not found.' using errcode = '22023';
  end if;

  if not private.is_team_owner(checklist_row.team_id) then
    raise exception 'Only the team owner can delete a checklist.'
      using errcode = '42501';
  end if;

  if checklist_row.deleted_at is not null then
    return;
  end if;

  update public.checklists
  set deleted_at = now()
  where id = p_checklist_id and deleted_at is null;

  update public.tasks
  set deleted_at = now()
  where checklist_id = p_checklist_id and deleted_at is null;
end;
$$;

create or replace function public.soft_delete_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  task_row public.tasks%rowtype;
  task_checklist_id uuid;
  checklist_team_id uuid;
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select checklist_id
  into task_checklist_id
  from public.tasks
  where id = p_task_id;

  if not found then
    raise exception 'Task not found.' using errcode = '22023';
  end if;

  select team_id
  into checklist_team_id
  from public.checklists
  where id = task_checklist_id
  for update;

  if checklist_team_id is null then
    raise exception 'Checklist not found.' using errcode = '22023';
  end if;

  select *
  into task_row
  from public.tasks
  where id = p_task_id
    and checklist_id = task_checklist_id
  for update;

  if not found then
    raise exception 'Task changed while it was being deleted.' using errcode = '40001';
  end if;

  if not private.is_team_owner(checklist_team_id) then
    raise exception 'Only the team owner can delete a task.' using errcode = '42501';
  end if;

  if task_row.deleted_at is not null then
    return;
  end if;

  update public.tasks
  set deleted_at = now()
  where id = p_task_id and deleted_at is null;
end;
$$;

drop policy if exists checklists_delete_owner on public.checklists;
drop policy if exists tasks_delete_owner on public.tasks;
drop policy if exists tasks_insert_owner on public.tasks;

alter policy checklists_insert_owner on public.checklists
with check (
  private.is_team_owner(team_id)
  and created_by = (select auth.uid())
);

alter policy checklists_update_owner on public.checklists
using (
  deleted_at is null
  and private.is_team_owner(team_id)
)
with check (
  deleted_at is null
  and private.is_team_owner(team_id)
);

alter policy tasks_update_owner on public.tasks
using (
  deleted_at is null
  and exists (
    select 1
    from public.checklists as checklist
    where checklist.id = checklist_id
      and checklist.deleted_at is null
      and private.is_team_owner(checklist.team_id)
  )
)
with check (
  deleted_at is null
  and exists (
    select 1
    from public.checklists as checklist
    where checklist.id = checklist_id
      and checklist.deleted_at is null
      and private.is_team_owner(checklist.team_id)
  )
);

revoke insert, update, delete on public.checklists from authenticated;
grant insert (team_id, name, cadence, weekdays, created_by)
on public.checklists to authenticated;
grant update (name, cadence, weekdays)
on public.checklists to authenticated;

revoke insert, update, delete on public.tasks from authenticated;
grant update (title) on public.tasks to authenticated;

grant execute on function private.valid_iso_weekdays(smallint[]) to authenticated;

revoke all on function public.create_checklist_task(uuid, text) from public, anon, authenticated;
revoke all on function public.reorder_checklist_tasks(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.soft_delete_checklist(uuid) from public, anon, authenticated;
revoke all on function public.soft_delete_task(uuid) from public, anon, authenticated;

grant execute on function public.create_checklist_task(uuid, text) to authenticated;
grant execute on function public.reorder_checklist_tasks(uuid, uuid[]) to authenticated;
grant execute on function public.soft_delete_checklist(uuid) to authenticated;
grant execute on function public.soft_delete_task(uuid) to authenticated;

comment on function public.create_checklist_task(uuid, text) is
  'Owner-only task insert that assigns the next active position under a checklist lock.';
comment on function public.reorder_checklist_tasks(uuid, uuid[]) is
  'Owner-only two-phase rewrite of active task positions.';
comment on function public.soft_delete_checklist(uuid) is
  'Owner-only soft-delete of a checklist and its active tasks.';
comment on function public.soft_delete_task(uuid) is
  'Owner-only soft-delete of a single task.';
