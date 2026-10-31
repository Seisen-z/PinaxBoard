begin;
create table public.note_activity (
 id uuid primary key default gen_random_uuid(), note_id uuid not null references public.notes(id) on delete cascade,
 board_id uuid not null, owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('created','edited','moved','completed','archived','restored','deleted')),
 snapshot_skipped boolean not null default false, created_at timestamptz not null default clock_timestamp()
);
create table public.note_versions (
 id uuid primary key default gen_random_uuid(), note_id uuid not null references public.notes(id) on delete cascade,
 board_id uuid not null, owner_id uuid not null references auth.users(id) on delete cascade,
 reason text not null, snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=524288),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp()
);
create index note_activity_note_time on public.note_activity(note_id,created_at desc);
create index note_versions_note_time on public.note_versions(note_id,updated_at desc);
alter table public.note_activity enable row level security;
alter table public.note_versions enable row level security;
create policy note_activity_owner_read on public.note_activity for select to authenticated using (
 owner_id=(select auth.uid()) and exists(select 1 from public.notes n where n.id=note_id and n.owner_id=(select auth.uid())));
create policy note_versions_owner_read on public.note_versions for select to authenticated using (
 owner_id=(select auth.uid()) and exists(select 1 from public.notes n where n.id=note_id and n.owner_id=(select auth.uid())));
revoke all on public.note_activity,public.note_versions from public,anon,authenticated;
grant select on public.note_activity,public.note_versions to authenticated;

-- Append-only from trusted note writes, never a client-fabricated history feed.
create function public.capture_note_history() returns trigger language plpgsql security definer set search_path=public as $$
declare kinds text[]:='{}'; event_kind text; body_changed boolean; payload jsonb; baseline jsonb; latest public.note_versions%rowtype; t timestamptz:=clock_timestamp(); skipped boolean:=false;
begin
 payload:=jsonb_build_object('title',new.title,'content',new.content,'excerpt',new.excerpt,'subtasks',new.subtasks);
 if tg_op='INSERT' then kinds:=array['created'];body_changed:=false;
 else
  body_changed:=row(old.title,old.content,old.excerpt,old.subtasks) is distinct from row(new.title,new.content,new.excerpt,new.subtasks);
  if current_setting('tackly.restore_note',true)=new.id::text then kinds:=array['restored'];
  else
   if new.deleted_at is not null and old.deleted_at is null then kinds:=array_append(kinds,'deleted');
   elsif (new.deleted_at is null and old.deleted_at is not null) or (not new.archived and old.archived) then kinds:=array_append(kinds,'restored');
   elsif new.archived and not old.archived then kinds:=array_append(kinds,'archived');end if;
   if new.completed and not old.completed then kinds:=array_append(kinds,'completed');end if;
   if row(new.lane_id,new.x,new.y) is distinct from row(old.lane_id,old.x,old.y) then kinds:=array_append(kinds,'moved');end if;
   if (body_changed or (coalesce(new.repeat_rule,'{}'::jsonb)-'nextId') is distinct from (coalesce(old.repeat_rule,'{}'::jsonb)-'nextId') or row(new.completed,new.note_color,new.note_style,new.cover_url,new.priority,new.remind_at,new.start_at,new.due_at,new.pinned,new.locked,new.on_canvas,new.category_id) is distinct from row(old.completed,old.note_color,old.note_style,old.cover_url,old.priority,old.remind_at,old.start_at,old.due_at,old.pinned,old.locked,old.on_canvas,old.category_id)) and not ('completed'=any(kinds)) then kinds:=array_append(kinds,'edited');end if;
  end if;
 end if;
 if cardinality(kinds)=0 then return new;end if;
 -- Keep a pre-edit baseline for notes that predate this migration.
 if tg_op='UPDATE' and not exists(select 1 from public.note_versions where note_id=new.id) then
  baseline:=jsonb_build_object('title',old.title,'content',old.content,'excerpt',old.excerpt,'subtasks',old.subtasks);
  if octet_length(baseline::text)<=524288 then insert into public.note_versions(note_id,board_id,owner_id,reason,snapshot) values(new.id,new.board_id,new.owner_id,'baseline',baseline);end if;
 end if;
 if tg_op='INSERT' or body_changed then
  if octet_length(payload::text)>524288 then skipped:=true;
  else
   select * into latest from public.note_versions where note_id=new.id order by updated_at desc,id desc limit 1;
   if tg_op='UPDATE' and kinds=array['edited']::text[] and latest.reason='edited' and latest.created_at>t-interval '60 seconds' then
    update public.note_versions set snapshot=payload,updated_at=t where id=latest.id;
   else
    insert into public.note_versions(note_id,board_id,owner_id,reason,snapshot,created_at,updated_at) values(new.id,new.board_id,new.owner_id,kinds[1],payload,t,t);
   end if;
  end if;
 end if;
 foreach event_kind in array kinds loop
  if event_kind='edited' and exists(select 1 from public.note_activity where note_id=new.id and kind='edited' and created_at>t-interval '60 seconds') then
   update public.note_activity set created_at=t,snapshot_skipped=skipped where id=(select id from public.note_activity where note_id=new.id and kind='edited' order by created_at desc limit 1);
  else insert into public.note_activity(note_id,board_id,owner_id,kind,snapshot_skipped,created_at) values(new.id,new.board_id,new.owner_id,event_kind,skipped,t);end if;
 end loop;
 delete from public.note_versions where note_id=new.id and id in (select id from public.note_versions where note_id=new.id order by updated_at desc,id desc offset 20);
 delete from public.note_activity where note_id=new.id and id in (select id from public.note_activity where note_id=new.id order by created_at desc,id desc offset 100);
 return new;
end;
$$;
revoke all on function public.capture_note_history() from public,anon,authenticated;
create trigger notes_capture_history after insert or update on public.notes for each row execute function public.capture_note_history();

create function public.restore_note_version(p_note_id uuid,p_version_id uuid,p_expected_updated_at timestamptz)
returns setof public.notes language plpgsql security definer set search_path=public as $$
declare n public.notes%rowtype; v public.note_versions%rowtype; reopen boolean;
begin
 select * into n from public.notes where id=p_note_id and owner_id=auth.uid() for update;
 if n.id is null then raise exception 'Note not found';end if;
 if n.locked or n.deleted_at is not null then raise exception 'Unlock/recover the note before restoring a version';end if;
 select * into v from public.note_versions where id=p_version_id and note_id=n.id and owner_id=auth.uid() for share;
 if v.id is null then raise exception 'Version not found';end if;
 if v.updated_at is distinct from p_expected_updated_at then raise exception 'Version changed; refresh and preview it again';end if;
 -- Save pending edits before this RPC; snapshot guard ensures the preview is still current.
 reopen:=n.completed and exists(select 1 from jsonb_array_elements(v.snapshot->'subtasks') task where (task->>'completed')::boolean is not true);
 perform set_config('tackly.restore_note',n.id::text,true);
 return query update public.notes set title=v.snapshot->>'title',content=nullif(v.snapshot->'content','null'::jsonb),excerpt=v.snapshot->>'excerpt',subtasks=v.snapshot->'subtasks',completed=case when reopen then false else n.completed end,completed_at=case when reopen then null else n.completed_at end where id=n.id returning *;
 perform set_config('tackly.restore_note','',true);
end;
$$;
revoke all on function public.restore_note_version(uuid,uuid,timestamptz) from public,anon;
grant execute on function public.restore_note_version(uuid,uuid,timestamptz) to authenticated;
commit;
