-- Board-scoped sharing. Parent workspace visibility does not grant access to sibling boards.
begin;
alter table public.notes add column if not exists inbox boolean not null default false;
alter table public.notes add column if not exists created_by uuid references auth.users(id) on delete set null;
update public.notes set created_by=owner_id where created_by is null;
alter table public.notes alter column created_by set default auth.uid();
create table public.board_members (
 board_id uuid not null references public.boards(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('viewer','editor')), created_at timestamptz not null default now(),
 primary key(board_id,user_id)
);
create table public.board_invitations (
 id uuid primary key default gen_random_uuid(), board_id uuid not null references public.boards(id) on delete cascade,
 token_hash text not null unique, role text not null check(role in ('viewer','editor')),
 created_by uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days', accepted_by uuid references auth.users(id) on delete set null,
 accepted_at timestamptz, revoked_at timestamptz
);
alter table public.board_members enable row level security;
alter table public.board_invitations enable row level security;
create function public.board_role(p_board_id uuid) returns text
language sql stable security definer set search_path=public,pg_temp as $$
 select case when b.owner_id=auth.uid() then 'owner' else m.role end
 from public.boards b left join public.board_members m on m.board_id=b.id and m.user_id=auth.uid()
 where b.id=p_board_id and auth.uid() is not null
$$;
create function public.board_access(p_board_id uuid,p_write boolean default false) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(public.board_role(p_board_id) in (case when p_write then 'editor' else 'viewer' end,'owner',case when p_write then 'owner' else 'editor' end),false)
$$;
create function public.shared_workspace_access(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and exists(select 1 from public.boards b join public.board_members m on m.board_id=b.id where b.workspace_id=p_workspace_id and m.user_id=auth.uid())
$$;
revoke all on function public.board_role(uuid), public.board_access(uuid,boolean), public.shared_workspace_access(uuid) from public,anon;
grant execute on function public.board_role(uuid), public.board_access(uuid,boolean), public.shared_workspace_access(uuid) to authenticated;
create policy members_read on public.board_members for select to authenticated using(public.board_access(board_id));
create policy invitations_owner_read on public.board_invitations for select to authenticated using(public.board_role(board_id)='owner');
revoke all on public.board_members,public.board_invitations from public,anon,authenticated;
grant select on public.board_members to authenticated;
-- Raw invitation hashes are never selectable. Management goes through bounded RPCs.
create policy workspaces_shared_read on public.workspaces for select to authenticated using(public.shared_workspace_access(id));
drop policy if exists boards_insert_own on public.boards;
create policy boards_insert_own on public.boards for insert to authenticated with check(owner_id=auth.uid() and exists(select 1 from public.workspaces w where w.id=workspace_id and w.owner_id=auth.uid()));
create policy boards_shared_read on public.boards for select to authenticated using(public.board_access(id));
create policy categories_shared_read on public.categories for select to authenticated using(public.shared_workspace_access(workspace_id));
create policy tags_shared_read on public.tags for select to authenticated using(public.shared_workspace_access(workspace_id));
-- Replace owner-only note/lane policies, including foreign-board insert loopholes.
do $$ declare target text; begin
 foreach target in array array['notes','lanes'] loop
  execute format('drop policy if exists %1$s_select_own on public.%1$s; drop policy if exists %1$s_insert_own on public.%1$s; drop policy if exists %1$s_update_own on public.%1$s; drop policy if exists %1$s_delete_own on public.%1$s;',target);
  execute format('create policy %1$s_board_read on public.%1$s for select to authenticated using(public.board_access(board_id));',target);
  execute format('create policy %1$s_board_insert on public.%1$s for insert to authenticated with check(public.board_access(board_id,true) and owner_id=(select b.owner_id from public.boards b where b.id=board_id));',target);
  execute format('create policy %1$s_board_update on public.%1$s for update to authenticated using(public.board_access(board_id,true)) with check(public.board_access(board_id,true) and owner_id=(select b.owner_id from public.boards b where b.id=board_id));',target);
 end loop;
end $$;
create policy lanes_board_delete on public.lanes for delete to authenticated using(public.board_access(board_id,true));
create function public.protect_shared_identity() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_op='UPDATE' and (new.board_id<>old.board_id or new.owner_id<>old.owner_id) then raise exception 'Board identity is immutable';end if;
 if tg_table_name='notes' then
  if tg_op='INSERT' then new.created_by:=auth.uid();
  elsif new.created_by is distinct from old.created_by then raise exception 'Author identity is immutable'; end if;
  if new.lane_id is not null and not exists(select 1 from public.lanes l where l.id=new.lane_id and l.board_id=new.board_id) then raise exception 'Column belongs to another board';end if;
  if new.category_id is not null and not exists(select 1 from public.categories c join public.boards b on b.workspace_id=c.workspace_id where c.id=new.category_id and b.id=new.board_id) then raise exception 'Category belongs to another workspace';end if;
 end if;
 return new;
end $$;
create trigger notes_shared_identity before insert or update on public.notes for each row execute function public.protect_shared_identity();
create trigger lanes_shared_identity before insert or update on public.lanes for each row execute function public.protect_shared_identity();
drop policy if exists note_tags_select_own on public.note_tags;
drop policy if exists note_tags_insert_own on public.note_tags;
drop policy if exists note_tags_delete_own on public.note_tags;
create policy note_tags_shared_read on public.note_tags for select to authenticated using(exists(select 1 from public.notes n where n.id=note_id and public.board_access(n.board_id)));
create policy note_tags_shared_insert on public.note_tags for insert to authenticated with check(exists(select 1 from public.notes n join public.boards b on b.id=n.board_id join public.tags t on t.workspace_id=b.workspace_id where n.id=note_id and t.id=tag_id and public.board_access(n.board_id,true)));
create policy note_tags_shared_delete on public.note_tags for delete to authenticated using(exists(select 1 from public.notes n where n.id=note_id and public.board_access(n.board_id,true)));
create policy attachments_shared_read on public.attachments for select to authenticated using(exists(select 1 from public.notes n where n.id=note_id and public.board_access(n.board_id)));
create policy attachments_shared_insert on public.attachments for insert to authenticated with check(owner_id=auth.uid() and split_part(storage_path,'/',1)=auth.uid()::text and exists(select 1 from public.notes n where n.id=note_id and public.board_access(n.board_id,true)));
create policy shared_note_files_read on storage.objects for select to authenticated using(
 exists(select 1 from public.attachments a join public.notes n on n.id=a.note_id where a.bucket=bucket_id and a.storage_path=name and public.board_access(n.board_id))
 or (bucket_id='covers' and exists(select 1 from public.notes n where n.cover_url=name and public.board_access(n.board_id)))
);
create policy history_shared_read on public.note_activity for select to authenticated using(public.board_access(board_id));
create policy versions_shared_read on public.note_versions for select to authenticated using(public.board_access(board_id));

create function public.create_board_invitation(p_board_id uuid,p_role text) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare token text:=encode(gen_random_bytes(32),'hex'); invite public.board_invitations;
begin
 if public.board_role(p_board_id) is distinct from 'owner' or p_role not in ('viewer','editor') or p_role is null then raise exception 'Only the board owner can invite';end if;
 insert into public.board_invitations(board_id,token_hash,role,created_by) values(p_board_id,encode(digest(token,'sha256'),'hex'),p_role,auth.uid()) returning * into invite;
 return jsonb_build_object('id',invite.id,'token',token,'role',invite.role,'expiresAt',invite.expires_at);
end $$;
create function public.accept_board_invitation(p_token text) returns uuid
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare invite public.board_invitations;
begin
 if auth.uid() is null or p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Sign in with a valid invitation';end if;
 select * into invite from public.board_invitations where token_hash=encode(digest(p_token,'sha256'),'hex') for update;
 if invite.id is null or invite.revoked_at is not null or invite.expires_at<=now() or not exists(select 1 from public.boards b join public.workspaces w on w.id=b.workspace_id where b.id=invite.board_id and b.archived_at is null and w.archived_at is null) then raise exception 'Invitation expired or was revoked';end if;
 if invite.accepted_by is not null then
  if invite.accepted_by=auth.uid() and public.board_access(invite.board_id) then return invite.board_id;end if;
  raise exception 'Invitation already used';
 end if;
 if public.board_role(invite.board_id)='owner' then raise exception 'The owner already has access';end if;
 -- Accepting a viewer invitation must not silently downgrade an existing editor.
 insert into public.board_members(board_id,user_id,role) values(invite.board_id,auth.uid(),invite.role)
 on conflict(board_id,user_id) do update set role=case when board_members.role='editor' then 'editor' else excluded.role end;
 update public.board_invitations set accepted_by=auth.uid(),accepted_at=now() where id=invite.id;
 return invite.board_id;
end $$;
create function public.manage_board_member(p_board_id uuid,p_user_id uuid,p_role text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if public.board_role(p_board_id) is distinct from 'owner' or p_role not in ('viewer','editor','remove') or p_role is null then raise exception 'Only the owner can manage access';end if;
 if p_role='remove' then delete from public.board_members where board_id=p_board_id and user_id=p_user_id;
 else update public.board_members set role=p_role where board_id=p_board_id and user_id=p_user_id;end if;
end $$;
create function public.revoke_board_invitation(p_invite_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.board_invitations set revoked_at=now() where id=p_invite_id and public.board_role(board_id)='owner';
 if not found then raise exception 'Invitation not found';end if;
end $$;
create function public.board_people(p_board_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.board_access(p_board_id) then raise exception 'Board access required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',people.id,'name',coalesce(p.display_name,p.username,'Collaborator'),'role',people.role)), '[]'::jsonb)
 from (select owner_id id,'owner' role from public.boards where id=p_board_id union all select user_id,role from public.board_members where board_id=p_board_id) people left join public.profiles p on p.id=people.id);
end $$;
create function public.board_invitation_list(p_board_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if public.board_role(p_board_id) is distinct from 'owner' then raise exception 'Owner access required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'role',role,'expiresAt',expires_at,'accepted',accepted_at is not null,'revoked',revoked_at is not null) order by created_at desc),'[]'::jsonb) from (select * from public.board_invitations where board_id=p_board_id order by created_at desc limit 100) invitations);
end $$;

create function public.save_shared_board(p_board_id uuid,p_notes jsonb,p_lanes jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; before_value jsonb; after_value jsonb; n public.notes; l public.lanes; board_owner uuid; tag uuid; expected_tags jsonb; actual_tags jsonb;
begin
 if not public.board_access(p_board_id,true) then raise exception 'Editor access required' using errcode='42501';end if;
 if jsonb_typeof(p_notes) is distinct from 'array' or jsonb_typeof(p_lanes) is distinct from 'array' or jsonb_array_length(p_notes)>5000 or jsonb_array_length(p_lanes)>24 then raise exception 'Invalid change batch';end if;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_notes))<>jsonb_array_length(p_notes) or (select count(distinct value->>'id') from jsonb_array_elements(p_lanes))<>jsonb_array_length(p_lanes) then raise exception 'Duplicate change ids';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_board_id::text,7));
 select owner_id into board_owner from public.boards where id=p_board_id;
 -- Guard every existing row before writing any row. Server timestamps are not client revisions.
 for item in select value from jsonb_array_elements(p_notes) order by value->>'id' loop
  select * into n from public.notes where id=(item->>'id')::uuid for update;
  before_value:=nullif(item->'before','null'::jsonb);
  if n.id is null and before_value is not null or n.id is not null and (before_value is null or n.board_id<>p_board_id or not (to_jsonb(n) @> (before_value-'created_at'-'updated_at'-'tag_ids'))) then raise exception 'Concurrent note edit; refresh and preserve both versions' using errcode='40001';end if;
  if n.id is not null then
   select coalesce(jsonb_agg(tag_id::text order by tag_id),'[]'::jsonb) into actual_tags from public.note_tags where note_id=n.id;
   select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into expected_tags from jsonb_array_elements_text(coalesce(item->'tagsBefore','[]'::jsonb));
   if actual_tags<>expected_tags then raise exception 'Concurrent tag edit' using errcode='40001';end if;
  end if;
 end loop;
 for item in select value from jsonb_array_elements(p_lanes) order by value->>'id' loop
  select * into l from public.lanes where id=(item->>'id')::uuid for update;
  before_value:=nullif(item->'before','null'::jsonb);
  if l.id is null and before_value is not null or l.id is not null and (before_value is null or l.board_id<>p_board_id or not (to_jsonb(l) @> (before_value-'created_at'-'updated_at'))) then raise exception 'Concurrent column edit' using errcode='40001';end if;
 end loop;
 for item in select value from jsonb_array_elements(p_lanes) where value->'after'<>'null'::jsonb loop
  l:=jsonb_populate_record(null::public.lanes,item->'after');
  if l.id is distinct from (item->>'id')::uuid or l.board_id is distinct from p_board_id or l.owner_id is distinct from board_owner then raise exception 'Invalid column scope';end if;
  insert into public.lanes select (l).* on conflict(id) do update set name=excluded.name,color=excluded.color,position=excluded.position;
 end loop;
 -- Parents before generated recurring children; frontend preserves this order.
 for item in select value from jsonb_array_elements(p_notes) loop
  after_value:=nullif(item->'after','null'::jsonb);
  if after_value is null then update public.notes set deleted_at=now() where id=(item->>'id')::uuid and board_id=p_board_id;continue;end if;
  n:=jsonb_populate_record(null::public.notes,after_value);
  n.inbox:=coalesce(n.inbox,false);n.created_by:=coalesce(n.created_by,auth.uid());
  if n.id is distinct from (item->>'id')::uuid or n.board_id is distinct from p_board_id or n.owner_id is distinct from board_owner then raise exception 'Invalid note scope';end if;
  if n.lane_id is null or not exists(select 1 from public.lanes where id=n.lane_id and board_id=p_board_id) then raise exception 'Invalid column';end if;
  insert into public.notes select (n).* on conflict(id) do update set

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
        recurrence_source_id=excluded.recurrence_source_id,
        inbox=excluded.inbox;
  delete from public.note_tags where note_id=n.id;
  for tag in select value::uuid from jsonb_array_elements_text(coalesce(item->'tagsAfter','[]'::jsonb)) loop
   if not exists(select 1 from public.tags t join public.boards b on b.workspace_id=t.workspace_id where t.id=tag and b.id=p_board_id) then raise exception 'Tag belongs to another workspace';end if;
   insert into public.note_tags(note_id,tag_id) values(n.id,tag) on conflict do nothing;
  end loop;
 end loop;
 for item in select value from jsonb_array_elements(p_lanes) where value->'after'='null'::jsonb loop
  if exists(select 1 from public.notes where lane_id=(item->>'id')::uuid) then raise exception 'Move notes before deleting a column';end if;
  if (select count(*) from public.lanes where board_id=p_board_id)<=1 then raise exception 'Keep at least one column';end if;
  delete from public.lanes where id=(item->>'id')::uuid and board_id=p_board_id;
 end loop;
end $$;
revoke all on function public.create_board_invitation(uuid,text),public.accept_board_invitation(text),public.manage_board_member(uuid,uuid,text),public.revoke_board_invitation(uuid),public.board_people(uuid),public.board_invitation_list(uuid),public.save_shared_board(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.create_board_invitation(uuid,text),public.accept_board_invitation(text),public.manage_board_member(uuid,uuid,text),public.revoke_board_invitation(uuid),public.board_people(uuid),public.board_invitation_list(uuid),public.save_shared_board(uuid,jsonb,jsonb) to authenticated;
-- Retain installation provenance so rollback restores publication membership exactly.
create table public.collaboration_install_state(table_name text primary key,published boolean not null);
alter table public.collaboration_install_state enable row level security;
revoke all on public.collaboration_install_state from public,anon,authenticated;
insert into public.collaboration_install_state select target,exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=target) from unnest(array['notes','lanes']) target;
-- Only ephemeral cursor/name/view metadata crosses Broadcast/Presence; note bodies use RLS-protected Postgres changes.
create policy tackly_board_presence_read on realtime.messages for select to authenticated using(
 extension in ('presence','broadcast') and realtime.topic() ~ '^tackly:board:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and public.board_access(split_part(realtime.topic(),':',3)::uuid)
);
create policy tackly_board_presence_write on realtime.messages for insert to authenticated with check(
 extension in ('presence','broadcast') and realtime.topic() ~ '^tackly:board:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and public.board_access(split_part(realtime.topic(),':',3)::uuid)
);
do $$ declare target text;begin
 foreach target in array array['notes','lanes','board_members'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=target) then execute format('alter publication supabase_realtime add table public.%I',target);end if;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
