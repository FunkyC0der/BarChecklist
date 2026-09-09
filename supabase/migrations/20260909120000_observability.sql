-- Observability: a Postgres-log breadcrumb on every RPC failure path, plus a
-- write-only client_events table so a beta bug report ("broke last night")
-- can be reconstructed from Supabase instead of a live phone screen-share.

create or replace function private.log_event(
  p_fn text,
  p_reason text,
  p_context jsonb default '{}'::jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  -- raise log survives a transaction rollback (unlike a table insert inside
  -- the same failing function) and is greppable in Dashboard -> Logs ->
  -- Postgres by the "[checklister]" prefix.
  raise log '[checklister] fn=% reason=% ctx=%', p_fn, p_reason, p_context;
end;
$$;

revoke all on function private.log_event(text, text, jsonb)
  from public, anon, authenticated;

-- complete_task: reformatted to one statement per line (was a dense
-- single-line style out of step with the rest of the file) and instrumented
-- on every failure path. Semantics are unchanged; today_realtime.test.sql's
-- 35 assertions cover the behavior.
create or replace function public.complete_task(p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  v_cadence public.task_cadence;
  v_weekdays smallint[];
  v_team_id uuid;
  today date;
  completion public.task_completions%rowtype;
  inserted boolean;
begin
  if actor is null then
    perform private.log_event(
      'complete_task', 'unauthenticated', jsonb_build_object('taskId', p_task_id)
    );
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select t.cadence, t.weekdays, c.team_id
  into v_cadence, v_weekdays, v_team_id
  from public.tasks t
  join public.checklists c on c.id = t.checklist_id
  where t.id = p_task_id and t.deleted_at is null and c.deleted_at is null;

  if not found then
    perform private.log_event(
      'complete_task', 'task_inactive',
      jsonb_build_object('actor', actor, 'taskId', p_task_id)
    );
    raise exception 'The task or checklist is inactive.' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.team_members tm
    where tm.team_id = v_team_id and tm.user_id = actor
  ) then
    perform private.log_event(
      'complete_task', 'not_a_member',
      jsonb_build_object('actor', actor, 'taskId', p_task_id, 'teamId', v_team_id)
    );
    raise exception 'The user is not a member of this task team.' using errcode = '42501';
  end if;

  today := private.logical_date(v_team_id);
  if not private.task_is_scheduled(v_cadence, v_weekdays, today) then
    perform private.log_event(
      'complete_task', 'not_scheduled',
      jsonb_build_object('actor', actor, 'taskId', p_task_id, 'teamId', v_team_id)
    );
    raise exception 'The task is not scheduled for the current logical date.' using errcode = '23514';
  end if;

  insert into public.task_completions (task_id, team_id, completion_date, completed_by)
  values (p_task_id, v_team_id, today, actor)
  on conflict (task_id, completion_date) do nothing
  returning * into completion;

  inserted := completion.id is not null;
  if not inserted then
    select * into completion
    from public.task_completions tc
    where tc.task_id = p_task_id and tc.completion_date = today
    for update;

    if completion.undone_at is null then
      inserted := false;
    else
      update public.task_completions tc
      set completed_by = actor, completed_at = pg_catalog.now(), undone_at = null, undone_by = null
      where tc.task_id = p_task_id and tc.completion_date = today and tc.undone_at is not null
      returning tc.* into completion;
      inserted := true;
    end if;
  end if;

  return jsonb_build_object(
    'status', case when inserted then 'created' else 'already_completed' end,
    'completion', jsonb_build_object(
      'id', completion.id,
      'taskId', completion.task_id,
      'teamId', completion.team_id,
      'completionDate', completion.completion_date,
      'completedBy', completion.completed_by,
      'completedAt', completion.completed_at,
      'completedByName', (select display_name from public.profiles where id = completion.completed_by)
    )
  );
end;
$$;

create or replace function public.uncomplete_task(p_completion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  completion public.task_completions%rowtype;
  allowed boolean;
begin
  if actor is null then
    perform private.log_event(
      'uncomplete_task', 'unauthenticated', jsonb_build_object('completionId', p_completion_id)
    );
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into completion from public.task_completions where id = p_completion_id for update;
  if not found then
    return jsonb_build_object('status', 'already_uncompleted');
  end if;

  if not exists (
    select 1 from public.team_members
    where team_id = completion.team_id and user_id = actor
  ) then
    perform private.log_event(
      'uncomplete_task', 'not_a_member',
      jsonb_build_object('actor', actor, 'completionId', p_completion_id, 'teamId', completion.team_id)
    );
    raise exception 'The user is not a member of this team.' using errcode = '42501';
  end if;

  if completion.undone_at is not null then
    return jsonb_build_object('status', 'already_uncompleted');
  end if;

  select completion.completed_by = actor
    or exists (select 1 from public.teams where id = completion.team_id and owner_id = actor)
  into allowed;

  if not allowed then
    perform private.log_event(
      'uncomplete_task', 'not_author_or_owner',
      jsonb_build_object('actor', actor, 'completionId', p_completion_id, 'teamId', completion.team_id)
    );
    raise exception 'Only the completion author or team owner can undo it.' using errcode = '42501';
  end if;

  update public.task_completions set undone_at = pg_catalog.now(), undone_by = actor where id = p_completion_id;
  return jsonb_build_object('status', 'removed', 'completionId', p_completion_id);
end;
$$;

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
  if actor is null then
    perform private.log_event(
      'get_today_snapshot', 'unauthenticated', jsonb_build_object('teamId', p_team_id)
    );
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  select * into team_row from public.teams where id = p_team_id;
  if not found then
    perform private.log_event(
      'get_today_snapshot', 'team_not_found',
      jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'Team not found.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.team_members where team_id = p_team_id and user_id = actor) then
    perform private.log_event(
      'get_today_snapshot', 'not_a_member',
      jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
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

create or replace function public.get_history(
  p_team_id uuid,
  p_from_date date default null,
  p_to_date date default null,
  p_checklist_id uuid default null,
  p_user_id uuid default null,
  p_limit integer default 14,
  p_before_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  team_row public.teams%rowtype;
  logical_today date;
  resolved_from_date date;
  resolved_to_date date;
  result_days jsonb;
  has_more boolean;
  next_before_date date;
begin
  if actor is null then
    perform private.log_event(
      'get_history', 'unauthenticated', jsonb_build_object('teamId', p_team_id)
    );
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_team_id is null then
    perform private.log_event('get_history', 'missing_team', jsonb_build_object('actor', actor));
    raise exception 'Team is required.' using errcode = '22023';
  end if;

  select * into team_row
  from public.teams
  where id = p_team_id;
  if not found then
    perform private.log_event(
      'get_history', 'team_not_found', jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'Team not found.' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.team_members
    where team_id = p_team_id and user_id = actor
  ) then
    perform private.log_event(
      'get_history', 'not_a_member', jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'The user is not a member of this team.' using errcode = '42501';
  end if;

  logical_today := (pg_catalog.now() at time zone team_row.timezone)::date;
  if p_limit is null or p_limit < 1 or p_limit > 31 then
    perform private.log_event(
      'get_history', 'invalid_limit',
      jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'History limit must be between 1 and 31.' using errcode = '22023';
  end if;
  if (p_from_date is null) <> (p_to_date is null) then
    perform private.log_event(
      'get_history', 'incomplete_range',
      jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'Both fromDate and toDate are required when filtering a range.'
      using errcode = '22023';
  end if;

  if p_from_date is null then
    resolved_to_date := logical_today;
    resolved_from_date := logical_today - 13;
  else
    resolved_from_date := p_from_date;
    resolved_to_date := p_to_date;
  end if;

  if resolved_to_date > logical_today then
    perform private.log_event(
      'get_history', 'to_date_in_future',
      jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'toDate cannot be in the future.' using errcode = '22023';
  end if;
  if resolved_from_date > resolved_to_date then
    perform private.log_event(
      'get_history', 'from_date_after_to_date',
      jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'fromDate must be on or before toDate.' using errcode = '22023';
  end if;

  with matching_completions as (
    select
      tc.id,
      tc.task_id,
      tc.completion_date,
      tc.completed_by,
      tc.completed_at,
      t.title as task_title,
      t.position as task_position,
      c.id as checklist_id,
      c.name as checklist_name,
      c.created_at as checklist_created_at,
      p.display_name as completed_by_name
    from public.task_completions tc
    join public.tasks t on t.id = tc.task_id
    join public.checklists c on c.id = t.checklist_id
    join public.profiles p on p.id = tc.completed_by
    where tc.team_id = p_team_id
      and tc.undone_at is null
      and c.team_id = p_team_id
      and tc.completion_date >= resolved_from_date
      and tc.completion_date <= resolved_to_date
      and (p_before_date is null or tc.completion_date < p_before_date)
      and (p_checklist_id is null or c.id = p_checklist_id)
      and (p_user_id is null or tc.completed_by = p_user_id)
  ), day_series as (
    select series.value::date as day
    from pg_catalog.generate_series(
      resolved_from_date,
      least(resolved_to_date, logical_today - 1),
      interval '1 day'
    ) as series(value)
    where p_user_id is null
      and (p_before_date is null or series.value::date < p_before_date)
  ), missed_tasks as (
    select
      ds.day,
      t.id as task_id,
      t.title as task_title,
      t.position as task_position,
      c.id as checklist_id,
      c.name as checklist_name,
      c.created_at as checklist_created_at
    from day_series ds
    join public.checklists c
      on c.team_id = p_team_id and c.deleted_at is null
    join public.tasks t
      on t.checklist_id = c.id and t.deleted_at is null
    where (p_checklist_id is null or c.id = p_checklist_id)
      and private.logical_date_at(team_row.timezone, t.created_at) <= ds.day
      and private.task_is_scheduled(t.cadence, t.weekdays, ds.day)
      and not exists (
        select 1
        from public.task_completions tc
        where tc.task_id = t.id
          and tc.completion_date = ds.day
          and tc.undone_at is null
      )
  ), candidate_days as (
    select day
    from (
      select completion_date as day from matching_completions
      union
      select day from missed_tasks
    ) days
    group by day
    order by day desc
    limit p_limit + 1
  ), page_days as (
    select day
    from candidate_days
    order by day desc
    limit p_limit
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', page_days.day,
          'completedCount', (
            select count(*)
            from matching_completions matching
            where matching.completion_date = page_days.day
          ),
          'completions', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', matching.id,
                'taskId', matching.task_id,
                'taskTitle', matching.task_title,
                'checklistId', matching.checklist_id,
                'checklistName', matching.checklist_name,
                'completedBy', matching.completed_by,
                'completedByName', matching.completed_by_name,
                'completedAt', matching.completed_at
              ) order by matching.checklist_created_at, matching.checklist_id,
                matching.task_position, matching.task_id, matching.completed_at,
                matching.id
            )
            from matching_completions matching
            where matching.completion_date = page_days.day
          ), '[]'::jsonb),
          'missedCount', (
            select count(*)
            from missed_tasks missed
            where missed.day = page_days.day
          ),
          'missed', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'taskId', missed.task_id,
                'taskTitle', missed.task_title,
                'checklistId', missed.checklist_id,
                'checklistName', missed.checklist_name
              ) order by missed.checklist_created_at, missed.checklist_id,
                missed.task_position, missed.task_id
            )
            from missed_tasks missed
            where missed.day = page_days.day
          ), '[]'::jsonb)
        )
        order by page_days.day desc
      ),
      '[]'::jsonb
    ),
    (select count(*) > p_limit from candidate_days),
    (select min(day) from page_days)
  into result_days, has_more, next_before_date
  from page_days;

  return jsonb_build_object(
    'logicalToday', logical_today,
    'fromDate', resolved_from_date,
    'toDate', resolved_to_date,
    'days', result_days,
    'hasMore', has_more,
    'nextBeforeDate', case when has_more then next_before_date else null end
  );
end;
$$;

create or replace function public.accept_team_invite(p_token text)
returns table (team_id uuid, joined boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  invitation public.team_invites%rowtype;
  inserted_count integer;
begin
  if actor is null then
    perform private.log_event('accept_team_invite', 'unauthenticated', '{}'::jsonb);
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select *
  into invitation
  from public.team_invites
  where token_hash = pg_catalog.encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    perform private.log_event('accept_team_invite', 'invalid_token', jsonb_build_object('actor', actor));
    raise exception 'Invite is invalid.' using errcode = '22023';
  end if;

  if invitation.revoked_at is not null then
    perform private.log_event(
      'accept_team_invite', 'revoked',
      jsonb_build_object('actor', actor, 'teamId', invitation.team_id)
    );
    raise exception 'Invite has been revoked.' using errcode = '22023';
  end if;

  if invitation.expires_at <= now() then
    perform private.log_event(
      'accept_team_invite', 'expired',
      jsonb_build_object('actor', actor, 'teamId', invitation.team_id)
    );
    raise exception 'Invite has expired.' using errcode = '22023';
  end if;

  insert into public.team_members (team_id, user_id)
  values (invitation.team_id, actor)
  on conflict on constraint team_members_pkey do nothing;

  get diagnostics inserted_count = row_count;
  return query select invitation.team_id, inserted_count = 1;
end;
$$;

-- Client-side breadcrumbs: write-only from the app, read only via the
-- Dashboard SQL editor (service role) so a beta user never sees their own
-- or anyone else's log rows.
create table public.client_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  session_id text not null,
  level text not null check (level in ('debug', 'info', 'warn', 'error')),
  event text not null,
  code text,
  context jsonb not null default '{}'::jsonb,
  app_version text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now()
);

create index client_events_created_at_idx on public.client_events (created_at desc);
create index client_events_user_id_created_at_idx on public.client_events (user_id, created_at desc);

alter table public.client_events enable row level security;
revoke all on public.client_events from public, anon, authenticated;

comment on table public.client_events is
  'Beta observability breadcrumbs. No select policy by design: read via Dashboard SQL (service role) only. Manually delete rows older than 30 days per docs/ops/observability.md.';

create or replace function public.log_client_event(p_events jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  evt jsonb;
  v_team_id uuid;
  v_level text;
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_events) is distinct from 'array' then
    raise exception 'Events must be a JSON array.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_events) > 20 then
    raise exception 'At most 20 events per call.' using errcode = '22023';
  end if;

  for evt in select * from jsonb_array_elements(p_events)
  loop
    if pg_catalog.octet_length(evt::text) > 4096 then
      raise exception 'Event payload exceeds 4KB.' using errcode = '22023';
    end if;

    v_level := evt->>'level';
    if v_level is null or v_level not in ('debug', 'info', 'warn', 'error') then
      raise exception 'Invalid event level.' using errcode = '22023';
    end if;

    v_team_id := nullif(evt->>'teamId', '')::uuid;
    if v_team_id is not null and not exists (
      select 1 from public.team_members where team_id = v_team_id and user_id = actor
    ) then
      raise exception 'The user is not a member of the referenced team.' using errcode = '42501';
    end if;

    insert into public.client_events (
      user_id, team_id, session_id, level, event, code, context, app_version, occurred_at
    ) values (
      actor,
      v_team_id,
      coalesce(evt->>'sessionId', ''),
      v_level,
      coalesce(evt->>'event', ''),
      evt->>'code',
      coalesce(evt->'context', '{}'::jsonb),
      evt->>'appVersion',
      coalesce((evt->>'occurredAt')::timestamptz, pg_catalog.now())
    );
  end loop;
end;
$$;

revoke all on function public.log_client_event(jsonb) from public, anon, authenticated;
grant execute on function public.log_client_event(jsonb) to authenticated;
