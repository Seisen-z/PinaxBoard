# Distinct views and board collaboration

## One set of notes, different jobs

- Dashboard: the current board's due work, priorities, recent edits, pinned notes and completions. It is an overview, not another layout switcher.
- Inbox: explicit quick captures awaiting organization. Capture creates one blank note immediately. Choosing a column clears its Inbox flag; it does not clone, delete, archive or remove the note from Canvas.
- My Notes: searchable notes authored by the signed-in user on the current board. Legacy records fall back to their owner. New shared notes retain board ownership but have a separate, database-stamped author.
- All Notes: the board's library, including collaborators' notes. This replaces the ambiguous Notes label.
- Board: columns, with Board/Grid/List + Filter/Display retained in its toolbar.
- Canvas: spatial placement of those same records, with grid/snap/fit and Canvas controls instead of Board/Grid/List switching. A note's `onCanvas` flag and transform describe placement, not another copy of its document.
- Calendar and Timeline remain sidebar destinations with their own surface labels.

All library/summary views are scoped to the selected board. Archive/Trash remain separate lifecycle states.

## Sharing scope and roles

The Share button is available in the header and the focus editor. It shares **the selected board and all its notes**, including its Canvas; it is not a private single-note link. The dialog explains this before an invitation can be created. Sibling boards remain private. Parent workspace names and taxonomy become readable so a shared board can be opened; this does not grant workspace-wide editing.

- Owner: invites, changes/removes membership, and manages board/workspace settings. Permanent purge and version restoration remain owner operations.
- Editor: creates and edits notes and columns, organizes Inbox captures, changes Canvas placement, and uses existing tags/categories. Workspace taxonomy management remains with its owner. Attachment removal still follows the original uploader's ownership.
- Viewer: reads and opens notes; mutation controls and store actions are guarded. Database RLS independently rejects writes.

The owner chooses Can view or Can edit and creates a single-use 7-day invitation link, then copies/sends it. The recipient needs an account and explicitly accepts. The raw token appears once in the link's URL fragment; the database retains only its SHA256 hash. A pending link survives sign-in in that tab's sessionStorage. Links can be revoked; accepted access can be downgraded or removed. A used link does not re-grant removed membership.

## Realtime and conflict behavior

Authenticated private Supabase channels carry ephemeral cursor/name/view metadata, not note bodies. Canvas pointers use world coordinates so different viewport pans and zooms agree. Board pointers anchor to note cards, and focus-editor pointers appear when both people open the same note. Presence and its listeners are cleaned up on board/session changes. Display names in presence are presentation data, never authorization credentials.

Durable notes/columns are synchronized via RLS-protected Postgres Changes and a bounded compare-and-save transaction. Writes remain debounced; Canvas transforms commit on release, never as database writes on every pointer move. Shared save checks the actual changed rows and their tag sets before writing the whole batch atomically. A stale write is rejected and the existing three-way recovery keeps the server version plus a new conflict copy of the local version. Concurrent column names are retained as separate conflict columns when capacity permits; reaching the 12-column limit retains the device journal and surfaces an actionable error instead of discarding a rename. It does **not** character-merge two simultaneous rich-text edits like a CRDT editor.

Membership is rechecked on changes, tab focus and a 15-second interval. Revocation blocks subsequent database reads/writes; private presence connections are closed on the next permission refresh. Presence can briefly retain previously received cursor metadata during that interval. Missed note notifications have a periodic reconciliation fallback.

## Database rollout and verification boundary

Migration: `supabase/migrations/0007_board_collaboration.sql`.
Guarded database rollback: `supabase/rollback/0007_board_collaboration.sql`.

The rollback refuses to erase membership, invitations, Inbox state or distinct author identities. For an unused installation it restores owner-only policies, original note columns and the previous publication membership while retaining history/reminders.

On 2026-10-31 the user supplied a new active project in `.env.local` and requested activation. Migrations **0001-0009** were installed there after a fresh-schema preflight ran collaboration and daily-health fixtures in a rolled-back transaction and confirmed the schema returned to empty. Hosted SQL tests cover invitation acceptance/reuse/revocation, sibling/outsider isolation, viewer rejection, editor writes, stale-write rollback and author identity. The old paused project was not restored; accounts/data were not copied.

Two real accounts signed in through the app forms. The owner created an editor link in Share, the recipient accepted, and a note edit reached both hosted storage and the owner browser. Private realtime presence displayed the editor cursor on Canvas. Owner downgrade removed the recipient's editing UI, the API independently denied viewer writes, and membership removal hid shared notes. Browser errors: zero. Current deployment and browser evidence: `../new-project-evidence/VERIFICATION.txt` and `LIVE.json`. Disposable test users/resources are removed after the browser run. No public app deployment/domain is implied by hosted database activation: invitation links use the current app origin, so localhost links are only useful on that computer.

`0008_explicit_api_grants.sql` supplies explicit privileges alongside RLS for fresh projects and backfills absent profiles. `0009_daily_health_check.sql` adds the requested server-only daily diagnostic; see `docs/DAILY_HEALTH_CHECK.md`. It does not affect note contents or sharing permissions.

The fresh-project evidence helper `../new-project-evidence/CLOUD.mjs` accepts `preflight`, `apply`, `verify`, and `rollback-test`, reading `SUPABASE_ACCESS_TOKEN` from a transient process environment. Its bootstrap refuses an existing Tackly schema. Do not use the old 0007-only helper to initialize a new project. Runtime collaboration and the daily scheduler do not require a Management API personal token.

Official implementation references: [Supabase private-channel authorization](https://supabase.com/docs/guides/realtime/authorization) and [Postgres Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes).

Comments, mentions, assignments, workspace-wide invitations and CRDT text merging remain separate enhancements; they are not represented as shipped by this board-sharing slice.
