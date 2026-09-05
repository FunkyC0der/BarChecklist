do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_completions'
  ) then
    alter publication supabase_realtime add table public.task_completions;
  end if;
end;
$$;

alter table public.task_completions replica identity full;
