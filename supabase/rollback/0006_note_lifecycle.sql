begin;
do $$ begin
 if to_regclass('public.note_file_cleanup') is not null then
  if exists(select 1 from public.note_file_cleanup) then raise exception 'Finish queued file cleanup before rolling back migration 0006';end if;
 end if;
end $$;
drop function if exists public.purge_trashed_notes(uuid,jsonb);
drop table if exists public.note_file_cleanup;
grant delete on public.notes to authenticated;
commit;
-- Original direct-delete privilege restored; history/schedule schemas and notes remain.
