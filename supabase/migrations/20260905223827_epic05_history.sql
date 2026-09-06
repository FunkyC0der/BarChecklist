-- Epic 5: historical completion queries and filter options.

create index if not exists task_completions_history_active_idx
on public.task_completions (team_id, completion_date desc, task_id)
where undone_at is null;

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
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_team_id is null then
    raise exception 'Team is required.' using errcode = '22023';
  end if;

  select * into team_row
  from public.teams
  where id = p_team_id;
  if not found then
    raise exception 'Team not found.' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.team_members
    where team_id = p_team_id and user_id = actor
  ) then
    raise exception 'The user is not a member of this team.' using errcode = '42501';
  end if;

  logical_today := (pg_catalog.now() at time zone team_row.timezone)::date;
  if p_limit is null or p_limit < 1 or p_limit > 31 then
    raise exception 'History limit must be between 1 and 31.' using errcode = '22023';
  end if;
  if (p_from_date is null) <> (p_to_date is null) then
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
    raise exception 'toDate cannot be in the future.' using errcode = '22023';
  end if;
  if resolved_from_date > resolved_to_date then
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
  ), candidate_days as (
    select completion_date
    from matching_completions
    group by completion_date
    order by completion_date desc
    limit p_limit + 1
  ), page_days as (
    select completion_date
    from candidate_days
    order by completion_date desc
    limit p_limit
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', page_days.completion_date,
          'completedCount', (
            select count(*)
            from matching_completions matching
            where matching.completion_date = page_days.completion_date
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
            where matching.completion_date = page_days.completion_date
          ), '[]'::jsonb)
        )
        order by page_days.completion_date desc
      ),
      '[]'::jsonb
    ),
    (select count(*) > p_limit from candidate_days),
    (select min(completion_date) from page_days)
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

create or replace function public.get_history_filter_options(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  checklists jsonb;
  users jsonb;
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_team_id is null then
    raise exception 'Team is required.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.teams where id = p_team_id) then
    raise exception 'Team not found.' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.team_members
    where team_id = p_team_id and user_id = actor
  ) then
    raise exception 'The user is not a member of this team.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', checklist.id,
      'name', checklist.name,
      'archived', checklist.deleted_at is not null
    ) order by checklist.name, checklist.id
  ), '[]'::jsonb)
  into checklists
  from (
    select distinct c.id, c.name, c.deleted_at
    from public.task_completions tc
    join public.tasks t on t.id = tc.task_id
    join public.checklists c on c.id = t.checklist_id
    where tc.team_id = p_team_id
      and c.team_id = p_team_id
      and tc.undone_at is null
  ) checklist;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', profile.id,
      'displayName', profile.display_name,
      'currentMember', exists (
        select 1
        from public.team_members member
        where member.team_id = p_team_id and member.user_id = profile.id
      )
    ) order by profile.display_name, profile.id
  ), '[]'::jsonb)
  into users
  from (
    select distinct p.id, p.display_name
    from public.task_completions tc
    join public.tasks t on t.id = tc.task_id
    join public.checklists c on c.id = t.checklist_id
    join public.profiles p on p.id = tc.completed_by
    where tc.team_id = p_team_id
      and c.team_id = p_team_id
      and tc.undone_at is null
  ) profile;

  return jsonb_build_object('checklists', checklists, 'users', users);
end;
$$;

revoke all on function public.get_history(uuid, date, date, uuid, uuid, integer, date)
  from public, anon, authenticated;
revoke all on function public.get_history_filter_options(uuid)
  from public, anon, authenticated;
grant execute on function public.get_history(uuid, date, date, uuid, uuid, integer, date)
  to authenticated;
grant execute on function public.get_history_filter_options(uuid)
  to authenticated;
