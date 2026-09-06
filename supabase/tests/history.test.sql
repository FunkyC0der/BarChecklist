begin;
select plan(31);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000051', 'history-owner@example.com', '{"display_name":"History Owner"}'),
  ('00000000-0000-0000-0000-000000000052', 'history-member@example.com', '{"display_name":"History Member"}'),
  ('00000000-0000-0000-0000-000000000053', 'history-former@example.com', '{"display_name":"History Former"}'),
  ('00000000-0000-0000-0000-000000000054', 'history-outsider@example.com', '{"display_name":"History Outsider"}');

insert into public.teams (id, name, owner_id, timezone)
values
  ('10000000-0000-0000-0000-000000000051', 'History team', '00000000-0000-0000-0000-000000000051', 'UTC'),
  ('10000000-0000-0000-0000-000000000052', 'Other history team', '00000000-0000-0000-0000-000000000054', 'UTC');
insert into public.team_members (team_id, user_id)
values
  ('10000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000052');

insert into public.checklists (id, team_id, name, created_by)
values
  ('20000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000051', 'History open', '00000000-0000-0000-0000-000000000051'),
  ('20000000-0000-0000-0000-000000000052', '10000000-0000-0000-0000-000000000051', 'History archive', '00000000-0000-0000-0000-000000000051');
insert into public.tasks (id, checklist_id, title, position)
values
  ('30000000-0000-0000-0000-000000000051', '20000000-0000-0000-0000-000000000051', 'Open till', 0),
  ('30000000-0000-0000-0000-000000000052', '20000000-0000-0000-0000-000000000052', 'Archive till', 0);
insert into public.checklists (id, team_id, name, created_by)
values
  ('20000000-0000-0000-0000-000000000053', '10000000-0000-0000-0000-000000000052', 'Other team checklist', '00000000-0000-0000-0000-000000000054');
insert into public.tasks (id, checklist_id, title, position)
values
  ('30000000-0000-0000-0000-000000000053', '20000000-0000-0000-0000-000000000053', 'Other team task', 0);

alter table public.task_completions disable trigger task_completion_prepared;
insert into public.task_completions (id, task_id, team_id, completion_date, completed_by, completed_at, undone_at)
values
  ('40000000-0000-0000-0000-000000000101', '30000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000051', (now() at time zone 'UTC')::date, '00000000-0000-0000-0000-000000000052', now() - interval '1 hour', null),
  ('40000000-0000-0000-0000-000000000102', '30000000-0000-0000-0000-000000000052', '10000000-0000-0000-0000-000000000051', (now() at time zone 'UTC')::date - 1, '00000000-0000-0000-0000-000000000053', now() - interval '25 hours', null),
  ('40000000-0000-0000-0000-000000000103', '30000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000051', (now() at time zone 'UTC')::date - 2, '00000000-0000-0000-0000-000000000052', now() - interval '49 hours', now()),
  ('40000000-0000-0000-0000-000000000104', '30000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000051', (now() at time zone 'UTC')::date - 14, '00000000-0000-0000-0000-000000000052', now() - interval '14 days', null),
  ('40000000-0000-0000-0000-000000000105', '30000000-0000-0000-0000-000000000053', '10000000-0000-0000-0000-000000000051', (now() at time zone 'UTC')::date - 3, '00000000-0000-0000-0000-000000000054', now() - interval '73 hours', null);
alter table public.task_completions enable trigger task_completion_prepared;

update public.checklists
set deleted_at = now()
where id = '20000000-0000-0000-0000-000000000052';
update public.tasks
set deleted_at = now()
where id = '30000000-0000-0000-0000-000000000052';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000052', true);

select is(
  public.get_history('10000000-0000-0000-0000-000000000051')->>'logicalToday',
  ((now() at time zone 'UTC')::date)::text,
  'history uses the canonical team logical today'
);
select is(
  public.get_history('10000000-0000-0000-0000-000000000051')->>'fromDate',
  ((now() at time zone 'UTC')::date - 13)::text,
  'default history range starts thirteen days before today'
);
select is(
  jsonb_array_length(public.get_history('10000000-0000-0000-0000-000000000051')->'days'),
  2,
  'default history excludes days outside the fourteen-day range and undone completions'
);
select is(
  public.get_history('10000000-0000-0000-0000-000000000051')->'days'->0->>'date',
  ((now() at time zone 'UTC')::date)::text,
  'history orders whole logical days descending'
);
select is(
  public.get_history('10000000-0000-0000-0000-000000000051')->'days'->0->'completions'->0->>'taskTitle',
  'Open till',
  'history includes current task names'
);
select is(
  public.get_history('10000000-0000-0000-0000-000000000051')->'days'->1->'completions'->0->>'checklistName',
  'History archive',
  'history retains current names for archived checklist and task records'
);
select is(
  public.get_history('10000000-0000-0000-0000-000000000051')->'days'->1->'completedCount',
  '1',
  'history reports each day completion count'
);
select ok(
  not (public.get_history('10000000-0000-0000-0000-000000000051') @> '{"days":[{"completions":[{"taskId":"30000000-0000-0000-0000-000000000053"}]}]}'::jsonb),
  'history excludes completions whose task belongs to another team'
);
select is(
  jsonb_array_length(public.get_history('10000000-0000-0000-0000-000000000051', null, null, '20000000-0000-0000-0000-000000000052')->'days'),
  1,
  'checklist filter supports archived historical checklist'
);
select is(
  jsonb_array_length(public.get_history('10000000-0000-0000-0000-000000000051', null, null, null, '00000000-0000-0000-0000-000000000053')->'days'),
  1,
  'user filter returns that performer history'
);
select is(
  jsonb_array_length(public.get_history('10000000-0000-0000-0000-000000000051', (now() at time zone 'UTC')::date - 1, (now() at time zone 'UTC')::date - 1)->'days'),
  1,
  'explicit inclusive date range is respected'
);
select is(
  public.get_history('10000000-0000-0000-0000-000000000051', current_date - 1000, current_date - 999) - 'logicalToday' - 'fromDate' - 'toDate',
  '{"days": [], "hasMore": false, "nextBeforeDate": null}'::jsonb,
  'empty history returns a stable page shape'
);
select is(
  jsonb_array_length(public.get_history('10000000-0000-0000-0000-000000000051', (now() at time zone 'UTC')::date - 14, (now() at time zone 'UTC')::date, null, null, 1, (now() at time zone 'UTC')::date - 14)->'days'),
  0,
  'cursor before the lower date bound returns no days'
);
select is(
  public.get_history('10000000-0000-0000-0000-000000000051', (now() at time zone 'UTC')::date - 14, (now() at time zone 'UTC')::date, null, null, 1)->>'hasMore',
  'true',
  'whole-day limit exposes a cursor when more days exist'
);
select is(
  public.get_history('10000000-0000-0000-0000-000000000051', (now() at time zone 'UTC')::date - 14, (now() at time zone 'UTC')::date, null, null, 1)->>'nextBeforeDate',
  ((now() at time zone 'UTC')::date)::text,
  'next cursor is the final returned logical day'
);
select is(
  public.get_history('10000000-0000-0000-0000-000000000051', (now() at time zone 'UTC')::date - 14, (now() at time zone 'UTC')::date, null, null, 1, (now() at time zone 'UTC')::date)->'days'->0->>'date',
  ((now() at time zone 'UTC')::date - 1)::text,
  'cursor starts strictly before the returned day'
);
select is(
  public.get_history_filter_options('10000000-0000-0000-0000-000000000051')->'checklists'->0->>'archived',
  'true',
  'filter options mark historical archived checklists'
);
select is(
  public.get_history_filter_options('10000000-0000-0000-0000-000000000051')->'users'->0->>'currentMember',
  'false',
  'filter options retain former performers as non-members'
);
select is(
  jsonb_array_length(public.get_history_filter_options('10000000-0000-0000-0000-000000000051')->'checklists'),
  2,
  'filter options include only checklists with active completions'
);
select is(
  jsonb_array_length(public.get_history_filter_options('10000000-0000-0000-0000-000000000051')->'users'),
  2,
  'filter options include only users with active completions'
);
select ok(
  not (public.get_history_filter_options('10000000-0000-0000-0000-000000000051')->'checklists' @> '[{"id":"20000000-0000-0000-0000-000000000053"}]'::jsonb)
  and not (public.get_history_filter_options('10000000-0000-0000-0000-000000000051')->'users' @> '[{"id":"00000000-0000-0000-0000-000000000054"}]'::jsonb),
  'filter options exclude mismatched task and performer records from another team'
);
select throws_ok(
  $$select public.get_history(null)$$,
  '22023',
  'Team is required.',
  'missing team is rejected'
);
select throws_ok(
  $$select public.get_history('10000000-0000-0000-0000-000000000051', current_date, null)$$,
  '22023',
  'Both fromDate and toDate are required when filtering a range.',
  'one missing date is rejected'
);
select throws_ok(
  $$select public.get_history('10000000-0000-0000-0000-000000000051', current_date, current_date + 1)$$,
  '22023',
  'toDate cannot be in the future.',
  'future toDate is rejected'
);
select throws_ok(
  $$select public.get_history('10000000-0000-0000-0000-000000000051', null, null, null, null, 0)$$,
  '22023',
  'History limit must be between 1 and 31.',
  'limit below one is rejected'
);
select throws_ok(
  $$select public.get_history('10000000-0000-0000-0000-000000000051', null, null, null, null, 32)$$,
  '22023',
  'History limit must be between 1 and 31.',
  'limit above thirty-one is rejected'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000054', true);
select throws_ok(
  $$select public.get_history('10000000-0000-0000-0000-000000000051')$$,
  '42501',
  'The user is not a member of this team.',
  'outsider cannot read history'
);
select throws_ok(
  $$select public.get_history_filter_options('10000000-0000-0000-0000-000000000051')$$,
  '42501',
  'The user is not a member of this team.',
  'outsider cannot read history filters'
);
reset role;

select ok(
  not has_function_privilege('anon', 'public.get_history(uuid, date, date, uuid, uuid, integer, date)', 'execute')
  and has_function_privilege('authenticated', 'public.get_history(uuid, date, date, uuid, uuid, integer, date)', 'execute'),
  'history RPC execution is granted only to authenticated users'
);
select ok(
  not has_function_privilege('anon', 'public.get_history_filter_options(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.get_history_filter_options(uuid)', 'execute'),
  'history filter-options execution is granted only to authenticated users'
);
select ok(
  to_regclass('public.task_completions_history_active_idx') is not null,
  'active completion history index exists'
);

select * from finish();
rollback;
