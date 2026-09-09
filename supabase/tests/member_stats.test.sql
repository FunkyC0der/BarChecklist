begin;
select plan(24);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000071', 'stats-owner@example.com', '{"display_name":"Stats Owner"}'),
  ('00000000-0000-0000-0000-000000000072', 'stats-member-a@example.com', '{"display_name":"Stats Member A"}'),
  ('00000000-0000-0000-0000-000000000073', 'stats-member-b@example.com', '{"display_name":"Stats Member B"}'),
  ('00000000-0000-0000-0000-000000000074', 'stats-former@example.com', '{"display_name":"Stats Former"}'),
  ('00000000-0000-0000-0000-000000000075', 'stats-outsider@example.com', '{"display_name":"Stats Outsider"}');

-- Team creation auto-adds the owner to team_members (team_owner_membership trigger).
insert into public.teams (id, name, owner_id, timezone)
values ('10000000-0000-0000-0000-000000000071', 'Stats team', '00000000-0000-0000-0000-000000000071', 'UTC');
insert into public.team_members (team_id, user_id)
values
  ('10000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000072'),
  ('10000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000073'),
  ('10000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000074');

insert into public.checklists (id, team_id, name, created_by)
values
  ('20000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', 'Stats open', '00000000-0000-0000-0000-000000000071'),
  ('20000000-0000-0000-0000-000000000072', '10000000-0000-0000-0000-000000000071', 'Stats archived', '00000000-0000-0000-0000-000000000071');
insert into public.tasks (id, checklist_id, title, position)
values
  ('30000000-0000-0000-0000-000000000071', '20000000-0000-0000-0000-000000000071', 'Wash glasses', 0),
  ('30000000-0000-0000-0000-000000000072', '20000000-0000-0000-0000-000000000072', 'Count till', 0);

alter table public.task_completions disable trigger task_completion_prepared;
insert into public.task_completions (id, task_id, team_id, completion_date, completed_by, completed_at, undone_at)
values
  -- Member A: two completions of the same task today/yesterday, plus one of the archived-checklist task.
  ('40000000-0000-0000-0000-000000000071', '30000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', (now() at time zone 'UTC')::date, '00000000-0000-0000-0000-000000000072', now() - interval '1 hour', null),
  ('40000000-0000-0000-0000-000000000072', '30000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', (now() at time zone 'UTC')::date - 1, '00000000-0000-0000-0000-000000000072', now() - interval '25 hours', null),
  ('40000000-0000-0000-0000-000000000073', '30000000-0000-0000-0000-000000000072', '10000000-0000-0000-0000-000000000071', (now() at time zone 'UTC')::date - 2, '00000000-0000-0000-0000-000000000072', now() - interval '49 hours', null),
  -- Former member: one completion in range, made before leaving the team.
  ('40000000-0000-0000-0000-000000000074', '30000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', (now() at time zone 'UTC')::date - 3, '00000000-0000-0000-0000-000000000074', now() - interval '73 hours', null),
  -- Undone completion: must not count.
  ('40000000-0000-0000-0000-000000000075', '30000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', (now() at time zone 'UTC')::date - 4, '00000000-0000-0000-0000-000000000072', now() - interval '4 days', now()),
  -- Outside the default thirty-day window: only counted with an explicit range.
  ('40000000-0000-0000-0000-000000000076', '30000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', (now() at time zone 'UTC')::date - 40, '00000000-0000-0000-0000-000000000072', now() - interval '40 days', null);
alter table public.task_completions enable trigger task_completion_prepared;

update public.checklists set deleted_at = now() where id = '20000000-0000-0000-0000-000000000072';
delete from public.team_members
where team_id = '10000000-0000-0000-0000-000000000071'
  and user_id = '00000000-0000-0000-0000-000000000074';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000072', true);

select is(
  (
    select member.value->'completedCount'
    from jsonb_array_elements(public.get_member_stats('10000000-0000-0000-0000-000000000071')->'members') as member(value)
    where member.value->>'userId' = '00000000-0000-0000-0000-000000000072'
  ),
  '3'::jsonb,
  'member A completed count excludes the undone completion within the default window'
);
select is(
  (
    select member.value->'taskCount'
    from jsonb_array_elements(public.get_member_stats('10000000-0000-0000-0000-000000000071')->'members') as member(value)
    where member.value->>'userId' = '00000000-0000-0000-0000-000000000072'
  ),
  '2'::jsonb,
  'member A task count is the number of distinct tasks touched'
);
select is(
  (
    select member.value->>'lastCompletionDate'
    from jsonb_array_elements(public.get_member_stats('10000000-0000-0000-0000-000000000071')->'members') as member(value)
    where member.value->>'userId' = '00000000-0000-0000-0000-000000000072'
  ),
  ((now() at time zone 'UTC')::date)::text,
  'member A last completion date is the most recent one in range'
);
select is(
  (
    select member.value
    from jsonb_array_elements(public.get_member_stats('10000000-0000-0000-0000-000000000071')->'members') as member(value)
    where member.value->>'userId' = '00000000-0000-0000-0000-000000000073'
  ),
  jsonb_build_object(
    'userId', '00000000-0000-0000-0000-000000000073',
    'displayName', 'Stats Member B',
    'currentMember', true,
    'completedCount', 0,
    'taskCount', 0,
    'lastCompletionDate', null
  ),
  'a current member with no completions still appears with zero counts'
);
select ok(
  (
    select member.value @> '{"currentMember": false, "completedCount": 1}'::jsonb
    from jsonb_array_elements(public.get_member_stats('10000000-0000-0000-0000-000000000071')->'members') as member(value)
    where member.value->>'userId' = '00000000-0000-0000-0000-000000000074'
  ),
  'a former member with in-range completions appears with currentMember false'
);
select is(
  (
    select member.value->'completedCount'
    from jsonb_array_elements(
      public.get_member_stats('10000000-0000-0000-0000-000000000071', (now() at time zone 'UTC')::date - 45, (now() at time zone 'UTC')::date)->'members'
    ) as member(value)
    where member.value->>'userId' = '00000000-0000-0000-0000-000000000072'
  ),
  '4'::jsonb,
  'an explicit range includes completions outside the default thirty-day window'
);
select is(
  (
    select member.value->'completedCount'
    from jsonb_array_elements(
      public.get_member_stats('10000000-0000-0000-0000-000000000071', null, null, '20000000-0000-0000-0000-000000000072')->'members'
    ) as member(value)
    where member.value->>'userId' = '00000000-0000-0000-0000-000000000072'
  ),
  '1'::jsonb,
  'the checklist filter narrows get_member_stats to that checklist'
);
select is(
  (public.get_member_stats('10000000-0000-0000-0000-000000000071')->>'teamCompletedCount')::int,
  (
    select sum((member.value->>'completedCount')::int)::int
    from jsonb_array_elements(public.get_member_stats('10000000-0000-0000-0000-000000000071')->'members') as member(value)
  ),
  'teamCompletedCount equals the sum of member counts'
);
select is(
  public.get_member_task_stats('10000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000072')->'tasks'->0->>'taskId',
  '30000000-0000-0000-0000-000000000071',
  'get_member_task_stats orders tasks by completedCount descending'
);
select is(
  (public.get_member_task_stats('10000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000072')->'tasks'->0->'completedCount')::int,
  2,
  'the top task carries the correct completed count'
);
select ok(
  (public.get_member_task_stats('10000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000072')->'tasks'->1) @> '{"checklistArchived": true, "taskArchived": false}'::jsonb,
  'a task in a soft-deleted checklist is reported with checklistArchived true'
);
select is(
  (public.get_member_task_stats('10000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000072')->>'completedCount')::int,
  3,
  'get_member_task_stats total completedCount matches the member total'
);
select is(
  (public.get_member_task_stats('10000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000074')->>'currentMember')::boolean,
  false,
  'get_member_task_stats works for a former member the caller is not'
);
select is(
  (
    select count(*)
    from jsonb_array_elements(
      public.get_member_task_stats(
        '10000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000072',
        null, null, '20000000-0000-0000-0000-000000000072'
      )->'tasks'
    )
  ),
  1::bigint,
  'the checklist filter narrows get_member_task_stats to that checklist'
);

select throws_ok(
  $$select public.get_member_stats(null)$$,
  '22023',
  'Team is required.',
  'missing team is rejected'
);
select throws_ok(
  $$select public.get_member_stats('10000000-0000-0000-0000-000000000071', current_date, null)$$,
  '22023',
  'Both fromDate and toDate are required when filtering a range.',
  'one missing range bound is rejected'
);
select throws_ok(
  $$select public.get_member_stats('10000000-0000-0000-0000-000000000071', current_date, current_date + 1)$$,
  '22023',
  'toDate cannot be in the future.',
  'future toDate is rejected'
);
select throws_ok(
  $$select public.get_member_stats('10000000-0000-0000-0000-000000000071', current_date, current_date - 1)$$,
  '22023',
  'fromDate must be on or before toDate.',
  'fromDate after toDate is rejected'
);
select throws_ok(
  $$select public.get_member_task_stats('10000000-0000-0000-0000-000000000071', null)$$,
  '22023',
  'User is required.',
  'null target user is rejected'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000075', true);
select throws_ok(
  $$select public.get_member_stats('10000000-0000-0000-0000-000000000071')$$,
  '42501',
  'The user is not a member of this team.',
  'outsider cannot read member stats'
);
select throws_ok(
  $$select public.get_member_task_stats('10000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000072')$$,
  '42501',
  'The user is not a member of this team.',
  'outsider cannot read member task stats'
);
reset role;

select ok(
  not has_function_privilege('anon', 'public.get_member_stats(uuid, date, date, uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.get_member_stats(uuid, date, date, uuid)', 'execute'),
  'get_member_stats execution is granted only to authenticated users'
);
select ok(
  not has_function_privilege('anon', 'public.get_member_task_stats(uuid, uuid, date, date, uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.get_member_task_stats(uuid, uuid, date, date, uuid)', 'execute'),
  'get_member_task_stats execution is granted only to authenticated users'
);
select ok(
  to_regclass('public.task_completions_member_stats_idx') is not null,
  'the member-stats supporting index exists'
);

select * from finish();
rollback;
