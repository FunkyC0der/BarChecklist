begin;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'owner@example.com', '{"display_name":"Owner"}'),
  ('00000000-0000-0000-0000-000000000002', 'member@example.com', '{"display_name":"Member"}'),
  ('00000000-0000-0000-0000-000000000003', 'outsider@example.com', '{"display_name":"Outsider"}');

insert into public.teams (id, name, owner_id, timezone)
values (
  '10000000-0000-0000-0000-000000000001',
  'Test team',
  '00000000-0000-0000-0000-000000000001',
  'UTC'
);

insert into public.team_members (team_id, user_id)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');

insert into public.checklists (id, team_id, name, created_by)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Opening',
  '00000000-0000-0000-0000-000000000001'
);

insert into public.tasks (id, checklist_id, title, position)
values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Unlock the door',
  0
);

select is(
  (
    select count(*)
    from public.profiles
    where id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    )
  ),
  3::bigint,
  'signup trigger creates profiles'
);
select is(
  (select count(*) from public.team_members where user_id = '00000000-0000-0000-0000-000000000001'),
  1::bigint,
  'team trigger adds owner as a member'
);
select throws_ok(
  $$delete from public.team_members where team_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000001'$$,
  '23514',
  'The team owner cannot be removed from team_members.',
  'owner membership is protected'
);
select throws_ok(
  $$insert into public.teams (name, owner_id, timezone) values ('Broken', '00000000-0000-0000-0000-000000000001', 'Not/A_Zone')$$,
  '22023',
  'Unknown IANA timezone: Not/A_Zone',
  'invalid timezone is rejected'
);

set local role anon;
select throws_ok(
  $$select * from public.teams$$,
  '42501',
  null,
  'anonymous cannot read teams'
);
select throws_ok(
  $$insert into public.teams (name, owner_id) values ('Anon team', '00000000-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'anonymous cannot insert teams'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.teams), 1::bigint, 'owner can read their team');
select is((select count(*) from public.checklists), 1::bigint, 'owner can read team checklists');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.tasks), 1::bigint, 'member can read team tasks');
select throws_ok(
  $$insert into public.checklists (team_id, name, created_by) values ('10000000-0000-0000-0000-000000000001', 'Forbidden', '00000000-0000-0000-0000-000000000002')$$,
  '42501',
  null,
  'member cannot manage checklists'
);
select lives_ok(
  $$select public.complete_task('30000000-0000-0000-0000-000000000001')$$,
  'member can complete an active task'
);
select is(
  (select completed_by from public.task_completions where task_id = '30000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-000000000002'::uuid,
  'completion trigger derives the actor'
);
select is(
  (select team_id from public.task_completions where task_id = '30000000-0000-0000-0000-000000000001'),
  '10000000-0000-0000-0000-000000000001'::uuid,
  'completion trigger derives the team'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.teams), 0::bigint, 'outsider cannot read another team');

select * from finish();
rollback;
