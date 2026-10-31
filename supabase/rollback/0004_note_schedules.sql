begin;
drop function if exists public.save_recurring_note_batch(jsonb,uuid[]);
drop trigger if exists notes_recurrence_source_check on public.notes;
drop function if exists public.check_recurrence_source();
drop index if exists public.notes_remind_at_idx;
alter table public.notes drop constraint if exists notes_repeat_rule_valid;
alter table public.notes drop column if exists recurrence_source_id, drop column if exists repeat_rule, drop column if exists remind_at;
commit;
