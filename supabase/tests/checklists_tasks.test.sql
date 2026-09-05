begin;
select plan(52);

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

insert into public.checklists (id, team_id, name, created_by)
values
  (
    '20000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000011',
    'Opening',
    '00000000-0000-0000-0000-000000000011'
  ),
  (
    '20000000-0000-0000-0000-000000000012',
    '10000000-0000-0000-0000-000000000011',
    'Daily close',
    '00000000-0000-0000-0000-000000000011'
  ),
  (
    '20000000-0000-0000-0000-000000000013',
    '10000000-0000-0000-0000-000000000011',
    'Weekend prep',
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

select lives_ok(
  $$insert into public.checklists (team_id, name, created_by)
    values (
      '10000000-0000-0000-0000-000000000011',
      'Owner-created checklist',
      '00000000-0000-0000-0000-000000000011'
    )$$,
  'owner can create a checklist through the restricted Data API surface'
);

select is(
  (
    select name
    from public.checklists
    where name = 'Owner-created checklist'
  ),
  'Owner-created checklist',
  'owner can create a checklist without a schedule'
);

reset role;
insert into public.tasks (checklist_id, title, position, cadence, weekdays)
values (
  '20000000-0000-0000-0000-000000000013',
  'Weekly prep task',
  0,
  'weekly',
  '{5,6}'
);

select is(
  (
    select cadence
    from public.tasks
    where title = 'Weekly prep task'
  ),
  'weekly'::public.task_cadence,
  'weekly task cadence is stored'
);
select is(
  (
    select weekdays
    from public.tasks
    where title = 'Weekly prep task'
  ),
  array[5, 6]::smallint[],
  'weekly task stores ISO weekdays'
);

select throws_ok(
  $$insert into public.tasks (checklist_id, title, position, cadence, weekdays)
    values (
      '20000000-0000-0000-0000-000000000013',
      'Empty weekly',
      99,
      'weekly',
      '{}'
    )$$,
  '23514',
  null,
  'weekly task without weekdays is rejected'
);
select throws_ok(
  $$insert into public.tasks (checklist_id, title, position, cadence, weekdays)
    values (
      '20000000-0000-0000-0000-000000000013',
      'Day zero',
      99,
      'weekly',
      '{0}'
    )$$,
  '23514',
  null,
  'weekday 0 is rejected'
);
select throws_ok(
  $$insert into public.tasks (checklist_id, title, position, cadence, weekdays)
    values (
      '20000000-0000-0000-0000-000000000013',
      'Day eight',
      99,
      'weekly',
      '{8}'
    )$$,
  '23514',
  null,
  'weekday 8 is rejected'
);
select throws_ok(
  $$insert into public.tasks (checklist_id, title, position, cadence, weekdays)
    values (
      '20000000-0000-0000-0000-000000000013',
      'Duplicate days',
      99,
      'weekly',
      '{1,1}'
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
select lives_ok(
  $$update public.checklists
    set name = 'Hacked'
    where id = '20000000-0000-0000-0000-000000000011'$$,
  'member checklist update is filtered by RLS'
);
select is(
  (select name from public.checklists where id = '20000000-0000-0000-0000-000000000011'),
  'Opening',
  'member cannot change checklist fields'
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
select lives_ok(
  $$update public.tasks
    set title = 'Hacked'
    where id = '30000000-0000-0000-0000-000000000011'$$,
  'member task update is filtered by RLS'
);
select is(
  (select title from public.tasks where id = '30000000-0000-0000-0000-000000000011'),
  'Unlock the door',
  'member cannot change task fields'
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
    'Forbidden rpc',
    'daily',
    '{}'
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

select throws_ok(
  $$insert into public.tasks (checklist_id, title, position)
    values (
      '20000000-0000-0000-0000-000000000012',
      'Bypass RPC',
      99
    )$$,
  '42501',
  null,
  'owner cannot bypass create_checklist_task with a direct insert'
);
select throws_ok(
  $$update public.tasks
    set position = 99
    where id = '30000000-0000-0000-0000-000000000011'$$,
  '42501',
  null,
  'owner cannot update task positions directly'
);
select lives_ok(
  $$update public.tasks
    set title = 'Unlock entrance'
    where id = '30000000-0000-0000-0000-000000000011'$$,
  'owner can update the allowed task title column'
);
select is(
  (select title from public.tasks where id = '30000000-0000-0000-0000-000000000011'),
  'Unlock entrance',
  'allowed task title update is persisted'
);
select lives_ok(
  $$update public.tasks
    set cadence = 'weekly', weekdays = '{2,4}'
    where id = '30000000-0000-0000-0000-000000000011'$$,
  'owner can update the allowed task schedule columns'
);
select is(
  (
    select weekdays
    from public.tasks
    where id = '30000000-0000-0000-0000-000000000011'
  ),
  array[2, 4]::smallint[],
  'allowed task schedule update is persisted'
);

select public.create_checklist_task(
  '20000000-0000-0000-0000-000000000012',
  'First',
  'daily',
  '{}'
);
select public.create_checklist_task(
  '20000000-0000-0000-0000-000000000012',
  'Second',
  'weekly',
  '{1,3}'
);
select public.create_checklist_task(
  '20000000-0000-0000-0000-000000000012',
  'Third',
  'daily',
  '{}'
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
select is(
  (
    select weekdays
    from public.tasks
    where checklist_id = '20000000-0000-0000-0000-000000000012'
      and title = 'Second'
  ),
  array[1, 3]::smallint[],
  'create_checklist_task stores the supplied task schedule'
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

select public.soft_delete_checklist('20000000-0000-0000-0000-000000000013');

select throws_ok(
  $$update public.checklists
    set deleted_at = null
    where id = '20000000-0000-0000-0000-000000000013'$$,
  '42501',
  null,
  'owner cannot restore a checklist through a direct update'
);
select lives_ok(
  $$update public.checklists
    set name = 'Edited after deletion'
    where id = '20000000-0000-0000-0000-000000000013'$$,
  'soft-deleted checklist updates are filtered by RLS'
);
select is(
  (select name from public.checklists where id = '20000000-0000-0000-0000-000000000013'),
  'Weekend prep',
  'soft-deleted checklist business fields stay immutable'
);

select throws_ok(
  $$select public.create_checklist_task(
    '20000000-0000-0000-0000-000000000013',
    'Too late',
    'daily',
    '{}'
  )$$,
  '23514',
  null,
  'create_checklist_task rejects a soft-deleted checklist'
);

select public.soft_delete_task(
  (
    select id
    from public.tasks
    where checklist_id = '20000000-0000-0000-0000-000000000012'
      and title = 'Third'
  )
);
select ok(
  (
    select deleted_at is not null
    from public.tasks
    where checklist_id = '20000000-0000-0000-0000-000000000012'
      and title = 'Third'
  ),
  'soft_delete_task marks an active task deleted'
);
select throws_ok(
  $$update public.tasks
    set deleted_at = null
    where checklist_id = '20000000-0000-0000-0000-000000000012'
      and title = 'Third'$$,
  '42501',
  null,
  'owner cannot restore a task through a direct update'
);
select lives_ok(
  $$update public.tasks
    set title = 'Edited after deletion'
    where checklist_id = '20000000-0000-0000-0000-000000000012'
      and title = 'Third'$$,
  'soft-deleted task updates are filtered by RLS'
);
select is(
  (
    select title
    from public.tasks
    where checklist_id = '20000000-0000-0000-0000-000000000012'
      and title = 'Third'
  ),
  'Third',
  'soft-deleted task business fields stay immutable'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
update public.tasks
set cadence = 'daily', weekdays = '{}'
where id = '30000000-0000-0000-0000-000000000011';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
select public.complete_task('30000000-0000-0000-0000-000000000011');

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
  $$select public.complete_task('30000000-0000-0000-0000-000000000012')$$,
  '23514',
  null,
  'soft-deleted tasks cannot be completed'
);

reset role;

insert into public.checklists (id, team_id, name, created_by)
select
  ('20000000-0000-0000-0000-0000000010' || lpad(gs::text, 2, '0'))::uuid,
  '10000000-0000-0000-0000-000000000012',
  'Limit ' || gs,
  '00000000-0000-0000-0000-000000000011'
from generate_series(1, 20) as gs;

select throws_ok(
  $$insert into public.checklists (team_id, name, created_by)
    values (
      '10000000-0000-0000-0000-000000000012',
      'One too many',
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
select ok(
  has_column_privilege('authenticated', 'public.checklists', 'name', 'update')
    and not has_column_privilege('authenticated', 'public.checklists', 'deleted_at', 'update')
    and has_column_privilege('authenticated', 'public.tasks', 'title', 'update')
    and has_column_privilege('authenticated', 'public.tasks', 'cadence', 'update')
    and has_column_privilege('authenticated', 'public.tasks', 'weekdays', 'update')
    and not has_column_privilege('authenticated', 'public.tasks', 'position', 'update')
    and not has_table_privilege('authenticated', 'public.tasks', 'insert'),
  'authenticated receives only the intended checklist and task column grants'
);
select ok(
  has_function_privilege(
      'authenticated',
      'public.create_checklist_task(uuid,text,public.task_cadence,smallint[])',
      'execute'
    )
    and has_function_privilege('authenticated', 'public.reorder_checklist_tasks(uuid,uuid[])', 'execute')
    and has_function_privilege('authenticated', 'public.soft_delete_checklist(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.soft_delete_task(uuid)', 'execute')
    and not has_function_privilege(
      'anon',
      'public.create_checklist_task(uuid,text,public.task_cadence,smallint[])',
      'execute'
    )
    and not has_function_privilege('anon', 'public.reorder_checklist_tasks(uuid,uuid[])', 'execute')
    and not has_function_privilege('anon', 'public.soft_delete_checklist(uuid)', 'execute')
    and not has_function_privilege('anon', 'public.soft_delete_task(uuid)', 'execute'),
  'only authenticated clients can execute checklist management RPCs'
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
