-- Epic 6b: per-member completion statistics. No schema change — group-by-member
-- reads over the existing task_completions table, plus a supporting index.

create index if not exists task_completions_member_stats_idx
on public.task_completions (team_id, completed_by, completion_date)
where undone_at is null;

create or replace function public.get_member_stats(
  p_team_id uuid,
  p_from_date date default null,
  p_to_date date default null,
  p_checklist_id uuid default null
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
  members jsonb;
  team_completed_count integer;
begin
  if actor is null then
    perform private.log_event(
      'get_member_stats', 'unauthenticated', jsonb_build_object('teamId', p_team_id)
    );
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_team_id is null then
    perform private.log_event('get_member_stats', 'missing_team', jsonb_build_object('actor', actor));
    raise exception 'Team is required.' using errcode = '22023';
  end if;

  select * into team_row
  from public.teams
  where id = p_team_id;
  if not found then
    perform private.log_event(
      'get_member_stats', 'team_not_found', jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'Team not found.' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.team_members
    where team_id = p_team_id and user_id = actor
  ) then
    perform private.log_event(
      'get_member_stats', 'not_a_member', jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'The user is not a member of this team.' using errcode = '42501';
  end if;

  logical_today := (pg_catalog.now() at time zone team_row.timezone)::date;
  if (p_from_date is null) <> (p_to_date is null) then
    perform private.log_event(
      'get_member_stats', 'incomplete_range', jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'Both fromDate and toDate are required when filtering a range.'
      using errcode = '22023';
  end if;

  if p_from_date is null then
    resolved_to_date := logical_today;
    resolved_from_date := logical_today - 29;
  else
    resolved_from_date := p_from_date;
    resolved_to_date := p_to_date;
  end if;

  if resolved_to_date > logical_today then
    perform private.log_event(
      'get_member_stats', 'to_date_in_future', jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'toDate cannot be in the future.' using errcode = '22023';
  end if;
  if resolved_from_date > resolved_to_date then
    perform private.log_event(
      'get_member_stats', 'from_date_after_to_date',
      jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'fromDate must be on or before toDate.' using errcode = '22023';
  end if;

  with matching_completions as (
    select tc.id, tc.task_id, tc.completed_by, tc.completion_date
    from public.task_completions tc
    join public.tasks t on t.id = tc.task_id
    join public.checklists c on c.id = t.checklist_id
    where tc.team_id = p_team_id
      and c.team_id = p_team_id
      and tc.undone_at is null
      and tc.completion_date >= resolved_from_date
      and tc.completion_date <= resolved_to_date
      and (p_checklist_id is null or c.id = p_checklist_id)
  ), member_users as (
    select tm.user_id, true as current_member
    from public.team_members tm
    where tm.team_id = p_team_id
    union
    select mc.completed_by, false
    from matching_completions mc
    where not exists (
      select 1 from public.team_members tm
      where tm.team_id = p_team_id and tm.user_id = mc.completed_by
    )
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'userId', mu.user_id,
        'displayName', p.display_name,
        'currentMember', mu.current_member,
        'completedCount', coalesce(agg.completed_count, 0),
        'taskCount', coalesce(agg.task_count, 0),
        'lastCompletionDate', agg.last_completion_date
      ) order by coalesce(agg.completed_count, 0) desc, p.display_name, mu.user_id
    ), '[]'::jsonb),
    coalesce(sum(coalesce(agg.completed_count, 0)), 0)
  into members, team_completed_count
  from member_users mu
  join public.profiles p on p.id = mu.user_id
  left join lateral (
    select
      count(*) as completed_count,
      count(distinct mc.task_id) as task_count,
      max(mc.completion_date) as last_completion_date
    from matching_completions mc
    where mc.completed_by = mu.user_id
  ) agg on true;

  return jsonb_build_object(
    'logicalToday', logical_today,
    'fromDate', resolved_from_date,
    'toDate', resolved_to_date,
    'teamCompletedCount', team_completed_count,
    'members', members
  );
end;
$$;

create or replace function public.get_member_task_stats(
  p_team_id uuid,
  p_user_id uuid,
  p_from_date date default null,
  p_to_date date default null,
  p_checklist_id uuid default null
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
  target_display_name text;
  target_current_member boolean;
  tasks jsonb;
  total_completed integer;
begin
  if actor is null then
    perform private.log_event(
      'get_member_task_stats', 'unauthenticated', jsonb_build_object('teamId', p_team_id)
    );
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_team_id is null then
    perform private.log_event(
      'get_member_task_stats', 'missing_team', jsonb_build_object('actor', actor)
    );
    raise exception 'Team is required.' using errcode = '22023';
  end if;
  if p_user_id is null then
    perform private.log_event(
      'get_member_task_stats', 'missing_user', jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'User is required.' using errcode = '22023';
  end if;

  select * into team_row
  from public.teams
  where id = p_team_id;
  if not found then
    perform private.log_event(
      'get_member_task_stats', 'team_not_found',
      jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'Team not found.' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.team_members
    where team_id = p_team_id and user_id = actor
  ) then
    perform private.log_event(
      'get_member_task_stats', 'not_a_member',
      jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'The user is not a member of this team.' using errcode = '42501';
  end if;

  select display_name into target_display_name
  from public.profiles
  where id = p_user_id;
  if not found then
    perform private.log_event(
      'get_member_task_stats', 'user_not_found',
      jsonb_build_object('actor', actor, 'teamId', p_team_id, 'targetUserId', p_user_id)
    );
    raise exception 'User not found.' using errcode = '22023';
  end if;
  target_current_member := exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = p_user_id
  );

  logical_today := (pg_catalog.now() at time zone team_row.timezone)::date;
  if (p_from_date is null) <> (p_to_date is null) then
    perform private.log_event(
      'get_member_task_stats', 'incomplete_range',
      jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'Both fromDate and toDate are required when filtering a range.'
      using errcode = '22023';
  end if;

  if p_from_date is null then
    resolved_to_date := logical_today;
    resolved_from_date := logical_today - 29;
  else
    resolved_from_date := p_from_date;
    resolved_to_date := p_to_date;
  end if;

  if resolved_to_date > logical_today then
    perform private.log_event(
      'get_member_task_stats', 'to_date_in_future',
      jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'toDate cannot be in the future.' using errcode = '22023';
  end if;
  if resolved_from_date > resolved_to_date then
    perform private.log_event(
      'get_member_task_stats', 'from_date_after_to_date',
      jsonb_build_object('actor', actor, 'teamId', p_team_id)
    );
    raise exception 'fromDate must be on or before toDate.' using errcode = '22023';
  end if;

  with matching_completions as (
    select
      tc.id,
      tc.task_id,
      tc.completion_date,
      t.title as task_title,
      t.position as task_position,
      t.deleted_at is not null as task_archived,
      c.id as checklist_id,
      c.name as checklist_name,
      c.created_at as checklist_created_at,
      c.deleted_at is not null as checklist_archived
    from public.task_completions tc
    join public.tasks t on t.id = tc.task_id
    join public.checklists c on c.id = t.checklist_id
    where tc.team_id = p_team_id
      and c.team_id = p_team_id
      and tc.completed_by = p_user_id
      and tc.undone_at is null
      and tc.completion_date >= resolved_from_date
      and tc.completion_date <= resolved_to_date
      and (p_checklist_id is null or c.id = p_checklist_id)
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'taskId', task_id,
        'taskTitle', task_title,
        'checklistId', checklist_id,
        'checklistName', checklist_name,
        'checklistArchived', checklist_archived,
        'taskArchived', task_archived,
        'completedCount', completed_count,
        'lastCompletionDate', last_completion_date
      ) order by completed_count desc, checklist_created_at, checklist_id, task_position, task_id
    ), '[]'::jsonb),
    coalesce(sum(completed_count), 0)
  into tasks, total_completed
  from (
    select
      task_id, task_title, task_position, task_archived,
      checklist_id, checklist_name, checklist_created_at, checklist_archived,
      count(*) as completed_count,
      max(completion_date) as last_completion_date
    from matching_completions
    group by task_id, task_title, task_position, task_archived,
      checklist_id, checklist_name, checklist_created_at, checklist_archived
  ) grouped;

  return jsonb_build_object(
    'userId', p_user_id,
    'displayName', target_display_name,
    'currentMember', target_current_member,
    'fromDate', resolved_from_date,
    'toDate', resolved_to_date,
    'logicalToday', logical_today,
    'completedCount', total_completed,
    'tasks', tasks
  );
end;
$$;

revoke all on function public.get_member_stats(uuid, date, date, uuid)
  from public, anon, authenticated;
revoke all on function public.get_member_task_stats(uuid, uuid, date, date, uuid)
  from public, anon, authenticated;
grant execute on function public.get_member_stats(uuid, date, date, uuid) to authenticated;
grant execute on function public.get_member_task_stats(uuid, uuid, date, date, uuid) to authenticated;
