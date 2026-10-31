# Tackly — architecture and component reference

This document covers what exists today (Milestones 0–8: foundation, design
system, application shell, the interactive note system, Canvas Mode, the
Supabase foundation, authentication, cloud-backed workspaces and boards, and
note persistence) and the seams that later milestones plug into. It is written
for engineers working in this repository.

For *what* to build and *in what order*, read `PRODUCT_SPEC.md`,
`FRONTEND_SPEC.md` and `IMPLEMENTATION_PLAN.md`. This file explains *how the
code is arranged*.

---

## 1. Where things live

```text
src/
├── app/                  Next.js App Router — routes, root layout, providers
├── components/
│   ├── board/            The Board surface: lanes, dividers, floating controls
│   ├── notes/            The paper note card and its sections
│   ├── shell/            App shell: background, header, composition root
│   └── ui/               Design-system primitives (no domain knowledge)
├── config/               Design + domain catalogues (tokens' TypeScript side)
│   └── …                 note-styles, statuses, layouts, themes
├── features/             Domain logic grouped by feature
├── hooks/                Cross-feature React hooks
├── lib/                  Framework-agnostic helpers
├── stores/               Zustand stores (UI/interaction state)
├── styles/               tokens.css — the single source of visual truth
└── types/                Domain types
```

The rule that keeps this from collapsing: **`components/ui` knows nothing about
notes, boards or workspaces.** It takes colors, labels and callbacks. Domain
components in `board/`, `notes/` and `shell/` compose those primitives.

---

## 2. The token system

`src/styles/tokens.css` holds every recurring visual value: surfaces, borders,
paper colors, claymorphism shadows, status and priority accents, lane
dimensions, motion timings, z-index layers.

`src/app/globals.css` bridges those tokens into Tailwind through
`@theme inline`, which emits `var(--token)` rather than a copied value. That is
what lets a theme change re-skin the application at runtime with no rebuild and
no component re-render.

```css
/* tokens.css */
--surface: hsl(222 27% 13%);

/* globals.css */
@theme inline { --color-surface: var(--surface); }
```

```tsx
<div className="bg-surface" />   // resolves to var(--surface)
```

### Three rules the tests enforce

| Rule | Spec | Guarded by |
| --- | --- | --- |
| Only `.tk-background-layer` uses a CSS `filter`; no `backdrop-filter` anywhere | FRONTEND_SPEC §53 | `src/styles/tokens.test.ts` |
| Note radius stays in 12–18px; completed opacity in 78–90% | §14, §19 | `src/styles/tokens.test.ts` |
| Every color referenced by a config module is declared in `tokens.css` | §6 | `src/styles/tokens.test.ts` |

### shadcn/ui

`shadcn init` ships its own `:root` palette. Letting it stand would have given
the app two competing colour systems, with shadcn's light-mode neutrals winning
by source order. Instead, the shadcn semantic names (`--popover`, `--accent`,
`--destructive`, `--input`, `--card`, `--radius`) are declared in `tokens.css`
as **aliases of the Tackly tokens**, and its `dark:` variant is rebound to the
`data-theme` attribute in `globals.css`.

The practical upshot: `npx shadcn add <component>` works and the component
inherits this theme with no edits. Two things to fix by hand afterwards —
the generator writes `import { cn } from "cn"` (repoint it to `@/lib/utils`),
and a `checked` prop passed straight through trips
`exactOptionalPropertyTypes`.

`ClayButton` is the project's button, not shadcn's — FRONTEND_SPEC §44–§45
specifies a clay depth system that shadcn's button does not implement.

### Neutrals

Pure black and pure white are not used anywhere. Every neutral — surfaces,
ink, shadows, and the specular highlights on clay controls — carries a slight
warm cast, so a surface reads as material rather than as a void. Shadows are
`rgb(10 8 4 / …)` and highlights `rgb(255 252 244 / …)` rather than `0 0 0`
and `255 255 255`. `src/styles/tokens.test.ts` and
`src/components/shell/theme-toggle.test.tsx` fail the build if a pure value
reappears in the tokens or in a mode's background.

### Light and dark

There are two colour modes and no theme picker — the ten presets, including
three duo-tone palettes, were removed at the user's request (see "Decisions
made" in `docs/HANDOFF.md`).

The whole mechanism is one attribute. `tokens.css` defines dark under `:root`
and light under `:root[data-theme="light"]`; `applyTheme()` sets `data-theme`
and nothing else. No component branches on the mode — they read tokens.

`useThemeSync()` restores the saved choice in an effect — not during render,
since the server has no `localStorage` — applies it to `<html>`, and hands the
shell that mode's background. `ThemeToggle` in the breadcrumb bar flips it.

`src/config/themes.ts` is consequently almost empty: two backgrounds, the
toggle helper, and the background → CSS variable mapping. A colour that belongs
in a mode belongs in `tokens.css`, because an inline override written by
`applyTheme` would be one no stylesheet could beat.

Paper colours are deliberately *not* moded: a note's colour is the user's
choice, and each paper family carries its own ink.

---

## 2a. The Board and the Canvas are different surfaces

They are **not** two renderings of the same list. Every note belongs to a
column and appears on the Board; only notes the user deliberately places appear
on the Canvas, controlled by `Note.onCanvas`.

This departs from IMPLEMENTATION_PLAN.md §19, which frames alternate views as
representations of the same records. It does **not** duplicate anything: one
note record, a flag deciding which surfaces show it. A note edited on the
Canvas is the same note the Board shows. The reason is product, not technical —
an infinite desk covered with every note you have ever written is not a desk.

Routes in:

| Action | Where |
| --- | --- |
| Add to Canvas / Remove from Canvas | The note's menu |
| Send to Canvas | A column's menu — places the whole column |
| Add note to canvas | The canvas controls — creates one at the centre of the view |

Removing a note from the Canvas never deletes it; it stays on its column.

A note arriving from the Board has no position (it sits at the origin), so
`placeOnCanvas` deals it into a grid — otherwise a whole column would land in a
single stack. A note that already carries a position keeps it, because the user
put it there.

## 2b. Columns are user data

The Board's columns are **records, not a status enum**. People name their own
("Today", "Waiting on Sam", "Someday"), recolour them, reorder them and delete
them. The five the app ships with — To Do, In Progress, Review, Done, Ideas —
are seed values in `src/config/lanes.ts` and carry no special status once
created.

This is why a note stores `laneId` rather than `status`: a status enum would
make "rename this column" a schema migration.

Consequences worth knowing:

- **Deleting a column rehomes its notes** into the first remaining column; it
  never deletes them. Losing a column's work to a menu click is not a
  recoverable mistake. `useLaneActions` owns that decision, because it is the
  one place that knows about both stores.
- **The last column cannot be deleted.** A board with no columns has nowhere to
  put a note.
- **`notes.lane_id` is `on delete set null`**, and `noteFromRow` takes a
  `fallbackLaneId` for the window where a note has no column.
- **`state.lanes` is kept sorted by position**, so `selectOrderedLanes` is a
  plain read. A selector that sorts a copy returns a new array every call, and
  a Zustand selector without a stable reference makes `useSyncExternalStore`
  re-render forever.

## 3. Config catalogues

TypeScript modules in `src/config/` pair each design token with its metadata
(label, accessible description, sort rank). Every lookup helper **falls back to
a default rather than throwing**, because an unrecognised value persisted by a
newer client must degrade to a plain note, never blank the board.

| Module | Exports |
| --- | --- |
| `note-styles.ts` | `NOTE_COLOR_DEFINITIONS`, `NOTE_STYLE_DEFINITIONS`, `NOTE_SIZE_PRESETS`, `getNoteColor`, `getNoteStyle` |
| `lanes.ts` | `DEFAULT_LANE_SEEDS`, `LANE_COLOR_OPTIONS`, `MAX_LANES` |
| `priorities.ts` | `PRIORITY_DEFINITIONS`, `getPriority` |
| `layouts.ts` | `LAYOUT_DEFINITIONS`, `VIEW_SWITCHER_LAYOUTS`, `ZOOM_STOPS`, zoom bounds |
| `themes.ts` | `THEMES` (light, dark), `DEFAULT_THEME_MODE`, `applyTheme`, `oppositeMode`, `backgroundToCssVariables` |

`layouts.ts` marks unshipped layouts `available: false`; the view switcher
renders them disabled with the milestone in the tooltip, so the control's shape
does not shift as milestones land.

---

## 4. Component reference

### `components/ui` — primitives

#### `SurfacePanel`

A solid application surface: header, menus, dialogs, floating clusters.

```tsx
<SurfacePanel as="header" tone="base" border="soft" radius="none" />
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `as` | `ElementType` | `"div"` | Render a semantic element |
| `tone` | `base \| soft \| raised \| sunken` | `base` | |
| `border` | `none \| soft \| strong` | `soft` | |
| `radius` | `none \| sm \| md \| lg \| xl` | `lg` | |
| `elevation` | `none \| sm \| md \| clay` | `none` | `clay` only for compact floating clusters |

#### `ClayButton`

The button system. `primary` and `secondary` are raised; `ghost` is flat;
`danger` is for destructive confirmation. All variants press in on `:active`.

| Prop | Type | Default |
| --- | --- | --- |
| `variant` | `primary \| secondary \| ghost \| danger` | `secondary` |
| `size` | `sm \| md \| lg` | `md` (`lg` is 44px — the touch-target minimum) |
| `selected` | `boolean` | `false` — sets `aria-pressed` and adds depth |

Icon-only? Use `IconButton`, whose required `label` prop makes an accessible
name impossible to forget.

#### `SurfaceCard`

A paper card. Carries an outer shadow and **never** a clay inner shadow.
`elevation="drag"` is the in-flight state. `completed` and `selected` also
surface as `data-*` attributes for styling and testing.

#### `SectionHeader`, `TagPill`, `PriorityBadge`

`SectionHeader` renders an accent dot, heading, count and trailing actions. The
accent is decorative — the heading text carries the meaning.

`PriorityBadge` has a `dot` and a `label` variant; **both** carry an accessible
name, so priority is never communicated by color alone.

### The rich editor

`Note.content` holds Tiptap JSON; `Note.excerpt` holds its plain-text
projection. They are written in the same patch, by `setContent` — search, card
previews and sorting read `excerpt`, and a write that updates one without the
other is how the two come to disagree about what a note says.

| Module | Responsibility |
| --- | --- |
| `lib/tiptap/document.ts` | `resolveDocument`, `toPlainText`, `fromPlainText`, `isRichDocument`, `isEmptyDocument` |
| `lib/tiptap/extensions.ts` | The block vocabulary, shared by every surface |
| `lib/tiptap/slash-commands.ts` | The slash menu's catalogue, each entry owning its own `run` |
| `RichEditor` | The editor, and the slash menu's state machine |
| `SlashMenu` | The menu, portalled to `document.body` |
| `NoteContent` | The card's body: the editor at `variant="card"` |
| `NoteFocusDialog` | Full-screen editing, opened from `expandedNoteId` |

`document.ts` imports nothing from `@tiptap/*`, deliberately: the store, the
sync engine and the server all need a note's text, and none of them should have
to load an editor to get it.

**Migration.** A note written before Milestone 9 has `content: null` and its
body in `excerpt`. `resolveDocument` converts it for display; the document is
only *written* when the user edits. Migrating on read would mean opening a
board dirties every note on it, and with autosave running, uploads the lot.

**The editor is uncontrolled after mount.** Tiptap owns a ProseMirror document,
and re-seeding it from a prop per keystroke would reset the cursor. External
changes — board hydration — are pushed in by an effect that compares first.
This is also why `NoteContent` memoizes `resolveDocument`: a fresh object every
render reads as an external change.

**The slash menu is held in a ref *and* in state.** Tiptap builds its keydown
handler once, so that handler can only see a ref; rendering needs a value whose
identity changes. Both are written together, only ever from an editor callback
or an event handler — never during render, which ESLint enforces.

Tables, file blocks and video embeds from IMPLEMENTATION_PLAN §15 are not
implemented: each needs an upload or embed pipeline (Milestone 10). They are
left out rather than half-wired, so nothing offers a block it cannot store.

---

### Uploads

Files go to Supabase Storage; their metadata goes to `public.attachments`. The
security model is that a path carries its owner —
`<bucket>/<user id>/<note id>/<uuid>.<ext>` — and every storage policy checks
the first segment against `auth.uid()`. `storagePath()` in
`features/attachments/upload-policy.ts` is the only place a path is built, so
the policies have exactly one function to agree with.

| Module | Responsibility |
| --- | --- |
| `features/attachments/upload-policy.ts` | Bucket choice, size and type limits, path construction — all pure |
| `features/attachments/repository.ts` | Upload, list, remove, sign |
| `features/attachments/queries.ts` | `useAttachments` (server state) and `useAttachmentUploads` (in-flight) |
| `features/attachments/cover.ts` | A note's single cover image |
| `AttachmentList` | The list, its five states, drag-and-drop |
| `NoteCover` / `NoteCoverControls` | Rendering and replacing a cover |

**An upload is two writes.** The object, then the metadata row. If the row
fails, the object is removed — otherwise bytes exist that nothing references
and nobody can delete. Removal goes the other way, row first: a failed object
delete then leaves an orphan rather than a row pointing at bytes that are gone,
and a broken image in a note is worse than a file nobody can see.

**Signed URLs are never stored.** Every bucket a note writes into is private,
so `attachments.public_url` is null and a URL is signed on demand with a one
hour TTL. The two public buckets, `avatars` and `backgrounds`, are decorations
the user chose to display; signing one per avatar per render would be a request
per face.

**In-flight uploads are local state, not query cache.** A half-uploaded file is
not a server fact. Each file is its own task, so one rejected file does not take
down a multi-file drop — the user gets the three that worked and a message
about the fourth.

`UploadTask.progress` is `null`: supabase-js resolves its upload promise without
reporting bytes, so the UI shows indeterminate activity rather than an animated
bar that is measuring nothing.

---

### Tags, categories and filtering

A note holds **ids**, never copies: `tagIds` and `categoryId`. The catalogue
itself is workspace-scoped server state owned by TanStack Query, because a tag
copied onto a note goes stale the moment it is renamed.

| Module | Responsibility |
| --- | --- |
| `features/taxonomy/repository.ts` | Tag and category CRUD, plus `note_tags` links |
| `features/taxonomy/queries.ts` | `useTaxonomy` — the catalogue and its mutations |
| `features/taxonomy/context.tsx` | Makes it ambient; falls back to the demo tags with no provider |
| `features/board/filter-notes.ts` | `BoardFilters` and `matchesFilters`, pure |
| `NoteTagPicker` / `NoteCategoryPicker` | Assignment, from the note menu |
| `BoardFilterMenu` | The toolbar's Filter control |

**Tags are many, a category is one.** The UI states that rather than explaining
it: tags are checkboxes that leave the submenu open, a category is a radio
group whose first option is "None". Both are plain buttons rather than Radix
menu items, which is what keeps the submenu open while several tags are picked.

**Filters combine OR within a facet, AND across facets.** Two tags widen the
result; a tag and a priority narrow it. AND within a facet would mean selecting
a second tag almost always empties the board. `null` is a real value in the
category facet — "what have I not filed yet" is the most useful category filter
there is.

**Tag links are the one part of a note that is not a column on it.**
`upsertNotes` writes them separately, after the notes, because a link cannot
reference a row that does not exist yet. `setNoteTags` replaces the set rather
than diffing it: the set is tiny, and a diff would need a read first.

**A context, not props.** The consumers are scattered — the toolbar's Filter
menu, every note menu's pickers, the badge on every card — so threading a tag
list down through the board, the lane and the card would be four layers of
pass-through. With no provider the context yields the seeded demo tags and
nothing editable, so a card rendered in isolation still shows its tags.

---

### Search

`features/search/search.ts` is pure and synchronous, over data the client
already holds. §18 asks for six surfaces — note titles, note text, tags,
categories, board names and workspace names — all of which are in memory, so a
round trip would make search slower without making it better. That is what
keeps it responsive: nothing to debounce, no loading state, and no stale result
arriving after three more keystrokes.

Note text is matched against `Note.excerpt`, the maintained plain-text
projection of the Tiptap document, so search never walks a document tree.

**Ranking is by where the term matched**, not how often: exact title → prefix →
partial → tag → category → body. Counting occurrences would rank a long note
mentioning a word five times above the note actually called that word. Each
note is reported once, by its strongest match, with a subtitle saying *why* it
came back — `Tagged "urgent"` rather than an unexplained title.

`CommandPalette` is the UI, on Ctrl/Cmd+K. The list never takes focus: the
caret stays in the input, which owns the keyboard and announces the active row
through `aria-activedescendant`. Choosing a result navigates — a note opens in
the full-screen editor, a board or workspace becomes active — because a result
that only highlighted something would leave the user to find it.

The shortcut is bound in `useCommandShortcut` on `document` **in the capture
phase**, so it still works while the caret is inside the rich editor;
ProseMirror handles keys on its own element and would otherwise see it first.

---

### `components/notes`

`PaperNoteCard` composes `NoteHeader`, `NoteContent`, `NoteChecklist`,
`NoteTags` and `NoteFooter`, and renders `NoteMenu` when given `menuActions`.

```tsx
const actions = useNoteActions();

<PaperNoteCard
  note={note}
  tags={tagsForNote}
  menuActions={actions}
  onTitleChange={actions.setTitle}     // (noteId, title) => void
  onContentChange={actions.setContent} // (noteId, document, text) => void
  onToggleSubtask={actions.toggleSubtask}
  onSelect={actions.selectNote}
  selected={selectedIds.has(note.id)}
  autoFocus={note.id === focusedNoteId}
/>
```

Three design decisions worth knowing:

- **Handlers receive the note id.** That lets a parent pass one stable callback
  for every card instead of a closure per note, which is what makes the
  component's `memo` actually prevent re-renders on a large board.
- **Supplying a change handler is what makes a field editable.** Omit
  `onTitleChange` and the title renders as a heading; supply it and the same
  card becomes writable. That is how one-action blank-note creation works with
  no separate "edit mode".
- **Supplying `menuActions` is what adds the More menu and the completion
  checkbox.** A card rendered without them is a pure read-only view, which is
  what the Grid and Calendar surfaces will want later.

| Component | Purpose |
| --- | --- |
| `NoteMenu` | The full action set from FRONTEND_SPEC §38, with destructive actions below their own separator |
| `NoteColorPicker` | Nine paper swatches painted with the real tokens — the picker *is* the preview |
| `NoteStylePicker` | Paper styles with miniature previews |
| `NotePriorityPicker` | Priority levels, each pairing its colour with its name |

All three pickers are radiogroups, so arrow keys move between options and the
current value is announced.

The style picker draws its own miniature textures rather than reusing
`.tk-paper-lined` / `.tk-paper-grid`: those rule at 28px and 20px for a real
card, which at swatch size renders a blank rectangle and makes Notebook, Lined
and Grid indistinguishable.

### `components/board`

| Component | Responsibility |
| --- | --- |
| `BoardWorkspace` | Groups notes by column in one pass, renders the column panels, owns horizontal scrolling and Add Column |
| `BoardLane` | One column panel: header, scrolling note list, empty-column target. Sets `--lane-accent` from `lane.color`, which is what tints the panel and its header pill |
| `LaneHeader` | Colour, name (editable in place), count, Add, and the column menu |
| `BoardToolbar` | The bar under the breadcrumb: view switcher, surface settings, note count, zoom, New note |
| `ViewSwitcher` | Board/layout switcher, at the left of the toolbar |
| `ZoomControls` | Zoom readout, stepping through `ZOOM_STOPS` |

`BoardWorkspace` filters archived and soft-deleted notes and sorts pinned notes
to the top of their column.

**Board and Canvas expose different settings.** `BoardControls` covers sort
order, card density and whether completed notes show; `CanvasControls` covers
grid mode, grid size, snapping and the viewport. The two surfaces answer
different questions, so neither shows the other's controls. Both are also
reachable by right-clicking the empty surface.

**Every menu is reachable two ways.** Radix ships dropdown and context menus as
separate families with matching APIs, so `src/components/ui/menu-primitives.ts`
exposes both as a `MenuPrimitives` set and each menu renders once against
whichever it is given. Rendering the list twice is how the two copies drift.
The note menu goes further and describes itself as *data*
(`note-menu-model.tsx`), because its rows carry disabled rules and submenus.

**The wheel scrolls the board sideways.** A mouse only produces `deltaY`, so
without `useHorizontalWheelScroll` a wide board can only be moved by dragging
the scrollbar. The hook redirects the wheel only when nothing under the pointer
can absorb a vertical scroll — otherwise a long column would become unreadable
because the board pans instead.

**One Add control per column.** The header's Add is the only note-creation
button in a populated column; a second one at the foot of every column was
redundant. An empty column's placeholder is also a target, but its label is
deliberately different ("Add the first note to …"), so no column ever presents
two identically-named Add controls.

### `components/canvas` — Canvas Mode

| Component | Responsibility |
| --- | --- |
| `Canvas` | The surface: pan, zoom, marquee select, and multi-note drag |
| `CanvasNote` | One positioned note, owning its own resize gesture |
| `CanvasGrid` | Dot or line grid, drawn as one repeating background |
| `SelectionBox` | The marquee rectangle |
| `ResizeHandles` | The eight grips on a lone selection |
| `CanvasControls` | Grid mode, snap, fit-to-content |

Gestures:

| Gesture | Result |
| --- | --- |
| Drag a note | Moves the whole selection |
| Drag empty canvas | Selection marquee |
| Middle-drag, or Space + drag | Pan |
| Wheel | Pan |
| Ctrl/Cmd + wheel, pinch | Zoom at the cursor |

Things worth knowing before changing this code:

- **The grid is one element, not many.** An infinite canvas has no bounded
  line count; a repeating CSS background costs one paint at any zoom. It is
  positioned in screen space so it stays glued to the canvas beneath it.
- **The marquee is in screen space too**, so its border stays one pixel wide
  instead of scaling into a slab when zoomed in.
- **Layer controls swap z-indices with the nearest neighbour** rather than
  incrementing. With notes at 1 and 5, incrementing to 2 leaves the note still
  underneath; swapping actually brings it forward.
- **`CanvasGrid` hides itself below 4px spacing**, where a grid reads as a
  wash of noise.
- **A 0×0 measurement is not published** to the canvas store. It means "not
  laid out yet", and publishing it would make fit-to-content believe there is
  no room and silently do nothing.

### `components/shell`

`AppShell` is the composition root: background, then a sidebar beside a column
of breadcrumb bar → toolbar → surface. It owns the viewport height so lanes
scroll internally rather than the page scrolling.

`AppSidebar` is the permanent left rail: workspace switcher, compose shortcut,
and the destinations from `nav-items.ts`. `BreadcrumbBar` names the location and
carries search, sync, theme, notifications and the account menu. Both replaced
the old `TopNavigation`; see "Decisions made" in `docs/HANDOFF.md`.

`AppBackground` renders the scenic layer. The filtered element is inset
negatively (`-inset-16`) and clipped by its wrapper: blurring an element flush
to the viewport edge samples transparent pixels outside it and leaves a visible
light rim. Overlay, tint, vignette and grain are unfiltered siblings, so raising
the blur never softens them.

---

## 5. Hooks and state

### `useNoteStore` — the note records

Zustand, seeded from `src/features/board/mock-board.ts`, persisted to
`localStorage` under `tackly:notes`. It is the temporary source of truth;
Milestone 8 moves durable data to Supabase behind TanStack Query and leaves
this store holding interaction state only. Every action is therefore shaped
like a mutation payload — an id plus a patch — rather than a React setter.

```ts
addNote(status) → noteId       deleteNote(id)        duplicateNote(id) → id | null
setTitle(id, title)            setText(id, text)     toggleSubtask(id, subtaskId, done)
toggleComplete(id)             togglePin(id)         toggleLock(id)
setColor / setStyle / setPriority / setStatus / setArchived
focusNote(id)                  clearFocus()          reset(notes)
```

Behaviours that are easy to regress, all covered by
`src/stores/note-store.test.ts`:

- **A no-op returns the same array.** `patchNote` only produces a new `notes`
  reference when something actually changed, so a rejected or missing-id action
  does not re-render every card.
- **Locking guards accidental edits, not deliberate ones.** Title, body and
  checklist changes are rejected while a note is locked; menu actions —
  including Unlock — stay available, because a lock the user cannot undo from
  the UI would strand the note.
- **Completing a note completes its checklist**, so the progress bar and the
  completion state cannot disagree. Reopening the note does *not* untick them —
  that would discard the user's marks.
- **A duplicate gets a new identity**: new note id, new subtask ids, no
  inherited pin, offset canvas position, inserted directly after its source.
- **A style that forces its paper writes that colour through**, so the swatch
  shown in the colour picker matches what the card renders.

`skipHydration: true` is set because the server has no `localStorage`; reading
it during render would produce markup that disagrees with the client.
`useStoreHydration()` rehydrates in an effect instead, and resolves to
"hydrated" even when storage is unreadable, so a corrupt entry cannot leave the
board stuck.

### `useCanvasStore` — viewport and grid

Holds `viewport` (`x`, `y`, `zoom`), the grid mode and size, snap, and the
measured `viewportSize`.

Deliberately **not** here: anything that changes per pointer move. That is the
whole point — see "The canvas save rule" below.

### `usePointerDrag()` — the rAF drag primitive

```ts
const startDrag = usePointerDrag({
  onStart: (state, event) => boolean | void,  // return false to reject
  onMove:  (state) => void,                   // at most once per frame
  onEnd:   (state) => void,                   // commit here
  onCancel: () => void,
});
```

Pointer events fire faster than the display refreshes, so raw `pointermove`
handling does redundant work and can tear. This coalesces moves into one
animation frame, captures the pointer so a fast drag that leaves the element
keeps tracking, and cleans up if the component unmounts mid-gesture.

Handlers are held in a ref, written in an effect rather than during render —
mutating a ref while rendering is unsafe under concurrent React.

### The canvas save rule

FRONTEND_SPEC.md §77, and the reason `canvas.tsx` looks the way it does:

```text
pointerdown → local interaction → requestAnimationFrame transform updates
            → pointerup → commit final state
```

Pointer movement never touches React or a store. A drag writes `transform`
straight onto the dragged elements inside the frame callback; the store is
updated exactly once, on `pointerup`, through `moveNotes` or `setTransform`.
Routing 60 frames a second through a store would re-render every subscriber on
every frame — precisely the failure the rule exists to prevent.

If you add a canvas gesture, it goes through `usePointerDrag` and commits once.

### `useLaneStore` — the board's columns

Create, rename, recolour, reorder and delete. Persisted to `localStorage`
alongside the notes. `useLaneActions` binds it to the UI and owns the one
decision that crosses stores — where a deleted column's notes go.

### `useSelectionStore` — which notes are selected

Kept separate from the note store on purpose: selection changes far more often
than note data, and a card that only cares whether it is selected should not
re-render when an unrelated note's title changes. `useIsNoteSelected(id)`
subscribes to a boolean for exactly that reason.

Modes follow PRODUCT_SPEC → Multi-Select: plain click replaces, Ctrl/Cmd
toggles one, Shift extends. `clear()` and `deselect()` return the existing
`Set` when nothing would change.

### `useNoteActions()` — binding the store to the UI

Pulls each action off the store individually and memoizes them into one object.
Selecting the whole store here would re-render this hook, and therefore every
card, on any note change. Zustand actions have stable identities, so the
returned object is stable too — which is what lets `PaperNoteCard` stay
memoized.

### State ownership

| State | Owner | Why |
| --- | --- | --- |
| Workspaces, boards, notes, tags, categories | TanStack Query + Supabase | Durable cloud data |
| Selection, canvas viewport, drag state, filters, sort, open panels | Zustand | High-frequency UI state |
| One component's open/closed toggles | `useState` | Not everything belongs in a store |

Zustand is never the permanent source of truth for cloud data.

---

## 6. Integration points for later milestones

| Milestone | Seam that already exists |
| --- | --- |
| Canvas extras (rotate, mini-map, stacks, groups) | `NoteTransform.rotation` is already stored and rendered; `boundingBox()` and `notesBoundingBox()` give a mini-map its extents |
| 5 — Supabase | `.env.local.example`; `src/lib/supabase/` is the intended home for `client.ts` / `server.ts` / `middleware.ts` |
| 7/8 — Persistence | `Providers` already mounts `QueryClientProvider`; `queryKeys` in `src/lib/query-client.ts` is the key factory |
| 19 — Theming | `applyTheme()` and `backgroundToCssVariables()`; `AppShell` takes a `background` prop |

`Note.content` is typed `unknown` because it is a `jsonb` column: the database
hands back whatever was stored, including whatever an older build wrote.
`src/lib/tiptap/document.ts` narrows it before any use.

---

## 6a. Supabase

The foundation is in place; nothing reads it yet. Authentication lands in
Milestone 6, real workspaces and boards in 7, note persistence in 8. Setup
instructions are in `supabase/README.md`.

| File | Role |
| --- | --- |
| `supabase/migrations/0001_initial_schema.sql` | Tables, indexes, triggers and RLS policies |
| `src/types/database.ts` | Row types matching that migration — regenerate once a project exists |
| `src/lib/env.ts` | Zod-validated environment, **lazily** |
| `src/lib/supabase/client.ts` | Browser client, cached per tab |
| `src/lib/supabase/server.ts` | Per-request server client, `server-only` |
| `src/lib/supabase/proxy.ts` | Session refresh |
| `src/proxy.ts` | The Next entry point that runs it |
| `src/lib/mappers/` | Row ↔ domain translation |

Decisions that will bite if reversed:

- **Env validation is lazy.** Parsing at module scope would crash the app on
  import whenever Supabase is unconfigured — which is every fresh clone, and
  the project's current state. It fails at client construction instead, with a
  message naming the variable and the file to fix.
- **The server client is a function, never a singleton.** A module-level client
  is shared across requests and would leak one user's session into another's
  render. `server-only` turns an accidental client import into a build error.
- **`getUser()`, not `getSession()`, on the server.** `getSession()` trusts the
  cookie without verifying it, so a forged cookie reads as a signed-in user.
- **The proxy exists because Server Components cannot set cookies.** When a
  token expires mid-render the refreshed one has nowhere to go, and the user is
  silently signed out. `server.ts` swallows its cookie-write failure — which is
  only safe while the proxy is in place.
- **Next 16 renamed `middleware` to `proxy`**, so the file is `src/proxy.ts`
  even though IMPLEMENTATION_PLAN.md §11 calls it middleware.
- **Mappers are the only place the two shapes meet**, and reads are defensive:
  an unrecognised enum falls back to a default, malformed `jsonb` degrades to
  empty. A row written by a newer client must render as a plain note, never a
  blank card.
- **Updates send only changed fields.** A full-row update clobbers a concurrent
  edit from another device with stale values.
- **Subtasks are `jsonb` on `notes`**, not a table. They are always loaded,
  edited and saved with their note and have no independent identity yet
  (§48: create tables only when needed).

RLS cannot be covered by the unit suite — there is no database in it. Verify
new tables manually with two accounts; `supabase/README.md` has the procedure.

## 6a2. Workspaces and boards

Cloud-backed, behind TanStack Query (IMPLEMENTATION_PLAN.md §13).

| File | Role |
| --- | --- |
| `src/features/workspaces/repository.ts` | Plain Supabase reads and writes |
| `src/features/workspaces/queries.ts` | Query hooks and optimistic mutations |
| `src/features/workspaces/use-active-workspace.ts` | Reconciles selection against the fetched lists |
| `src/stores/workspace-store.ts` | Which workspace and board are open — selection only |
| `src/components/shell/workspace-picker.tsx` | Presentational picker |
| `src/components/shell/workspace-switcher.tsx` | Binds the picker to its queries |
| `src/lib/mappers/workspace.ts` | Row ↔ domain |

Decisions worth keeping:

- **Query owns the lists; Zustand owns the selection.** Storing the records in
  Zustand too would make it a second copy that goes stale the moment another
  device renames something.
- **Selection is reconciled, never trusted.** A stored id can point at a
  workspace that was archived, deleted elsewhere, or belongs to another
  account. `useActiveWorkspace` falls back to the first available so the user
  always lands on something real. The write-back is guarded on inequality, or
  the effect loops.
- **The repository does not filter by owner.** RLS does that at the database;
  a client-side copy would create a second place to get it wrong, and would
  silently mask a broken policy.
- **Archive, not delete.** A workspace holds every board and note under it; a
  stray menu click must not destroy that.
- **Board creation is not optimistic.** It also seeds the board's columns, and
  an optimistic board would appear with none — landing the user on an empty,
  unusable surface.
- **Rollback restores the previous list rather than refetching**, so a failed
  mutation shows the user their own state back, not a spinner.
- **Naming uses `window.prompt`.** A proper dialog belongs with the rest of the
  dialog work; a prompt is obviously temporary rather than a half-built dialog
  that looks finished.

## 6a3. Note persistence and autosave

The flow IMPLEMENTATION_PLAN.md §50 prescribes, end to end:

```text
edit → immediate local update (Zustand)
     → debounce (600ms)
     → persist (Supabase)
     → show sync status
```

| File | Role |
| --- | --- |
| `src/features/notes/repository.ts` | Supabase reads and writes for notes and lanes |
| `src/features/notes/sync-engine.ts` | Pure diff/snapshot logic — no React, no network |
| `src/features/notes/use-board-sync.ts` | Watches the stores, debounces, writes, reports status |
| `src/features/notes/use-board-contents.ts` | Fetches a board and hydrates the stores |
| `src/stores/sync-store.ts` | Autosave status |
| `src/components/shell/sync-indicator.tsx` | The header readout |
| `src/components/board/board-status.tsx` | Loading and error overlay |
| `src/hooks/use-debounced-callback.ts` | The debounce primitive |

**The stores stay the source of truth for the UI.** Every interaction — drag,
type, toggle — writes locally and is instant regardless of the network.
Driving components from the query cache instead would mean a round trip per
keystroke, or an optimistic shadow of the whole board, which is the store again
with extra steps.

**Changes are found by snapshot diff, not dirty flags.** A flag has to be set
by every action that touches a record, and the one action that forgets loses
data silently. The stores update immutably, so "changed" is a reference
comparison — `diffById` cannot forget. A redundant write is harmless; a missed
one is not.

**A failed write is rolled back into the snapshot.** Without
`rollbackSnapshot`, records that failed would look clean on the next diff and
the edit would vanish — exactly what §51 forbids. A failed *deletion* gets a
placeholder id put back, or it would never be retried.

**The snapshot is advanced before the write, not after.** Edits made *during*
an in-flight write then register as new changes rather than being folded into
the batch that is already leaving.

**Write order matters.** Columns are upserted before notes (a note can
reference a column just created, and the foreign key would reject it) and
deleted after them (their notes have to be rehomed first).

**Hydration replaces rather than merges.** Merging would mean resolving
conflicts between local edits and server state, and guessing wrong there loses
work. `markClean` runs straight after, or the first diff would write the whole
board back to where it came from.

**A pending save survives the tab closing.** `visibilitychange` is the
reliable signal — `beforeunload` is skipped on mobile, where a backgrounded tab
is often never resumed. The debounce also flushes on unmount.

**Offline is not an error.** Edits stay in the store and in `localStorage`, the
indicator says so plainly, and the `online` event clears the backlog.

## 6b. Authentication

Sign up, sign in, sign out, session restore and auth-aware navigation
(IMPLEMENTATION_PLAN.md §12). Everything degrades to "signed out" when no
Supabase project is connected, so the board stays usable.

| File | Role |
| --- | --- |
| `src/features/auth/schemas.ts` | Zod credential schemas, shared by client and server |
| `src/features/auth/actions.ts` | `signInAction`, `signUpAction`, `signOutAction` |
| `src/features/auth/session.ts` | `getSessionUser()` — server-only |
| `src/features/auth/types.ts` | `SessionUser`, importable from client code |
| `src/components/auth/auth-form.tsx` | One form for both modes |
| `src/components/shell/account-menu.tsx` | The header's account control |
| `src/app/(auth)/login`, `/register` | The pages |
| `src/app/auth/callback/route.ts` | Exchanges an email-confirmation code for a session |

Decisions worth keeping:

- **The board is not gated.** Without Supabase it runs on local state, and even
  with it, a visitor can look around before signing up. The proxy only bounces
  a *signed-in* user off the auth pages. Gating arrives with real cloud data in
  Milestone 7.
- **Error messages are rewritten before they reach the user.** Supabase's are
  for developers, and some leak whether an address is registered — "invalid
  login credentials" stays vague on purpose, or the sign-in form becomes an
  account-enumeration oracle.
- **Sign-up validates a minimum password length; sign-in does not.** Existing
  accounts may predate the rule, and rejecting a valid password at the door is
  both wrong and impossible for the user to act on.
- **A sign-up with email confirmation returns a user but no session.** The
  action reports "check your inbox" instead of redirecting, which would bounce
  straight back to the login page.
- **`SessionUser` lives in `types.ts`, not `session.ts`.** The latter is
  `server-only`, and a client component needs the type.
- **Sign out is a form post, not an onClick**, so it works before hydration.
- **The callback route only honours same-origin `next` values.** Reflecting an
  arbitrary one would make it an open redirect.

### A gotcha in `src/types/database.ts`

Row shapes are `type` aliases, never `interface`. postgrest-js constrains rows
to `Record<string, unknown>`; an interface has no implicit index signature and
fails that constraint, which makes the whole `Database` type silently
non-conforming — every query then resolves its rows to `never`. Each table also
needs `Relationships: []`, and the empty groups need `{ [_ in never]: never }`
rather than `Record<never, never>`. This is exactly what `supabase gen types`
emits; keep the shape when editing by hand.

## 7. Type safety

`tsconfig.json` goes beyond `strict`:

| Flag | What it buys |
| --- | --- |
| `noUncheckedIndexedAccess` | `array[i]` is `T \| undefined` — catches off-by-one reads |
| `exactOptionalPropertyTypes` | `{ x?: string }` will not accept `undefined` explicitly; optional props are passed via conditional spread |
| `noUnusedLocals` / `noUnusedParameters` | Dead code fails the build |
| `noImplicitOverride`, `noFallthroughCasesInSwitch` | Classic silent bugs |

`any` is not used anywhere in `src/`. Where a value genuinely is not known —
Tiptap JSON, thrown errors — it is typed `unknown` and narrowed.

---

## 8. Performance

Rules already in force, ahead of the milestones that stress them:

- `PaperNoteCard` is memoized, and its handler signatures keep parent callbacks
  stable so the memo holds.
- `BoardWorkspace` groups notes into lanes in a single pass rather than running
  a filter per lane.
- Canvas drag (Milestone 4) must follow: `pointerdown` → local state →
  `requestAnimationFrame` transforms → `pointerup` → commit. No database write
  per `mousemove`.
- Autosave (Milestone 8) debounces at 400–800ms after an immediate local update.

---

## 9. Testing

```bash
npm run test         # vitest run
npm run test:watch
npm run verify       # typecheck + lint + test
```

Vitest with jsdom and Testing Library. Tests sit next to what they test.

| Layer | File | Covers |
| --- | --- | --- |
| Tokens | `src/styles/tokens.test.ts` | Token completeness, spec value ranges, the no-blur rule |
| Config | `src/config/config.test.ts` | Lane order and coverage, fallbacks on unknown ids, theme application |
| Primitives | `src/components/ui/primitives.test.tsx` | Accessible names, toggle semantics, disabled behaviour |
| Note card | `src/components/notes/paper-note-card.test.tsx` | Read-only vs editable, completion, checklist progress, appearance resolution |
| Domain | `src/features/notes/create-note.test.ts` | Blank-note invariants, id uniqueness |
| Helpers | `src/lib/utils.test.ts` | `cn`, `clamp` (incl. NaN), date formatting, appearance resolution |
| Shell | `src/components/shell/app-shell.test.tsx` | Five lanes in order, dividers, no sidebar, one-action note creation, zoom stepping |
| Note store | `src/stores/note-store.test.ts` | Every mutation, lock guard, duplicate identity, referential stability |
| Selection | `src/stores/selection-store.test.ts` | Replace/toggle/extend modes, no-op stability |
| Note actions | `src/components/notes/note-menu.test.tsx` | Menu actions reaching the store *and* the card, pickers, in-place editing, selection |
| Canvas math | `src/lib/canvas.test.ts` | Coordinate round-trips, zoom anchoring, snapping, fit, resize edge cases |
| Canvas store | `src/stores/canvas-store.test.ts` | Pan, zoom clamping, fit no-ops, grid settings |
| Transforms | `src/stores/note-transform.test.ts` | Move/resize commits, lock guard, layer swapping |
| Canvas Mode | `src/components/canvas/canvas.test.tsx` | View switching, controls, selection, resize grips, editing parity with the Board |
| Lane store | `src/stores/lane-store.test.ts` | Column CRUD, reorder, position invariants, delete guards |
| Column UI | `src/components/board/lane-management.test.tsx` | Add, rename (menu and double-click), reorder, delete with rehoming |
| Environment | `src/lib/env.test.ts` | Lazy validation, actionable error messages |
| Mappers | `src/lib/mappers/note.test.ts` | Row ↔ domain, enum fallbacks, partial updates |
| Board settings | `src/components/board/board-settings.test.tsx` | Settings menus, right-click routes, Board/Canvas separation |
| Sorting | `src/features/board/sort-notes.test.ts` | Every mode, pinned-first rule, undated notes, bad timestamps |
| Wheel scroll | `src/hooks/use-horizontal-wheel-scroll.test.tsx` | When a vertical wheel becomes horizontal, and when it must not |
| Auth schemas | `src/features/auth/schemas.test.ts` | Credential rules, field-error mapping |
| Auth form | `src/components/auth/auth-form.test.tsx` | Both modes, errors tied to inputs, unconfigured state |
| Account menu | `src/components/shell/account-menu.test.tsx` | Signed-in and signed-out states |
| Canvas placement | `src/stores/note-canvas.test.ts` | Moving notes between Board and Canvas, auto-placement |
| Workspace picker | `src/components/shell/workspace-picker.test.tsx` | Signed-in, signed-out and failed states |
| Workspace selection | `src/stores/workspace-store.test.ts` | Active selection, board invalidation |
| Workspace mappers | `src/lib/mappers/workspace.test.ts` | Row ↔ domain, layout and background fallbacks |
| Sync engine | `src/features/notes/sync-engine.test.ts` | Diffing, rollback, the §50 delay band |
| Debounce | `src/hooks/use-debounced-callback.test.tsx` | Bursts, flush, cancel, unmount, stale closures |
| Sync indicator | `src/components/shell/sync-indicator.test.tsx` | Every status, polite announcement, retry |

Anything containing `AppShell` must be rendered with `render` from
`@/test/render`, not from `@testing-library/react` — the header's workspace
switcher reads server state and needs a `QueryClientProvider`.

jsdom has no layout engine, so the canvas component tests cover wiring, state
and the interaction contract; the pointer geometry is covered exhaustively and
deterministically by the pure functions in `src/lib/canvas.ts`.

A store mutation made directly from a test is outside React's event loop, so
it needs `act()` for the render to flush before you assert.

`testTimeout` is 20s, not the 5s default: driving the whole shell through
`userEvent` in jsdom is slow enough that the default turns ordinary load into
flake that looks like a product bug.

Integration tests set up through the UI only where the UI *is* the thing under
test. Filling twelve columns to check a cap belongs in the store test; the
component test drives the store directly and asserts what the board renders.

Zustand stores are module singletons, so `vitest.setup.ts` resets them and
clears `localStorage` before every test. Without that, a note added in one test
survives into the next and lane-count assertions pass or fail by file order.

One Testing Library gotcha: Radix marks the rest of the page `aria-hidden`
while a menu is open, so `getByRole` cannot see the card underneath. Close the
menu before asserting on it.

Write tests for behaviour the spec is explicit about and for edge cases that
degrade silently — an unknown enum value, a `null` date, a NaN zoom. Those are
the failures nobody notices until a user reports a blank card.


## Milestone 13 - Grid View

`components/grid/grid-workspace.tsx` projects the same note working copy as the
Board; there is no grid store, migration or second persistence path. It uses
`features/board/visible-notes.ts` to exclude archived/deleted records, apply the
Board completion setting and facets, then sort (pinned first). This pure
projection preserves record identity and canvas transforms/membership.

PaperNoteCard accepts optional `metadata` for column name and last-edit time.
All cover signing, tags, checklists, completion, inline editing, selection and
context/dropdown actions stay in the shared card. The shell still owns the one
focus editor and autosave. Grid is enabled in `config/layouts.ts`; later layouts
remain disabled. The shell/toolbar must check `activeView === "canvas"`, never
`activeView !== "board"`, because alternate layouts are not Canvas.

`.tk-note-grid` uses auto-fill columns and a minimum width bounded by 100% of the
surface; `--grid-card-min-width` and `--grid-card-gap` are tokens. The toolbar
wraps, uses minimum height, and omits nonfunctional zoom controls on Grid.
`grid-workspace.test.tsx` covers identity, filtering, rendering, edit/completion,
empty-state recovery, blank creation, external mutations and view round-trips.


## Milestone 14 - List View and Board column dragging

`components/list/list-workspace.tsx` uses the shared `visibleNotes` projection.
`list-note-row.tsx` renders flat rows: document icon, inline title, body preview,
tags/category, due date or last-edit date, priority, status and the same
NoteMenu/NoteContextMenu as paper cards. Icon, preview and double-click call
`onEdit`, opening the shell's single NoteFocusDialog. No List store, cloned
records, new migration or extra autosave loop. The catalogue enables List;
Grid and List omit nonfunctional zoom controls. List row height/spacing,
selection shadow and completed opacity come from tokens. Tags move beneath
the title on small screens and title/preview truncate instead of widening rows.

`BoardDndContext` wraps BoardWorkspace. `BoardLane` registers an entire panel
as a droppable, even if it has no notes. `DraggableBoardNote` attaches listeners
only to a grip in PaperNoteCard's optional `headerLeading` slot: inputs, rich
text, menu and checkboxes retain their own events. Pointer activation needs
6px of movement; touch-action is disabled only on the grip. Keyboard movement
uses `columnKeyboardCoordinates` to hop to the nearest column in that direction.
Pointer collision uses pointerWithin so releasing outside every column cancels;
keyboard collision uses closestCenter. Screen-reader instructions/announcements
and the overlay stay in the context; original cards fade only during dragging.

No mutation happens in drag-start, move, over or cancel. On drag-end,
`commitBoardDrop` re-reads current stores, rejects stale/missing/locked/archived/
deleted/cross-board/same-lane targets, and calls existing `setLane` once. This
changes a working-copy reference and the existing autosave diff writes `lane_id`.
Content, canvas transform/membership and ids remain unchanged. This is a
cross-column move only, not within-column manual reordering or multi-note drag.
The deliberate Move to Column menu remains available for locked notes; the
new direct drag gesture is disabled while locked, consistent with Canvas moves.

Tests exercise the real dnd-kit sensors with measured jsdom rect fixtures,
not fabricated onDragEnd callbacks. These prove wiring, commit timing and
store behavior, not physical browser/touch geometry or live cloud writes.


## Milestone 15 - Workflow provided by Board

The user removed the duplicate Kanban selector/surface in Milestone 16.
BoardWorkspace remains the one workflow surface with existing columns,
notes, DndContext, CRUD and persistence. Kanban has no catalogue entry or
switcher button and no dedicated branch/props on BoardWorkspace. Its legacy
stored layout id remains in the domain tuple for data compatibility only.
Former Kanban tests are now Board workflow regressions, retaining the useful
cloud-column and local rehydration checks.

The milestone review found that lane-store.addLane still stamped MOCK_BOARD_ID
onto new columns on cloud boards. LaneStore now has a non-persisted boardId
creation context for the empty-board case. `reset(lanes, boardId?)` hydrates it
with the records (defaults to their first board id, or the local mock id).
`useBoardContents` supplies the real board id explicitly even with no columns.
Creation uses the existing lanes' board id when present, otherwise that context.
Only lanes persist; context does not leak into a signed-out cold reload.
`laneToInsert` and the existing sync engine serialize this actual board_id.

Board workflow tests cover column creation/naming, cloud id regression, record identity,
filters/sorting, inline editing, and localStorage persistence plus rehydration.
Board pointer and keyboard sensor tests cover cancel/locked handles. These are jsdom geometry tests,
not browser/touch or live cloud-write observations.


`lane-management.test.tsx` now uses `renderColumns`: the real BoardWorkspace,
menus, lane actions and note stores, retaining Ideas notes for rehome checks.
This removes unrelated shell/editor load that made existing add/delete/submenu
tests flaky under the full suite. Assertions are retained; testTimeout and
maxWorkers are unchanged.


Vitest now selects `pool: "threads"` with `isolate: true`, preserving a fresh
worker/environment per file rather than disabling isolation or capping workers.
The default forked runs timed out existing heavy UI tests; the same 618-test
suite passed with isolated threads. The 20-second testTimeout is unchanged.
Reference: https://vitest.dev/guide/improving-performance (pool choices).

Grid/List round-trip tests use a representative pair of records rather than
booting all rich editors at every view switch; separate rendering tests still
assert every existing note appears. Routing, identity and membership assertions
are retained, with no timeout increases.

All-at-once verification still sometimes times out heavy pre-existing UI tests
on this machine. `milestone-15-evidence/VERIFY_BATCHED.ps1` selects every test
file in smaller groups with normal isolation, timeout and worker settings.
Its final coverage check verifies 618 tests across all 46 files, all passing.
This is reported as batched proof, not as a passing monolithic `npm run verify`.


## Milestone 16 - Month calendar

`features/calendar/month.ts` owns local day keys, defensive date parsing,
end-of-local-day deadlines, month shifting and a 42-cell Sunday-first grid.
Grouping keeps original note objects; it excludes undated/invalid/archived/
deleted records and preserves the caller's sort order. Date-only strings are
local dates rather than UTC midnight; tests use local constructors.

`CalendarWorkspace` is controlled by AppShell's displayed month and selected
date. It uses shared visibleNotes filters/sort/completion visibility and taxonomy.
Pills show title, category colour and priority and expand the existing global
focus editor. A busy day initially shows three notes and expands the rest.
The seven-column grid scrolls horizontally on small screens; dimensions,
colours/radii are token-based. Calendar controls include Previous/Next/Today,
not unimplemented week/day/year options or zoom. The toolbar count follows
the visible calendar range, including neighbouring-month cells.

Calendar New note uses the selected date, the current board context and first
lane, creates a blank record in one store update, and opens the shared editor.
`AddNoteOptions.dueAt` seeds the deadline before the record is published.
`setDueAt` rejects invalid dates, protects locked notes and avoids no-op writes.
The shared NoteFocusDialog date input sets/clears the field explicitly; reads
never mutate a note. Existing noteToUpdate/diff/autosave persist `due_at`; no
schema change or second calendar persistence path. Clearing dueAt removes a
pill without deleting the note or changing Canvas membership.

Month is the current milestone. Week/day/year and dragging dates remain later
product work; the date input provides rescheduling now. Pure/date and component
tests cover boundaries, identity, category/priority, navigation, filters, shared
editor, creation, locking, local persistence and autosave mapping. Browser and
connected cloud behavior are reported separately from these tests.


## Milestone 17 - Horizontal timeline

`features/timeline/range.ts` defines week/month/quarter windows and shifts.
Weeks start Monday; months/quarters use real calendar starts/ends. Inclusive
civil-day ordinals use Date.UTC(local year/month/day), not elapsed milliseconds,
so time-of-day and daylight-saving changes do not distort bar length. noteRange
classifies dated/undated/invalid; one missing endpoint is a one-day milestone.
Reversed/invalid dates are never silently swapped. timelineBar clips visible
geometry but retains original duration and date labels; no record is mutated.

`TimelineWorkspace` uses existing visibleNotes filters/sort/completion settings,
taxonomy and lane names. Each note is one row with a sticky label and category-
coloured grid-column bar. Day columns have fixed token width and the surface
scrolls horizontally/vertically; Today/date markers, navigation, scope switches,
priority and clipping indicators are real controls. Unscheduled/invalid notes
remain accessible in separate correction sections, not dropped from the app.

AppShell controls anchor/scope, routes Timeline explicitly and counts intersecting
bars. New note seeds startAt/dueAt on the anchor's local day before publishing
one blank record and opens the single NoteFocusDialog. Shared date editing
adds setStartAt (invalid/locked/no-op guarded) beside setDueAt; clear/edit actions
keep content and Canvas membership. Existing start_at/due_at mappers, local
persist and snapshot-diff autosave handle writes with no migration/second store.

Tests cover boundaries/leap/civil-day arithmetic, interval overlap/clipping,
identity, scope/navigation, UI opening/editing, category/priority, filters,
local persistence/autosave mapping, locks and blank creation. CSS scroll proof
and jsdom wiring are not represented as physical browser/cloud verification.
Drag/resize bars and dependency links are later features, not offered here.
