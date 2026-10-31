-- Milestone 10 — file and media uploads (IMPLEMENTATION_PLAN.md §16).
--
-- Two halves, and both are needed for an upload to be safe:
--
--   1. `public.attachments` — the metadata. What the file is called, how big
--      it is, what it is, and which note it belongs to.
--   2. Storage buckets and their policies — the bytes.
--
-- The security model is that a file's *path* carries its owner:
--
--     <bucket>/<user id>/<note id>/<uuid>.<ext>
--
-- Every storage policy checks that the first path segment is the caller's own
-- user id. That is what makes "unauthorized users cannot access private files"
-- true at the database rather than in the client — the app never gets a chance
-- to forget a filter (PRODUCT_SPEC.md → "Supabase Security").

-- ------------------------------------------------------------------ --
-- Attachment metadata
-- ------------------------------------------------------------------ --

create table if not exists public.attachments (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references public.notes (id) on delete cascade,
  -- Denormalized from the note so a policy can check ownership without a join.
  -- A join in a policy runs per row on every read; this does not.
  owner_id    uuid not null references auth.users (id) on delete cascade,

  bucket      text not null check (
    bucket in ('note-images', 'note-videos', 'attachments', 'covers')
  ),
  -- Path within the bucket. Unique per bucket: two rows pointing at one object
  -- would mean deleting either leaves the other dangling or orphans the file.
  storage_path text not null,

  file_name   text not null,
  mime_type   text not null,
  file_size   bigint not null check (file_size > 0),

  -- Set only for objects in a public bucket. A private file is reached through
  -- a signed URL, which expires and therefore must never be stored.
  public_url  text,

  created_at  timestamptz not null default now()
);

create unique index if not exists attachments_object_idx
  on public.attachments (bucket, storage_path);

-- The card and the editor both load "every attachment on this note".
create index if not exists attachments_note_idx
  on public.attachments (note_id, created_at);

alter table public.attachments enable row level security;

drop policy if exists attachments_select_own on public.attachments;
create policy attachments_select_own on public.attachments
  for select using ((select auth.uid()) = owner_id);

drop policy if exists attachments_insert_own on public.attachments;
create policy attachments_insert_own on public.attachments
  for insert with check (
    (select auth.uid()) = owner_id
    -- The note must also be the caller's, or a user could attach a file to
    -- somebody else's note while still passing the owner_id check.
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.owner_id = (select auth.uid())
    )
  );

-- Deliberately no update policy. An attachment is immutable: "replace" uploads
-- a new object and deletes the old row, so a row can never end up describing
-- bytes that are no longer there.

drop policy if exists attachments_delete_own on public.attachments;
create policy attachments_delete_own on public.attachments
  for delete using ((select auth.uid()) = owner_id);

-- ------------------------------------------------------------------ --
-- Buckets
-- ------------------------------------------------------------------ --
--
-- `avatars` and `backgrounds` are public: they are decorations the user has
-- chosen to display, and a signed URL for every avatar on every render would
-- be a request per face. Everything a user writes *into a note* is private.
--
-- The size limits are enforced here as well as in the client. The client's
-- check is for the error message; this one is the actual limit.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',     'avatars',     true,   2 * 1024 * 1024,
   array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('backgrounds', 'backgrounds', true,  10 * 1024 * 1024,
   array['image/png', 'image/jpeg', 'image/webp', 'image/avif']),
  ('covers',      'covers',      false, 10 * 1024 * 1024,
   array['image/png', 'image/jpeg', 'image/webp', 'image/avif']),
  ('note-images', 'note-images', false, 10 * 1024 * 1024,
   array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml']),
  ('note-videos', 'note-videos', false, 50 * 1024 * 1024,
   array['video/mp4', 'video/webm', 'video/quicktime']),
  ('attachments', 'attachments', false, 25 * 1024 * 1024, null)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------------ --
-- Storage policies
-- ------------------------------------------------------------------ --
--
-- `storage.foldername(name)` splits an object path into its segments, so
-- `[1]` is the first folder. Requiring it to equal the caller's user id is
-- what scopes every bucket per user.

do $$
declare
  target text;
begin
  foreach target in array array[
    'avatars', 'backgrounds', 'covers', 'note-images', 'note-videos', 'attachments'
  ]
  loop
    execute format(
      $pol$
      drop policy if exists "%1$s_insert_own" on storage.objects;
      create policy "%1$s_insert_own" on storage.objects
        for insert to authenticated
        with check (
          bucket_id = %1$L
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );

      drop policy if exists "%1$s_update_own" on storage.objects;
      create policy "%1$s_update_own" on storage.objects
        for update to authenticated
        using (
          bucket_id = %1$L
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
        with check (
          bucket_id = %1$L
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );

      drop policy if exists "%1$s_delete_own" on storage.objects;
      create policy "%1$s_delete_own" on storage.objects
        for delete to authenticated
        using (
          bucket_id = %1$L
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );
      $pol$,
      target
    );
  end loop;
end;
$$;

-- Reads are split, because the buckets differ.
--
-- Private buckets: only the owner may read, which is also what lets the owner
-- mint a signed URL. Public buckets still restrict *writes* to the owner — the
-- read side is open by virtue of the bucket being public, so a select policy
-- for them would be decoration.

do $$
declare
  target text;
begin
  foreach target in array array['covers', 'note-images', 'note-videos', 'attachments']
  loop
    execute format(
      $pol$
      drop policy if exists "%1$s_select_own" on storage.objects;
      create policy "%1$s_select_own" on storage.objects
        for select to authenticated
        using (
          bucket_id = %1$L
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );
      $pol$,
      target
    );
  end loop;
end;
$$;

do $$
declare
  target text;
begin
  foreach target in array array['avatars', 'backgrounds']
  loop
    execute format(
      $pol$
      drop policy if exists "%1$s_select_public" on storage.objects;
      create policy "%1$s_select_public" on storage.objects
        for select to public
        using (bucket_id = %1$L);
      $pol$,
      target
    );
  end loop;
end;
$$;
