begin;
select plan(10);

-- Missed-task reporting uses its own fixtures: backdated tasks would otherwise
-- change every day count asserted in history.test.sql.

insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000061', 'missed-owner@example.com', '{"display_name":"Missed Owner"}'),
  ('00000000-0000-0000-0000-000000000062', 'missed-member@example.com', '{"display_name":"Missed Member"}');

insert into public.teams (id, name, owner_id, timezone)
values ('10000000-0000-0000-0000-000000000061', 'Missed team', '00000000-0000-0000-0000-000000000061', 'UTC');
insert into public.team_members (team_id, user_id)
values ('10000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000062');

insert into public.checklists (id, team_id, name, created_by)
values
  ('20000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000061', 'Missed open', '00000000-0000-0000-0000-000000000061'),
  ('20000000-0000-0000-0000-000000000062', '10000000-0000-0000-0000-000000000061', 'Missed second', '00000000-0000-0000-0000-000000000061'),
  ('20000000-0000-0000-0000-000000000063', '10000000-0000-0000-0000-000000000061', 'Missed archived', '00000000-0000-0000-0000-000000000061');

insert into public.tasks (id, checklist_id, title, position, cadence, weekdays)
values
  -- Daily, active for the whole default range.
  ('30000000-0000-0000-0000-000000000061', '20000000-0000-0000-0000-000000000061', 'Daily missed', 0, 'daily', '{}'),
  -- Weekly, scheduled only on the weekday of yesterday.
  ('30000000-0000-0000-0000-000000000062', '20000000-0000-0000-0000-000000000061', 'Weekly missed', 1, 'weekly',
    array[extract(isodow from (now() at time zone 'UTC')::date - 1)::smallint]),
  -- Created after the oldest days in the range.
  ('30000000-0000-0000-0000-000000000063', '20000000-0000-0000-0000-000000000061', 'Recent task', 2, 'daily', '{}'),
  -- Soft-deleted task and a task in an archived checklist.
  ('30000000-0000-0000-0000-000000000064', '20000000-0000-0000-0000-000000000061', 'Deleted task', 3, 'daily', '{}'),
  ('30000000-0000-0000-0000-000000000065', '20000000-0000-0000-0000-000000000063', 'Archived checklist task', 0, 'daily', '{}'),
  -- Daily task in a second checklist, used for the checklist filter.
  ('30000000-0000-0000-0000-000000000066', '20000000-0000-0000-0000-000000000062', 'Second checklist daily', 0, 'daily', '{}');

update public.tasks
set created_at = now() - interval '30 days'
where id in (
  '30000000-0000-0000-0000-000000000061',
  '30000000-0000-0000-0000-000000000062',
  '30000000-0000-0000-0000-000000000064',
  '30000000-0000-0000-0000-000000000065',
  '30000000-0000-0000-0000-000000000066'
);
update public.tasks
set created_at = now() - interval '1 day'
where id = '30000000-0000-0000-0000-000000000063';

alter table public.task_completions disable trigger task_completion_prepared;
insert into public.task_completions (id, task_id, team_id, completion_date, completed_by, completed_at, undone_at)
values
  -- Yesterday's daily task was completed, so it must not be reported as missed.
  ('40000000-0000-0000-0000-000000000201', '30000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000061', (now() at time zone 'UTC')::date - 1, '00000000-0000-0000-0000-000000000062', now() - interval '25 hours', null),
  -- Two days ago the completion was undone, so it counts as missed again.
  ('40000000-0000-0000-0000-000000000202', '30000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000061', (now() at time zone 'UTC')::date - 2, '00000000-0000-0000-0000-000000000062', now() - interval '49 hours', now());
alter table public.task_completions enable trigger task_completion_prepared;

update public.tasks set deleted_at = now() where id = '30000000-0000-0000-0000-000000000064';
update public.checklists set deleted_at = now() where id = '20000000-0000-0000-0000-000000000063';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000062', true);

select ok(
  not exists (
    select 1
    from jsonb_array_elements(public.get_history('10000000-0000-0000-0000-000000000061')->'days') as entry(value)
    where entry.value->>'date' = ((now() at time zone 'UTC')::date)::text
  ),
  'today is never reported as missed while the logical day is in progress'
);
select is(
  (
    select entry.value->'missedCount'
    from jsonb_array_elements(public.get_history('10000000-0000-0000-0000-000000000061')->'days') as entry(value)
    where entry.value->>'date' = ((now() at time zone 'UTC')::date - 1)::text
  ),
  '3'::jsonb,
  'a completed daily task is excluded while the other scheduled tasks are missed'
);
select ok(
  (
    select entry.value->'missed' @> '[{"taskId":"30000000-0000-0000-0000-000000000062","taskTitle":"Weekly missed"}]'::jsonb
    from jsonb_array_elements(public.get_history('10000000-0000-0000-0000-000000000061')->'days') as entry(value)
    where entry.value->>'date' = ((now() at time zone 'UTC')::date - 1)::text
  ),
  'a weekly task is missed on a day matching its weekdays'
);
select ok(
  (
    select not (entry.value->'missed' @> '[{"taskId":"30000000-0000-0000-0000-000000000062"}]'::jsonb)
    from jsonb_array_elements(public.get_history('10000000-0000-0000-0000-000000000061')->'days') as entry(value)
    where entry.value->>'date' = ((now() at time zone 'UTC')::date - 3)::text
  ),
  'a weekly task is not missed on days outside its weekdays'
);
select ok(
  (
    select entry.value->'missed' @> '[{"taskId":"30000000-0000-0000-0000-000000000061"}]'::jsonb
    from jsonb_array_elements(public.get_history('10000000-0000-0000-0000-000000000061')->'days') as entry(value)
    where entry.value->>'date' = ((now() at time zone 'UTC')::date - 2)::text
  ),
  'an undone completion leaves its task reported as missed'
);
select ok(
  (
    select not (entry.value->'missed' @> '[{"taskId":"30000000-0000-0000-0000-000000000063"}]'::jsonb)
    from jsonb_array_elements(public.get_history('10000000-0000-0000-0000-000000000061')->'days') as entry(value)
    where entry.value->>'date' = ((now() at time zone 'UTC')::date - 5)::text
  ),
  'a task created after the day is not reported as missed on that day'
);
select ok(
  not (public.get_history('10000000-0000-0000-0000-000000000061')
    @> '{"days":[{"missed":[{"taskId":"30000000-0000-0000-0000-000000000064"}]}]}'::jsonb)
  and not (public.get_history('10000000-0000-0000-0000-000000000061')
    @> '{"days":[{"missed":[{"taskId":"30000000-0000-0000-0000-000000000065"}]}]}'::jsonb),
  'deleted tasks and archived checklists are excluded from missed tasks'
);
select is(
  (
    select entry.value->'missedCount'
    from jsonb_array_elements(
      public.get_history('10000000-0000-0000-0000-000000000061', null, null, '20000000-0000-0000-0000-000000000062')->'days'
    ) as entry(value)
    where entry.value->>'date' = ((now() at time zone 'UTC')::date - 1)::text
  ),
  '1'::jsonb,
  'the checklist filter narrows missed tasks to that checklist'
);
select ok(
  (
    select bool_and((entry.value->>'missedCount')::integer = 0)
    from jsonb_array_elements(
      public.get_history('10000000-0000-0000-0000-000000000061', null, null, null, '00000000-0000-0000-0000-000000000062')->'days'
    ) as entry(value)
  ),
  'filtering by performer hides missed tasks, which have no performer'
);
select is(
  jsonb_array_length(public.get_history('10000000-0000-0000-0000-000000000061')->'days'),
  13,
  'days with only missed tasks still appear in the default range'
);

reset role;
select * from finish();
rollback;
