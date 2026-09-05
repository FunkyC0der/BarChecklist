alter type public.checklist_cadence rename to task_cadence;

alter table public.tasks
  add column cadence public.task_cadence,
  add column weekdays smallint[];

update public.tasks as task
set
  cadence = checklist.cadence,
  weekdays = checklist.weekdays
from public.checklists as checklist
where checklist.id = task.checklist_id;

do $$
begin
  if exists (
    select 1
    from public.tasks
    where cadence is null or weekdays is null
  ) then
    raise exception 'Task schedule backfill is incomplete.' using errcode = '23514';
  end if;
end;
$$;

alter table public.tasks
  alter column cadence set default 'daily'::public.task_cadence,
  alter column cadence set not null,
  alter column weekdays set default '{}',
  alter column weekdays set not null,
  add constraint task_schedule_matches_cadence check (
    (cadence = 'daily' and cardinality(weekdays) = 0)
    or
    (cadence = 'weekly' and cardinality(weekdays) between 1 and 7)
  ),
  add constraint task_weekdays_are_unique_iso_days
    check (private.valid_iso_weekdays(weekdays));

alter table public.checklists
  drop constraint checklist_weekdays_are_unique_iso_days,
  drop constraint checklist_schedule_matches_cadence,
  drop column cadence,
  drop column weekdays;

drop function public.create_checklist_task(uuid, text);

create function public.create_checklist_task(
  p_checklist_id uuid,
  p_title text,
  p_cadence public.task_cadence,
  p_weekdays smallint[]
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
  insert into public.tasks (checklist_id, title, cadence, weekdays, position)
  values (p_checklist_id, btrim(p_title), p_cadence, p_weekdays, next_position)
  returning *;
end;
$$;

revoke insert, update, delete on public.checklists from authenticated;
grant insert (team_id, name, created_by) on public.checklists to authenticated;
grant update (name) on public.checklists to authenticated;

revoke insert, update, delete on public.tasks from authenticated;
grant update (title, cadence, weekdays) on public.tasks to authenticated;

revoke all on function public.create_checklist_task(
  uuid,
  text,
  public.task_cadence,
  smallint[]
) from public, anon, authenticated;
grant execute on function public.create_checklist_task(
  uuid,
  text,
  public.task_cadence,
  smallint[]
) to authenticated;

comment on function public.create_checklist_task(
  uuid,
  text,
  public.task_cadence,
  smallint[]
) is
  'Owner-only task insert that validates the task schedule and assigns the next active position under a checklist lock.';
