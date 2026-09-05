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
  on conflict on constraint team_members_pkey do nothing;

  get diagnostics inserted_count = row_count;
  return query select invitation.team_id, inserted_count = 1;
end;
$$;
