-- One reminder and recurrence rule per note. Existing notes/RLS/autosave remain authoritative.
begin;
alter table public.notes
  add column if not exists remind_at timestamptz,
  add column if not exists repeat_rule jsonb,
  add column if not exists recurrence_source_id uuid references public.notes(id) on delete set null;

alter table public.notes add constraint notes_repeat_rule_valid check (
  repeat_rule is null or coalesce((
    jsonb_typeof(repeat_rule) = 'object'
    and repeat_rule->>'frequency' in ('daily', 'weekly', 'monthly', 'yearly')
    and (repeat_rule->>'anchorDay') ~ '^([1-9]|[12][0-9]|3[01])$'
    and (repeat_rule->>'anchorMonth') ~ '^([0-9]|1[01])$'
    and repeat_rule ?& array['frequency','anchorDay','anchorMonth']
  ), false)
);
create index notes_remind_at_idx on public.notes(owner_id, board_id, remind_at)
  where remind_at is not null and not completed and not archived and deleted_at is null;

create or replace function public.check_recurrence_source()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.recurrence_source_id is not null and not exists (
    select 1 from public.notes parent
    where parent.id = new.recurrence_source_id and parent.id <> new.id
      and parent.owner_id = new.owner_id and parent.board_id = new.board_id
  ) then raise exception 'Recurrence source must belong to this owner and board'; end if;
  return new;
end;
$$;
create trigger notes_recurrence_source_check before insert or update of recurrence_source_id, owner_id, board_id
on public.notes for each row execute function public.check_recurrence_source();
-- Authenticated invoker keeps the existing notes/note_tags RLS in force.
create or replace function public.save_recurring_note_batch(note_values jsonb, generated_ids uuid[])
returns void language plpgsql security invoker set search_path = public as $$
declare item jsonb; nrow public.notes%rowtype; saved_id uuid;
begin
  for item in select value from jsonb_array_elements(note_values) loop
    nrow := jsonb_populate_record(null::public.notes, item);
    if nrow.owner_id <> auth.uid() or auth.uid() is null then raise exception 'Owner mismatch'; end if;
    saved_id := null;
    if nrow.id = any(generated_ids) then
      insert into public.notes select (nrow).* on conflict (id) do nothing returning id into saved_id;
      if saved_id is null then continue; end if;
    else
      insert into public.notes select (nrow).* on conflict (id) do update set
        board_id=excluded.board_id,
        lane_id=excluded.lane_id,
        title=excluded.title,
        content=excluded.content,
        excerpt=excluded.excerpt,
        x=excluded.x,
        y=excluded.y,
        width=excluded.width,
        height=excluded.height,
        rotation=excluded.rotation,
        z_index=excluded.z_index,
        note_color=excluded.note_color,
        note_style=excluded.note_style,
        cover_url=excluded.cover_url,
        priority=excluded.priority,
        subtasks=excluded.subtasks,
        completed=excluded.completed,
        completed_at=excluded.completed_at,
        pinned=excluded.pinned,
        locked=excluded.locked,
        collapsed=excluded.collapsed,
        archived=excluded.archived,
        on_canvas=excluded.on_canvas,
        category_id=excluded.category_id,
        start_at=excluded.start_at,
        due_at=excluded.due_at,
        updated_at=excluded.updated_at,
        deleted_at=excluded.deleted_at,
        remind_at=excluded.remind_at,
        repeat_rule=excluded.repeat_rule,
        recurrence_source_id=excluded.recurrence_source_id;
    end if;
    delete from public.note_tags where note_id = nrow.id;
    insert into public.note_tags(note_id, tag_id)
      select nrow.id, value::uuid from jsonb_array_elements_text(coalesce(item->'tag_ids','[]'::jsonb));
  end loop;
end;
$$;
revoke all on function public.save_recurring_note_batch(jsonb, uuid[]) from public;
revoke all on function public.save_recurring_note_batch(jsonb, uuid[]) from anon;
grant execute on function public.save_recurring_note_batch(jsonb, uuid[]) to authenticated;
commit;
