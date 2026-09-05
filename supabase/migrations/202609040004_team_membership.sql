create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  created_by uuid not null references auth.users (id) on delete restrict,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint team_invites_expiry_after_creation check (expires_at > created_at)
);

create index team_invites_team_created_idx
  on public.team_invites (team_id, created_at desc);

alter table public.team_invites enable row level security;

revoke all on public.team_invites from anon, authenticated;
grant select on public.team_invites to authenticated;

create policy team_invites_select_owner on public.team_invites
for select to authenticated
using (private.is_team_owner(team_id));

drop policy team_members_insert_owner on public.team_members;
drop policy team_members_update_owner on public.team_members;
drop policy team_members_delete_owner on public.team_members;

revoke insert, update, delete on public.team_members from authenticated;

create or replace function public.create_team_invite(p_team_id uuid)
returns table (token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  raw_token text;
  invitation_expiry timestamptz := now() + interval '7 days';
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.teams where id = p_team_id and owner_id = actor
  ) then
    raise exception 'Only the team owner can create an invite.' using errcode = '42501';
  end if;

  update public.team_invites
  set revoked_at = now()
  where team_id = p_team_id and revoked_at is null;

  raw_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.team_invites (
    team_id,
    token_hash,
    created_by,
    expires_at
  )
  values (
    p_team_id,
    pg_catalog.encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    actor,
    invitation_expiry
  );

  return query select raw_token, invitation_expiry;
end;
$$;

create or replace function public.inspect_team_invite(p_token text)
returns table (
  team_id uuid,
  team_name text,
  status text,
  already_member boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  invitation public.team_invites%rowtype;
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select *
  into invitation
  from public.team_invites
  where token_hash = pg_catalog.encode(extensions.digest(p_token, 'sha256'), 'hex');

  if not found then
    return query select null::uuid, null::text, 'invalid'::text, false;
    return;
  end if;

  if invitation.revoked_at is not null then
    return query select invitation.team_id, null::text, 'revoked'::text, false;
    return;
  end if;

  if invitation.expires_at <= now() then
    return query select invitation.team_id, null::text, 'expired'::text, false;
    return;
  end if;

  return query
  select
    team.id,
    team.name,
    'active'::text,
    exists (
      select 1
      from public.team_members
      where team_id = team.id and user_id = actor
    )
  from public.teams team
  where team.id = invitation.team_id;
end;
$$;

create or replace function public.accept_team_invite(p_token text)
returns table (team_id uuid, joined boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  invitation public.team_invites%rowtype;
  inserted_count integer;
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select *
  into invitation
  from public.team_invites
  where token_hash = pg_catalog.encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'Invite is invalid.' using errcode = '22023';
  end if;

  if invitation.revoked_at is not null then
    raise exception 'Invite has been revoked.' using errcode = '22023';
  end if;

  if invitation.expires_at <= now() then
    raise exception 'Invite has expired.' using errcode = '22023';
  end if;

  insert into public.team_members (team_id, user_id)
  values (invitation.team_id, actor)
  on conflict (team_id, user_id) do nothing;

  get diagnostics inserted_count = row_count;
  return query select invitation.team_id, inserted_count = 1;
end;
$$;

create or replace function public.revoke_team_invite(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.teams where id = p_team_id and owner_id = actor
  ) then
    raise exception 'Only the team owner can revoke an invite.' using errcode = '42501';
  end if;

  update public.team_invites
  set revoked_at = now()
  where team_id = p_team_id and revoked_at is null;
end;
$$;

create or replace function public.leave_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  deleted_count integer;
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.teams where id = p_team_id and owner_id = actor
  ) then
    raise exception 'The team owner cannot leave the team.' using errcode = '23514';
  end if;

  delete from public.team_members
  where team_id = p_team_id and user_id = actor;

  get diagnostics deleted_count = row_count;
  if deleted_count = 0 then
    raise exception 'You are not a member of this team.' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.remove_team_member(
  p_team_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  deleted_count integer;
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.teams where id = p_team_id and owner_id = actor
  ) then
    raise exception 'Only the team owner can remove members.' using errcode = '42501';
  end if;

  if actor = p_user_id then
    raise exception 'The team owner cannot be removed from team_members.' using errcode = '23514';
  end if;

  delete from public.team_members
  where team_id = p_team_id and user_id = p_user_id;

  get diagnostics deleted_count = row_count;
  if deleted_count = 0 then
    raise exception 'The user is not a member of this team.' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.create_team_invite(uuid) from public;
revoke all on function public.inspect_team_invite(text) from public;
revoke all on function public.accept_team_invite(text) from public;
revoke all on function public.revoke_team_invite(uuid) from public;
revoke all on function public.leave_team(uuid) from public;
revoke all on function public.remove_team_member(uuid, uuid) from public;

grant execute on function public.create_team_invite(uuid) to authenticated;
grant execute on function public.inspect_team_invite(text) to authenticated;
grant execute on function public.accept_team_invite(text) to authenticated;
grant execute on function public.revoke_team_invite(uuid) to authenticated;
grant execute on function public.leave_team(uuid) to authenticated;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;

comment on table public.team_invites is 'Hashed, rotatable bearer links for joining a team.';
