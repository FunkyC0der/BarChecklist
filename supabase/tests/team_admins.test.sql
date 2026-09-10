begin;
select plan(19);
insert into auth.users (id, email, raw_user_meta_data) values
  ('70000000-0000-0000-0000-000000000001', 'admin-owner@example.com', '{"display_name":"Owner"}'),
  ('70000000-0000-0000-0000-000000000002', 'admin@example.com', '{"display_name":"Admin"}'),
  ('70000000-0000-0000-0000-000000000003', 'member@example.com', '{"display_name":"Member"}'),
  ('70000000-0000-0000-0000-000000000004', 'member-two@example.com', '{"display_name":"Member Two"}'),
  ('70000000-0000-0000-0000-000000000005', 'outsider@example.com', '{"display_name":"Outsider"}');
insert into public.teams (id, name, owner_id, timezone) values ('71000000-0000-0000-0000-000000000001', 'Admin team', '70000000-0000-0000-0000-000000000001', 'UTC');
insert into public.team_members (team_id, user_id) values
  ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002'),
  ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003'),
  ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000004');
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select public.set_team_member_role('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'admin');
select pass('owner promotes member');
select is((select role from public.team_members where user_id = '70000000-0000-0000-0000-000000000002'), 'admin', 'promotion persists');
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);
select ok(private.can_manage_team('71000000-0000-0000-0000-000000000001'), 'admin can manage');
select public.set_team_member_role('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'admin');
select pass('admin promotes');
select public.set_team_member_role('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'member');
select pass('admin demotes');
select * from public.create_team_invite('71000000-0000-0000-0000-000000000001');
select pass('admin creates invite');
select is((select count(*) from public.team_invites), 1::bigint, 'admin reads invite metadata');
select public.revoke_team_invite('71000000-0000-0000-0000-000000000001');
select pass('admin revokes invite');
update public.teams set name = 'Managed', timezone = 'Europe/Kyiv' where id = '71000000-0000-0000-0000-000000000001';
select pass('admin updates team');
select is((select name from public.teams where id = '71000000-0000-0000-0000-000000000001'), 'Managed', 'team update persists');
select public.remove_team_member('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000004');
select pass('admin removes member');
select throws_ok($$select public.remove_team_member('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001')$$, '23514', 'The team owner cannot be removed from team_members.', 'admin cannot remove owner');
select throws_ok($$update public.teams set owner_id = '70000000-0000-0000-0000-000000000002' where id = '71000000-0000-0000-0000-000000000001'$$, '42501', null, 'admin cannot change owner');
delete from public.teams where id = '71000000-0000-0000-0000-000000000001';
select pass('admin delete is filtered');
select is((select count(*) from public.teams where id = '71000000-0000-0000-0000-000000000001'), 1::bigint, 'team survives');
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000003', true);
select throws_ok($$select public.set_team_member_role('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'member')$$, '42501', null, 'member cannot set role');
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000005', true);
select throws_ok($$select public.set_team_member_role('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'member')$$, '42501', null, 'outsider cannot set role');
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.set_team_member_role('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'admin')$$, '23514', 'The team owner role cannot be changed.', 'owner role immutable');
select throws_ok($$select public.set_team_member_role('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'owner')$$, '22023', 'Role must be member or admin.', 'invalid role rejected');
select * from finish();
rollback;
