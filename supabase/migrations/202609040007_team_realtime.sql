do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array['teams', 'team_members', 'team_invites']
  loop
    if not exists (
      select 1
      from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        realtime_table
      );
    end if;
  end loop;
end;
$$;

alter table public.teams replica identity full;
alter table public.team_members replica identity full;
alter table public.team_invites replica identity full;
