# IMPLEMENTATION_PLAN.md

# Tackly Implementation Plan

> **Status:** Active development plan  
> **Project:** Tackly  
> **Primary product spec:** `PRODUCT_SPEC.md`  
> **Primary frontend spec:** `FRONTEND_SPEC.md`  
> **Agent workflow:** `AGENTS.md`  

---

# 1. PURPOSE

This file defines the exact order in which Tackly should be built.

It exists to prevent the coding agent from:

- Building too many unfinished systems at once
- Skipping foundational architecture
- Rewriting working features unnecessarily
- Mixing backend work into unfinished frontend work
- Building advanced features before the core workspace is stable
- Ignoring the approved design direction
- Creating inconsistent one-off implementations

The agent should follow this plan milestone by milestone.

Do not jump ahead unless the current milestone is complete or the user explicitly requests it.

---

# 2. REQUIRED REFERENCES

Before starting any milestone, the coding agent MUST review:

```text
PRODUCT_SPEC.md
FRONTEND_SPEC.md
AGENTS.md
```

---

# 3. APPROVED TECH STACK

Use:

```text
Next.js
React
TypeScript
Supabase
Tailwind CSS
shadcn/ui
Zustand
Tiptap
dnd-kit
TanStack Query
Motion
Zod
Lucide React
```

Do not replace these technologies without explicit approval.

---

# 4. DEVELOPMENT STRATEGY

The application should be built in four broad layers:

```text
1. Foundation
2. Visual/Product Shell
3. Core Interaction
4. Persistence and Advanced Features
```

The most important principle is:

> Build one stable vertical slice at a time.

Do not create placeholders for dozens of future systems if the current core flow is not yet working.

---

# 5. PROJECT ROOT EXPECTATION

The project root should contain:

```text
Website/
├── AGENTS.md
├── PRODUCT_SPEC.md
├── FRONTEND_SPEC.md
├── IMPLEMENTATION_PLAN.md
├── package.json
├── next.config.*
├── tsconfig.json
├── .env.local
├── public/
└── src/
```

The coding agent should not rename the specification files without approval.

---

# 6. MILESTONE 0 — PROJECT INITIALIZATION

## Goal

Create the base Next.js application with the agreed stack and a clean development foundation.

## Required Tasks

Initialize:

- Next.js
- React
- TypeScript
- App Router
- `src/` directory
- Tailwind CSS
- ESLint

Install and configure:

- Supabase client
- shadcn/ui
- Zustand
- Tiptap
- dnd-kit
- TanStack Query
- Motion
- Zod
- Lucide React

## Recommended Packages

Typical package set:

```text
@supabase/supabase-js
@supabase/ssr
zustand
@tanstack/react-query
@tiptap/react
@tiptap/starter-kit
@tiptap/extension-task-list
@tiptap/extension-task-item
@tiptap/extension-link
@tiptap/extension-image
@dnd-kit/core
@dnd-kit/sortable
@dnd-kit/utilities
motion
zod
lucide-react
```

Add additional Tiptap extensions only when actually needed.

## Create Initial Directories

```text
src/
├── app/
├── components/
├── config/
├── hooks/
├── lib/
├── stores/
├── styles/
├── types/
└── features/
```

## Create Initial Shared Files

```text
src/styles/tokens.css
src/config/themes.ts
src/config/note-styles.ts
src/lib/utils.ts
src/lib/query-client.ts
```

## Do Not Build Yet

Do not build:

- Supabase database schema
- Authentication
- Rich editor
- Infinite canvas
- Kanban
- Calendar
- Collaboration

## Milestone 0 Definition of Done

- App runs locally
- TypeScript works
- Tailwind works
- shadcn/ui works
- No obvious console errors
- Core dependencies installed
- Project structure created
- Specs remain in project root

---

# 7. MILESTONE 1 — DESIGN SYSTEM

## Goal

Create centralized tokens for solid surfaces, paper notes, borders, small shadows, spacing, status colors, and restrained tactile controls. Build reusable SurfacePanel, ClayButton, IconButton, SurfaceCard, SectionHeader, TagPill, and PriorityBadge primitives. Keep the customizable background in its own layer; only that layer may be blurred. Focus, hover, pressed, disabled, and selected states must remain visible. Do not add real persistence, authentication, or the final editor yet.

## Milestone 1 Definition of Done

- Tokens centralized
- Solid controls and paper notes reusable
- Background layer works
- Focus states visible
- No normal UI backdrop blur

---

# 8. MILESTONE 2 — STATIC APPLICATION SHELL

## Goal

Build the full-width Tackly Board composition using mock content and no backend.

## Build

- Solid dark top navigation with Tackly, Board, Calendar, Timeline, Notes, Analytics, search, theme, notifications, and profile.
- Transparent main Board with open To Do, In Progress, Review, Done, and Ideas lanes, separated only by thin vertical lines.
- Large paper/notepad cards with readable mock content; no enclosing lane panels, permanent sidebar, or right design rail.
- Solid floating Board view and zoom controls.
- Add Note immediately inserts an Untitled blank editable demo card, without a setup chooser. This local-only interaction does not constitute Milestone 3 persistence or full CRUD.
- Horizontal scrolling when five practical note widths do not fit.

## Milestone 2 Definition of Done

- Header and open Board respond at desktop and smaller viewports
- Background remains visible, with blur only on its own layer
- Paper cards and thin dividers carry the composition
- Add Note creates a blank local demo card in one action
- Typecheck, lint, build, and viewport inspection pass
- No backend dependency required

---

# 9. MILESTONE 3 — BASIC NOTE SYSTEM

## Goal

Turn static notes into interactive client-side notes.

## Build

Note actions:

- Add a blank note in one action, then edit manually
- Edit
- Delete
- Duplicate
- Complete
- Pin
- Lock
- Change color
- Change style
- Change priority

Use client-side state first.

## Create Components

Recommended:

```text
NoteCard
NoteHeader
NoteBody
NoteFooter
NoteMenu
NoteColorPicker
NoteStylePicker
NotePriorityPicker
```

## Create Zustand State

Suggested:

```text
useNoteStore
useSelectionStore
```

## Temporary Persistence

Use:

- In-memory state
- Optionally localStorage for prototype continuity

Do not connect Supabase yet.

## Milestone 3 Definition of Done

- User can create note
- User can edit note
- User can delete note
- User can duplicate note
- User can complete note
- User can pin note
- User can lock note
- Note color changes work
- Note style changes work
- UI feels immediate

---

# 10. MILESTONE 4 — CANVAS MODE CORE

## Goal

Build the signature Tackly experience.

## Required Features

- Free positioning
- Drag
- Pan
- Zoom
- Resize
- Selection
- Multi-select
- Selection rectangle
- Z-index
- Bring forward
- Send backward
- Snap-to-grid
- Grid visibility
- Lock
- Pin
- Fit content

## State

Create:

```text
useCanvasStore
useSelectionStore
```

Suggested canvas state:

```ts
type CanvasViewport = {
  x: number;
  y: number;
  zoom: number;
};
```

Each note should maintain:

```ts
type NoteTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
};
```

## Performance Rule

During drag:

```text
pointerdown
→ local movement
→ requestAnimationFrame transform
→ pointerup
→ commit final note transform
```

Never perform server writes per mousemove.

## Do Not Build Yet

- Supabase persistence
- Realtime collaboration
- Complex version history

## Milestone 4 Definition of Done

- Drag feels smooth
- Zoom feels smooth
- Pan works
- Notes can resize
- Selection works
- Multi-select works
- Grid snap works
- Lock prevents movement
- Z-index controls work
- Canvas remains performant with many mock notes

---

# 11. MILESTONE 5 — SUPABASE FOUNDATION

## Goal

Introduce real backend persistence after the frontend interaction model is stable.

## Configure

Create:

```text
.env.local
```

Expected variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use server-side secrets only where appropriate.

## Create Supabase Helpers

Recommended:

```text
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/middleware.ts
```

## Database Tables

Start with:

```text
profiles
workspaces
boards
notes
categories
tags
note_tags
```

Do not create every future table immediately unless needed.

## Required Security

Enable:

- Row Level Security
- User ownership policies

Do not rely on frontend filtering.

## Milestone 5 Definition of Done

- Supabase client configured
- Database connection works
- Initial schema exists
- RLS enabled
- Basic user-scoped data can be queried safely

---

# 12. MILESTONE 6 — AUTHENTICATION

## Goal

Add real user accounts and user-scoped application data.

## Build

- Sign up
- Sign in
- Sign out
- Protected app routes
- Session restore
- Profile record
- Auth-aware navigation

## Pages

Recommended:

```text
/login
/register
```

Optional later:

```text
/forgot-password
/reset-password
```

## Milestone 6 Definition of Done

- User can register
- User can log in
- User can log out
- Protected workspace requires authentication
- Profile is associated with Supabase user
- User cannot read another user's private data

---

# 13. MILESTONE 7 — REAL WORKSPACES AND BOARDS

## Goal

Replace mock workspace/board data with real Supabase-backed data.

## Build

Workspace:

- Create
- Rename
- Archive
- Delete later
- Select active workspace

Board:

- Create
- Rename
- Archive
- Duplicate later
- Select active board
- Store layout mode

## Use

- TanStack Query for fetching
- Mutations for create/update
- Optimistic updates where safe
- Zustand for current selection/UI state

## Milestone 7 Definition of Done

- Workspaces persist
- Boards persist
- Sidebar reflects real data
- Active board state works
- Refresh preserves data
- User sees only their own workspaces/boards

---

# 14. MILESTONE 8 — REAL NOTE PERSISTENCE

## Goal

Persist note data to Supabase.

## Replace

```text
Mock note state
```

with:

```text
TanStack Query
+
Supabase
+
Zustand interaction state
```

## Persist

- Title
- Content placeholder
- Position
- Size
- Rotation
- Z-index
- Color
- Style
- Complete
- Pin
- Lock
- Priority
- Due date later

## Autosave

Use debounced updates.

Do not save every keystroke immediately.

## Optimistic UX

Actions should feel instant.

Server synchronization happens after local UI response.

## Milestone 8 Definition of Done

- Notes persist after refresh
- Drag position persists
- Size persists
- Color/style persists
- Complete state persists
- Delete/archive works
- No high-frequency write spam

---

# 15. MILESTONE 9 — RICH NOTE EDITOR

## Goal

Replace basic note text editing with Tiptap.

## Build

Supported blocks:

- Paragraph
- Heading
- Bullet list
- Numbered list
- Checklist
- Quote
- Divider
- Link
- Image
- Code
- Table
- File block
- Video/embed

## Slash Menu

Typing:

```text
/
```

should open block commands.

## Storage Format

Prefer Tiptap JSON in a `jsonb` field.

## Rich Editor Views

Support:

- Compact card editing
- Full-screen focus mode
- Read-only rendering

## Milestone 9 Definition of Done

- Tiptap integrated
- Rich content persists
- Slash menu works
- Checklist works
- Links work
- Images can render
- Full-screen editor works
- Existing notes migrate safely

---

# 16. MILESTONE 10 — FILE AND MEDIA UPLOADS

## Goal

Support images, files, and media attachments.

## Supabase Storage Buckets

Recommended:

```text
avatars
note-images
note-videos
attachments
backgrounds
covers
```

## Build

- Upload UI
- Progress
- Error state
- File metadata
- Remove attachment
- Replace image
- Preview
- Size validation
- Type validation

## Security

Storage paths should be user-scoped.

## Milestone 10 Definition of Done

- Image upload works
- File upload works
- File metadata stored
- Unauthorized users cannot access private files
- Errors are handled gracefully

---

# 17. MILESTONE 11 — CATEGORIES, TAGS, PRIORITY

## Goal

Build organization features.

## Build

Categories:

- Create
- Rename
- Color
- Icon
- Assign to note

Tags:

- Create
- Assign multiple
- Remove
- Filter

Priority:

- None
- Low
- Medium
- High
- Urgent

## Milestone 11 Definition of Done

- Categories persist
- Tags persist
- Notes can have multiple tags
- Filtering works
- Priority works
- UI matches frontend spec

---

# 18. MILESTONE 12 — SEARCH, FILTER, SORT

## Goal

Make large workspaces manageable.

## Search

Search:

- Titles
- Note text
- Tags
- Categories
- Board names
- Workspace names

## Filters

Support:

- Category
- Tag
- Priority
- Complete/incomplete
- Due date
- Note type

## Sort

Support:

- Custom
- Created
- Updated
- Due
- Priority
- Alphabetical

## Milestone 12 Definition of Done

- Search works
- Filters combine correctly
- Sort works
- Search UI integrates with command palette
- Search remains responsive

---

# 19. MILESTONE 13 — GRID VIEW

## Goal

Add alternate layout without duplicating note data.

## Build

Responsive grid.

Display:

- Title
- Cover
- Tags
- Count
- Date
- Status

## Rule

Grid is only another representation of the same note records.

## Milestone 13 Definition of Done

- Grid renders existing notes
- Grid does not duplicate data
- Grid responsive
- Note interactions still work

---

# 20. MILESTONE 14 — LIST VIEW

## Goal

Add a dense information-oriented view.

## Build

Rows with:

- Icon
- Title
- Preview
- Tags
- Date
- Priority
- Status
- Menu

## Milestone 14 Definition of Done

- List renders real notes
- Sort/filter works
- Editing/opening works
- Responsive handling exists

---

# 21. MILESTONE 15 — KANBAN VIEW

> Superseded by the user: the separate Kanban view was removed because Board already provides column-based workflow. Do not recreate the duplicate view.

## Goal

Add project workflow organization.

## Default Columns

- To Do
- In Progress
- Review
- Done

## Build

Use dnd-kit.

Allow:

- Drag card between columns
- Add column later
- Rename column later

## Data Model

Do not duplicate notes.

Store status/column relationship.

## Milestone 15 Definition of Done

- Kanban renders real notes
- Drag between columns works
- State persists
- No duplicate note creation
- Smooth interaction

---

# 22. MILESTONE 16 — CALENDAR VIEW

## Goal

Display dated notes/tasks.

## Build

Views:

- Month first
- Week later
- Day later
- Year later

Display tasks with:

- Title
- Category color
- Priority

## Milestone 16 Definition of Done

- Due-dated notes appear
- Month view works
- Open note from calendar works
- Same underlying note data used

---

# 23. MILESTONE 17 — TIMELINE VIEW

## Goal

Add long-term project visualization.

## Build

- Start date
- Due date
- Horizontal timeline
- Week/month/quarter
- Task bars

## Milestone 17 Definition of Done

- Tasks appear on timeline
- Date ranges render correctly
- Scroll works
- Existing note records reused

---

# 24. MILESTONE 18 — ADVANCED NOTE APPEARANCE

## Goal

Expand post-creation customization of the same flexible notepad. Users first create a blank note, then may change paper color, texture, size, cover, pin, lock, and other properties without changing the underlying content or choosing a creation mode.

## Milestone 18 Definition of Done

- Appearance controls apply to existing notes
- Content remains intact across appearance changes
- Creation remains one-action and blank

---

# 25. MILESTONE 19 — THEME AND BACKGROUND CUSTOMIZATION

## Goal

Finish the personalization experience.

## Background

Support:

- Upload
- Built-in images
- Gradient
- Solid
- Pattern
- Video later

## Effects

- Blur
- Brightness
- Saturation
- Contrast
- Opacity
- Vignette
- Grain
- Tint

## Themes

- Cozy Dark
- Minimal
- Dark
- Anime
- Nature
- Pastel
- Retro
- Cyber
- Custom

## Requirement

All changes preview live.

## Milestone 19 Definition of Done

- Background customization persists
- Theme persists
- Visual preview is live
- Clean/paper/tactile balance remains consistent

---

# 26. MILESTONE 20 — FOCUS MODE

## Goal

Create distraction-free editing.

## Build

- Full-screen note
- Dim/blur background
- Close
- Undo
- Redo
- Share placeholder if needed
- More menu

## Milestone 20 Definition of Done

- Double-click/open focus works
- Rich editor works full-screen
- Escape closes
- State remains synced

---

# 27. MILESTONE 21 — DASHBOARD

## Goal

Add a useful home summary.

## Sections

- Today
- Overdue
- Upcoming
- High Priority
- Recently Edited
- Completed Today
- Pinned Notes
- Recent Boards

## Milestone 21 Definition of Done

- Dashboard uses real data
- Sections are query-driven
- Empty states exist
- Dashboard remains lightweight

---

# 28. MILESTONE 22 — REMINDERS AND RECURRING TASKS

## Goal

Introduce time-based productivity.

## Build

- Reminder time
- Repeat rule
- Daily
- Weekly
- Monthly
- Yearly
- Custom later

## Notifications

Start with:

- In-app
- Browser notification

Email later if needed.

## Milestone 22 Definition of Done

- Reminder can be set
- Reminder persists
- User receives in-app/browser notification
- Repeating tasks generate expected next occurrence

---

# 29. MILESTONE 23 — ACTIVITY HISTORY AND VERSION HISTORY

## Goal

Protect user work and improve recoverability.

## Activity

Track:

- Created
- Edited
- Moved
- Completed
- Archived
- Restored

## Version History

Save meaningful versions.

Do not save a full version per keystroke.

## Milestone 23 Definition of Done

- Activity history readable
- Note versions readable
- Previous version can be restored
- Storage growth is controlled

---

# 30. MILESTONE 24 — TRASH AND ARCHIVE

## Goal

Complete safe deletion lifecycle.

## Trash

- Restore
- Permanently delete
- Empty trash

## Archive

- Archive
- Restore
- Search archived notes

## Milestone 24 Definition of Done

- Normal delete moves to Trash
- Restore works
- Archive works
- Permanent deletion requires confirmation

---

# 31. MILESTONE 25 — IMPORT / EXPORT

> Status: implemented and verified in the approved 25–30 release. See `docs/RELEASE_25_30.md` and `docs/HANDOFF.md` for exact behavior and evidence.

## Goal

Allow users to move data in and out.

## Import

Support:

- JSON
- Markdown
- TXT
- CSV
- Images

## Export

Support:

- Note
- Board
- Workspace

Formats:

- JSON
- Markdown
- TXT
- PDF
- PNG board image
- Backup format

## Milestone 25 Definition of Done

- Import validates data
- Invalid imports do not corrupt workspace
- Export works for supported formats
- Backup can be restored later

---

# 32. MILESTONE 26 — OFFLINE MODE

> Status: implemented and verified in the approved 25–30 release. See `docs/RELEASE_25_30.md` and `docs/HANDOFF.md` for exact behavior and evidence.

## Goal

Allow note work without active internet.

## Recommended

Use:

- IndexedDB
- Local mutation queue
- Optimistic state
- Background sync

## Status

Show:

```text
Saved
Saving...
Syncing...
Offline
Sync Error
```

## Milestone 26 Definition of Done

- Existing notes remain accessible offline
- User can edit offline
- Mutations queue
- Reconnect sync works
- Conflicts are handled safely

---

# 33. MILESTONE 27 — ANALYTICS

> Status: implemented and verified in the approved 25–30 release. See `docs/RELEASE_25_30.md` and `docs/HANDOFF.md` for exact behavior and evidence.

## Goal

Add lightweight productivity insights.

## Metrics

- Completed today
- Completed week
- Completed month
- Current streak
- Active boards
- Most active category

## Milestone 27 Definition of Done

- Metrics use real data
- Charts are lightweight
- Analytics does not slow app
- No enterprise-style overcomplication

---

# 34. MILESTONE 28 — MOBILE AND TABLET POLISH

> Status: implemented and verified in the approved 25–30 release. See `docs/RELEASE_25_30.md` and `docs/HANDOFF.md` for exact behavior and evidence.

## Goal

Make the application feel intentionally designed on touch devices.

## Mobile

- Compact header
- Bottom navigation
- Floating add
- Full-screen editor
- Long-press menus
- Pinch zoom
- Two-finger pan

## Tablet

- Collapsible sidebar
- Full board
- Touch canvas
- Larger touch controls

## Milestone 28 Definition of Done

- Mobile navigation works
- Core note editing works
- Canvas touch works
- Tablet layout is comfortable
- No desktop-only interactions block usage

---

# 35. MILESTONE 29 — ACCESSIBILITY PASS

> Status: implemented and verified in the approved 25–30 release. See `docs/RELEASE_25_30.md` and `docs/HANDOFF.md` for exact behavior and evidence.

## Goal

Ensure the application is usable beyond mouse-only interaction.

## Check

- Keyboard navigation
- Focus states
- ARIA
- Semantic HTML
- Contrast
- Reduced motion
- 44px touch targets
- Screen reader compatibility for forms and menus

## Milestone 29 Definition of Done

- Core workflows keyboard-accessible
- Visible focus
- Dialogs accessible
- Menus accessible
- Important status is not color-only

---

# 36. MILESTONE 30 — PERFORMANCE PASS

> Status: implemented and verified in the approved 25–30 release. See `docs/RELEASE_25_30.md` and `docs/HANDOFF.md` for exact behavior and evidence.

## Goal

Optimize real-world large-board usage.

## Profile

- Canvas
- Board switching
- Search
- Editor
- Grid
- Kanban
- Images

## Optimize

- Memoization
- Selective store subscriptions
- Virtualization
- Lazy rendering
- Debounced persistence
- Image optimization
- Query caching
- Reduced unnecessary effects

## Target

The app should remain usable with hundreds of notes and should be designed toward handling thousands.

## Milestone 30 Definition of Done

- Drag remains smooth on large boards
- Board loading acceptable
- Large lists virtualized where necessary
- No excessive Supabase calls
- No major memory leak

---

# 37. MILESTONE 31 — COLLABORATION

**Active requested slice (2026-10-31):** Distinct note destinations and board-scoped sharing with viewer/editor invitation links, membership management, presence/cursors, realtime note updates and atomic conflict preservation are implemented. The user's new active Supabase project now has migrations 0001-0009 installed, with hosted SQL permission/invitation tests passing. See `docs/COLLABORATION.md` and current `../new-project-evidence/VERIFICATION.txt` for browser proof and exact results. A server-running daily insert/delete diagnostic is documented in `docs/DAILY_HEALTH_CHECK.md`; it is not a guarantee against provider pausing. Comments, mentions, assignments and workspace-wide sharing below remain future enhancements, not completed claims.


## Goal

Only after the single-user experience is stable, introduce sharing and realtime collaboration.

## Future Features

- Shared workspaces
- Shared boards
- Invitations
- Presence
- Comments
- Mentions
- Assignments
- Realtime note updates

## Important

Do NOT build collaboration early.

It increases complexity across:

- Security
- Ownership
- Realtime
- Conflicts
- Presence
- Permissions

## Milestone 31 Definition of Done

Define later once collaboration becomes active scope.

---

# 38. MVP SCOPE

The MVP should stop after these capabilities are stable:

```text
Authentication
Workspaces
Boards
Canvas Mode
Sticky notes
Note CRUD
Drag/resize
Basic rich text
Checklists
Tags/categories
Search
Supabase persistence
Basic background/theme settings
Responsive app shell
```

Do not wait for every advanced milestone before considering the app usable.

---

# 39. FIRST DEVELOPMENT SPRINT

The very first sprint should include only:

```text
Milestone 0
Milestone 1
Milestone 2
```

That means:

- Project initialization
- Design system
- Static app shell

The result should be:

> A real working Next.js website that visually matches the approved Tackly prototype, using mock content.

This is the correct place to start.

---

# 40. SECOND DEVELOPMENT SPRINT

Build:

```text
Milestone 3
Milestone 4
```

Result:

> Fully interactive local sticky-note canvas without backend complexity.

---

# 41. THIRD DEVELOPMENT SPRINT

Build:

```text
Milestone 5
Milestone 6
Milestone 7
Milestone 8
```

Result:

> Real authentication, workspaces, boards, and persistent notes.

---

# 42. FOURTH DEVELOPMENT SPRINT

Build:

```text
Milestone 9
Milestone 10
Milestone 11
Milestone 12
```

Result:

> Rich note editing, uploads, organization, search, filters, and sorting.

---

# 43. FIFTH DEVELOPMENT SPRINT

Build:

```text
Milestone 13
Milestone 14
Milestone 15
Milestone 16
Milestone 17
```

Result:

> Multiple productivity views using the same underlying data.

---

# 44. SIXTH DEVELOPMENT SPRINT

Build:

```text
Milestone 18
Milestone 19
Milestone 20
Milestone 21
```

Result:

> Advanced note appearance, customization, focus mode, and dashboard.

---

# 45. SEVENTH DEVELOPMENT SPRINT

Build:

```text
Milestone 22
Milestone 23
Milestone 24
Milestone 25
```

Result:

> Reminders, history, trash/archive, import/export.

---

# 46. EIGHTH DEVELOPMENT SPRINT

Build:

```text
Milestone 26
Milestone 27
Milestone 28
Milestone 29
Milestone 30
```

Result:

> Offline mode, analytics, mobile polish, accessibility, performance.

---

# 47. DO NOT BUILD EARLY

Avoid prematurely building:

- Collaboration
- Complex realtime sync
- Public sharing
- Enterprise permissions
- AI features
- Advanced billing
- Plugin marketplace
- Deep analytics
- Email notification system
- Mobile native app

These are future considerations.

---

# 48. DATABASE CREATION ORDER

Create tables only when needed.

Recommended order:

```text
1. profiles
2. workspaces
3. boards
4. notes
5. categories
6. tags
7. note_tags
8. attachments
9. reminders
10. activity_logs
11. note_versions
12. groups
13. stacks
```

Avoid creating a huge unused schema in the first migration.

---

# 49. QUERY STRATEGY

Use TanStack Query for:

- Workspaces
- Boards
- Notes
- Categories
- Tags
- Search
- Dashboard
- History

Use Zustand for:

- Current board
- Canvas viewport
- Selection
- Drag state
- Temporary transforms
- Filters
- Sort
- Open panels

Do not use Zustand as the permanent source of truth for cloud data.

---

# 50. AUTOSAVE STRATEGY

Use:

```text
Immediate local update
→ debounce
→ persist
→ show sync status
```

Recommended starting debounce:

```text
400–800ms
```

Tune based on actual behavior.

---

# 51. ERROR HANDLING

Every async feature should consider:

- Loading
- Success
- Empty
- Error
- Retry

Never silently fail.

User edits must not disappear due to temporary network errors.

---

# 52. MIGRATION RULE

Database changes require migrations.

Do not manually alter production assumptions without a migration path.

Avoid destructive migrations unless explicitly approved.

---

# 53. TESTING STRATEGY

At minimum, test:

## Critical User Flows

- Sign in
- Create workspace
- Create board
- Create note
- Edit note
- Drag note
- Refresh and verify persistence
- Mark complete
- Search
- Switch layout

## Component Interaction

Test:

- Menus
- Dialogs
- Note controls
- Tiptap
- Kanban drag
- Filters
- Settings

## Later

Add integration/e2e coverage for critical workflows.

---

# 54. GIT / CHANGE DISCIPLINE

Keep commits/milestones logically scoped.

Good examples:

```text
feat: add base app shell
feat: add canvas drag and zoom
feat: add Supabase authentication
feat: persist notes to Supabase
```

Avoid giant mixed changes that include unrelated redesigns.

---

# 55. AGENT TASK FORMAT

When instructing the coding agent, tasks should be specific.

Good:

```text
Implement Milestone 1 from IMPLEMENTATION_PLAN.md.
Read AGENTS.md, PRODUCT_SPEC.md, and FRONTEND_SPEC.md first.
Do not start Milestone 2.
```

Bad:

```text
Build the whole Tackly app.
```

---

# 56. CURRENT NEXT ACTION

The immediate next development task is:

```text
Implement Milestone 0 — Project Initialization
```

Then:

```text
Implement Milestone 1 — Design System
```

Then:

```text
Implement Milestone 2 — Static Application Shell
```

Do not begin Supabase/auth/database work until the visual shell and design system are in a good state unless explicitly requested.

---

# 57. FINAL IMPLEMENTATION PRINCIPLE

Build Tackly in this order:

```text
Make it structurally sound
→
Make it visually correct
→
Make it interactive
→
Make it persistent
→
Make it powerful
→
Make it collaborative
```

The coding agent should always prefer:

```text
Stable finished feature
```

over:

```text
Many half-built features
```

When uncertain, check:

```text
PRODUCT_SPEC.md
FRONTEND_SPEC.md
AGENTS.md
IMPLEMENTATION_PLAN.md
```

before proceeding.
