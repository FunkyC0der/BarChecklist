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
      from public.team_members membership
      where membership.team_id = team.id and membership.user_id = actor
    )
  from public.teams team
  where team.id = invitation.team_id;
end;
$$;
