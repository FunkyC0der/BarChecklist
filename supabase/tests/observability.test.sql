begin;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000091', 'obs-member@example.com', '{"display_name":"Obs Member"}'),
  ('00000000-0000-0000-0000-000000000092', 'obs-outsider@example.com', '{"display_name":"Obs Outsider"}');
insert into public.teams (id, name, owner_id, timezone) values
  ('10000000-0000-0000-0000-000000000091', 'Obs team', '00000000-0000-0000-0000-000000000091', 'UTC');

set local role anon;
select throws_ok(
  $$select public.log_client_event('[]'::jsonb)$$,
  '42501',
  null,
  'anonymous cannot call log_client_event'
);
select throws_ok(
  $$select * from public.client_events$$,
  '42501',
  null,
  'anonymous cannot select client_events'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000091', true);

select throws_ok(
  $$select * from public.client_events$$,
  '42501',
  null,
  'authenticated cannot select client_events directly'
);
select throws_ok(
  $$insert into public.client_events (user_id, session_id, level, event, occurred_at)
    values ('00000000-0000-0000-0000-000000000091', 's1', 'error', 'x', now())$$,
  '42501',
  null,
  'authenticated cannot insert client_events directly'
);

select lives_ok(
  $$select public.log_client_event(jsonb_build_array(jsonb_build_object(
    'level', 'error', 'event', 'test.event', 'sessionId', 's1', 'occurredAt', now()::text
  )))$$,
  'member can log an event through the RPC'
);
reset role;
select is(
  (select count(*) from public.client_events where event = 'test.event'),
  1::bigint,
  'RPC-inserted event is stored'
);
select is(
  (select user_id from public.client_events where event = 'test.event'),
  '00000000-0000-0000-0000-000000000091'::uuid,
  'RPC stamps the caller as user_id regardless of payload'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000091', true);

select throws_ok(
  $$select public.log_client_event(
    (select jsonb_agg(jsonb_build_object(
      'level', 'error', 'event', 'n' || n, 'sessionId', 's1', 'occurredAt', now()::text
    )) from generate_series(1, 21) n)
  )$$,
  '22023',
  null,
  'batch of more than 20 events is refused'
);

select throws_ok(
  $$select public.log_client_event(jsonb_build_array(jsonb_build_object(
    'level', 'error', 'event', 'too-big', 'sessionId', 's1', 'occurredAt', now()::text,
    'context', jsonb_build_object('blob', repeat('x', 5000))
  )))$$,
  '22023',
  null,
  'an event payload over 4KB is refused'
);

select throws_ok(
  $$select public.log_client_event(jsonb_build_array(jsonb_build_object(
    'level', 'error', 'event', 'foreign-team', 'sessionId', 's1', 'occurredAt', now()::text,
    'teamId', '10000000-0000-0000-0000-000000000099'
  )))$$,
  '42501',
  null,
  'a team the caller does not belong to is refused'
);

reset role;
select ok(
  not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'client_events'
  ),
  'client_events is not part of the realtime publication'
);

select * from finish();
rollback;
