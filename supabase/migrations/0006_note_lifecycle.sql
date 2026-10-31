begin;
-- A trusted deletion transaction retains file paths until Storage API removal succeeds.
create table public.note_file_cleanup (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 bucket text not null check(bucket in ('note-images','note-videos','attachments','covers')),
 storage_path text not null, created_at timestamptz not null default now(),
 unique(owner_id,bucket,storage_path),check(split_part(storage_path,'/',1)=owner_id::text)
);
alter table public.note_file_cleanup enable row level security;
create policy cleanup_owner_read on public.note_file_cleanup for select to authenticated using(owner_id=(select auth.uid()));
create policy cleanup_owner_ack on public.note_file_cleanup for delete to authenticated using(owner_id=(select auth.uid()));
revoke all on public.note_file_cleanup from public,anon,authenticated;
grant select,delete on public.note_file_cleanup to authenticated;
create index cleanup_owner_time on public.note_file_cleanup(owner_id,created_at);
create function public.purge_trashed_notes(p_board_id uuid,p_notes jsonb) returns setof uuid
language plpgsql security definer set search_path=public as $$
declare count_expected integer;count_found integer; target record;
begin
 if auth.uid() is null or jsonb_typeof(p_notes) is distinct from 'array' then raise exception 'Invalid deletion request';end if;
 count_expected:=jsonb_array_length(p_notes);
 if count_expected<1 or count_expected>1000 or (select count(distinct (entry->>'id')::uuid) from jsonb_array_elements(p_notes) entry)<>count_expected then raise exception 'Invalid deletion targets';end if;
 -- Lock the exact owned batch in stable order, then recheck timestamps/lock status.
 perform n.id from public.notes n join jsonb_array_elements(p_notes) entry on n.id=(entry->>'id')::uuid
 where n.board_id=p_board_id and n.owner_id=auth.uid() order by n.id for update of n;
 select count(*) into count_found from public.notes n join jsonb_array_elements(p_notes) entry on n.id=(entry->>'id')::uuid
 where n.board_id=p_board_id and n.owner_id=auth.uid() and not n.locked and n.deleted_at is not null
 and n.deleted_at=(entry->>'deleted_at')::timestamptz;
 if count_found<>count_expected then raise exception 'Trash changed; refresh and confirm again';end if;
 insert into public.note_file_cleanup(owner_id,bucket,storage_path)
 select a.owner_id,a.bucket,a.storage_path from public.attachments a join jsonb_array_elements(p_notes) entry on a.note_id=(entry->>'id')::uuid
 where a.owner_id=auth.uid() on conflict(owner_id,bucket,storage_path) do nothing;
 return query delete from public.notes n using jsonb_array_elements(p_notes) entry
 where n.id=(entry->>'id')::uuid and n.board_id=p_board_id and n.owner_id=auth.uid() returning n.id;
end;
$$;
revoke all on function public.purge_trashed_notes(uuid,jsonb) from public,anon;
grant execute on function public.purge_trashed_notes(uuid,jsonb) to authenticated;
-- Ordinary deletion must remain recoverable; hard delete uses the checked RPC.
revoke delete on public.notes from public,anon,authenticated;
commit;
