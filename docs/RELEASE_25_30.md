# Tackly: approved single-user release, Milestones 25–30

## 25 — Import / Export

Open **Import / Export** in the sidebar/bottom navigation. Choose a file, inspect
its note/column count, then confirm. JSON supports Tackly note-record arrays,
board backups, and workspace backups. Workspace backups expose a board selector;
restore each chosen board into the currently open board. Imports add new records,
never overwrite existing records, and regenerate note/checklist/recurrence IDs.

Markdown headings, lists, task lists, code and basic inline formatting are read;
TXT and quoted CSV (`title`, `content`/`excerpt`/`text` columns) are supported.
PNG/JPEG/GIF/WebP files are decoded before being accepted. JSON is validated as a
whole batch; malformed notes, duplicate IDs, unsupported documents, invalid
scheduling, excessive columns and oversized files fail before note mutation.
A recovery marker protects the two browser persistence writes across errors or
interrupted tabs. Local columns are now rehydrated with notes after reload.

Export scope can be a note, board, or workspace. Workspace export fetches every
board, including archived boards, rather than relabelling the active board.
JSON/backup retains full note records, columns, board metadata, and vocabulary.
Restore matches/recreates vocabulary and remaps references. Markdown, TXT and
multipage Unicode-capable PDF are available. PDF includes document images and
covers when readable. PNG captures the **visible** surface, including its actual
background, columns, scroll position and rendered notes—not a fabricated grid.

Limits: 10 MB input files, 5,000 notes per import, and the existing 12-column board
limit. Backups are note-record backups: uploaded storage binaries and version
history are separate. They do not create a new cloud workspace or automatically
replace board settings; choose/create the destination board and restore its
records explicitly. Image files embedded into imported documents travel with
those documents. External/private media references still need their source files.

## 26 — Offline mode

A per-owner/per-board durable working journal retains the confirmed baseline and
working records. Browser storage is synchronous for the last edit; IndexedDB
mirrors board snapshots. Cached workspace directories let existing boards reopen.
The service worker caches only the same-origin app shell and static assets; it
never caches Supabase, auth endpoints, or generic API responses. Account shell
caches are separated and the previous shell is removed on session changes.

Reconnect performs three-way reconciliation. Unchanged remote records accept the
local edit; concurrent edits or a remote purge preserve the remote result and
create a new **offline conflict copy** of local work. Retry never consumes the
only copy of queued work before a successful write. Board/owner scope guards
reject late saves for a newly selected board. Quota failures retain in-memory
edits and show a storage error instead of claiming a durable save.

Offline reopening requires one prior successful online shell/static-asset cache
warm-up. New authentication, uploads and uncached boards still need a connection.

## 27 — Analytics

Analytics uses the current workspace (or the local board), actual completion
timestamps, civil-day boundaries and real category IDs. It displays completed
today/week/month, ongoing streak, active notes/boards, most active category and
14 daily counts. Future/invalid/deleted/archived completion records are excluded;
`updatedAt` is never substituted for a missing completion event. Cloud loading
and errors are explicit and retryable. Workspace data is cached for 30 seconds.

## 28 — Mobile / tablet

Phones use reachable bottom navigation, a floating one-action add, a compact
header, touch-sized controls and the shared full-screen editor. Canvas supports
native two-finger pan/pinch, cancels a competing single-pointer note drag, and
commits the viewport on release. Existing context menus support touch long press;
visible More buttons provide a non-gesture route. Tablets can collapse/expand
the sidebar. Board/Grid/List and Filter/Display stay in the toolbar;
Canvas/Calendar/Timeline remain sidebar destinations. No duplicate Kanban.

## 29 — Accessibility

Skip-to-notes navigation, visible focus, readable status text, reduced motion,
mobile page zoom, 44px coarse-pointer controls, and controlled-dialog focus return
are implemented. Canvas has keyboard pan/zoom/fit; focus its placement group and
use Alt+arrows to move, Ctrl+Alt+arrows to resize (Shift increases the step).
The existing Board drag keyboard sensor and explicit note menus remain available.
Real Chrome axe audits cover light/dark Board, transfer dialog, Analytics, phone
Board and phone Canvas. Automated audits do not replace human screen-reader review.

## 30 — Performance

Board columns above 100 records and Lists above 200 records use measured variable-height windowing with labelled
previous/next controls and total/position semantics. Offscreen Canvas notes are
culled without deleting store records or losing selected notes. Rich editors
mount near the viewport; previews keep SSR/client markup consistent. Covers load
lazily. Stable tag arrays and mutation callbacks keep card memoization effective.
Large-board notes, tag links and workspace export boards are paged with exact counts so Data API row limits do not silently truncate a backup. Tag links are skipped for unchanged titles/body edits and otherwise use bounded
100-note batches instead of two requests for every note.

Browser fixtures exercise 1,000 notes, native drag, bounded list DOM, Canvas
culling, and repeated surface switches with post-GC heap measurements. These are
local-machine measurements, not a guarantee for every device or unlimited data.

## First-account follow-up

An authenticated empty account provisions a Personal workspace and first board.
Retries re-read existing records, reuse partial prior creation, and repair empty
column seeds rather than duplicating them. Pending setup hides unrelated mock
notes and disables toolbar creation. Setup/network errors expose retry controls.
Repository fixtures verify this; a fresh real authenticated account review remains
separate from local-browser and mocked repository evidence.

## Verification and rollback

Full commands, input fixtures, literal outputs and exit codes live in
`E:\Apps - Website\To Do\release-25-30-evidence\VERIFICATION.txt`.
The evidence directory includes original/modified hashes, MODIFIED_FILE.zip,
DIFF_FILE.patch and ROLLBACK.sh. Rollback is tested on a disposable copy and does
not roll back or erase live cloud data. No database migration is added here.

Milestone 31 Collaboration remains the roadmap's separate future phase. Earlier
calendar/timeline enhancements, closed-page push and other post-MVP items remain
listed in the handoff; they are not silently represented as shipped here.
