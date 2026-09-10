-- Epic 6c follow-up: rename the platform-admin role to "super admin" before
-- any real admin rows exist. 20260909170000_platform_admin.sql is already
-- applied in production, so this renames forward with a new migration
-- instead of editing that file in place.

alter table private.platform_admins rename to super_admins;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.super_admins where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_super_admin() from public, anon, authenticated;
drop function private.is_platform_admin();

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.is_super_admin(), false);
$$;

revoke all on function public.is_super_admin() from public, anon, authenticated;
grant execute on function public.is_super_admin() to authenticated;
drop function public.is_platform_admin();

-- Re-created to call private.is_super_admin() instead of the dropped
-- private.is_platform_admin(); a function body is stored as source text, so
-- the rename above does not update these call sites on its own. RPC names
-- and error/log-event text are unchanged: they describe platform-wide data,
-- not the admin role.
create or replace function public.get_platform_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  result jsonb;
begin
  if actor is null then
    perform private.log_event('get_platform_overview', 'unauthenticated', '{}'::jsonb);
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if not private.is_super_admin() then
    perform private.log_event(
      'get_platform_overview', 'not_admin', jsonb_build_object('actor', actor)
    );
    raise exception 'Super admin access is required.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generatedAt', pg_catalog.now(),
    'totals', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'teams', (select count(*) from public.teams),
      'memberships', (select count(*) from public.team_members),
      'checklists', (select count(*) from public.checklists where deleted_at is null),
      'checklistsDeleted', (select count(*) from public.checklists where deleted_at is not null),
      'tasks', (select count(*) from public.tasks where deleted_at is null),
      'tasksDeleted', (select count(*) from public.tasks where deleted_at is not null),
      'completions', (select count(*) from public.task_completions where undone_at is null),
      'openInvites', (
        select count(*) from public.team_invites
        where revoked_at is null and expires_at > pg_catalog.now()
      )
    ),
    'growth', jsonb_build_object(
      'usersLast7', (
        select count(*) from auth.users where created_at >= pg_catalog.now() - interval '7 days'
      ),
      'usersLast30', (
        select count(*) from auth.users where created_at >= pg_catalog.now() - interval '30 days'
      ),
      'teamsLast7', (
        select count(*) from public.teams where created_at >= pg_catalog.now() - interval '7 days'
      ),
      'teamsLast30', (
        select count(*) from public.teams where created_at >= pg_catalog.now() - interval '30 days'
      ),
      'completionsLast7', (
        select count(*) from public.task_completions
        where undone_at is null and completed_at >= pg_catalog.now() - interval '7 days'
      ),
      'completionsLast30', (
        select count(*) from public.task_completions
        where undone_at is null and completed_at >= pg_catalog.now() - interval '30 days'
      )
    ),
    'activity', jsonb_build_object(
      'activeTeamsLast7', (
        select count(distinct team_id) from public.task_completions
        where undone_at is null and completed_at >= pg_catalog.now() - interval '7 days'
      ),
      'activeTeamsLast30', (
        select count(distinct team_id) from public.task_completions
        where undone_at is null and completed_at >= pg_catalog.now() - interval '30 days'
      ),
      'activeUsersLast7', (
        select count(distinct completed_by) from public.task_completions
        where undone_at is null and completed_at >= pg_catalog.now() - interval '7 days'
      ),
      'activeUsersLast30', (
        select count(distinct completed_by) from public.task_completions
        where undone_at is null and completed_at >= pg_catalog.now() - interval '30 days'
      )
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.get_platform_teams(
  p_limit int default 50,
  p_offset int default 0,
  p_sort text default 'recent_activity'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  resolved_limit int;
  resolved_offset int;
  total_count integer;
  teams jsonb;
begin
  if actor is null then
    perform private.log_event('get_platform_teams', 'unauthenticated', '{}'::jsonb);
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if not private.is_super_admin() then
    perform private.log_event(
      'get_platform_teams', 'not_admin', jsonb_build_object('actor', actor)
    );
    raise exception 'Super admin access is required.' using errcode = '42501';
  end if;
  if p_sort not in ('recent_activity', 'created', 'members', 'completions') then
    perform private.log_event(
      'get_platform_teams', 'invalid_sort',
      jsonb_build_object('actor', actor, 'sort', p_sort)
    );
    raise exception 'Invalid sort option.' using errcode = '22023';
  end if;

  resolved_limit := least(greatest(coalesce(p_limit, 50), 1), 200);
  resolved_offset := greatest(coalesce(p_offset, 0), 0);

  select count(*) into total_count from public.teams;

  with team_stats as (
    select
      t.id,
      t.name,
      t.timezone,
      t.created_at,
      t.owner_id,
      owner.display_name as owner_name,
      owner_user.email as owner_email,
      (select count(*) from public.team_members tm where tm.team_id = t.id) as member_count,
      (select count(*) from public.checklists c where c.team_id = t.id and c.deleted_at is null) as checklist_count,
      (
        select count(*) from public.tasks tk
        join public.checklists c on c.id = tk.checklist_id
        where c.team_id = t.id and tk.deleted_at is null
      ) as task_count,
      (
        select count(*) from public.task_completions tc
        where tc.team_id = t.id and tc.undone_at is null
      ) as completion_count,
      (
        select max(tc.completed_at) from public.task_completions tc
        where tc.team_id = t.id and tc.undone_at is null
      ) as last_completion_at,
      exists (
        select 1 from public.team_invites ti
        where ti.team_id = t.id and ti.revoked_at is null and ti.expires_at > pg_catalog.now()
      ) as has_open_invite
    from public.teams t
    join public.profiles owner on owner.id = t.owner_id
    join auth.users owner_user on owner_user.id = t.owner_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ts.id,
        'name', ts.name,
        'timezone', ts.timezone,
        'createdAt', ts.created_at,
        'ownerId', ts.owner_id,
        'ownerName', ts.owner_name,
        'ownerEmail', ts.owner_email,
        'memberCount', ts.member_count,
        'checklistCount', ts.checklist_count,
        'taskCount', ts.task_count,
        'completionCount', ts.completion_count,
        'lastCompletionAt', ts.last_completion_at,
        'hasOpenInvite', ts.has_open_invite
      )
      order by
        case when p_sort = 'recent_activity' then ts.last_completion_at end desc nulls last,
        case when p_sort = 'created' then ts.created_at end desc,
        case when p_sort = 'members' then ts.member_count end desc,
        case when p_sort = 'completions' then ts.completion_count end desc,
        ts.id
    ),
    '[]'::jsonb
  )
  into teams
  from (
    select * from team_stats
    order by
      case when p_sort = 'recent_activity' then last_completion_at end desc nulls last,
      case when p_sort = 'created' then created_at end desc,
      case when p_sort = 'members' then member_count end desc,
      case when p_sort = 'completions' then completion_count end desc,
      id
    limit resolved_limit
    offset resolved_offset
  ) ts;

  return jsonb_build_object(
    'total', total_count,
    'limit', resolved_limit,
    'offset', resolved_offset,
    'sort', p_sort,
    'teams', teams
  );
end;
$$;
