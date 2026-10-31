-- New Supabase projects require explicit Data API privileges, independently of RLS.
-- Grant only the operations the existing policies and application support.
begin;
grant usage on schema public to authenticated, service_role;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces, public.boards,
  public.lanes, public.categories, public.tags to authenticated;
grant select, insert, update on public.notes to authenticated;
revoke delete on public.notes from public, anon, authenticated;
grant select, insert, delete on public.note_tags, public.attachments to authenticated;
revoke update on public.note_tags, public.attachments from authenticated;
grant select on public.note_activity, public.note_versions, public.board_members to authenticated;
grant select, delete on public.note_file_cleanup to authenticated;
revoke all on public.board_invitations, public.collaboration_install_state from public, anon, authenticated;

-- Server-only administrative clients still need table grants even though they bypass RLS.
grant select, insert, update, delete on public.profiles, public.workspaces,
  public.boards, public.lanes, public.notes, public.categories, public.tags,
  public.note_tags, public.attachments, public.note_activity, public.note_versions,
  public.note_file_cleanup, public.board_members, public.board_invitations,
  public.collaboration_install_state to service_role;

-- Accounts created before installing the schema missed its signup trigger.
-- Backfill absent profiles, without overwriting an existing profile.
insert into public.profiles(id, display_name, avatar_url)
select id, coalesce(nullif(raw_user_meta_data->>'full_name', ''),
  nullif(raw_user_meta_data->>'display_name', ''), split_part(email, '@', 1)),
  nullif(raw_user_meta_data->>'avatar_url', '') from auth.users
on conflict(id) do nothing;
notify pgrst, 'reload schema';
commit;
