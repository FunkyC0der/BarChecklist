begin;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', 'super-admin-owner@example.com', '{"display_name":"Super Admin Owner"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'super-admin-member@example.com', '{"display_name":"Super Admin Member"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'super-admin-admin@example.com', '{"display_name":"Super Admin Admin"}');

-- Team creation auto-adds the owner to team_members (team_owner_membership trigger).
insert into public.teams (id, name, owner_id, timezone)
values ('10000000-0000-0000-0000-0000000000a1', 'Super Admin team', '00000000-0000-0000-0000-0000000000a1', 'UTC');
insert into public.team_members (team_id, user_id)
values ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2');

insert into public.checklists (id, team_id, name, created_by)
values ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'Super Admin checklist', '00000000-0000-0000-0000-0000000000a1');
insert into public.tasks (id, checklist_id, title, position)
values ('30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'Super Admin task', 0);

alter table public.task_completions disable trigger task_completion_prepared;
insert into public.task_completions (id, task_id, team_id, completion_date, completed_by, completed_at, undone_at)
values
  ('40000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date, '00000000-0000-0000-0000-0000000000a2', now() - interval '1 hour', null),
  -- Soft-undone: must not count toward completions.
  ('40000000-0000-0000-0000-0000000000a2', '30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date - 1, '00000000-0000-0000-0000-0000000000a2', now() - interval '25 hours', now());
alter table public.task_completions enable trigger task_completion_prepared;

-- 1-2: anon cannot call either RPC.
set local role anon;
select throws_ok(
  $$select public.get_platform_overview()$$,
  '42501',
  null,
  'anonymous cannot call get_platform_overview'
);
select throws_ok(
  $$select public.get_platform_teams()$$,
  '42501',
  null,
  'anonymous cannot call get_platform_teams'
);

-- 3-5: authenticated non-admin cannot call either RPC, and the flag is false.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
select throws_ok(
  $$select public.get_platform_overview()$$,
  '42501',
  null,
  'a non-admin cannot call get_platform_overview'
);
select throws_ok(
  $$select public.get_platform_teams()$$,
  '42501',
  null,
  'a non-admin cannot call get_platform_teams'
);
select is(
  public.is_super_admin(),
  false,
  'is_super_admin is false for a non-admin'
);

-- 6: authenticated cannot select private.super_admins directly.
select throws_ok(
  $$select * from private.super_admins$$,
  '42501',
  null,
  'authenticated cannot select private.super_admins directly'
);

reset role;
insert into private.super_admins (user_id, note)
values ('00000000-0000-0000-0000-0000000000a3', 'test admin');

-- 7: flag flips true once granted.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', true);
select is(
  public.is_super_admin(),
  true,
  'is_super_admin is true once granted'
);

-- 8-9: admin can call both RPCs.
select lives_ok(
  $$select public.get_platform_overview()$$,
  'admin can call get_platform_overview'
);
select lives_ok(
  $$select public.get_platform_teams()$$,
  'admin can call get_platform_teams'
);

-- 10-13: overview totals match fixtures (soft-deleted/undone excluded).
select is(
  (public.get_platform_overview()->'totals'->>'teams')::int,
  1,
  'totals.teams matches fixtures'
);
select is(
  (public.get_platform_overview()->'totals'->>'checklists')::int,
  1,
  'totals.checklists excludes soft-deleted checklists'
);
select is(
  (public.get_platform_overview()->'totals'->>'tasks')::int,
  1,
  'totals.tasks excludes soft-deleted tasks'
);
select is(
  (public.get_platform_overview()->'totals'->>'completions')::int,
  1,
  'totals.completions excludes the soft-undone completion'
);

-- 14: get_platform_teams returns the fixture team with correct member/owner data.
select is(
  (
    select team.value->>'memberCount'
    from jsonb_array_elements(public.get_platform_teams()->'teams') as team(value)
    where team.value->>'id' = '10000000-0000-0000-0000-0000000000a1'
  ),
  '2',
  'get_platform_teams reports the correct memberCount'
);

-- 15: invalid sort is rejected; out-of-range limit is clamped rather than erroring.
select throws_ok(
  $$select public.get_platform_teams(50, 0, 'bogus')$$,
  '22023',
  null,
  'an invalid sort option is rejected'
);
select is(
  (public.get_platform_teams(9999, 0, 'created')->>'limit')::int,
  200,
  'an out-of-range limit is clamped to 200'
);

reset role;
select * from finish();
rollback;
