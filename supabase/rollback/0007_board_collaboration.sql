-- Deliberately guarded: do not erase active invitations, membership, Inbox captures or authorship.
begin;
do $$begin
 if exists(select 1 from public.board_members) or exists(select 1 from public.board_invitations) or exists(select 1 from public.notes where inbox or created_by is distinct from owner_id) then
  raise exception 'Sharing or Inbox data exists. Preserve it before rolling back collaboration.';
 end if;
end $$;
drop policy if exists tackly_board_presence_read on realtime.messages;
drop policy if exists tackly_board_presence_write on realtime.messages;
drop policy if exists shared_note_files_read on storage.objects;
drop policy if exists workspaces_shared_read on public.workspaces;
drop policy if exists boards_shared_read on public.boards;
drop policy if exists categories_shared_read on public.categories;
drop policy if exists tags_shared_read on public.tags;
drop policy if exists note_tags_shared_read on public.note_tags;
drop policy if exists note_tags_shared_insert on public.note_tags;
drop policy if exists note_tags_shared_delete on public.note_tags;
drop policy if exists attachments_shared_read on public.attachments;
drop policy if exists attachments_shared_insert on public.attachments;
drop policy if exists history_shared_read on public.note_activity;
drop policy if exists versions_shared_read on public.note_versions;
drop policy if exists members_read on public.board_members;
drop policy if exists invitations_owner_read on public.board_invitations;
drop policy if exists notes_board_read on public.notes;
drop policy if exists notes_board_insert on public.notes;
drop policy if exists notes_board_update on public.notes;
drop policy if exists lanes_board_read on public.lanes;
drop policy if exists lanes_board_insert on public.lanes;
drop policy if exists lanes_board_update on public.lanes;
drop policy if exists lanes_board_delete on public.lanes;
drop policy if exists boards_insert_own on public.boards;
create policy boards_insert_own on public.boards for insert with check((select auth.uid())=owner_id);
drop trigger if exists notes_shared_identity on public.notes;
drop trigger if exists lanes_shared_identity on public.lanes;
drop function public.protect_shared_identity();
drop function public.create_board_invitation(uuid,text),public.accept_board_invitation(text),public.manage_board_member(uuid,uuid,text),public.revoke_board_invitation(uuid),public.board_people(uuid),public.board_invitation_list(uuid),public.save_shared_board(uuid,jsonb,jsonb);
drop function public.board_access(uuid,boolean),public.shared_workspace_access(uuid);
drop function public.board_role(uuid);
do $$declare target text;begin
 foreach target in array array['notes','lanes'] loop
  execute format('create policy %1$s_select_own on public.%1$s for select using((select auth.uid())=owner_id);create policy %1$s_insert_own on public.%1$s for insert with check((select auth.uid())=owner_id);create policy %1$s_update_own on public.%1$s for update using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);create policy %1$s_delete_own on public.%1$s for delete using((select auth.uid())=owner_id);',target);
 end loop;
end $$;
drop policy if exists note_tags_select_own on public.note_tags;
create policy note_tags_select_own on public.note_tags
  for select using (
    exists (
      select 1 from public.notes n
      where n.id = note_id and n.owner_id = (select auth.uid())
    )
  );

drop policy if exists note_tags_insert_own on public.note_tags;
create policy note_tags_insert_own on public.note_tags
  for insert with check (
    exists (
      select 1 from public.notes n
      where n.id = note_id and n.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.tags t
      where t.id = tag_id and t.owner_id = (select auth.uid())
    )
  );

drop policy if exists note_tags_delete_own on public.note_tags;
create policy note_tags_delete_own on public.note_tags
  for delete using (
    exists (
      select 1 from public.notes n
      where n.id = note_id and n.owner_id = (select auth.uid())
    )
  );

do $$declare target text;begin
 for target in select table_name from public.collaboration_install_state where not published loop
  execute format('alter publication supabase_realtime drop table public.%I',target);
 end loop;
end $$;
drop table public.board_invitations;
drop table public.board_members;
drop table public.collaboration_install_state;
alter table public.notes drop column inbox,drop column created_by;
notify pgrst,'reload schema';
commit;
