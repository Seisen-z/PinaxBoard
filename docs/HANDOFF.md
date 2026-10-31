# Session handoff — Tackly

> **Current work (2026-10-31):** Fixed the reported development-only removed-module factory error after demo-data removal. The previous dev app registered the offline service worker, which cached mutable Turbopack chunks. Development now unregisters only Tackly's worker and removes only its app-shell CacheStorage; production offline behavior is retained. The stale generated .next/dev tree was preserved in ../runtime-errors-evidence/original-dev-cache and a fresh dev server starts on port 3000. No notes/localStorage/journals, accounts or cloud data are cleared. Main branding/clean-start changes remain in place; see ../runtime-errors-evidence/VERIFICATION.txt for current checks and ../brand-cleanup-evidence for the prior rollout.
> Previously approved Milestones **25–30** remain implemented. `docs/COLLABORATION.md` documents the new behavior, permission model, conflict handling, activation commands and verification boundary. `docs/RELEASE_25_30.md` retains the earlier feature details.
> Current branding/clean-start evidence: `E:\Apps - Website\To Do\brand-cleanup-evidence`. Earlier OTP/UI evidence remains `../otp-boxes-evidence` and `../otp-email-evidence`; collaboration/health activation: `../new-project-evidence`. Preserve their original/modified hash manifests and tested rollback artifacts.

- Dashboard is a summary, Inbox is explicit quick capture/triage, My Notes filters by author on the current board, and All Notes includes all authors. Organizing Inbox changes the existing note, not a copy.
- Board retains Board/Grid/List + Filter/Display. Canvas, Calendar and Timeline no longer repeat that layout switcher. They remain sidebar destinations and share the same notes.
- Share grants access to the selected **whole board and all its notes**, not a private single-note or workspace-wide share. Owner manages single-use 7-day viewer/editor invitations, membership changes and revocation. Signed-in recipients explicitly accept.
- Shared saves use an atomic compare-and-save RPC; stale edits preserve the server record and a local conflict copy. Cursors/presence use private rooms and world-space Canvas coordinates. No CRDT character merge is claimed.
- Local PostgreSQL/pgcrypto tests cover RLS, invitation reuse/revocation, sibling isolation, viewer/editor/outsider behavior and guarded schema rollback. Hosted SQL/API permission tests and a real two-account browser/WebSocket run now pass on the new project: UI invitation acceptance, editor save reaching the owner, visible private Canvas cursor, viewer downgrade/write denial, and membership removal. Temporary accounts/resources were deleted. See `../new-project-evidence/LIVE.json`.
- Preserve blank one-action note creation, user-owned columns, shared focus/editor, light/dark modes, and all history/reminder/lifecycle/import/offline contracts. Archive/Trash remain sidebar destinations. Owner-only settings/history restore/purge stay guarded.
- UI repair (2026-10-31): portalled DropdownMenu roots/submenus use `--z-menu: 110`, above header 80 and overlay 100. Workspace/account navigation menus are non-modal, avoiding aria-hidden focusable background content. The signed-out workspace explanation is now an actual `/login` link. Sign-out prevents default menu-selection close, keeping its native form mounted through submission. Sign-in creates a fresh account's Personal/My board cloud records and persists across reload. Current UI/sign-in tests and reversible source evidence: `../ui-signin-evidence/VERIFICATION.txt`; previous database rollout evidence remains unchanged.
- OTP input UI (2026-10-31): six separate digit boxes replace the single long field, as requested. Auto-advance, Backspace/arrow/Home/End navigation, paste/autofill, leading zeros and one unchanged server `code` field remain supported. Current UI evidence: `../otp-boxes-evidence/VERIFICATION.txt`; the prior OTP/backend evidence is `../otp-email-evidence`. No additional email was requested after the user chose to test delivery themselves.
- Email verification: signup without a session and unconfirmed password sign-in open `/verify-email`. Codes verify through the real provider, not a local comparison. Pending cookies hold only email/UI timestamps. Migration 0010 limits sends to 3/15 minutes with a 60-second gap, verifies to 5/10 minutes; service-role RPC only. Direct public Auth endpoints retain independent provider limits. Source/type/lint regression: 876 tests in 88 files passed. A real provider-issued fixture OTP passes the browser form, persists the session, rejects replay and an eleven-minute-old code, and clears pending state. Twenty concurrent limiter calls allow exactly five attempts; two responsive accessibility audits pass. See the current report for final counts and separate delivery proof. SMTP credentials are excluded from artifacts; local edits must also be applied to hosted Auth configuration.
- Do not add duplicate Kanban navigation. Do not add comments/mentions/assignments or workspace-wide sharing unless requested.

---

## How to use this file

**Starting a new session:** paste this whole file as your first message, or —
if the session can read the repository — say:

> Read `docs/HANDOFF.md`, confirm you understand, then continue from
> "Open questions / next steps".

**This file is the single source of truth for project state.** It supersedes
any earlier conversation, summary or recollection. If something here
contradicts what a session thinks it remembers, this file wins. If something
here contradicts the **code**, the code wins and this file is stale — fix it.

**Ending a session:** before the context fills up, **overwrite this file** with
a fresh handoff reflecting the new state. Do not append, do not keep a history
section, do not create `HANDOFF-2.md`. One file, always current. A handoff that
accumulates becomes a changelog nobody reads.

What a regenerated handoff must carry forward:

- Everything under **Decisions made** and **Do not redo** — these are the
  user's standing choices and the traps already hit. Losing them means
  re-litigating settled questions.
- Everything under **Gotchas** that is still true.
- A **Current state** rewritten to match reality, not copied.
- **Open questions / next steps** reduced to what actually remains.

Delete anything that has become false. A stale handoff is worse than none.

---

## Goal

Build **Tackly**, a sticky-note / to-do / notebook workspace app, following
three specs in the project root: `PRODUCT_SPEC.md`, `FRONTEND_SPEC.md`,
`IMPLEMENTATION_PLAN.md`. Work proceeds milestone by milestone per the
implementation plan.

---

## Current state

**Project root:** `E:\Apps - Website\To Do\Website` — the Next.js app lives
alongside the three spec files. Not a git repository.

```bash
npm run verify     # typecheck + lint + test; heavy UI tests may time out under load
npm run dev        # http://localhost:3000
npm run build
```

### Stack, as installed

Next 16.3.6 · React 19.2.8 · TypeScript (strict, plus
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`,
`noUnusedParameters`) · Tailwind v4 (CSS-first, no config file) · shadcn/ui
(radix base, nova preset) · Zustand 5 · TanStack Query 5 · Zod 4 · Geist (local
font package) · Lucide.

**Used for Board drag-and-drop:** dnd-kit. **Installed but not yet used:** Motion.

### What works today

- **Focus Mode (Milestone 20).** Extends the one shared NoteFocusDialog, not a
  second editor. Paper surface double-click and keyboard Enter open it on
  Board/Grid/Canvas; nested buttons, inputs, editable text and portal menus keep
  their ordinary behavior. Existing List/Calendar/Timeline/menu opening remains.
  Text-only Undo/Redo controls subscribe to real Tiptap transactions, follow
  keyboard history, and disable when unavailable or locked. The focus RichEditor
  is keyed by note id: switching notes/closing does not reuse another session's
  history. Semantically identical server echoes (including JSON key reordering)
  preserve history; changed external documents reset it so Undo cannot overwrite
  newer data. Own edits, Undo and Redo write content/excerpt together to the same
  record. Title is controlled by that shared record and reflects external updates.
  More reuses the existing menu/actions; Archive closes focus, Delete retains
  existing store semantics. Share opens board sharing in the app; embedded editors without a sharing handler keep the control disabled.
  Header wraps at narrow widths. Existing dim overlay, paper styles, rich editing,
  appearance, dates, attachments, locks and Escape/Close remain. No foreground blur.

- **Background personalization (Milestone 19).** The breadcrumb wallpaper button
  opens a narrow drawer while the real board remains visible as the live preview.
  Solid token swatches/custom color, two gradients/custom two-color angle, two
  patterns and two bundled SVG landscapes. Image uploads accept PNG/JPEG/WebP/AVIF:
  2 MB locally (reloadable data URL in preferences), 10 MB for cloud boards using
  the existing public `backgrounds` bucket from 0003 and `storagePath()`.
  Blur, brightness, saturation, contrast, opacity, overlay, vignette, grain and
  tint affect only the background layer. Cancel discards the scoped preview;
  Save commits with loading/error/retry states. Reset follows the current theme.
  Local storage quota failure does not publish a false saved state. Cloud saves
  confirm the board row, update its TanStack cache, and capture board/account ids
  so an in-flight write cannot land on a newly selected board. Failed-save uploads
  are cleaned up; replaced own-board objects are cleaned after commit, best effort.
  Local settings and theme rehydrate; cloud backgrounds live in `boards.background`.
  Existing note records and creation flow are untouched. No new theme presets.

- **Advanced Note Appearance (Milestone 18).** Shared focus editor exposes a
  collapsed Note appearance section using the existing color/style pickers and
  cover controls, plus five Canvas footprint presets and honest custom-size
  display. Pin and lock/unlock are available inside the editor. Locked notes
  disable appearance editing; forced-color styles explain their color behavior.
  Editor paper scrolls when the customization section expands. No new note
  type, creation chooser, migration or theme mode was introduced.

- **Layout:** permanent left sidebar (workspace switcher, compose, destinations)
  → breadcrumb bar (location + search, sync, theme, notifications, account) →
  board toolbar (view switcher, Filter, Display, count, zoom, New note) →
  surface. No floating clusters. **Browser-verified in the previous session.**
- Board of user-owned columns rendered as tinted panels; notes with full CRUD,
  colour, style, priority, pin, lock, complete, archive, checklists, tags.
- Canvas Mode: pan, zoom, drag, resize, marquee select, snap-to-grid, layer
  order, fit-to-content.
- **Rich note editing (Tiptap).** Paragraphs, three heading levels, bullet and
  numbered lists, checklists, quotes, code and code blocks, dividers, links and
  images by URL. Slash menu, full-screen editor, read-only rendering. Pre-§15
  notes migrate from `excerpt` on first edit.
- Light and dark mode only — no theme picker. Dark is a warm near-black
  (measured `rgb(19 18 17)` on `body`). Right-click menus on every surface,
  board/canvas settings.
- **Uploads (Milestone 10) — working end to end.** Attachment list with drag,
  drop and a picker; per-file validation, progress, error and dismiss; remove;
  image thumbnails via signed URLs; paste/drop an image into the editor to
  upload and inline it; note cover add/replace/remove. Confirmed in a browser:
  file → object under `<uid>/<noteId>/<uuid>.png` → `attachments` row →
  signed thumbnail renders → header reads "Saved".
- **Tags, categories and filtering (Milestone 11).** Workspace-scoped tags and
  categories with create/rename/delete; multi-select tag assignment and
  single-select category from the note menu; a category badge on the card;
  and a Filter menu over tags, categories, priority and completion.
- **Board fulfils Milestone 15.** The user removed the redundant Kanban
  option. Board retains the same user-owned columns, drag/drop, add/rename/
  recolour/delete/rehome, filters, sorting and persistence. No separate Kanban
  component, catalogue entry or view-switcher button remains. The legacy
  `kanban` data id is retained for stored-row compatibility, not exposed as a view.
- **Timeline View (Milestone 17).** Enabled in the view switcher. A horizontally
  scrollable date axis shows one row per note, with title/column label, category
  colour, priority and inclusive duration. Week is Monday-first; month and
  quarter follow real calendar boundaries. Previous/Next/Today, edge clipping
  indicators and sticky row labels. Start-only/due-only notes are one-day
  milestones. Undated and invalid/reversed ranges remain accessible below the
  chart for correction. Uses existing filters/sort/completion visibility and
  records; bar/row opens the one focus editor. Shared Start date input sets or
  clears `startAt`; due date editing remains available. Timeline New note creates
  one blank dated record on the anchor day, then opens it immediately.
- **Calendar View (Milestone 16).** Enabled in the view switcher. A local-day,
  Sunday-first month grid shows due-dated notes as category-coloured pills
  with title and priority. Previous/next month and Today; selected day; six
  complete weeks including neighbouring dates; busy-day expansion. Filters,
  completion visibility and sort are shared. Pills open the one focus editor.
  New note creates one blank dated record on the selected day and opens it;
  no type chooser, copied records or forced Canvas membership. A Due date input
  in the shared editor sets/clears dates, protected by locking and persisted
  through the existing local store/autosave mapper. Mobile scrolls the seven-day
  grid horizontally; no pretend zoom or unimplemented mode controls.
- **Cloud column creation fixed.** `useLaneStore.addLane` previously hard-coded
  `MOCK_BOARD_ID`, even after cloud hydration. It now uses the current lane
  records' board id or the non-persisted creation context. `reset(lanes, boardId)`
  carries that context with hydration, even when there are zero lanes. New
  columns therefore serialize the actual `board_id` for the existing autosave.
- **List View (Milestone 14).** Enabled in the view switcher. Flat, compact
  responsive rows display document icon, inline title, body preview, tags and
  category, due/last-edited date, priority, column/completion status and menu.
  Icon/preview/double-click opens the one shared focus editor. Uses the same
  filters and six sort modes as Grid/Board, with empty-state recovery and blank
  creation. No extra note data or persistence path; no nonfunctional List zoom.
- **Board drag-and-drop (user-requested).** Drag the grip beside a note's title
  onto another column, including an empty column. Pointer/touch and keyboard
  sensors use dnd-kit; Space/Enter picks up, Left/Right chooses a column,
  Space/Enter drops, Escape cancels. The hovered panel gets a focus outline,
  and an overlay previews the dragged note. Only drop commits `laneId` once;
  autosave persists through the existing mapper/snapshot diff. Locked notes
  have disabled grips; outside/cancelled/same-column/stale drops are no-ops.
  Dragging does not edit content, coordinates, Canvas membership or duplicate
  a note. Title text, editor, checkboxes and menus do not activate dragging.
- **Grid View (Milestone 13).** Enabled in the view switcher. Responsive CSS
  grid uses the same paper cards and store records, with covers, tags, checklist
  counts, completion status, column name and last-edit date. It uses Board
  filters, all six sort modes and density; excludes archived/deleted notes.
  Menus, inline editing, selection and the full-screen editor are shared.
  Switching views neither duplicates records nor changes Canvas membership.
  Empty and filtered-empty states offer creation or display recovery.
  The toolbar wraps on narrow screens; Grid has no pretend zoom control.
- **Search, filter, sort (Milestone 12).** A Ctrl/Cmd+K command palette
  searching note titles, body text, tags, categories, board and workspace
  names; picking a result opens or switches to it. Filters extended with
  due-date buckets and note style. All six sort modes were already in place.
- Supabase auth: sign up, sign in, sign out, session refresh, profile records.
- Cloud workspaces and boards via TanStack Query with optimistic mutations.
- Note and column persistence with 600ms debounced autosave and a status
  readout in the header.
- Without `.env.local` the whole app still runs on `localStorage`.

### Fixed this session — signed-in note creation

`useNoteStore.addNote` hard-coded `boardId: MOCK_BOARD_ID` and
`ownerId: MOCK_OWNER_ID`. Signed in on a cloud board, every new note was
therefore written with `board_id: "mock-board"`, which Postgres rejects as a
malformed uuid (`22P02`). **No note a signed-in user created had ever been
saved** — the console showed `save your notes failed` and the note lived only
in `localStorage`. It also made uploads impossible, because the `attachments`
insert policy requires the note row to exist and be the caller's.

The fix: the note store carries a `boardContext` (`{ boardId, ownerId }`), set
by `reset(notes, context)` — the same call that fills the records, so the
context cannot drift from the notes it describes. It defaults to
`LOCAL_BOARD_CONTEXT` (the mock pair) for signed-out and test callers, and
`useBoardContents` passes the real pair on hydration. It is **not** persisted,
so a signed-out reload cannot inherit a cloud board. Three tests in
`note-store.test.ts` pin it, including the exact regression.

This was never in any milestone's "left open" list — it was found only by
driving the signed-in path in a real browser.

### Supabase

Project `<PROJECT_REF>`. Credentials in `.env.local` (gitignored; only
`.env.local.example` is tracked). **All three migrations applied and verified
live:**

- 9 tables, RLS enabled, policies on every one.
- Every row type in `src/types/database.ts` matches the live columns exactly
  (profiles 6, workspaces 9, boards 13, lanes 8, notes 31, categories 9,
  tags 6, note_tags 2, **attachments 10**).
- `updated_at` triggers on all six mutable tables; `on_auth_user_created`
  seeds the profile row.
- **RLS genuinely isolates users**, for tables and for Storage both. See
  `supabase/README.md` → "Verifying RLS" for the exact checks and their
  results; all passed this session against two throwaway accounts.
- 6 Storage buckets (`avatars`, `backgrounds` public; `covers`, `note-images`,
  `note-videos`, `attachments` private) with 24 policies.
- **At the previous live check, the project had zero users and zero rows** — every test account
  was deleted afterwards. A new sign-up is a genuine first run.

Note: `notes` has **no `position` column**; ordering comes from the lane plus
`z_index`. Writing a seed script against it will fail otherwise.

To apply future migrations without the dashboard, use the Management API with
a Personal Access Token (`sbp_…`) — the service role key **cannot** do DDL
(it is the data plane; PostgREST ships no generic SQL function):

```
POST https://api.supabase.com/v1/projects/<PROJECT_REF>/database/query
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
{"query": "<sql>"}
```

### Key paths

| Path | What lives there |
| --- | --- |
| `docs/ARCHITECTURE.md` | **Read first.** Component and hook reference, plus every decision below with its rationale |
| `src/styles/tokens.css` | All design tokens — the single source of visual truth |
| `src/stores/` | note, lane, selection, canvas, settings, workspace, sync |
| `src/features/` | notes, board, workspaces, auth |
| `src/lib/supabase/` | client, server, proxy helpers |
| `src/proxy.ts` | The Next entry point for session refresh |
| `src/lib/mappers/` | Row ↔ domain — the only place snake_case meets camelCase |
| `src/lib/tiptap/` | `document.ts` (JSON ↔ text, migration), `extensions.ts` (the block vocabulary), `slash-commands.ts` |
| `src/features/attachments/` | `upload-policy.ts` (validation + paths), `repository.ts`, `queries.ts`, `cover.ts` |
| `src/features/taxonomy/` | `repository.ts`, `queries.ts`, `context.tsx` — the workspace vocabulary |
| `src/features/board/filter-notes.ts` | Board filters, pure |
| `src/features/search/search.ts` | Workspace search and its ranking, pure |
| `src/test/render.tsx` | Provider-aware `render` for tests |
| `supabase/migrations/` | `0001_initial_schema.sql`, `0002_note_on_canvas.sql`, `0003_attachments_and_storage.sql` (**all applied**) |
| `supabase/README.md` | Connecting a project, migrations, verifying RLS |
| `AGENTS.md` | Short rules for anyone writing code here |

---

## Decisions made

**User decision, 2026-10-14:** Keep Board/Grid/List, Filter and Display in the
toolbar; move Canvas, Calendar and Timeline to functional sidebar destinations.

**User decision, 2026-10-09:** Board already provides Kanban workflow. Remove
and do not reintroduce a duplicate Kanban view/button; mark its milestone as
covered by Board. Keep the useful cloud-column creation fix.

The user overrode the written specs on each of these. Treat their decision as
authoritative over the spec text. **Carry this section into every future
handoff.**

1. **Columns are user data, not a status enum.** A note stores `laneId`. The
   five seeds (To Do / In Progress / Review / Done / Ideas) are defaults; the
   user renames, recolours, reorders and deletes them. Deleting a column
   **rehomes** its notes into the first remaining column rather than deleting
   them. The last column cannot be deleted.
   *Deviates from IMPLEMENTATION_PLAN.md §8.*

2. **The Board and the Canvas hold different content.** `Note.onCanvas` is a
   flag on the one record, never a copy. The Canvas starts empty. Routes in:
   "Add to Canvas" on a note, "Send to Canvas" on a column, "Add note to
   canvas" in the canvas controls.
   *Deviates from §19 and PRODUCT_SPEC's "same records, different
   representation".*

3. **Shadows reduced.** A resting card gets a tight contact shadow only; depth
   is reserved for hover and drag. The active nav item is *filled*, not raised.
   *Deviates from FRONTEND_SPEC.md §16 and §10.*

4. **Locking prevents deletion.** This reverses an earlier call in the session.
   Unlock stays available, so a locked note is never stranded.

5. **No pure black or white anywhere.** Shadows are `rgb(10 8 4 / …)`,
   highlights `rgb(255 252 244 / …)`. Two tests fail the build if a pure value
   reappears.

6. ~~Three requested duo-tone themes.~~ **Reversed.** The user removed theme
   selection entirely: there are two modes, light and dark, and no picker. The
   ten presets — including the three duo-tone palettes requested earlier in the
   project — are deleted. `src/config/themes.ts` is now two backgrounds and an
   `applyTheme` that sets one attribute; every colour lives in `tokens.css`,
   where `:root` is dark and `:root[data-theme="light"]` overrides it.
   *Supersedes FRONTEND_SPEC.md §34 and PRODUCT_SPEC.md → "Theme Presets".*

7. **One Add control per column** — the header's. An empty column shows a
   placeholder target with a deliberately different label.

8. **Right-click opens configuration.** A note → the note menu; the empty
   board or canvas → that surface's settings. The browser's own menu is
   suppressed only on those targets.

9. **The Board and the Canvas expose different settings.** Board: sort order,
   card density, show/hide completed. Canvas: grid mode, grid size, snapping,
   fit, reset view.

10. **The layout follows a Linear-style issue tracker**, from a screenshot the
    user supplied. This reverses three spec rules at once, all deliberately:

    - **A permanent left sidebar** (`src/components/shell/app-sidebar.tsx`)
      holds the workspace switcher and every destination. The top navigation
      bar is gone — `top-navigation.tsx` was deleted, and `NAV_ITEMS` moved to
      `src/components/shell/nav-items.ts`.
      *Deviates from FRONTEND_SPEC.md §10 and §11.*
    - **Columns are enclosed panels**, not open lanes with dividers. Each
      panel and its header pill are mixed from `--lane-accent` (set inline from
      `lane.color`) against `--lane-tint-panel` / `--lane-tint-header`. The
      `tk-lane-divider` utility still exists but nothing renders it.
      *Deviates from FRONTEND_SPEC.md §9 and §52.*
    - **The floating clusters became a toolbar** (`board-toolbar.tsx`), sitting
      under a slim breadcrumb bar. `FloatingViewControls` → `ViewSwitcher`
      (`view-switcher.tsx`), `FloatingZoomControls` → `ZoomControls`
      (`zoom-controls.tsx`); all four control groups lost their `SurfacePanel`
      chrome but **kept their accessible group names** — "Board view",
      "Board settings", "Zoom", "Canvas" — which is why most tests survived.
      *Deviates from FRONTEND_SPEC.md §43.*

    Scope the user set when choosing this: structure only. No issue keys, no
    assignees, no schema change. The layout is built from tokens, so it works
    in both modes.

11. **`Note.content` holds Tiptap JSON; `Note.excerpt` is its plain-text
    projection.** Both are written in the same patch by `setContent`, because
    they describe the same thing and a write that updates one is how they
    drift. `src/lib/tiptap/document.ts` owns the conversion both ways and
    imports nothing from `@tiptap/*` — the store, the sync engine and the
    server all read a note's text without loading an editor.

12. **Edit opens the full-screen editor.** It used to move focus to the card's
    title. The card body stays capped at `--note-content-max-height` so one
    long note cannot fill its lane; the full-screen editor is where a long
    note is actually read and written.

13. **Dark mode is a near-black, not a navy.** Hue 30 at 4–6% saturation —
    black with the same warm cast every other neutral carries, never reaching
    pure black. The strongest control in each mode is ink rather than an
    accent: near-black on light, near-white on dark, mirroring each other. The
    focus ring stays blue in both, because it has to read as a system
    affordance rather than brand colour.

15. **Tags are many per note; a category is one.** That is the whole
    distinction, and the UI states it: tags are checkboxes that leave the
    submenu open, a category is a radio group with "None" as a listed option.
    Filters combine **OR within a facet, AND across facets** — picking a
    second tag widens, picking a tag *and* a priority narrows. The opposite
    choice makes selecting a second tag almost always empty the board.

17. **Search runs in memory, on every keystroke.** §18's six surfaces —
    titles, note text, tags, categories, board names, workspace names — are all
    data the client already holds, so a round trip would make search slower
    without making it better. That is also what keeps it responsive: nothing to
    debounce, no loading state to flash, no stale result arriving three
    characters later. Note text is matched against `Note.excerpt`, so nothing
    walks a Tiptap document. Full-text search at the database belongs with the
    scale that needs it.

18. **Search ranks by *where* it matched, not how often.** Exact title, then
    prefix, then partial, then tag, then category, then body. Counting
    occurrences would rank a long note that mentions a word five times above
    the note actually called that word. A note is reported once, by its
    strongest match.

19. **Due dates are buckets, not a range picker.** Overdue, today, next 7 days,
    has a date, no date. The questions people ask a board are "what is late"
    and "what is today". "Today" deliberately includes overdue work — a today
    list that hides yesterday's missed task is a list that lets it be
    forgotten.

16. **The workspace vocabulary is a context, not props.** Its consumers are
    scattered and deep — the toolbar's Filter menu, the pickers inside every
    note menu, the badge on every card — and threading a tag list through the
    board, the lane and the card would be four layers of pass-through. The
    cost is that creating a tag re-renders every card; that happens while
    someone types a tag name, not while they drag.

14. **A cover is appearance; an attachment is a file the note has.** That is
    why a cover lives on `Note.appearance.coverUrl` and not in the attachments
    list — and why a note has exactly one, so uploading a second replaces the
    first (§16's "replace image"). `coverUrl` holds either an external
    `https://` URL or a `covers` object path; `resolveCoverSource` tells them
    apart and signs the latter.

---


## Gotchas worth not rediscovering

- **`src/types/database.ts` row shapes must be `type` aliases, never
  `interface`.** postgrest-js constrains rows to `Record<string, unknown>`; an
  interface has no implicit index signature, so the whole `Database` type
  silently fails to conform and **every query resolves to `never`**. Each table
  also needs `Relationships: []`, and empty groups need
  `{ [_ in never]: never }` rather than `Record<never, never>`.

- **Next 16 renamed `middleware` to `proxy`.** Session refresh lives in
  `src/proxy.ts`, even though IMPLEMENTATION_PLAN.md §11 calls it middleware.

- **Killing `next dev` can leave `.next/dev/types/*` truncated,** and `tsc`
  then reports a wall of syntax errors in files nobody wrote. `rm -rf .next/dev`
  and re-run. Nothing is wrong with the source.

- **Next 16 refuses a second `next dev` for the same directory.** It prints
  "Another next dev server is already running", names the PID, and exits — after
  having already said "Ready" on a different port, so a log tail that greps for
  "Ready" will think it started. Check whether `localhost:3000` already answers
  before starting one.

- **A signed Storage URL must never be stored.** It expires. `attachments.
  public_url` is null for every note bucket, and `Note.appearance.coverUrl`
  holds either an external `https://` URL or an object *path* — never a signed
  one. `resolveCoverSource` and `attachmentUrl` sign on demand.

- **`storagePath()` is the only place a storage path may be built.** Every
  policy in `0003` checks `(storage.foldername(name))[1] = auth.uid()`, so a
  path assembled anywhere else is rejected by the database. That is the right
  failure mode, but it only holds while that function is the single source.

- **Anything that stamps ids onto a new record needs the board context.**
  `addNote` reading `MOCK_BOARD_ID` from module scope is what broke signed-in
  saves for four milestones without a single test noticing — every test ran
  signed out, where the mock ids are correct. If you add another creator
  (duplicate-into-another-board, templates, import), take its ids from
  `useNoteStore.getState().boardContext`, not from the mock constants.

- **`npx shadcn init` is destructive.** It overwrote `src/lib/utils.ts`, added a
  competing light-mode palette, and injected a Google-hosted font. Already
  recovered: shadcn's semantic names are aliased onto Tackly tokens in
  `tokens.css`, and its `dark:` variant is rebound to the `data-theme`
  attribute. After `npx shadcn add <component>`, two manual fixups:
  repoint `import { cn } from "cn"` to `@/lib/utils`, and change a passed-through
  `checked` to `checked ?? false` for `exactOptionalPropertyTypes`.

- **Tests that render `AppShell` must import `render` from `@/test/render`,**
  not from `@testing-library/react` — the header's workspace switcher reads
  server state and needs a `QueryClientProvider`.

- `vitest.config.mts` sets `testTimeout: 20_000`. Driving the whole shell
  through `userEvent` in jsdom is slow enough that the 5s default produced
  flake that looked like product bugs.

- `vitest.setup.ts` resets every Zustand store and clears `localStorage` before
  each test. The stores are module singletons; without this a note added in one
  test survives into the next. Its `useNoteStore.reset(MOCK_NOTES)` also
  restores the default `boardContext`, because `reset` defaults it.

- Radix marks the rest of the page `aria-hidden` while a menu is open, so
  `getByRole` cannot see the card underneath. Close the menu before asserting.

- A store mutation made directly from a test is outside React's event loop and
  needs `act()` for the render to flush.

- ESLint enforces no `setState` in an effect body and no ref access during
  render. Both have already caught real bugs here; fix the cause rather than
  suppressing.

- **ProseMirror needs layout geometry jsdom has not got.** `vitest.setup.ts`
  stubs `Range.getClientRects`, `Range.getBoundingClientRect` and
  `document.elementFromPoint`. Without them, typing one character into a note
  throws inside `coordsAtPos`. The stubs return zeros, which is honest — jsdom
  does no layout — so the slash menu's *screen position* is the one thing its
  tests cannot check. **It was checked in a real browser this session and is
  correct** (see "Seen in a browser").

- **The rich editor is uncontrolled after mount.** Re-seeding Tiptap from a
  prop on every keystroke would reset the cursor, so `RichEditor` compares the
  incoming document against `editor.getJSON()` before writing. That is also why
  `NoteContent` memoizes `resolveDocument` — a fresh object each render would
  read as an external change and move the caret to the end as you type.

- **`Note.content` is `unknown` because it is `jsonb`.** Everything in
  `document.ts` narrows before use; `resolveDocument` falls back to the excerpt
  for any value that is not a document, so a corrupt or foreign row renders the
  user's text instead of taking the board down.

- **`vitest.setup.ts` resets the settings store too, via `SETTINGS_DEFAULTS`.**
  It did not until Milestone 11, and a board filter set in one test silently
  hid notes in the next — which showed up as an assertion on a note count that
  passed or failed by file order. Any new persisted preference belongs in that
  defaults object.

- **jsdom implements no layout and no scrolling.** `vitest.setup.ts` stubs
  `Range.getClientRects`, `Range.getBoundingClientRect`,
  `document.elementFromPoint` (all for ProseMirror) and
  `Element.prototype.scrollIntoView` (for the palette and slash menu). Any new
  keyboard list will need the last one.

- **Do not drive a Radix submenu through the whole `AppShell` in a test.**
  Opening one that way took ~9s, which passed alone and timed out under the
  full suite's parallelism. `userEvent.setup({ delay: null })` makes it fast
  but the submenu then never opens — Radix needs those event ticks. The fix is
  to render less: see `CardHarness` in `note-taxonomy.test.tsx`, which keeps
  the menu → picker → actions → store path and drops the rest of the shell.

- **Date tests must build local times, not UTC instants.** "Due today" means
  the user's local day, so `matchesDue` takes the boundary from the local
  clock. A test fixed to `18:00Z` passes in London and fails in Sydney —
  `new Date(2026, 5, 15, 18, 0, 0)` is the form to use.

- **The first card on screen is not `notes[0]`.** The board groups by column
  and sorts within one, so a test that needs a card's note should read
  `data-note-id` off the card rather than indexing the store.

- **The column tint needs `--lane-accent`, or every column renders the same.**
  `.tk-lane-panel` mixes against `var(--lane-accent, transparent)`; a column
  that fails to set it falls back silently to the plain surface rather than
  erroring. `app-shell.test.tsx` asserts the property is present per column.

- **`--header-height` is now 48px, not 74px.** It sizes the breadcrumb bar; the
  toolbar below it has its own `--toolbar-height` (52px). `tokens.test.ts`
  guards the *sum* against the header it replaced rather than either band alone.

- `selectOrderedLanes` returns `state.lanes` directly, because the store keeps
  them sorted. A selector that sorts a copy returns a new array on every call,
  and a Zustand selector without a stable reference makes `useSyncExternalStore`
  re-render forever.

- The row types in `database.ts` close with `}` rather than `};` — a leftover
  from converting interfaces to aliases. Valid TypeScript; only matters if you
  write a script that parses the file.

### Looking at the app when the session has no browser tool

No session so far has had one. Chrome is installed at
`C:\Program Files\Google\Chrome\Application\chrome.exe`, so:

```bash
cd <scratchpad> && npm init -y && npm install playwright-core
# then launch with { channel: "chrome" } — no browser download needed
```

Import supabase-js in such a script by absolute file URL
(`file:///E:/.../node_modules/@supabase/supabase-js/dist/index.mjs`); a bare
specifier does not resolve from outside the project.

Two traps: `waitUntil: "networkidle"` never settles on a route Next is
compiling for the first time (the HMR socket keeps it busy) — use
`domcontentloaded` plus `waitForSelector`. And the slash menu only opens on an
empty paragraph, so typing `/` into a card that already has body text does
nothing.

---

## Seen in a browser — the §3b sweep, now done

Everything below was checked against the running app this session. This closes
the "no one has looked at any of it" item.

- **Dark mode** is a warm near-black (`rgb(19 18 17)`), not navy, and reads
  correctly across sidebar, breadcrumb, toolbar and panels. Note *paper*
  colours are deliberately the same in both modes.
- **The slash menu positions correctly**, which jsdom could never test. At the
  right edge it stays inside the viewport; with a short viewport it flips above
  the caret (menu bottom 484px, caret top 489px). `clampToViewport` works.
- **No console errors or warnings** on load, and none during the signed-in
  create → edit → upload path after the fix.
- **Each column renders its own tint**, confirmed by computed style — the five
  panels differ in hue direction as intended.
- `.tk-prose` block styles, light and dark, look right on the paper colours.

Prior observations and their current status:

1. **Toolbar overflow fixed in Milestone 13.** The toolbar now wraps and uses
   a minimum height rather than forcing every control onto one clipped row.
   Browser visual verification of this change remains pending: the current
   automation inventory returned no browsers. Responsive grid geometry uses
   `min(100%, --grid-card-min-width)` so even one card fits a narrow surface.

2. **The column tint is very subtle in both modes** — the panels differ from
   each other by roughly 0.01 in oklab L and carry about as much chroma. It is
   legible in light, barely perceptible in dark. `--lane-tint-panel: 7%` is
   doing what it says; the question is whether 7% is the number you want.
   Raising it only for dark is a one-line override in `tokens.css`.

---

## Open questions / next steps

The new project has been initialized at the user's request. The earlier leave-paused decision applied to the old project only; it was not restored.

- Migrations 0001-0010 are installed, including explicit Data API privileges, collaboration, the daily diagnostic, and private OTP rate limits. Future migrations must not rerun the fresh-project bootstrap against an existing schema.
- The daily check runs on Node server startup and checks hourly for an unchecked Asia/Shanghai calendar day; database locking deduplicates replicas/restarts. It inserts then immediately deletes one diagnostic row in a transaction, retains only a last-success marker, and retries failures. It never creates user notes. Production builds do not run it.
- The server must stay running; browser-only activity, stopped/sleeping processes, and scale-to-zero/serverless timers are not durable schedulers. No guaranteed exemption from Supabase Free-plan pausing is claimed. Runtime uses the service-role key, not the seven-day Management token. Set `TACKLY_DAILY_HEALTH_CHECK=false` and restart to disable.
- New evidence captures 317 original source/document hashes. Source rollback is tested on a disposable copy; it does not remove the hosted schema. Diagnostic DB rollback is `supabase/rollback/0009_daily_health_check.sql`; stop the scheduler first. The existing 0007 rollback remains guarded against discarding memberships, invitations, Inbox state and authorship.
- The new database does not automatically contain accounts/notes from the old paused project. Sign up/sign in using accounts on the new project. No public application hosting/domain was deployed by this database rollout; invite links use the app's current origin.
- Preserve the distinct destination behavior and one shared note identity. Board/Grid/List + Filter/Display stay on Board; Canvas/Calendar/Timeline stay on the sidebar. No duplicate Kanban.
- Comments, mentions, assignments, workspace-wide invitations and CRDT text merging remain separate enhancements, not completed claims. Sharing covers the selected whole board and its Canvas.
- Prior regression evidence remains `../collaboration-evidence/VERIFICATION.txt` (837 tests/83 files). Current rollout test commands and results are in `../new-project-evidence/VERIFICATION.txt`; do not conflate old and new test runs.
- Prior 25-30 behavior/limits remain in `docs/RELEASE_25_30.md`: backups contain note records, not Storage binaries/version history; offline recovery preserves conflict copies; closed-page push/email delivery remains future work.

Existing history and lifecycle contracts remain in force: restore only title/content/excerpt/checklist while preserving scheduling/identity/appearance; save pending work before restore; 20 versions, 100 activities and 512 KiB snapshots; purge only confirmed trashed/unlocked timestamp-matching targets, preserve durable file-cleanup paths, and never resurrect purged records through autosave.
