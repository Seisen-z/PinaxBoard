begin;
drop trigger if exists notes_capture_history on public.notes;
drop function if exists public.capture_note_history();
drop function if exists public.restore_note_version(uuid,uuid,timestamptz);
drop table if exists public.note_versions;
drop table if exists public.note_activity;
commit;
