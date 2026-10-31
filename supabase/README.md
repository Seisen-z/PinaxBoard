# Supabase

Schema and migrations for Tackly's backend.

Once a project is connected, everything syncs: accounts, workspaces, boards,
columns and notes. Without credentials the app runs entirely on local state and
saves to the browser.

## One-time setup

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. Copy `.env.local.example` to `.env.local` and fill in **Project Settings →
   API**:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```

   Both are safe in the browser. Row Level Security is what protects user
   data — never the key.
3. Apply **all** numbered files in `migrations/` in ascending order, either
   through the SQL Editor, or with the CLI for a CLI-managed project:

   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

   The current new project was initialized through Management API SQL on
   2026-10-31 (0001-0009). This is not a CLI migration-history initialization;
   reconcile its migration ledger before adopting `supabase db push`, rather
   than blindly replaying existing schema. The fresh-project evidence bootstrap
   refuses an existing Tackly schema.

4. Regenerate the types so they match what actually shipped:

   ```bash
   npx supabase gen types typescript --project-id <project-ref> > src/types/database.ts
   ```

## Migrations

Numbered and forward-only. Schema changes get a new file; existing files are
never edited once applied, because a migration that has already run somewhere
cannot be changed retroactively (IMPLEMENTATION_PLAN.md §52).

Avoid destructive migrations. A column drop that loses user content needs
explicit approval and a backfill plan.

| File | Contents |
| --- | --- |
| `0001_initial_schema.sql` | profiles, workspaces, boards, lanes, notes, categories, tags, note_tags — plus RLS |
| `0002_note_on_canvas.sql` | `notes.on_canvas` — the Board/Canvas split |
| `0003_attachments_and_storage.sql` | `attachments`, six Storage buckets, and their policies |
| `0004_note_schedules.sql` | reminders, recurrence, atomic recurring batches |
| `0005_note_history.sql` | activity, version snapshots and owner restore |
| `0006_note_lifecycle.sql` | guarded purge and file-cleanup queue |
| `0007_board_collaboration.sql` | author/Inbox fields, viewer/editor invites, RLS, private presence |
| `0008_explicit_api_grants.sql` | explicit API grants and absent-profile backfill |
| `0009_daily_health_check.sql` | service-only daily insert/delete diagnostic |

All nine are installed on the current new project. See
`docs/COLLABORATION.md` and `docs/DAILY_HEALTH_CHECK.md` for current runtime proof,
scheduler operation and rollback. The old paused project's data was not copied.

## Storage

Uploads land in six buckets. The security model is that a file's **path**
carries its owner:

```text
<bucket>/<user id>/<note id>/<uuid>.<ext>
```

Every storage policy checks that the first path segment equals `auth.uid()`.
That is what makes "unauthorized users cannot access private files" true at the
database rather than in the client, which can forget a filter.

| Bucket | Public | Limit | Holds |
| --- | --- | --- | --- |
| `avatars` | yes | 2 MB | Profile pictures |
| `backgrounds` | yes | 10 MB | Board backgrounds (Milestone 19) |
| `covers` | no | 10 MB | A note's cover image |
| `note-images` | no | 10 MB | Images inside a note's body |
| `note-videos` | no | 50 MB | Video attachments |
| `attachments` | no | 25 MB | Everything else, any type |

`avatars` and `backgrounds` are public because they are decorations the user
chose to display, and signing a URL per avatar per render would be a request
per face. Everything written *into a note* is private and read through a
signed URL — which expires, and so is never stored on the row.

Paths are built in exactly one place, `storagePath()` in
`src/features/attachments/upload-policy.ts`. A path built any other way is
rejected by the policies, which is the intended failure mode but only works if
that function stays the single source.

## Row Level Security

Enabled on every table. Owner-only data retains ownership policies; migration
0007 adds board-membership policies for the explicitly shared resources. The
diagnostic tables are server-only, with no anonymous/authenticated policies. Two things worth knowing:

- **`with check` on update is not redundant.** Without it a user could
  reassign `owner_id` and hand their row to someone else.
- **`note_tags` has no `owner_id`.** Ownership is derived through the note, and
  inserts check *both* sides — so a user cannot attach someone else's tag to
  their note, or their own tag to someone else's note.

A table with RLS enabled and no policy denies everything. When you add a table,
add its policies in the same migration.

## Verifying RLS

These policies cannot be covered by the unit suite — it has no database. After
applying the migration, check with two accounts:

1. Sign in as user A, create a workspace and a note.
2. Sign in as user B and query the same ids directly.
3. For an uninvited user B, reads return empty and writes are rejected.
4. For an explicitly invited viewer, reads succeed and writes are rejected.
   An editor can edit only the invited board, not private sibling boards.

Do this once per new table before relying on it.

### Storage, specifically

`0003` is installed on the new project. The following byte-upload checks are
historical evidence from the previous project, not a fresh Storage runtime
audit of this recreated project. Current two-account browser proof covers
sharing, live note edits, cursors, downgrade and revocation. Re-run these
Storage checks after any storage policy change:

1. As user A, upload a file to a note. The object's path begins with A's user
   id. ✓
2. As user B, read that object by path — rejected, no bytes. B also cannot mint
   a signed URL for it. ✓
3. As user B, upload to a path beginning with **A's** user id — rejected by the
   insert policy. ✓
4. As user B, insert an `attachments` row pointing at A's note — rejected, both
   with `owner_id` set to B and with it set to A. The policy checks the note's
   owner as well as `owner_id`. ✓
5. A signed URL stops working after its TTL (200 while fresh, 400 after). ✓

Plus the positive controls, so the policies are not merely closed: A can insert
its own `attachments` row and sign its own object, and B reads zero rows.

The script that runs all of this is not checked in — it creates two confirmed
users with the service role key, exercises the paths, then deletes both. Write
it fresh rather than keeping a credentialed script in the repo.
