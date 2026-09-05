create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.checklist_cadence as enum ('daily', 'weekly');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  owner_id uuid not null references auth.users (id) on delete restrict,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  cadence public.checklist_cadence not null default 'daily',
  weekdays smallint[] not null default '{}',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint checklist_schedule_matches_cadence check (
    (cadence = 'daily' and cardinality(weekdays) = 0)
    or
    (cadence = 'weekly' and cardinality(weekdays) between 1 and 7)
  )
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete restrict,
  team_id uuid not null references public.teams (id) on delete restrict,
  completion_date date not null,
  completed_by uuid not null references auth.users (id) on delete restrict,
  completed_at timestamptz not null default now(),
  unique (task_id, completion_date)
);

create index team_members_user_id_idx on public.team_members (user_id, team_id);
create index checklists_team_active_idx on public.checklists (team_id) where deleted_at is null;
create index tasks_checklist_active_idx on public.tasks (checklist_id, position) where deleted_at is null;
create unique index tasks_active_position_unique on public.tasks (checklist_id, position) where deleted_at is null;
create index task_completions_team_date_idx on public.task_completions (team_id, completion_date);

create or replace function private.valid_iso_weekdays(value smallint[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    and cardinality(value) = cardinality(array(select distinct unnest(value)));
$$;

alter table public.checklists
  add constraint checklist_weekdays_are_unique_iso_days
  check (private.valid_iso_weekdays(weekdays));

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.validate_team_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown IANA timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create or replace function private.add_owner_as_team_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.team_members (team_id, user_id) values (new.id, new.owner_id);
  return new;
end;
$$;

create or replace function private.protect_team_owner_membership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.teams where id = old.team_id and owner_id = old.user_id
  ) then
    raise exception 'The team owner cannot be removed from team_members.' using errcode = '23514';
  end if;
  return old;
end;
$$;

create or replace function private.prepare_task_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  resolved_team_id uuid;
  resolved_timezone text;
begin
  if actor is null then
    raise exception 'Authentication is required to complete a task.' using errcode = '42501';
  end if;

  select c.team_id, tm.timezone
  into resolved_team_id, resolved_timezone
  from public.tasks t
  join public.checklists c on c.id = t.checklist_id
  join public.teams tm on tm.id = c.team_id
  where t.id = new.task_id
    and t.deleted_at is null
    and c.deleted_at is null;

  if resolved_team_id is null then
    raise exception 'The task or checklist is inactive.' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.team_members where team_id = resolved_team_id and user_id = actor
  ) then
    raise exception 'The user is not a member of this task team.' using errcode = '42501';
  end if;

  new.team_id := resolved_team_id;
  new.completed_by := actor;
  new.completed_at := now();
  new.completion_date := (now() at time zone resolved_timezone)::date;
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger teams_validate_timezone before insert or update of timezone on public.teams
for each row execute function private.validate_team_timezone();
create trigger teams_set_updated_at before update on public.teams
for each row execute function private.set_updated_at();
create trigger checklists_set_updated_at before update on public.checklists
for each row execute function private.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function private.set_updated_at();
create trigger auth_user_created after insert on auth.users
for each row execute function private.create_profile_for_new_user();
create trigger team_created after insert on public.teams
for each row execute function private.add_owner_as_team_member();
create trigger team_owner_membership_protected before delete or update on public.team_members
for each row execute function private.protect_team_owner_membership();
create trigger task_completion_prepared before insert or update on public.task_completions
for each row execute function private.prepare_task_completion();

comment on column public.task_completions.completion_date is 'Logical local date derived from the team IANA timezone.';
comment on schema private is 'Non-API helper functions for invariants and RLS.';
