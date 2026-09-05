-- Epic 4: logical-day Today workflow, server-confirmed completions, and Realtime.

alter table public.task_completions
  add column if not exists undone_at timestamptz,
  add column if not exists undone_by uuid references auth.users(id) on delete restrict,
  drop constraint if exists task_completions_team_id_fkey,
  add constraint task_completions_team_id_fkey
    foreign key (team_id) references public.teams(id) on delete cascade;

create or replace function private.logical_date_at(p_timezone text, p_at timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$ select (p_at at time zone p_timezone)::date $$;

create or replace function private.logical_date(p_team_id uuid)
returns date
language sql
stable
set search_path = ''
as $$
  select private.logical_date_at(t.timezone, pg_catalog.now())
  from public.teams t where t.id = p_team_id
$$;

create or replace function private.task_is_scheduled(
  p_cadence public.task_cadence,
  p_weekdays smallint[],
  p_logical_date date
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_cadence = 'daily'::public.task_cadence
    or (p_cadence = 'weekly'::public.task_cadence
      and extract(isodow from p_logical_date)::smallint = any(p_weekdays))
$$;

create or replace function private.prepare_task_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  resolved_team_id uuid;
  resolved_timezone text;
  resolved_date date;
  resolved_cadence public.task_cadence;
  resolved_weekdays smallint[];
begin
  if actor is null then
    raise exception 'Authentication is required to complete a task.' using errcode = '42501';
  end if;

  select c.team_id, tm.timezone, t.cadence, t.weekdays
  into resolved_team_id, resolved_timezone, resolved_cadence, resolved_weekdays
  from public.tasks t
  join public.checklists c on c.id = t.checklist_id
  join public.teams tm on tm.id = c.team_id
  where t.id = new.task_id and t.deleted_at is null and c.deleted_at is null;

  if resolved_team_id is null then
    raise exception 'The task or checklist is inactive.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.team_members where team_id = resolved_team_id and user_id = actor) then
    raise exception 'The user is not a member of this task team.' using errcode = '42501';
  end if;

  resolved_date := (pg_catalog.now() at time zone resolved_timezone)::date;
  if not private.task_is_scheduled(resolved_cadence, resolved_weekdays, resolved_date) then
    raise exception 'The task is not scheduled for the current logical date.' using errcode = '23514';
  end if;

  new.team_id := resolved_team_id;
  new.completed_by := actor;
  new.completed_at := pg_catalog.now();
  new.completion_date := resolved_date;
  return new;
end;
$$;

drop trigger if exists task_completion_prepared on public.task_completions;
create trigger task_completion_prepared before insert on public.task_completions
for each row execute function private.prepare_task_completion();

create or replace function public.get_today_snapshot(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  team_row public.teams%rowtype;
  today date;
  result jsonb;
begin
  if actor is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  select * into team_row from public.teams where id = p_team_id;
  if not found then raise exception 'Team not found.' using errcode = '22023'; end if;
  if not exists (select 1 from public.team_members where team_id = p_team_id and user_id = actor) then
    raise exception 'The user is not a member of this team.' using errcode = '42501';
  end if;
  today := (pg_catalog.now() at time zone team_row.timezone)::date;
  select jsonb_build_object(
    'logicalDate', today,
    'timezone', team_row.timezone,
    'checklists', coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'createdAt', c.created_at,
      'tasks', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'position', t.position,
        'cadence', t.cadence, 'weekdays', t.weekdays,
        'completion', case when tc.id is null then null else jsonb_build_object(
          'id', tc.id, 'completedBy', tc.completed_by, 'completedAt', tc.completed_at,
          'completedByName', p.display_name) end
      ) order by t.position, t.id)
      from public.tasks t
      left join public.task_completions tc on tc.task_id = t.id and tc.team_id = p_team_id and tc.completion_date = today and tc.undone_at is null
      left join public.profiles p on p.id = tc.completed_by
      where t.checklist_id = c.id and t.deleted_at is null
        and private.task_is_scheduled(t.cadence, t.weekdays, today)), '[]'::jsonb)
    ) order by c.created_at, c.id), '[]'::jsonb)
  ) into result
  from public.checklists c
  where c.team_id = p_team_id and c.deleted_at is null;
  return result;
end;
$$;

create or replace function public.complete_task(p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid(); v_cadence public.task_cadence; v_weekdays smallint[]; v_team_id uuid; today date;
  completion public.task_completions%rowtype; inserted boolean;
begin
  if actor is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  select t.cadence, t.weekdays, c.team_id into v_cadence, v_weekdays, v_team_id
    from public.tasks t join public.checklists c on c.id=t.checklist_id
    where t.id=p_task_id and t.deleted_at is null and c.deleted_at is null;
  if not found then raise exception 'The task or checklist is inactive.' using errcode = '23514'; end if;
  if not exists (select 1 from public.team_members tm where tm.team_id=v_team_id and tm.user_id=actor) then raise exception 'The user is not a member of this task team.' using errcode='42501'; end if;
  today := private.logical_date(v_team_id);
  if not private.task_is_scheduled(v_cadence, v_weekdays, today) then raise exception 'The task is not scheduled for the current logical date.' using errcode='23514'; end if;
  insert into public.task_completions(task_id, team_id, completion_date, completed_by)
    values (p_task_id, v_team_id, today, actor) on conflict (task_id, completion_date) do nothing returning * into completion;
  inserted := completion.id is not null;
  if not inserted then
    select * into completion from public.task_completions tc where tc.task_id=p_task_id and tc.completion_date=today for update;
    if completion.undone_at is null then
      inserted := false;
    else
      update public.task_completions tc set completed_by=actor, completed_at=pg_catalog.now(), undone_at=null, undone_by=null
      where tc.task_id=p_task_id and tc.completion_date=today and tc.undone_at is not null returning tc.* into completion;
      inserted := true;
    end if;
  end if;
  return jsonb_build_object('status', case when inserted then 'created' else 'already_completed' end,
    'completion', jsonb_build_object('id',completion.id,'taskId',completion.task_id,'teamId',completion.team_id,
      'completionDate',completion.completion_date,'completedBy',completion.completed_by,'completedAt',completion.completed_at,
      'completedByName',(select display_name from public.profiles where id=completion.completed_by)));
end;
$$;

create or replace function public.uncomplete_task(p_completion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := auth.uid(); completion public.task_completions%rowtype; allowed boolean;
begin
  if actor is null then raise exception 'Authentication is required.' using errcode='42501'; end if;
  select * into completion from public.task_completions where id=p_completion_id for update;
  if not found then return jsonb_build_object('status','already_uncompleted'); end if;
  if not exists (select 1 from public.team_members where team_id=completion.team_id and user_id=actor) then raise exception 'The user is not a member of this team.' using errcode='42501'; end if;
  if completion.undone_at is not null then return jsonb_build_object('status','already_uncompleted'); end if;
  select completion.completed_by=actor or exists(select 1 from public.teams where id=completion.team_id and owner_id=actor) into allowed;
  if not allowed then raise exception 'Only the completion author or team owner can undo it.' using errcode='42501'; end if;
  update public.task_completions set undone_at=pg_catalog.now(), undone_by=actor where id=p_completion_id;
  return jsonb_build_object('status','removed','completionId',p_completion_id);
end;
$$;

revoke insert, delete on public.task_completions from authenticated;
revoke update on public.task_completions from authenticated;
drop policy if exists completions_insert_member on public.task_completions;
drop policy if exists completions_delete_creator_or_owner on public.task_completions;
revoke all on function public.get_today_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.complete_task(uuid) from public, anon, authenticated;
revoke all on function public.uncomplete_task(uuid) from public, anon, authenticated;
revoke all on function private.logical_date(uuid) from public, anon, authenticated;
revoke all on function private.logical_date_at(text, timestamptz) from public, anon, authenticated;
revoke all on function private.task_is_scheduled(public.task_cadence, smallint[], date) from public, anon, authenticated;
grant execute on function public.get_today_snapshot(uuid) to authenticated;
grant execute on function public.complete_task(uuid) to authenticated;
grant execute on function public.uncomplete_task(uuid) to authenticated;

do $$ declare n text; begin
  foreach n in array array['checklists','tasks'] loop
    if not exists (select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=n) then
      execute format('alter publication supabase_realtime add table public.%I', n);
    end if;
  end loop;
end $$;
alter table public.checklists replica identity full;
alter table public.tasks replica identity full;

comment on column public.task_completions.undone_at is 'Soft undo marker; retained so Realtime UPDATE payloads remain team-scoped and race-safe.';
comment on column public.task_completions.undone_by is 'Authenticated member who performed the soft undo.';
