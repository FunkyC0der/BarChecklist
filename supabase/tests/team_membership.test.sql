begin;
select plan(35);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('40000000-0000-0000-0000-000000000001', 'owner-two@example.com', '{"display_name":"Owner Two"}'),
  ('40000000-0000-0000-0000-000000000002', 'member-two@example.com', '{"display_name":"Member Two"}'),
  ('40000000-0000-0000-0000-000000000003', 'invitee-two@example.com', '{"display_name":"Invitee Two"}'),
  ('40000000-0000-0000-0000-000000000004', 'outsider-two@example.com', '{"display_name":"Outsider Two"}');

insert into public.teams (id, name, owner_id, timezone)
values (
  '50000000-0000-0000-0000-000000000001',
  'Membership team',
  '40000000-0000-0000-0000-000000000001',
  'Europe/Kyiv'
);

create temporary table invite_tokens (token text not null);
grant select, insert on invite_tokens to authenticated;

select is(
  (select count(*) from public.team_members where team_id = '50000000-0000-0000-0000-000000000001'),
  1::bigint,
  'team creation adds the owner as a member'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$insert into public.teams (id, name, owner_id, timezone) values ('50000000-0000-0000-0000-000000000002', 'Created as owner', '40000000-0000-0000-0000-000000000001', 'UTC')$$,
  'authenticated user can create a team'
);
select is(
  (select count(*) from public.team_members where team_id = '50000000-0000-0000-0000-000000000002' and user_id = '40000000-0000-0000-0000-000000000001'),
  1::bigint,
  'authenticated team creation adds its owner as a member'
);
select is(
  (select count(*) from public.teams where id = '50000000-0000-0000-0000-000000000002'),
  1::bigint,
  'new owner can read their team in a separate query'
);

select lives_ok(
  $$insert into invite_tokens select token from public.create_team_invite('50000000-0000-0000-0000-000000000001')$$,
  'owner can create an invite'
);
select is((select char_length(token) from invite_tokens), 64, 'invite token is 256 bits encoded as hex');
select is((select count(*) from public.team_invites), 1::bigint, 'owner can view invite metadata');
select is(
  (select char_length(token_hash) from public.team_invites),
  64,
  'only a hash is stored for an invite token'
);
select throws_ok(
  $$insert into public.team_members (team_id, user_id) values ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002')$$,
  '42501',
  null,
  'owner cannot directly add a member'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.team_invites), 0::bigint, 'outsider cannot view invite metadata');
select throws_ok(
  $$select * from public.create_team_invite('50000000-0000-0000-0000-000000000001')$$,
  '42501',
  'Only the team owner can create an invite.',
  'outsider cannot create an invite'
);
select is(
  (select status from public.inspect_team_invite((select token from invite_tokens))),
  'active',
  'authenticated invitee can inspect an active invite'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
select is(
  (select joined from public.accept_team_invite((select token from invite_tokens))),
  true,
  'first invite acceptance creates membership'
);
select is(
  (select joined from public.accept_team_invite((select token from invite_tokens))),
  false,
  'repeat invite acceptance is idempotent'
);
select is(
  (select count(*) from public.team_members where team_id = '50000000-0000-0000-0000-000000000001' and user_id = '40000000-0000-0000-0000-000000000002'),
  1::bigint,
  'repeat accept does not duplicate membership'
);
update public.teams
set name = 'Nope'
where id = '50000000-0000-0000-0000-000000000001';
select is(
  (select name from public.teams where id = '50000000-0000-0000-0000-000000000001'),
  'Membership team',
  'member cannot update owner-only team data'
);
select lives_ok(
  $$select public.leave_team('50000000-0000-0000-0000-000000000001')$$,
  'member can leave their team'
);
select is(
  (select count(*) from public.team_members where team_id = '50000000-0000-0000-0000-000000000001' and user_id = '40000000-0000-0000-0000-000000000002'),
  0::bigint,
  'leave removes the member'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);
select is(
  (select joined from public.accept_team_invite((select token from invite_tokens))),
  true,
  'one invite can be accepted by another user'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.revoke_team_invite('50000000-0000-0000-0000-000000000001')$$,
  'owner can revoke the active invite'
);
select is(
  (select revoked_at is not null from public.team_invites),
  true,
  'revoke marks the invite revoked'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);
select is(
  (select status from public.inspect_team_invite((select token from invite_tokens))),
  'revoked',
  'revoked invite reports its status'
);
select throws_ok(
  $$select * from public.accept_team_invite((select token from invite_tokens))$$,
  '22023',
  'Invite has been revoked.',
  'revoked invite cannot be accepted'
);
select is(
  (select status from public.inspect_team_invite('not-a-real-token')),
  'invalid',
  'invalid invite reports its status'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
insert into invite_tokens select token from public.create_team_invite('50000000-0000-0000-0000-000000000001');
select is(
  (select count(*) from public.team_invites where revoked_at is null),
  1::bigint,
  'rotating an invite leaves only one unrevoked invite'
);
select is(
  (select count(*) from public.team_invites where revoked_at is not null),
  1::bigint,
  'rotating an invite revokes the previous one'
);
select throws_ok(
  $$select public.leave_team('50000000-0000-0000-0000-000000000001')$$,
  '23514',
  'The team owner cannot leave the team.',
  'owner cannot leave the team'
);
select throws_ok(
  $$select public.remove_team_member('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001')$$,
  '23514',
  'The team owner cannot be removed from team_members.',
  'owner cannot remove themselves'
);
select lives_ok(
  $$select public.remove_team_member('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003')$$,
  'owner can remove a member'
);
select is(
  (select count(*) from public.team_members where team_id = '50000000-0000-0000-0000-000000000001' and user_id = '40000000-0000-0000-0000-000000000003'),
  0::bigint,
  'owner removal removes that membership'
);
select lives_ok(
  $$delete from public.teams where id = '50000000-0000-0000-0000-000000000001'$$,
  'owner can permanently delete their team'
);
select is(
  (select count(*) from public.teams where id = '50000000-0000-0000-0000-000000000001'),
  0::bigint,
  'deleting a team removes it and its memberships'
);

select ok(
  exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'teams'
  ),
  'teams are published for realtime updates'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_members'
  ),
  'team memberships are published for realtime updates'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_invites'
  ),
  'team invites are published for realtime updates'
);

select * from finish();
rollback;
