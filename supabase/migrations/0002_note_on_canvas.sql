-- The Board and the Canvas are separate surfaces.
--
-- Every note belongs to a column and appears on the Board; only notes the user
-- deliberately places appear on the Canvas. This is a flag on the one note
-- record, never a second copy — a note edited on the Canvas is the same note
-- the Board shows.
--
-- Defaults to false so existing notes stay on the Board only, which is the
-- conservative direction: a user's Canvas does not suddenly fill up.

alter table public.notes
  add column if not exists on_canvas boolean not null default false;

-- The Canvas reads one board's placed notes. A partial index keeps that query
-- off the far larger set of Board-only notes.
create index if not exists notes_canvas_idx
  on public.notes (board_id)
  where on_canvas = true and deleted_at is null and archived = false;
