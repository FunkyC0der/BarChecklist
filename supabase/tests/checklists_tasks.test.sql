begin;
select plan(31);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000011', 'owner@example.com', '{"display_name":"Owner"}'),
  ('00000000-0000-0000-0000-000000000012', 'member@example.com', '{"display_name":"Member"}'),
  ('00000000-0000-0000-0000-000000000013', 'outsider@example.com', '{"display_name":"Outsider"}');

insert into public.teams (id, name, owner_id, timezone)
values
  (
    '10000000-0000-0000-0000-000000000011',
    'Bar team',
    '00000000-0000-0000-0000-000000000011',
    'UTC'
  ),
  (
    '10000000-0000-0000-0000-000000000012',
    'Limit team',
    '00000000-0000-0000-0000-000000000011',
    'UTC'
  );

insert into public.team_members (team_id, user_id)
values (
  '10000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012'
);

insert into public.checklists (id, team_id, name, cadence, weekdays, created_by)
values (
  '20000000-0000-0000-0000-000000000011',
  '10000000-0000-0000-0000-000000000011',
  'Opening',
  'daily',
  '{}',
  '00000000-0000-0000-0000-000000000011'
);

insert into public.tasks (id, checklist_id, title, position)
values
  (
    '30000000-0000-0000-0000-000000000011',
    '20000000-0000-0000-0000-000000000011',
    'Unlock the door',
    0
  ),
  (
    '30000000-0000-0000-0000-000000000012',
    '20000000-0000-0000-0000-000000000011',
    'Turn on lights',
    1
  ),
  (
    '30000000-0000-0000-0000-000000000013',
    '20000000-0000-0000-0000-000000000011',
    'Check tap',
    2
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);

insert into public.checklists (id, team_id, name, cadence, weekdays, created_by)
values (
  '20000000-0000-0000-0000-000000000012',
  '10000000-0000-0000-0000-000000000011',
  'Daily close',
  'daily',
  '{}',
  '00000000-0000-0000-0000-000000000011'
);

select is(
  (
    select cadence
    from public.checklists
    where id = '20000000-0000-0000-0000-000000000012'
  ),
  'daily'::public.checklist_cadence,
  'owner can create a daily checklist'
);
select is(
  (
    select cardinality(weekdays)
    from public.checklists
    where id = '20000000-0000-0000-0000-000000000012'
  ),
  0,
  'daily checklist keeps an empty weekday list'
);

insert into public.checklists (id, team_id, name, cadence, weekdays, created_by)
values (
  '20000000-0000-0000-0000-000000000013',
  '10000000-0000-0000-0000-000000000011',
  'Weekend prep',
  'weekly',
  '{5,6}',
  '00000000-0000-0000-0000-000000000011'
);

select is(
  (
    select weekdays
    from public.checklists
    where id = '20000000-0000-0000-0000-000000000013'
  ),
  array[5, 6]::smallint[],
  'owner can create a weekly checklist with ISO weekdays'
);

reset role;
select throws_ok(
  $$insert into public.checklists (team_id, name, cadence, weekdays, created_by)
    values (
      '10000000-0000-0000-0000-000000000011',
      'Empty weekly',
      'weekly',
      '{}',
      '00000000-0000-0000-0000-000000000011'
    )$$,
  '23514',
  null,
  'weekly checklist without weekdays is rejected'
);
select throws_ok(
  $$insert into public.checklists (team_id, name, cadence, weekdays, created_by)
    values (
      '10000000-0000-0000-0000-000000000011',
      'Day zero',
      'weekly',
      '{0}',
      '00000000-0000-0000-0000-000000000011'
    )$$,
  '23514',
  null,
  'weekday 0 is rejected'
);
select throws_ok(
  $$insert into public.checklists (team_id, name, cadence, weekdays, created_by)
    values (
      '10000000-0000-0000-0000-000000000011',
      'Day eight',
      'weekly',
      '{8}',
      '00000000-0000-0000-0000-000000000011'
    )$$,
  '23514',
  null,
  'weekday 8 is rejected'
);
select throws_ok(
  $$insert into public.checklists (team_id, name, cadence, weekdays, created_by)
    values (
      '10000000-0000-0000-0000-000000000011',
      'Duplicate days',
      'weekly',
      '{1,1}',
      '00000000-0000-0000-0000-000000000011'
    )$$,
  '23514',
  null,
  'duplicate weekdays are rejected'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);

select throws_ok(
  $$insert into public.checklists (team_id, name, created_by)
    values (
      '10000000-0000-0000-0000-000000000011',
      'Forbidden',
      '00000000-0000-0000-0000-000000000012'
    )$$,
  '42501',
  null,
  'member cannot insert a checklist'
);
select throws_ok(
  $$update public.checklists
    set name = 'Hacked'
    where id = '20000000-0000-0000-0000-000000000011'$$,
  '42501',
  null,
  'member cannot update a checklist'
);
select throws_ok(
  $$insert into public.tasks (checklist_id, title, position)
    values (
      '20000000-0000-0000-0000-000000000011',
      'Forbidden task',
      3
    )$$,
  '42501',
  null,
  'member cannot insert a task'
);
select throws_ok(
  $$update public.tasks
    set title = 'Hacked'
    where id = '30000000-0000-0000-0000-000000000011'$$,
  '42501',
  null,
  'member cannot update a task'
);
select throws_ok(
  $$select public.soft_delete_checklist('20000000-0000-0000-0000-000000000011')$$,
  '42501',
  null,
  'member cannot soft-delete a checklist'
);
select throws_ok(
  $$select public.soft_delete_task('30000000-0000-0000-0000-000000000011')$$,
  '42501',
  null,
  'member cannot soft-delete a task'
);
select throws_ok(
  $$select public.create_checklist_task(
    '20000000-0000-0000-0000-000000000011',
    'Forbidden rpc'
  )$$,
  '42501',
  null,
  'member cannot create a task through the RPC'
);
select throws_ok(
  $$select public.reorder_checklist_tasks(
    '20000000-0000-0000-0000-000000000011',
    array[
      '30000000-0000-0000-0000-000000000013',
      '30000000-0000-0000-0000-000000000012',
      '30000000-0000-0000-0000-000000000011'
    ]::uuid[]
  )$$,
  '42501',
  null,
  'member cannot reorder tasks'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', true);
select is(
  (select count(*) from public.checklists),
  0::bigint,
  'outsider cannot read team checklists'
);
select is(
  (select count(*) from public.tasks),
  0::bigint,
  'outsider cannot read team tasks'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);

select public.create_checklist_task(
  '20000000-0000-0000-0000-000000000012',
  'First'
);
select public.create_checklist_task(
  '20000000-0000-0000-0000-000000000012',
  'Second'
);
select public.create_checklist_task(
  '20000000-0000-0000-0000-000000000012',
  'Third'
);

select is(
  (
    select position
    from public.tasks
    where checklist_id = '20000000-0000-0000-0000-000000000012'
      and title = 'First'
  ),
  0,
  'first created task starts at position 0'
);
select is(
  (
    select array_agg(position order by title)
    from public.tasks
    where checklist_id = '20000000-0000-0000-0000-000000000012'
      and deleted_at is null
  ),
  array[0, 1, 2],
  'create_checklist_task assigns sequential positions'
);

select public.reorder_checklist_tasks(
  '20000000-0000-0000-0000-000000000011',
  array[
    '30000000-0000-0000-0000-000000000013',
    '30000000-0000-0000-0000-000000000011',
    '30000000-0000-0000-0000-000000000012'
  ]::uuid[]
);

select is(
  (
    select array_agg(id::text order by position)
    from public.tasks
    where checklist_id = '20000000-0000-0000-0000-000000000011'
      and deleted_at is null
  ),
  array[
    '30000000-0000-0000-0000-000000000013',
    '30000000-0000-0000-0000-000000000011',
    '30000000-0000-0000-0000-000000000012'
  ],
  'reorder_checklist_tasks rewrites positions without unique conflicts'
);

select throws_ok(
  $$select public.reorder_checklist_tasks(
    '20000000-0000-0000-0000-000000000011',
    array['30000000-0000-0000-0000-000000000011']::uuid[]
  )$$,
  '22023',
  null,
  'reorder rejects an incomplete task list'
);
select throws_ok(
  $$select public.reorder_checklist_tasks(
    '20000000-0000-0000-0000-000000000011',
    array[
      '30000000-0000-0000-0000-000000000011',
      '30000000-0000-0000-0000-000000000012',
      '30000000-0000-0000-0000-000000000099'
    ]::uuid[]
  )$$,
  '22023',
  null,
  'reorder rejects a foreign task id'
);

update public.checklists
set deleted_at = now()
where id = '20000000-0000-0000-0000-000000000013';

select throws_ok(
  $$select public.create_checklist_task(
    '20000000-0000-0000-0000-000000000013',
    'Too late'
  )$$,
  '23514',
  null,
  'create_checklist_task rejects a soft-deleted checklist'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
insert into public.task_completions (
  task_id,
  team_id,
  completion_date,
  completed_by
)
values (
  '30000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000999',
  '2000-01-01',
  '00000000-0000-0000-0000-000000000011'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select public.soft_delete_checklist('20000000-0000-0000-0000-000000000011');

select ok(
  (
    select deleted_at is not null
    from public.checklists
    where id = '20000000-0000-0000-0000-000000000011'
  ),
  'soft_delete_checklist marks the checklist deleted'
);
select is(
  (
    select count(*)
    from public.tasks
    where checklist_id = '20000000-0000-0000-0000-000000000011'
      and deleted_at is null
  ),
  0::bigint,
  'soft_delete_checklist marks active tasks deleted'
);
select is(
  (
    select count(*)
    from public.task_completions
    where task_id = '30000000-0000-0000-0000-000000000011'
  ),
  1::bigint,
  'soft-delete keeps related completion history'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
select throws_ok(
  $$insert into public.task_completions (
    task_id,
    team_id,
    completion_date,
    completed_by
  )
  values (
    '30000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000999',
    '2000-01-02',
    '00000000-0000-0000-0000-000000000012'
  )$$,
  '23514',
  null,
  'soft-deleted tasks cannot be completed'
);

reset role;

insert into public.checklists (id, team_id, name, cadence, weekdays, created_by)
select
  ('20000000-0000-0000-0000-0000000010' || lpad(gs::text, 2, '0'))::uuid,
  '10000000-0000-0000-0000-000000000012',
  'Limit ' || gs,
  'daily',
  '{}',
  '00000000-0000-0000-0000-000000000011'
from generate_series(1, 20) as gs;

select throws_ok(
  $$insert into public.checklists (team_id, name, cadence, weekdays, created_by)
    values (
      '10000000-0000-0000-0000-000000000012',
      'One too many',
      'daily',
      '{}',
      '00000000-0000-0000-0000-000000000011'
    )$$,
  '23514',
  null,
  'a team cannot have more than 20 active checklists'
);

insert into public.tasks (id, checklist_id, title, position)
select
  ('30000000-0000-0000-0000-0000000020' || lpad(gs::text, 2, '0'))::uuid,
  '20000000-0000-0000-0000-000000001001',
  'Task ' || gs,
  gs
from generate_series(0, 99) as gs;

select throws_ok(
  $$insert into public.tasks (checklist_id, title, position)
    values (
      '20000000-0000-0000-0000-000000001001',
      'Task overflow',
      100
    )$$,
  '23514',
  null,
  'a checklist cannot have more than 100 active tasks'
);

select is(
  has_table_privilege('authenticated', 'public.checklists', 'delete'),
  false,
  'authenticated no longer has delete on checklists'
);
select is(
  has_table_privilege('authenticated', 'public.tasks', 'delete'),
  false,
  'authenticated no longer has delete on tasks'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);

select throws_ok(
  $$delete from public.checklists
    where id = '20000000-0000-0000-0000-000000000012'$$,
  '42501',
  null,
  'owner cannot hard-delete a checklist'
);
select throws_ok(
  $$delete from public.tasks
    where checklist_id = '20000000-0000-0000-0000-000000000012'$$,
  '42501',
  null,
  'owner cannot hard-delete a task'
);

select * from finish();
rollback;
