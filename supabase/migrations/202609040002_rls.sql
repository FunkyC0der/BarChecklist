alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.checklists enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.checklists to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, delete on public.task_completions to authenticated;

create or replace function private.is_team_member(requested_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id = requested_team_id and user_id = auth.uid()
  );
$$;

create or replace function private.is_team_owner(requested_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teams
    where id = requested_team_id and owner_id = auth.uid()
  );
$$;

create or replace function private.shares_team(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members mine
    join public.team_members theirs on theirs.team_id = mine.team_id
    where mine.user_id = auth.uid() and theirs.user_id = other_user_id
  );
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_team_member(uuid) to authenticated;
grant execute on function private.is_team_owner(uuid) to authenticated;
grant execute on function private.shares_team(uuid) to authenticated;

create policy profiles_select_related on public.profiles
for select to authenticated
using (id = auth.uid() or private.shares_team(id));
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy teams_select_member on public.teams
for select to authenticated using (private.is_team_member(id));
create policy teams_insert_owner on public.teams
for insert to authenticated with check (owner_id = auth.uid());
create policy teams_update_owner on public.teams
for update to authenticated using (private.is_team_owner(id)) with check (owner_id = auth.uid());
create policy teams_delete_owner on public.teams
for delete to authenticated using (private.is_team_owner(id));

create policy team_members_select_member on public.team_members
for select to authenticated using (private.is_team_member(team_id));
create policy team_members_insert_owner on public.team_members
for insert to authenticated with check (private.is_team_owner(team_id));
create policy team_members_update_owner on public.team_members
for update to authenticated using (private.is_team_owner(team_id)) with check (private.is_team_owner(team_id));
create policy team_members_delete_owner on public.team_members
for delete to authenticated using (private.is_team_owner(team_id));

create policy checklists_select_member on public.checklists
for select to authenticated using (private.is_team_member(team_id));
create policy checklists_insert_owner on public.checklists
for insert to authenticated with check (private.is_team_owner(team_id) and created_by = auth.uid());
create policy checklists_update_owner on public.checklists
for update to authenticated using (private.is_team_owner(team_id)) with check (private.is_team_owner(team_id));
create policy checklists_delete_owner on public.checklists
for delete to authenticated using (private.is_team_owner(team_id));

create policy tasks_select_member on public.tasks
for select to authenticated using (
  exists (select 1 from public.checklists c where c.id = checklist_id and private.is_team_member(c.team_id))
);
create policy tasks_insert_owner on public.tasks
for insert to authenticated with check (
  exists (select 1 from public.checklists c where c.id = checklist_id and private.is_team_owner(c.team_id))
);
create policy tasks_update_owner on public.tasks
for update to authenticated using (
  exists (select 1 from public.checklists c where c.id = checklist_id and private.is_team_owner(c.team_id))
) with check (
  exists (select 1 from public.checklists c where c.id = checklist_id and private.is_team_owner(c.team_id))
);
create policy tasks_delete_owner on public.tasks
for delete to authenticated using (
  exists (select 1 from public.checklists c where c.id = checklist_id and private.is_team_owner(c.team_id))
);

create policy completions_select_member on public.task_completions
for select to authenticated using (private.is_team_member(team_id));
create policy completions_insert_member on public.task_completions
for insert to authenticated with check (
  completed_by = auth.uid() and private.is_team_member(team_id)
);
create policy completions_delete_creator_or_owner on public.task_completions
for delete to authenticated using (
  completed_by = auth.uid() or private.is_team_owner(team_id)
);
