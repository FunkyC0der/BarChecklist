-- Epic 5: report tasks that were scheduled but never completed on past logical days.
--
-- Schedule history does not exist: tasks.cadence, tasks.weekdays and the soft-delete
-- flags only describe the current state. A task therefore counts as scheduled for a
-- past day when it is currently active, was created on or before that day, and its
-- current cadence matches the day. Today is never reported as missed because the
-- logical day is still in progress.

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
