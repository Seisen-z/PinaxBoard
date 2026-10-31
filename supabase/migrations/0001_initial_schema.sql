-- Tackly — initial schema (IMPLEMENTATION_PLAN.md §11, Milestone 5)
--
-- Scope is deliberately the tables the app needs now: profiles, workspaces,
-- boards, lanes, notes, categories, tags and their join tables. Attachments,
-- reminders, versions, groups and stacks arrive with the milestones that use
-- them (§48: "Avoid creating a huge unused schema in the first migration").
--
-- Every user-owned table has Row Level Security enabled with ownership
-- policies. Frontend filtering is not access control (PRODUCT_SPEC.md →
-- "Supabase Security").

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Keeps `updated_at` honest. Doing this in a trigger rather than in the client
-- means a row cannot be updated without its timestamp moving, however it was
-- written.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Usernames appear in URLs and mentions later, so the shape is constrained
  -- at the database rather than trusted from the client.
  constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_-]{3,32}$')
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- A profile row is created for every new auth user. Without this, the first
-- write after sign-up fails on a missing foreign key.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------

create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 120),
  icon        text,
  color       text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists workspaces_owner_idx
  on public.workspaces (owner_id, position);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- boards
-- ---------------------------------------------------------------------------

create table if not exists public.boards (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  owner_id     uuid not null references auth.users (id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 120),
  icon         text,
  color        text,
  layout_mode  text not null default 'board'
    check (layout_mode in (
      'board', 'canvas', 'grid', 'row', 'column',
      'list', 'masonry', 'kanban', 'calendar', 'timeline'
    )),
  background   jsonb not null default '{}'::jsonb,
  settings     jsonb not null default '{}'::jsonb,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);

create index if not exists boards_workspace_idx
  on public.boards (workspace_id, position);

create trigger boards_set_updated_at
  before update on public.boards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- lanes
--
-- Board columns are user data, not a status enum: people name, recolour,
-- reorder and delete their own. See src/types/lane.ts.
-- ---------------------------------------------------------------------------

create table if not exists public.lanes (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards (id) on delete cascade,
  owner_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 60),
  color      text not null default 'var(--status-todo)',
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lanes_board_idx on public.lanes (board_id, position);

create trigger lanes_set_updated_at
  before update on public.lanes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------

create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards (id) on delete cascade,
  -- A note outlives its column: deleting a lane rehomes its notes rather than
  -- destroying them, so this is `set null` and the app picks a new lane.
  lane_id    uuid references public.lanes (id) on delete set null,
  owner_id   uuid not null references auth.users (id) on delete cascade,

  title      text not null default '',
  -- Tiptap JSON from Milestone 9. `excerpt` is the plain-text projection used
  -- for search and card previews, so search never has to walk the JSON tree.
  content    jsonb,
  excerpt    text not null default '',

  x          double precision not null default 0,
  y          double precision not null default 0,
  width      double precision not null default 280 check (width > 0),
  height     double precision not null default 240 check (height > 0),
  rotation   double precision not null default 0,
  z_index    integer not null default 0,

  note_color text not null default 'cream',
  note_style text not null default 'sticky',
  cover_url  text,

  priority   text not null default 'none'
    check (priority in ('none', 'low', 'medium', 'high', 'urgent')),

  -- Subtasks live here rather than in their own table: they are always loaded,
  -- edited and saved with their note, and have no independent identity yet.
  -- A table can follow if checklist items ever need querying on their own.
  subtasks   jsonb not null default '[]'::jsonb,

  completed    boolean not null default false,
  completed_at timestamptz,
  pinned       boolean not null default false,
  locked       boolean not null default false,
  collapsed    boolean not null default false,
  archived     boolean not null default false,

  category_id uuid,
  start_at    timestamptz,
  due_at      timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- The board view reads live notes for one board; the partial index keeps
-- trashed and archived rows out of that hot path.
create index if not exists notes_board_live_idx
  on public.notes (board_id, lane_id)
  where deleted_at is null and archived = false;

create index if not exists notes_owner_idx on public.notes (owner_id);
create index if not exists notes_due_idx
  on public.notes (owner_id, due_at)
  where due_at is not null and deleted_at is null;

-- Full-text search over title and body (PRODUCT_SPEC.md → "Search System":
-- start with PostgreSQL text search).
create index if not exists notes_search_idx
  on public.notes
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '')));

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- categories and tags
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  owner_id     uuid not null references auth.users (id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 60),
  color        text,
  icon         text,
  emoji        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (workspace_id, name)
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.notes
  drop constraint if exists notes_category_id_fkey;
alter table public.notes
  add constraint notes_category_id_fkey
  foreign key (category_id) references public.categories (id) on delete set null;

create table if not exists public.tags (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  owner_id     uuid not null references auth.users (id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 40),
  color        text,
  created_at   timestamptz not null default now(),

  unique (workspace_id, name)
);

create table if not exists public.note_tags (
  note_id uuid not null references public.notes (id) on delete cascade,
  tag_id  uuid not null references public.tags (id) on delete cascade,
  primary key (note_id, tag_id)
);

create index if not exists note_tags_tag_idx on public.note_tags (tag_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Enabled on every table. A table with RLS on and no policy denies everything,
-- so each one below gets explicit ownership policies.
-- ---------------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.workspaces enable row level security;
alter table public.boards     enable row level security;
alter table public.lanes      enable row level security;
alter table public.notes      enable row level security;
alter table public.categories enable row level security;
alter table public.tags       enable row level security;
alter table public.note_tags  enable row level security;

-- profiles: a user reads and writes only their own row. Inserting is handled
-- by the trigger above, but the policy allows it for completeness.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using ((select auth.uid()) = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Owner-scoped tables all follow the same shape. `with check` on update is not
-- redundant: without it a user could reassign `owner_id` and hand a row to
-- someone else.
do $$
declare
  target text;
begin
  foreach target in array array['workspaces', 'boards', 'lanes', 'notes', 'categories', 'tags']
  loop
    execute format(
      'drop policy if exists %1$s_select_own on public.%1$s;
       create policy %1$s_select_own on public.%1$s
         for select using ((select auth.uid()) = owner_id);

       drop policy if exists %1$s_insert_own on public.%1$s;
       create policy %1$s_insert_own on public.%1$s
         for insert with check ((select auth.uid()) = owner_id);

       drop policy if exists %1$s_update_own on public.%1$s;
       create policy %1$s_update_own on public.%1$s
         for update using ((select auth.uid()) = owner_id)
         with check ((select auth.uid()) = owner_id);

       drop policy if exists %1$s_delete_own on public.%1$s;
       create policy %1$s_delete_own on public.%1$s
         for delete using ((select auth.uid()) = owner_id);',
      target
    );
  end loop;
end;
$$;

-- note_tags has no owner_id of its own; ownership comes from the note. Both
-- sides are checked on insert so a user cannot attach someone else's tag to
-- their note, or their tag to someone else's note.
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
