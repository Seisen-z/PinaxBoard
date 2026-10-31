# FRONTEND_SPEC.md

# Tackly Frontend / UI / UX Specification

> **Status:** Active frontend specification  
> **Design direction:** Clean minimal workspace + paper notepads + very subtle tactile controls   
> **Companion specification:** `PRODUCT_SPEC.md`

---

# 1. PURPOSE

This document defines the frontend, visual language, interaction model, layout behavior, component structure, responsive rules, and implementation expectations for Tackly.

The coding agent MUST use this document together with:

1. `PRODUCT_SPEC.md`
2. `FRONTEND_SPEC.md`

The product specification defines **what the product does**.

This frontend specification defines **how the product should look, feel, and behave**.

---

# 2. CURRENT APPROVED DESIGN DIRECTION

Tackly uses a clean minimal interface, a customizable scenic background, paper/notepad cards, and restrained tactile controls. Approximate balance: 70% clean/minimal UI, 25% paper/sticky-note design, 5% subtle tactile detail. The default Board is full width, with five open status lanes divided by thin vertical rules; no permanent sidebar, right rail, glass column, or large dashboard panel. Create first, customize afterward: Add Note immediately places a blank editable card. The background may be blurred, but foreground UI must not use backdrop blur.

---

# 3. VISUAL DIRECTION

Use the design rules in this specification for overall composition, header organization, card proportions, status colors, and background mood. Keep the solid header and open-lane treatment, adapt responsively, and retain Tackly branding.

---

# 4. PRODUCT PERSONALITY

Tackly should feel like:

- A premium personal digital desk
- A creative sticky-note wall
- A modern task manager
- A digital notebook
- A project workspace
- A visual planning board
- A customizable personal environment

The interface should feel:

- Modern
- Cozy
- Smooth
- Creative
- Calm
- Premium
- Responsive
- Tactile
- Organized
- Personal
- Flexible

It should not feel:

- Corporate
- Sterile
- Overly flat
- Overly playful
- Overly glossy
- Overly clay-like
- Visually crowded
- Like a generic admin dashboard

---

# 5. DESIGN LANGUAGE

## 5.1 Clean minimal shell

Use a solid dark header, transparent Board workspace, open status lanes, thin dividers, and solid compact controls. Do not use frosted panels or backdrop filters on UI surfaces. Use background-layer blur only for the customizable image.

## 5.2 Very subtle tactile details

Give selected navigation, Add Note, lane add buttons, selected views, and zoom controls a small raised effect. Do not style entire lanes, the note body, or every button this way.

## 5.3 Paper / notepad cards

Cards are the primary visual objects: pastel or neutral paper, readable content, optional texture, small shadow, optional pin, and completion state. Users start with a blank notepad and choose appearance after creation.

---

# 6. DESIGN TOKENS

All recurring visual values should be centralized.

Do not scatter arbitrary colors and shadows across components.

Recommended semantic variables:

```css
:root {
  --background: 222 36% 8%;
  --foreground: 210 40% 98%;

  --surface: 222 27% 13%;
  --surface-raised: 222 25% 16%;
  --surface-panel: 222 27% 13%;
  --surface-panel-soft: 222 25% 16%;

  --border: 215 26% 76% / 0.14;
  --border-strong: 215 28% 82% / 0.24;

  --muted: 215 16% 68%;
  --muted-foreground: 215 18% 72%;

  --primary: 228 96% 66%;
  --primary-foreground: 0 0% 100%;

  --success: 151 67% 48%;
  --warning: 42 93% 57%;
  --danger: 0 82% 61%;
  --info: 204 92% 60%;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 22px;
  --radius-2xl: 28px;
}
```

---

# 7. CLAYMORPHISM TOKENS

Subtle clay effects should use shared tokens.

Example:

```css
:root {
  --clay-shadow-outer:
    0 8px 20px rgba(0, 0, 0, 0.28);

  --clay-shadow-highlight:
    inset 0 1px 1px rgba(255, 255, 255, 0.18);

  --clay-shadow-depth:
    inset 0 -2px 4px rgba(0, 0, 0, 0.14);

  --clay-border:
    1px solid rgba(255, 255, 255, 0.12);
}
```

A clay-style button can use:

```css
background: linear-gradient(
  180deg,
  rgba(90, 112, 255, 0.98),
  rgba(58, 78, 222, 0.98)
);

box-shadow:
  0 8px 20px rgba(0, 0, 0, 0.25),
  inset 0 1px 1px rgba(255, 255, 255, 0.22),
  inset 0 -2px 4px rgba(0, 0, 0, 0.14);

border: 1px solid rgba(255, 255, 255, 0.14);
```

## Do Not

Do not use:

- Huge pill inflation
- Cartoon bubble UI everywhere
- Excessive embossing
- Overly bright plastic surfaces
- Very large inner shadows
- Clay styling on every note body

---

# 8. BACKGROUND SYSTEM

The background should visually anchor the application.

Supported types:

- Image
- Gradient
- Solid
- Pattern
- Animated background
- Video

Recommended built-in themes:

- Cozy Night
- Study Room
- Minimal
- Dark
- Anime
- Nature
- Pastel
- Retro
- Cyber

Effects:

- Blur
- Brightness
- Saturation
- Contrast
- Opacity
- Vignette
- Grain
- Tint

Recommended default treatment:

```text
Blur: 10–18px
Brightness: 70–85%
Saturation: 90–110%
Dark overlay: 20–32%
```

Important:

The blur affects the **background layer**, not the notes or main UI.

---

# 9. APPLICATION SHELL

Desktop: full-width solid top navigation, then a transparent Board with To Do, In Progress, Review, Done, and Ideas lanes. Each lane contains a header and paper notes and is separated from its neighbor only by a thin vertical rule. Floating view controls sit bottom-left and zoom controls bottom-right. Keep five practical 280–360px note widths where space permits; use horizontal Board scrolling at narrower widths. A permanent sidebar and right design rail must not shrink the Board.

---

# 10. TOP NAVIGATION

The top navigation uses a clean solid dark surface without backdrop blur.

Recommended height:

```text
70–80px
```

Primary content:

## Left

- Logo
- Tackly name
- Optional workspace picker

## Center

- Board
- Calendar
- Timeline
- Notes
- Analytics

## Right

- Search
- `Ctrl + K`
- Theme button
- Notifications
- User profile

Example:

```text
[ N ] Tackly     [ Board ] Calendar Timeline Notes Analytics     [ Search... Ctrl K ]  ☼  🔔  Avatar
```

### Active navigation item

The active item should have:

- Stronger background
- Slight clay depth
- Raised appearance
- Clear icon
- Strong text contrast

---

# 11. BOARD ACCESS WITHOUT A PERMANENT SIDEBAR

Future workspace and board navigation can use a dropdown, command menu, drawer, or dedicated page. Do not display a permanent sidebar on the main Board. Keep the current Milestone 2 Board spacious.

---

# 12. NOTE CREATION AND CONTEXTUAL CONTROLS

Each lane header shows status color, name, count, Add, and More. Add creates a blank editable notepad in that lane immediately; it must not open a setup chooser. Advanced controls belong in contextual menus or later editor surfaces, not a permanent toolbar spanning the Board.

---

# 13. CANVAS MODE

Canvas Mode is the signature view.

Required:

- Infinite workspace
- Pan
- Zoom
- Drag cards
- Resize
- Rotate
- Multi-select
- Selection box
- Snap-to-grid
- Optional visible grid
- Z-index
- Bring forward
- Send backward
- Stack
- Group
- Pin
- Lock
- Mini-map
- Fit-to-content
- Focus mode

The background should remain visible behind notes.

Optional grid:

```text
Off
Dot Grid
Line Grid
```

Grid opacity:

```text
5–12%
```

---

# 14. STICKY NOTES

Notes should feel like actual paper objects placed above the workspace.

Default visual families:

- Sticky Note
- Notebook
- Lined Paper
- Grid Paper
- Minimal
- Dark Card
- Kraft Paper
- Checklist
- Project Card
- Image Card
- Reminder Card

Default sizes:

```text
Small: 220 × 180
Medium: 280 × 240
Large: 340 × 320
Wide: 420 × 260
Tall: 280 × 420
```

Cards remain resizable.

Recommended note corner radius:

```text
12–18px
```

---

# 15. NOTE COLORS

Default note colors may include:

- Warm yellow
- Soft pink
- Ice blue
- Mint
- Lavender
- Peach
- Neutral cream
- Dark slate
- Custom color

Colors should remain soft enough for content readability.

---

# 16. NOTE DEPTH

Notes should use light physical depth.

Example:

```css
box-shadow:
  0 12px 30px rgba(0, 0, 0, 0.18),
  0 2px 8px rgba(0, 0, 0, 0.10);
```

On drag:

```css
box-shadow:
  0 22px 50px rgba(0, 0, 0, 0.28);
```

Clay inner shadows should normally NOT be applied to the note body.

---

# 17. NOTE CONTENT HIERARCHY

Typical note:

```text
┌──────────────────────────┐
│ Project Planning      ...│
│                          │
│ □ Define requirements    │
│ □ Create roadmap         │
│ □ Assign tasks           │
│                          │
│ #work  #planning         │
│                          │
│ 📅 Sep 28         Avatar │
└──────────────────────────┘
```

Hierarchy:

1. Header
2. Main content
3. Rich blocks
4. Checklist
5. Tags
6. Metadata
7. Footer

---

# 18. NOTE HEADER

Possible controls:

- Title
- Pin
- Star
- Priority indicator
- More menu

Most actions should appear on hover or in the menu.

Avoid showing too many permanent controls.

---

# 19. NOTE COMPLETION

Completed notes can use:

- Completion icon
- Soft green indicator
- Optional strike-through
- Slightly reduced opacity
- Checked subtasks

Recommended opacity:

```text
78–90%
```

Never make completed content hard to read.

---

# 20. TAGS

Tags should use compact rounded pills.

Examples:

```text
#work
#planning
#development
#design
#important
```

Tags can have customizable colors.

---

# 21. PRIORITY

Priority levels:

- None
- Low
- Medium
- High
- Urgent

Recommended colors:

```text
None   Gray
Low    Green
Medium Amber
High   Coral
Urgent Red
```

Priority should be shown as a small accent, not an overwhelming whole-card color.

---

# 22. PUSH PINS AND PHYSICAL DETAILS

Push-pin visuals are optional decorative cues in Canvas Mode.

They can be used for:

- Pinned notes
- Important notes
- Visual personality

Use sparingly.

Do not make every card look physically pinned.

---

# 23. BLANK NOTEPAD CREATION

One Add Note action creates an Untitled paper card with empty content. Focus its title/content immediately. The note grows with entered content. Users may later add rich blocks or change appearance; they do not choose a type, style, or category before creation.

---

# 24. NOTE STYLE PICKER

Show actual visual style previews.

Styles:

- Sticky Note
- Notebook
- Lined Paper
- Grid Paper
- Minimal
- Dark Card
- Kraft Paper

Selected style should have:

- Accent outline
- Raised clay-like selected state
- Check or highlight

---

# 25. RICH EDITOR

Use Tiptap.

Supported blocks:

- Text
- Heading
- Checklist
- Bullet List
- Numbered List
- Image
- Video
- File
- Code
- Quote
- Divider
- Link
- Embed
- Table

Editor controls should use compact tactile icon buttons.

Do not over-style the writing area.

The content itself should remain clean.

---

# 26. SLASH COMMAND

Typing `/` opens:

```text
Basic
  Text
  Heading
  Bullet List
  Numbered List
  Checklist

Media
  Image
  Video
  File
  Embed

Advanced
  Table
  Code
  Quote
  Divider
  Link
```

Must support:

- Search
- Keyboard navigation
- Enter to insert
- Escape to dismiss

---

# 27. GRID VIEW

Grid View should display responsive cards.

Desktop target:

```text
4–6 columns depending on viewport
```

Grid cards emphasize:

- Cover
- Title
- Count
- Tags
- Last edit
- Small status icon

Cards may use a small clay-raised header icon or category badge.

---

# 28. LIST VIEW

Recommended row height:

```text
58–72px
```

Row contents:

- Icon
- Title
- Description
- Tag
- Date
- Priority
- Status
- More menu

List rows should remain relatively flat.

Only controls and active rows should use stronger depth.

---

# 29. KANBAN VIEW

Default columns:

- To Do
- In Progress
- Review
- Done

Optional:

- Backlog
- Ideas
- Blocked

Column design:

- Dark translucent container
- Soft border
- Rounded corners
- Colored header accent
- Item count
- Add button

Cards should drag smoothly between columns.

---

# 30. CALENDAR VIEW

Supported modes:

- Day
- Week
- Month
- Year

Month is the primary prototype view.

Tasks use colored pills.

Selected day and important controls may use subtle clay-style raised states.

---

# 31. TIMELINE VIEW

Timeline should provide:

- Project rows
- Week/month/quarter scope
- Colored task bars
- Horizontal scrolling
- Date markers
- Category colors

Keep the timeline visually clean.

---

# 32. FOCUS MODE

Focus Mode opens a selected note as a large centered document.

Background should:

- Dim
- Blur
- Or hide distractions

Header:

- Close
- Undo
- Redo
- Share
- More

The writing surface should be clean and paper-like.

---

# 33. BACKGROUND SETTINGS

Tabs:

- Background
- Colors
- Effects
- Advanced

Controls:

- Thumbnail picker
- Upload
- Blur
- Brightness
- Saturation
- Contrast
- Opacity
- Vignette
- Grain

Use sliders with subtle raised thumb controls.

All changes should preview live.

---

# 34. THEME PRESETS

Default:

- Cozy Dark
- Minimal
- Dark
- Anime
- Nature
- Pastel
- Retro
- Cyber
- Custom

Theme thumbnail selection should use a clay-style selected state.

---

# 35. QUICK ACTIONS

Quick actions:

- New Note
- Task
- Reminder
- Import
- Search

Primary add action should be the strongest clay control in this area.

---

# 36. SEARCH

Search placeholder:

```text
Search notes, tasks, or anything...
```

Shortcut:

```text
Ctrl + K
```

Search results should cover:

- Notes
- Content
- Tags
- Categories
- Boards
- Workspaces
- Attachments

---

# 37. COMMAND PALETTE

Commands:

- Search
- Create Note
- Create Task
- Switch Board
- Switch Workspace
- Change Layout
- Open Settings
- Open Calendar
- Toggle Theme

Use a solid dark container with a restrained selected row.

---

# 38. CONTEXT MENU

Right-click note:

```text
Open
Edit
Duplicate
Pin / Unpin
Lock / Unlock
Mark Done / Incomplete
Change Color
Change Style
Change Priority
Add Tag
Move to Board
Move to Workspace
Group
Stack
Bring to Front
Send to Back
Archive
Delete
```

Dangerous actions must be visually separated.

---

# 39. PROPERTIES PANEL

Optional right-side panel for selected note.

Sections:

- Appearance
- Task
- Tags
- Dates
- Attachments
- Advanced

The optional panel should use a solid surface and must not be permanently visible on the Board.

Individual interactive controls may use mild clay depth.

---

# 40. SETTINGS

Sections:

- General
- Appearance
- Background
- Cards
- Editor
- Notifications
- Shortcuts
- Data
- Backup
- Privacy
- Account

Use:

```text
Desktop: left settings nav + content panel
Mobile: stacked sections / full-screen sheet
```

---

# 41. DASHBOARD

Dashboard sections:

- Today
- Overdue
- Upcoming
- High Priority
- Recently Edited
- Completed Today
- Pinned Notes
- Recent Boards

Summary stat cards can use very subtle clay depth.

---

# 42. ANALYTICS

Possible metrics:

- Tasks completed today
- Tasks this week
- Tasks this month
- Current streak
- Active boards
- Most active category

Use:

- Small cards
- Bars
- Progress rings
- Compact charts

Do not turn the app into an analytics dashboard.

---

# 43. BOTTOM CONTROLS

Bottom-left:

```text
[ Board View ▼ ] [ Grid ] [ List ] [ Calendar ]
```

Bottom-right:

```text
[ − ] [ 100% ] [ + ] [ Fullscreen ]
```

The groups use solid dark fills, thin borders, and small shadows.

Individual buttons may use subtle claymorphism.

---

# 44. BUTTON SYSTEM

## Primary button

Use for:

- Add Note
- Save important dialog
- Confirm major non-destructive action

Characteristics:

- Strong accent
- Rounded
- Mild clay depth
- Visible hover
- Tactile active state

## Secondary button

Use for:

- Select
- Drag
- Filter
- Sort
- Secondary actions

Characteristics:

- Dark solid
- Lower depth
- Soft border

## Ghost button

Use for:

- Toolbar icons
- Inline actions
- Secondary menus

Characteristics:

- Mostly flat
- Small hover surface

---

# 45. CLAY INTERACTION STATES

## Default

Raised by 1–2 visual depth levels.

## Hover

- Slightly brighter
- Shadow increases subtly
- No large scale jump

## Active / pressed

Use:

- Slight inset shadow
- Translate Y by 1px
- Reduced outer shadow

Example:

```css
transform: translateY(1px);

box-shadow:
  inset 0 2px 5px rgba(0, 0, 0, 0.20),
  inset 0 1px 1px rgba(255, 255, 255, 0.08);
```

This is important to make clay controls feel tactile.

---

# 46. HOVER SYSTEM

Cards:

```text
translateY(-1px)
slightly stronger shadow
```

Buttons:

```text
brightness + subtle shadow
```

Icons:

```text
opacity/foreground increase
```

Do not use exaggerated scale animations.

---

# 47. DRAGGING STATE

When dragging:

- Raise z-index
- Increase shadow
- Optional scale 1.01
- Hide unnecessary inline controls
- Show drop target where applicable

Dragging should feel physical but precise.

---

# 48. MOTION

Use Motion.

Timing:

```text
Fast: 120–160ms
Normal: 180–240ms
Large: 260–340ms
```

Spring motion may be used for:

- Drag release
- Panel opening
- Quick action expansion

Respect:

```text
prefers-reduced-motion
```

---

# 49. TYPOGRAPHY

Recommended:

- Geist
- Inter
- Manrope

Default recommendation:

**Geist**

Scale:

```text
App title:      18–22px / 600–700
Page heading:   22–30px / 650–750
Card title:     15–18px / 600–700
Body:           13–16px / 400–500
Metadata:       11–13px / 400–500
Tiny label:     10–12px / 500–600
```

---

# 50. ICONS

Use Lucide React.

Recommended common size:

```text
16–20px
```

Primary controls:

```text
18–22px
```

Do not mix unrelated icon families.

---

# 51. SPACING

Recommended scale:

```text
4
6
8
10
12
16
20
24
32
40
48
```

---

# 52. BORDER SYSTEM

Board lane dividers are 1px, low-to-medium contrast, and extend through most of the workspace height. Do not draw an outer border around an entire lane. Cards may use a soft paper edge; solid controls may use a thin dark-theme border.

# 53. SOLID SURFACES

Header, menus, dialogs, toolbars, and bottom controls use solid colors rather than translucent or frosted treatments. The Board workspace itself remains open to the customizable background. Reserve blur, brightness, and saturation effects for the background layer.

---

# 54. RESPONSIVE DESIGN

Breakpoints:

```text
Mobile: < 640px
Tablet: 640–1023px
Desktop: 1024–1439px
Large Desktop: ≥ 1440px
```

---

# 55. MOBILE NAVIGATION

Mobile should use:

- Compact top bar
- Bottom navigation or menu
- Floating Add button
- Bottom sheets
- Full-screen editor when needed

Suggested bottom nav:

```text
Home
Board
Add
Calendar
More
```

---

# 56. MOBILE CANVAS

Support:

- Tap select
- Single-finger card drag
- Two-finger pan
- Pinch zoom
- Long-press menu
- Full-screen note editing

Minimum touch target:

```text
44 × 44px
```

---

# 57. TABLET

Tablet keeps:

- Full-width open Board
- Full board
- Top toolbar
- Touch canvas
- Large cards
- Responsive sheets

Tablet is a primary productivity layout, not stretched mobile.

---

# 58. EMPTY STATES

Board:

```text
Your board is empty.

Create your first note and start organizing your workspace.

[ + Add Note ]
```

Search:

```text
No matching notes found.
Try another search or clear filters.
```

Trash:

```text
Trash is empty.
```

---

# 59. LOADING

Prefer skeletons.

Use for:

- Boards
- Notes
- Dashboard
- Search

Avoid full-screen spinners for minor refreshes.

---

# 60. ERRORS

Examples:

```text
Could not save this note.
Retry
```

```text
Upload failed.
The file may be too large.
```

Never silently lose user edits.

---

# 61. TOASTS

Good uses:

- Note created
- Duplicated
- Archived
- Restored
- Upload complete
- Background changed

Do not show a toast for every autosave.

---

# 62. ACCESSIBILITY

Required:

- Keyboard navigation
- Visible focus
- ARIA labels
- Accessible dialogs
- Accessible context menus
- Sufficient contrast
- Reduced motion
- Semantic HTML
- 44px mobile targets
- No color-only status communication

---

# 63. FRONTEND STACK

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
```

---

# 64. LIBRARY RESPONSIBILITIES

## Next.js

- App Router
- Layouts
- Routing
- Server/client boundaries
- Loading/error routes

## React

- Components
- Interactive workspace
- Editor
- Board views

## Tailwind CSS

- Layout
- Spacing
- Tokens
- Responsive styling

## shadcn/ui

- Dialog
- Sheet
- Dropdown
- Context Menu
- Command
- Tooltip
- Popover
- Slider
- Select
- Checkbox
- Switch
- Tabs
- Toast

## Zustand

Use for UI state:

- Active board
- Active workspace
- Canvas viewport
- Selection
- Drag state
- Filters
- Sorting
- Open panels
- Temporary transforms

## Tiptap

Use for:

- Rich note editor
- Blocks
- Slash commands
- Checklist
- Embeds

## dnd-kit

Use for:

- Kanban
- Reordering
- Sortable lists
- Structured drag/drop

## TanStack Query

Use for:

- Supabase-backed server state
- Caching
- Mutations
- Optimistic updates

## Motion

Use for:

- Transition polish
- Panels
- Dialogs
- Hover
- Completion
- Layout transitions

## Zod

Use for:

- Form validation
- Note inputs
- Imports
- Settings
- Upload metadata

---

# 65. COMPONENT TREE

```text
AppShell
├── AppBackground
├── TopNavigation
└── BoardWorkspace
    ├── OpenStatusLanes
    │   ├── LaneHeader
    │   └── PaperNoteCard
    ├── AlternateBoardViews
    └── FloatingViewAndZoomControls
```

Workspace selectors, editor surfaces, and settings can be added contextually in later milestones.

---

# 66. NOTE COMPONENT

```text
NoteCard
├── NoteHeader
│   ├── Priority
│   ├── Title
│   ├── Pin
│   └── MoreMenu
├── NoteCover
├── NoteContent
├── NoteChecklist
├── NoteTags
└── NoteFooter
    ├── DueDate
    ├── Progress
    └── Avatar
```

---

# 67. FILE STRUCTURE

```text
src/
├── app/
├── components/
│   ├── shell/
│   ├── board/
│   ├── notes/
│   ├── editor/
│   └── ui/
├── features/
├── hooks/
├── styles/
├── types/
└── config/
```

No separate creation-mode or starter-library directory is required.

---

# 68. REQUIRED DESIGN CONFIG FILES

Prefer:

```text
src/styles/tokens.css
src/config/themes.ts
src/config/note-styles.ts
src/config/layouts.ts
```

Do not scatter design configuration.

---

# 69. PROTOTYPE SCREEN SET

The frontend may later provide Board, Canvas, Grid, List, Calendar, Timeline, Focus, Background Settings, Theme Settings, Dashboard, Analytics, Search/Command Palette, Trash/Archive, and Mobile Board screens. These are alternate surfaces for the same note content, not separate creation types.

---

# 70. APPROVED MAIN PROTOTYPE CHARACTERISTICS

Use this specification for Tackly branding placement, header organization, status colors, scenic background, and note-card proportions. Apply the approved direction: solid header, open divider-based lanes, pastel paper cards, no permanent sidebar or right rail, solid floating controls, and one-action blank note creation. Note styles and editor blocks remain contextual after creation.

---

# 71. DESIGN CONSISTENCY

All screens must share:

- Same radius system
- Same shadows
- Same clay depth
- Same solid surfaces
- Same border strength
- Same typography
- Same icon family
- Same spacing scale
- Same accent system
- Same interaction patterns

Do not design each screen as if it belongs to a different app.

---

# 72. PROGRESSIVE DISCLOSURE

Advanced features belong in:

- Context menus
- Dropdowns
- Properties panel
- Command palette
- Settings
- Contextual toolbars

The default board should remain calm.

---

# 73. DIRECT MANIPULATION

Prefer direct manipulation.

Examples:

```text
Move note → drag it
Resize note → use handles
Rotate note → use rotation control
Move task → drag between columns
Change note style → live preview
Change background → live preview
```

---

# 74. INSTANT FEEDBACK

Visual feedback should occur before cloud persistence.

Examples:

- Checkbox changes immediately
- Drag begins immediately
- Card appears immediately
- Note appearance changes preview immediately
- Theme previews immediately

---

# 75. SAFE DESTRUCTIVE ACTIONS

Normal delete:

```text
Move to Trash
```

Permanent delete:

```text
Require confirmation
```

Archive should be easy and reversible.

---

# 76. PERFORMANCE

Canvas performance is critical.

Use:

- Memoized note components
- Zustand selectors
- requestAnimationFrame
- Local transforms during movement
- Debounced persistence
- Lazy content
- Virtualization in dense views
- Image optimization

Do not rerender the entire board when one note moves.

---

# 77. CANVAS SAVE RULE

During drag:

```text
pointerdown
→ local interaction
→ requestAnimationFrame transform updates
→ pointerup
→ commit final state
→ sync to Supabase
```

Never write note coordinates to Supabase for every mousemove.

---

# 78. FRONTEND DEVELOPMENT ORDER

1. Solid app shell, customizable background, header, and open Board lanes.
2. One-action blank notes, then full note CRUD, colors, and checklists.
3. Canvas drag, pan, zoom, resize, and selection.
4. Tiptap rich blocks, slash commands, images, and tags.
5. Alternate Grid, List, Kanban, Calendar, and Timeline views.
6. Post-creation note appearance, theme/background customization, Focus, Dashboard, and Analytics.

---

# 79. FRONTEND AGENT RULES

The agent must:

1. Read `PRODUCT_SPEC.md`.
2. Read `FRONTEND_SPEC.md`.
3. Follow the visual direction in this specification for frontend work.
4. Preserve the approved visual direction.
5. Keep claymorphism subtle.
6. Reuse shared components.
7. Use theme tokens.
8. Maintain responsive behavior.
9. Avoid destructive rewrites of working frontend systems.
10. Keep notes and canvas performant.
11. Keep accessibility intact.
12. Preserve data when changing views.

---

# 80. FRONTEND DEFINITION OF DONE

A frontend feature is complete when:

- It follows `PRODUCT_SPEC.md`
- It follows `FRONTEND_SPEC.md`
- It follows the approved visual direction in `FRONTEND_SPEC.md`
- It uses the shared design system
- Desktop works
- Tablet behavior is acceptable
- Mobile behavior is defined
- Loading state exists where needed
- Empty state exists where needed
- Error state exists where needed
- Keyboard behavior is considered
- Focus states exist
- Reduced motion is respected
- No major layout shift occurs
- Existing features still work
- No obvious console errors remain
- User data is preserved
- It does not introduce inconsistent one-off styles

---

# 81. FINAL DESIGN PRINCIPLE

Create first. Customize afterward. Tackly should feel like a real personal desk with a clean minimal UI, open task lanes, flexible paper notepads, a customizable scenic background, and only very subtle tactile detail on compact controls.

---

