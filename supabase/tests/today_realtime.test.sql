begin;
select plan(35);

insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000041','today-owner@example.com','{"display_name":"Today Owner"}'),
 ('00000000-0000-0000-0000-000000000042','today-member@example.com','{"display_name":"Today Member"}'),
 ('00000000-0000-0000-0000-000000000043','today-outsider@example.com','{"display_name":"Today Outsider"}');
insert into public.teams(id,name,owner_id,timezone) values
 ('10000000-0000-0000-0000-000000000041','Today team','00000000-0000-0000-0000-000000000041','UTC');
insert into public.team_members(team_id,user_id) values
 ('10000000-0000-0000-0000-000000000041','00000000-0000-0000-0000-000000000042');
insert into public.checklists(id,team_id,name,created_by,created_at) values
 ('20000000-0000-0000-0000-000000000041','10000000-0000-0000-0000-000000000041','Today','00000000-0000-0000-0000-000000000041','2026-01-01'),
 ('20000000-0000-0000-0000-000000000042','10000000-0000-0000-0000-000000000041','Later','00000000-0000-0000-0000-000000000041','2026-01-02');
insert into public.tasks(id,checklist_id,title,position,cadence,weekdays) values
 ('30000000-0000-0000-0000-000000000041','20000000-0000-0000-0000-000000000041','Daily',0,'daily','{}'),
 ('30000000-0000-0000-0000-000000000042','20000000-0000-0000-0000-000000000041','Never today',1,'weekly',array[((extract(isodow from now())::int % 7) + 1)]::smallint[]),
 ('30000000-0000-0000-0000-000000000043','20000000-0000-0000-0000-000000000042','Second',0,'daily','{}');

select is(private.logical_date_at('UTC','2026-03-29 23:30+00'), '2026-03-29'::date, 'logical date UTC boundary');
select is(private.logical_date_at('Pacific/Kiritimati','2026-03-29 23:30+00'), '2026-03-30'::date, 'logical date east of UTC');
select is(private.logical_date_at('America/Adak','2026-03-30 00:30+00'), '2026-03-29'::date, 'logical date west of UTC');
select is(private.logical_date_at('Europe/Kyiv','2026-03-29 00:30+00'), '2026-03-29'::date, 'Kyiv spring DST date');
select is(private.logical_date_at('Europe/Kyiv','2026-10-25 00:30+00'), '2026-10-25'::date, 'Kyiv fall DST date');
select ok(private.task_is_scheduled('weekly','{1}'::smallint[],'2026-03-30'::date), 'weekly Monday schedule matches');
select ok(not private.task_is_scheduled('weekly','{1}'::smallint[],'2026-03-31'::date), 'weekly schedule excludes other days');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000042',true);
select ok((public.get_today_snapshot('10000000-0000-0000-0000-000000000041')->>'timezone')='UTC','snapshot returns team timezone');
select ok((public.get_today_snapshot('10000000-0000-0000-0000-000000000041')->>'logicalDate') = ((now() at time zone 'UTC')::date)::text,'snapshot uses canonical server logical date');
select is(jsonb_array_length(public.get_today_snapshot('10000000-0000-0000-0000-000000000041')->'checklists'),2,'snapshot includes all active checklists');
select is(jsonb_array_length(public.get_today_snapshot('10000000-0000-0000-0000-000000000041')->'checklists'->0->'tasks'),1,'snapshot filters unscheduled tasks');
select is(public.get_today_snapshot('10000000-0000-0000-0000-000000000041')->'checklists'->0->'tasks'->0->>'title','Daily','snapshot task order is stable');
select lives_ok($$select public.complete_task('30000000-0000-0000-0000-000000000041')$$,'member can complete scheduled task');
select is((public.complete_task('30000000-0000-0000-0000-000000000041')->>'status'),'already_completed','duplicate completion is idempotent');
select is((select count(*) from public.task_completions where task_id='30000000-0000-0000-0000-000000000041'),1::bigint,'unique completion race leaves one row');
select is((public.get_today_snapshot('10000000-0000-0000-0000-000000000041')->'checklists'->0->'tasks'->0->'completion'->>'completedByName'),'Today Member','snapshot exposes completion display name');
select throws_ok($$select public.complete_task('30000000-0000-0000-0000-000000000042')$$,'23514',null,'unscheduled task cannot be completed');
select throws_ok($$insert into public.task_completions(task_id,team_id,completion_date,completed_by) values ('30000000-0000-0000-0000-000000000043','10000000-0000-0000-0000-000000000041','2000-01-01','00000000-0000-0000-0000-000000000042')$$,'42501',null,'direct completion insert is revoked');
select lives_ok($$select public.uncomplete_task((select id from public.task_completions where task_id='30000000-0000-0000-0000-000000000041'))$$,'completion author can undo');
select is((select count(*) from public.task_completions where undone_at is null),0::bigint,'undo hides completion from active state');
select is((public.uncomplete_task('ffffffff-ffff-ffff-ffff-ffffffffffff')->>'status'),'already_uncompleted','missing completion undo is idempotent');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000041',true);
select lives_ok($$select public.complete_task('30000000-0000-0000-0000-000000000041')$$,'owner can complete task');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000042',true);
select throws_ok($$select public.uncomplete_task((select id from public.task_completions where task_id='30000000-0000-0000-0000-000000000041'))$$,'42501',null,'non-author member cannot undo');
select throws_ok($$delete from public.task_completions$$,'42501',null,'direct completion delete is revoked');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000041',true);
select lives_ok($$select public.uncomplete_task((select id from public.task_completions where task_id='30000000-0000-0000-0000-000000000041'))$$,'team owner can undo completion');
select is((public.uncomplete_task((select id from public.task_completions where task_id='30000000-0000-0000-0000-000000000041'))->>'status'),'already_uncompleted','repeat undo is idempotent');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000042',true);
select is((public.complete_task('30000000-0000-0000-0000-000000000041')->>'status'),'created','completion can be reactivated');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000041',true);
select lives_ok($$select public.soft_delete_task('30000000-0000-0000-0000-000000000043')$$,'owner can soft-delete task');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000042',true);
select throws_ok($$select public.complete_task('30000000-0000-0000-0000-000000000043')$$,'23514',null,'soft-deleted task cannot be completed');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000043',true);
select throws_ok($$select public.get_today_snapshot('10000000-0000-0000-0000-000000000041')$$,'42501',null,'outsider cannot snapshot team');
select throws_ok($$select public.complete_task('30000000-0000-0000-0000-000000000041')$$,'42501',null,'outsider cannot complete task');
reset role;
select lives_ok($$delete from public.teams where id='10000000-0000-0000-0000-000000000041'$$,'team deletion succeeds with completion history');
select is((select count(*) from public.task_completions where team_id='10000000-0000-0000-0000-000000000041'),0::bigint,'team cascade removes completions');
select ok((select exists(select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and tablename='checklists')),'checklists are in realtime publication');
select ok((select exists(select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and tablename='tasks')),'tasks are in realtime publication');
select * from finish();
rollback;
