# PROJECT SPECIFICATION — CUSTOMIZABLE TO-DO, STICKY NOTES, DIGITAL NOTEBOOK & PRODUCTIVITY WORKSPACE

> This document is the primary product and development specification for the project.
>
> An AI coding agent should read this file before making architectural or feature decisions.
>
> The original product requirements below are preserved and combined with the agreed technical implementation plan.

---

I want to create a highly customizable **to-do list, sticky-note board, digital notebook, and productivity workspace website** with a clean, modern, interactive design.

The goal is to create something that feels like organizing **real sticky notes, paper notes, notebooks, and tasks on a desk**, but with the flexibility and power of a digital productivity application.

The entire website should be highly customizable so users can organize, design, and use their workspace however they want.

## Main Website Layout

At the top of the website, there should be a clean **header/navigation bar**.

The header can contain:

- Website logo/name
- Search bar
- Workspace selector
- Board selector
- Layout selector
- Sort options
- Filter options
- Theme settings
- Background settings
- Notifications
- User profile/settings
- Quick Add button

The main section of the website should display multiple notes/cards.

Each card should visually resemble:

- Sticky notes
- Paper notes
- Notebook pages
- Grid paper
- Minimal cards
- Dark cards
- Checklist cards
- Custom-designed cards

The notes should feel physical and interactive, almost like pieces of paper placed on a real desk.

## Note / Card System

Users should be able to:

- Add cards
- Edit cards
- Delete cards
- Duplicate cards
- Archive cards
- Restore cards
- Pin cards
- Lock cards
- Resize cards
- Rotate cards
- Collapse cards
- Expand cards
- Move cards
- Stack cards
- Group cards
- Bring cards to front
- Send cards to back

Each note should function as a flexible mini-document instead of just a basic text field.

## Rich Content Editor

Inside every card, users should be able to add different types of content blocks.

Supported blocks should include:

- Title
- Headings
- Paragraph text
- Description
- Numbered lists
- Bullet lists
- Checklists
- Nested tasks
- Quotes
- Dividers
- Links
- Buttons
- Tables
- Code blocks
- Images
- Videos
- GIFs
- Audio
- Files
- Documents
- Embeds
- Attachments

Users should be able to rearrange content blocks by dragging them.

A `/` command menu should also be available.

For example, typing `/` could show options like:

- Heading
- Text
- Checklist
- Bullet List
- Numbered List
- Image
- Video
- File
- Table
- Code
- Quote
- Divider
- Link

This would make the editor feel similar to modern block-based applications.

## Task System

Every note should optionally work as a task.

Tasks can include:

- Complete / Done checkbox
- Due date
- Due time
- Start date
- Priority
- Category
- Tags
- Reminder
- Recurring schedule
- Progress
- Subtasks

Users should be able to mark the entire card as complete.

Completed cards could optionally:

- Show a large checkmark
- Fade slightly
- Use strike-through text
- Change color
- Move to a Completed section
- Stay in the original position
- Automatically archive after a certain period

Users should be able to configure how completed cards behave.

## Nested Tasks

Cards should support subtasks.

Example:

Project Website

- Design homepage
- Create login page
- Build dashboard
- Add database
- Test mobile layout
- Deploy website

Each subtask should have its own checkbox.

A progress indicator should automatically calculate completion.

Example:

4 / 6 Tasks Completed

67% Complete

A visual progress bar should also appear.

## Priority System

Cards should support priorities such as:

- None
- Low
- Medium
- High
- Urgent

Priority can be shown using:

- Small colored indicator
- Icon
- Border color
- Label
- Badge

Users should be able to sort and filter cards based on priority.

## Categories

Users should be able to create unlimited categories.

Example categories:

- Personal
- School
- Work
- Projects
- Important
- Ideas
- Reminders
- Shopping
- Fitness
- Finance
- Coding

Each category should support:

- Custom name
- Custom color
- Custom icon
- Custom emoji

Cards can belong to categories.

## Tags

Cards should also support multiple tags.

Example:

#important  
#school  
#coding  
#website  
#urgent

Tags can be used for:

- Searching
- Filtering
- Sorting
- Grouping cards

## Multiple Workspaces

Users should be able to create multiple workspaces.

For example:

Personal Workspace

School Workspace

Work Workspace

Development Workspace

Ideas Workspace

Each workspace can contain multiple boards.

## Boards

Inside each workspace, users should be able to create boards.

Example:

School Workspace

Boards:

- Assignments
- Exams
- Projects
- Notes
- Schedule

Users should be able to:

- Create boards
- Rename boards
- Delete boards
- Duplicate boards
- Archive boards
- Change board icon
- Change board color
- Change board background

## Canvas Mode

One of the main features should be a **Canvas Mode**.

Canvas Mode should work like an infinite digital desk.

Users should be able to freely:

- Drag notes anywhere
- Resize notes
- Rotate notes
- Overlap notes
- Stack notes
- Group notes
- Move groups
- Zoom in
- Zoom out
- Pan around the workspace

The workspace should feel like organizing physical sticky notes on a desk or wall.

Cards should not be forced into a fixed grid unless the user enables it.

## Snap-to-Grid

Canvas Mode should have an optional:

**Snap to Grid**

When enabled, cards automatically align neatly.

When disabled, cards can be placed anywhere freely.

Users can control:

- Grid size
- Grid spacing
- Snap strength
- Grid visibility

## Mini Map

Large Canvas Mode boards should include a mini-map.

The mini-map should show:

- Current viewing area
- Card locations
- Groups
- Board boundaries

Users should be able to click the mini-map to move around quickly.

## Zoom Controls

Canvas Mode should support:

- Zoom In
- Zoom Out
- Reset Zoom
- Fit All Cards
- 50%
- 75%
- 100%
- 125%
- 150%
- 200%

Mouse wheel zooming should also be supported.

## Layout Modes

Users should be able to switch between different layouts.

Available layouts should include:

- Canvas
- Grid
- Row
- Column
- List
- Masonry
- Kanban
- Calendar
- Timeline

Changing layout should not delete or modify the card contents.

## Grid Layout

Cards automatically organize into a clean grid.

Users can control:

- Card size
- Column count
- Spacing
- Alignment

## Row Layout

Cards appear horizontally.

Useful for:

- Daily planning
- Timelines
- Project stages

## Column Layout

Cards appear vertically.

Useful for:

- Task lists
- Notes
- Study plans

## Masonry Layout

Cards automatically arrange according to their height while minimizing empty spaces.

## List Layout

Cards appear in a compact list.

Useful when users have many tasks.

## Kanban Mode

Kanban Mode should allow customizable columns.

Example:

- Backlog
- To Do
- In Progress
- Review
- Done

Users should be able to drag cards between columns.

Users should also be able to add custom columns.

## Calendar View

Cards with dates should automatically appear inside a calendar.

Calendar modes:

- Day
- Week
- Month
- Year

Users should be able to drag tasks to different dates.

## Timeline View

Timeline Mode should be useful for larger projects.

Tasks could appear based on:

- Start date
- Due date
- Duration
- Project stage

## Sorting

Users should be able to sort cards by:

- Custom order
- Date created
- Date modified
- Due date
- Priority
- Category
- Title
- Alphabetical order
- Completed
- Incomplete
- Recently edited
- Oldest
- Newest

## Filters

Users should be able to filter by:

- Category
- Tag
- Priority
- Completion status
- Due date
- Workspace
- Board
- Card type
- Created date
- Modified date

Multiple filters should work together.

## Search

A powerful search system should allow searching:

- Titles
- Descriptions
- Tags
- Categories
- Checklist items
- Attachments
- File names
- Links
- Notes

Search results should update instantly.

## Customizable Notes

Every card should have extensive appearance settings.

Users can change:

- Note color
- Background color
- Gradient
- Paper texture
- Font
- Font size
- Font color
- Alignment
- Border style
- Border thickness
- Corner radius
- Shadow
- Transparency
- Rotation
- Width
- Height
- Cover image
- Background image

## Optional Note Appearance

Each new notepad begins blank. After creation, users may adjust paper color, texture, size, and other appearance properties. Examples include classic sticky paper, notebook paper, lined paper, grid paper, minimal white, dark paper, and kraft paper. These are visual properties of one flexible notepad, not separate note types.

---

## Note Sizes

Cards should support preset sizes.

Examples:

- Tiny
- Small
- Medium
- Large
- Wide
- Tall
- Full Document

Users can also resize manually.

## Card Covers

Cards should optionally support a cover.

The cover could be:

- Image
- Gradient
- Solid color
- GIF
- Pattern

## Emoji and Icon Picker

Boards, categories, cards, and workspaces should support:

- Emojis
- Custom icons
- Uploaded icons

## Card Linking

Notes should be able to link to other notes.

Example:

Project Plan

Related Notes:

- Website Design
- Database Setup
- Deployment Checklist

Clicking the linked note should open or focus it.

## Card Grouping

Users should be able to select multiple cards and group them.

Groups can have:

- Name
- Border
- Background
- Color
- Label

Groups should be movable together.

## Card Stacking

Cards can be stacked like real sheets of paper.

Clicking the stack could show all cards inside it.

Users can drag cards into and out of a stack.

## Layer Controls

In Canvas Mode, notes should support layer controls.

Options:

- Bring Forward
- Bring to Front
- Send Backward
- Send to Back

## Right-Click Context Menu

Right-clicking a card should open a context menu.

Options could include:

- Open
- Edit
- Duplicate
- Pin
- Unpin
- Lock
- Unlock
- Mark Done
- Mark Incomplete
- Change Color
- Change Style
- Change Priority
- Add Tag
- Move to Board
- Move to Workspace
- Group
- Stack
- Bring to Front
- Send to Back
- Archive
- Delete

## Multi-Select

Users should be able to select multiple cards.

Selection methods:

- Ctrl + Click
- Shift + Click
- Drag selection box

After selecting multiple cards, users can:

- Move them
- Delete them
- Archive them
- Change category
- Change priority
- Change color
- Add tags
- Group them
- Move them to another board

## Quick Add

The main Add Note action creates one blank notepad immediately, with an Untitled title and empty content area. It must not require choosing a type, category, style, or any setup option first. Users can manually add content and customize the note afterward. Creating boards remains a separate workspace action.

---

## Command Menu

Pressing:

Ctrl + K

should open a global command menu.

Commands could include:

- Create Note
- Create Task
- Search
- Change Board
- Change Workspace
- Change Layout
- Change Theme
- Open Calendar
- Open Settings
- Create Category

## Focus Mode

Users should be able to focus on one note.

When Focus Mode is enabled:

- Background cards become blurred or hidden
- Selected card becomes centered
- Distractions are minimized

Useful for:

- Writing
- Studying
- Planning
- Working on complex tasks

## Create First, Customize Afterward

Tackly has no template system. A user clicks Add Note, receives a blank notepad immediately, and then manually adds text, headings, checklists, lists, images, video, links, files, code, quotes, dividers, embeds, or other supported rich-content blocks. The same flexible notepad can become a task list, project plan, study note, meeting note, reminder, shopping list, image post, or mixed-media post. Color, paper style, size, priority, tags, due date, pin, and lock are post-creation properties.

---

## Reminder System

Cards should support reminders.

Examples:

- 10 minutes before
- 30 minutes before
- 1 hour before
- 1 day before
- Custom time

Reminders could appear through:

- Website notification
- Browser notification
- Optional email notification

## Recurring Tasks

Tasks should support recurring schedules.

Examples:

- Daily
- Every weekday
- Weekly
- Monthly
- Yearly
- Custom

Example:

Study Programming

Repeat:

Every Monday, Wednesday, and Friday

## Daily Dashboard

A dashboard should show important information.

Sections:

- Today
- Overdue
- Upcoming
- High Priority
- Recently Edited
- Completed Today
- Pinned Notes
- Recent Boards

## Statistics

Users should have optional productivity statistics.

Examples:

- Tasks completed today
- Tasks completed this week
- Tasks completed this month
- Current streak
- Average tasks completed per day
- Most active category
- Most active workspace

Charts can be used to visualize progress.

## Background Customization

The website background should be highly customizable.

Users can use:

- Uploaded images
- Built-in wallpapers
- Gradients
- Solid colors
- Animated backgrounds
- Patterns
- Videos

## Background Effects

Users should be able to customize:

- Blur
- Brightness
- Darkness
- Saturation
- Contrast
- Opacity
- Vignette
- Grain
- Tint

The background should optionally be blurred so the sticky notes remain the primary focus.

## Theme Presets

Include built-in themes such as:

- Cozy Desk
- Minimal White
- Dark Workspace
- Study Room
- Nature
- Anime
- Warm Minimal
- Retro Desktop
- Cyber
- Pastel
- Paper Notebook
- Wooden Desk

Each theme could change:

- Background
- Card appearance
- Shadows
- Fonts
- Colors
- Buttons
- UI effects

## Light and Dark Mode

Include:

- Light Mode
- Dark Mode
- System Mode

Users should also be able to create custom themes.

## Activity History

Users should be able to see recent activity.

Example:

10:25 PM — Edited "Website Project"

10:18 PM — Completed "Database Setup"

9:55 PM — Created "Study Notes"

Activity history could include:

- Created
- Edited
- Deleted
- Restored
- Moved
- Completed
- Archived

## Version History

Notes should automatically save previous versions.

Users should be able to:

- View previous versions
- Compare changes
- Restore previous versions

This protects against accidental changes.

## Undo and Redo

The entire workspace should support:

Ctrl + Z

Undo

Ctrl + Y

Redo

This should work for:

- Moving cards
- Deleting cards
- Editing notes
- Resizing
- Changing colors
- Grouping
- Sorting

## Trash System

Deleted cards should go to a Trash section.

Users can:

- Restore cards
- Permanently delete cards
- Empty trash

Trash can optionally automatically clear after a certain period.

## Archive

Completed or old cards can be archived.

Archived cards should remain searchable and restorable.

## Auto Save

Everything should automatically save.

Show a small status indicator:

Saving...

Saved

Offline

Syncing...

## Offline Mode

The website should continue working without internet.

Changes should save locally.

When the user reconnects, the website should synchronize changes.

## Import

Users should be able to import:

- JSON
- Markdown
- TXT
- CSV
- Images

## Export

Users should be able to export:

- Individual notes
- Boards
- Workspaces

Supported formats could include:

- JSON
- Markdown
- TXT
- PDF
- PNG image
- Backup file

## Board Screenshot

Users should be able to export the current board as an image.

This should capture:

- Background
- Notes
- Layout
- Decorations

## Keyboard Shortcuts

Useful shortcuts should include:

Ctrl + N — New Note

Ctrl + K — Command Menu

Ctrl + F — Search

Ctrl + Z — Undo

Ctrl + Y — Redo

Delete — Delete Selected Note

Ctrl + D — Duplicate

Ctrl + A — Select All Cards

Esc — Close / Deselect

Users should be able to customize shortcuts.

## Drag and Drop

Drag-and-drop should be used throughout the website.

Users should be able to drag:

- Cards
- Content blocks
- Images
- Files
- Categories
- Boards
- Kanban tasks

Animations should feel smooth and responsive.

## Animations

The interface should include subtle animations.

Examples:

- Smooth card movement
- Hover effects
- Card lift when dragging
- Soft shadows
- Completion animation
- Smooth layout transitions
- Fade effects

Animations should remain lightweight and optional.

## Pinning

Important cards should be pinnable.

Pinned cards can:

- Stay at the top
- Stay visible
- Stay fixed in Canvas Mode

## Locking

Cards should be lockable.

When locked:

- Cannot move
- Cannot resize
- Cannot accidentally edit

Users can unlock them from the context menu.

## Full-Screen Note Editing

Double-clicking a card could open a full-screen editor.

This allows users to comfortably edit longer notes or documents.

## Collaboration

This could be added later as an optional feature.

Users could:

- Share boards
- Invite users
- Collaborate in real time
- Comment on cards
- Mention users
- Assign tasks

## Comments

Cards could support optional comments.

Useful for collaboration or personal notes.

## User Accounts

Users should be able to create accounts.

Account features:

- Profile
- Avatar
- Username
- Email
- Password
- Cloud sync
- Preferences
- Theme settings
- Workspace settings

## Cloud Synchronization

User data should automatically synchronize across devices.

For example:

Desktop

Laptop

Tablet

Phone

Changes made on one device should appear on other devices.

## Responsive Design

The website must work properly on:

- Desktop
- Laptop
- Tablet
- Mobile

On mobile, Canvas Mode can use touch controls.

Support:

- Dragging
- Pinch zoom
- Long press
- Swipe actions

## Settings

Users should have a complete Settings page.

Sections could include:

General

Appearance

Background

Cards

Editor

Notifications

Shortcuts

Data

Backup

Privacy

Account

## Performance

The website should remain fast even with hundreds or thousands of notes.

Use:

- Lazy loading
- Efficient rendering
- Optimized images
- Virtualized lists
- Local caching

## Overall Design Direction

The website should feel:

- Modern
- Clean
- Cozy
- Interactive
- Highly customizable
- Smooth
- Responsive
- Organized
- Creative

The UI should not feel overcrowded even though many features are available.

Advanced options should be hidden inside:

- Right-click menus
- Dropdown menus
- Settings panels
- Command menu
- Toolbars

This keeps the main workspace visually clean.

## Main Concept

The final product should feel like a combination of:

- To-Do List
- Sticky Note Board
- Digital Notebook
- Infinite Canvas
- Project Manager
- Kanban Board
- Calendar
- Personal Workspace

The biggest focus should be **freedom and customization**.

Users should be able to build their workspace however they want, whether they prefer a clean task list, organized columns, a Kanban board, a calendar, or a completely freeform desk covered with digital sticky notes.

The application should feel like a real personal desk that users can organize, decorate, customize, and use for almost anything.

---

# TECHNICAL IMPLEMENTATION SPECIFICATION

## Chosen Technology Stack

The project MUST use this stack unless there is a strong technical reason to change a specific dependency:

- **Next.js**
- **React**
- **TypeScript**
- **Supabase**
- **Tailwind CSS**
- **shadcn/ui**
- **Zustand**
- **Tiptap**
- **dnd-kit**
- **TanStack Query**
- **Motion**
- **Zod**

### Responsibilities

#### Next.js
Use Next.js as the application framework.

Responsibilities:

- App Router
- Page routing
- Layouts
- Server Components where appropriate
- Client Components where interaction is required
- Route Handlers / API endpoints
- Server Actions where appropriate
- Metadata
- Authentication-aware layouts
- Deployment compatibility

#### React
Use React for all interactive interface components.

React will power:

- Notes
- Cards
- Canvas
- Dialogs
- Settings
- Filters
- Boards
- Workspaces
- Rich editor
- Kanban
- Calendar interactions
- Context menus
- Dragging and selection interfaces

#### TypeScript
The entire project should use TypeScript.

Avoid `any` unless absolutely necessary.

Important application entities should have clear interfaces or types.

Examples:

```ts
type Priority = "none" | "low" | "medium" | "high" | "urgent";

type LayoutMode =
  | "canvas"
  | "grid"
  | "row"
  | "column"
  | "list"
  | "masonry"
  | "kanban"
  | "calendar"
  | "timeline";

interface Note {
  id: string;
  boardId: string;
  userId: string;

  title: string;
  content: unknown;

  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;

  completed: boolean;
  pinned: boolean;
  locked: boolean;
  archived: boolean;

  priority: Priority;

  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

#### Supabase
Supabase should provide the backend platform.

Use Supabase for:

- Authentication
- PostgreSQL database
- Storage
- Realtime later
- Row Level Security
- User-scoped data access
- Cloud synchronization

Do not create a second authentication system or separate database unless required.

#### Tailwind CSS
Use Tailwind CSS for styling.

Use utility classes consistently and create reusable design tokens for:

- Colors
- Spacing
- Shadows
- Radius
- Typography
- Note styles
- Layout spacing

#### shadcn/ui
Use shadcn/ui for reusable interface primitives.

Recommended components:

- Dialog
- Dropdown Menu
- Context Menu
- Command
- Popover
- Tooltip
- Sheet
- Tabs
- Select
- Checkbox
- Switch
- Slider
- Toast
- Alert Dialog
- Scroll Area
- Separator

Do not force shadcn components where a custom interaction is better.

#### Zustand
Use Zustand for fast client-side UI and workspace state.

Recommended Zustand stores:

```text
useWorkspaceStore
useBoardStore
useCanvasStore
useSelectionStore
useCardStore
useEditorStore
useSettingsStore
useHistoryStore
```

State examples:

- Active workspace
- Active board
- Selected notes
- Canvas zoom
- Canvas pan
- Dragging state
- Temporary card positions
- Current filters
- Current sort
- Theme
- Background settings
- Modal states
- Context menu state
- Undo/redo snapshots where appropriate

Persistent cloud data should remain in Supabase.

Do not use Zustand as the permanent database.

#### Tiptap
Use Tiptap for rich note editing.

Support block-based content such as:

- Paragraph
- Heading
- Bullet list
- Ordered list
- Task list
- Task item
- Blockquote
- Divider
- Code block
- Link
- Image
- Video/embed
- Table
- File/attachment block
- Custom callout
- Custom button if needed

Implement a slash-command menu.

Typing:

```text
/
```

should open commands such as:

```text
Text
Heading
Checklist
Bullet List
Numbered List
Image
Video
File
Table
Code
Quote
Divider
Link
```

Tiptap JSON should be preferred for persistent rich content.

#### dnd-kit
Use dnd-kit for structured drag-and-drop.

Use it for:

- Kanban cards
- Reordering lists
- Reordering categories
- Reordering content blocks where appropriate
- Reordering boards
- Reordering grouped items

Canvas free-position dragging may use a custom pointer/transform system rather than forcing all infinite-canvas behavior into dnd-kit.

#### TanStack Query
Use TanStack Query for server data synchronization and caching.

Use it for:

- Workspaces
- Boards
- Notes
- Categories
- Tags
- Attachments
- Search results
- Dashboard data
- Activity history

Recommended behavior:

- Optimistic updates
- Query invalidation
- Background refetch
- Retry where appropriate
- Mutations with rollback on failure

Do not use it for high-frequency mouse movement.

#### Motion
Use Motion for lightweight animations.

Examples:

- Note hover
- Drag lift
- Dialog transitions
- Card completion
- Layout transitions
- Sidebar transitions
- Context menu animation
- Focus mode transitions

Animations should never block interaction.

Users should be able to reduce or disable animations.

#### Zod
Use Zod for validation.

Validate:

- Forms
- Settings
- Note mutations
- API input
- File metadata
- Workspace creation
- Board creation
- User preferences
- Import data

Never trust client input without validation.

---

# PRODUCT ARCHITECTURE

## Core Data Hierarchy

```text
User
└── Workspaces
    └── Boards
        ├── Notes / Cards
        │   ├── Rich Content
        │   ├── Tasks
        │   ├── Attachments
        │   ├── Tags
        │   ├── Categories
        │   ├── Links
        │   └── Versions
        ├── Groups
        ├── Stacks
        └── Board Settings
```

## Main Application Areas

```text
Application
├── Authentication
├── Dashboard
├── Workspaces
├── Boards
│   ├── Canvas
│   ├── Grid
│   ├── Row
│   ├── Column
│   ├── List
│   ├── Masonry
│   ├── Kanban
│   ├── Calendar
│   └── Timeline
├── Notes
├── Search
├── Notifications
├── Archive
├── Trash
└── Settings
```

---

# SUPABASE DATABASE DESIGN

The exact schema can evolve during implementation, but the project should begin with these entities.

## profiles

```text
id
username
display_name
avatar_url
created_at
updated_at
```

`id` should reference the authenticated Supabase user.

## workspaces

```text
id
owner_id
name
icon
color
position
created_at
updated_at
archived_at
```

## boards

```text
id
workspace_id
owner_id
name
icon
color
layout_mode
background_settings
settings
position
created_at
updated_at
archived_at
```

## notes

```text
id
board_id
owner_id

title
content

x
y
width
height
rotation
z_index

note_style
background
cover_url

priority

completed
completed_at

pinned
locked
collapsed
archived

start_at
due_at

group_id
stack_id

created_at
updated_at
deleted_at
```

Use `jsonb` where flexible settings or structured editor content are appropriate.

## categories

```text
id
workspace_id
owner_id
name
color
icon
emoji
created_at
updated_at
```

## note_categories

```text
note_id
category_id
```

## tags

```text
id
workspace_id
owner_id
name
color
created_at
```

## note_tags

```text
note_id
tag_id
```

## subtasks

```text
id
note_id
title
completed
position
created_at
updated_at
```

## attachments

```text
id
note_id
owner_id
file_name
file_type
mime_type
file_size
storage_path
public_url
metadata
created_at
```

## note_links

```text
id
source_note_id
target_note_id
created_at
```

## note_versions

```text
id
note_id
owner_id
content
metadata
created_at
```

## groups

```text
id
board_id
owner_id
name
color
x
y
width
height
settings
created_at
updated_at
```

## stacks

```text
id
board_id
owner_id
name
settings
created_at
updated_at
```

## reminders

```text
id
note_id
owner_id
remind_at
repeat_rule
status
created_at
updated_at
```

## user_settings

```text
id
user_id
theme
appearance
background_preferences
editor_preferences
notification_preferences
shortcut_preferences
accessibility_preferences
created_at
updated_at
```

## activity_logs

```text
id
owner_id
workspace_id
board_id
note_id
action
metadata
created_at
```

---

# SUPABASE SECURITY

Row Level Security MUST be enabled for user-owned tables.

The default rule should be:

> Users can only read, create, update, and delete data that belongs to them unless the data is explicitly shared through a future collaboration system.

Do not rely only on frontend filtering.

Ownership must be enforced at the database level.

Examples:

- A user cannot fetch another user's private workspace.
- A user cannot modify another user's note.
- Storage paths must be scoped by user.
- Uploads must respect storage policies.

---

# SUPABASE STORAGE

Recommended buckets:

```text
avatars
note-images
note-videos
attachments
backgrounds
covers
imports
exports
```

Preferred path structure:

```text
/user-id/workspace-id/board-id/file
```

or an equivalent securely scoped structure.

Do not store large binary files directly in PostgreSQL.

Store file metadata and storage paths in the database.

---

# CANVAS IMPLEMENTATION

Canvas Mode is the signature feature of the project.

It should feel like an infinite desk.

## Required Canvas Features

- Infinite workspace
- Pan
- Zoom
- Drag notes freely
- Resize notes
- Rotate notes
- Overlap notes
- Z-index
- Multi-select
- Selection rectangle
- Group movement
- Snap-to-grid
- Optional visible grid
- Mini-map
- Fit-to-content
- Bring forward/backward
- Lock position
- Pin notes
- Card stacking
- Keyboard movement when selected
- Touch controls later

## Coordinate Model

Each note must store persistent canvas coordinates.

Example:

```ts
interface CanvasTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}
```

Canvas viewport state should be separate:

```ts
interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}
```

Viewport state may be persisted per board or per user.

## Performance Rules

Do not send database writes on every mousemove.

Recommended flow:

```text
pointerdown
→ local drag state
→ requestAnimationFrame updates
→ pointerup
→ optimistic local save
→ debounced/persisted Supabase update
```

Card dragging should feel immediate even on slower networks.

---

# OFFLINE AND AUTOSAVE STRATEGY

The app should feel local-first even though Supabase is the cloud backend.

Recommended future implementation:

- IndexedDB for offline cache
- Local pending mutation queue
- Optimistic UI
- Background synchronization
- Conflict handling
- Sync status indicator

Statuses:

```text
Saved
Saving...
Syncing...
Offline
Sync Error
```

Avoid saving to Supabase on every keystroke.

Use debouncing.

A practical editor flow:

```text
User types
→ update local editor state immediately
→ debounce
→ save draft locally
→ sync to Supabase
```

---

# APPLICATION STATE RULES

Use the correct tool for the correct state.

## Supabase

Use for durable cloud data.

Examples:

- Workspaces
- Boards
- Notes
- Tags
- Categories
- Attachments
- Settings
- Activity logs

## TanStack Query

Use for:

- Fetching Supabase-backed application data
- Caching
- Mutations
- Optimistic updates
- Invalidating queries

## Zustand

Use for:

- Current UI state
- Selection
- Canvas transforms during interaction
- Current modal
- Current context menu
- Filters
- Sort state
- Temporary drag state
- UI preferences that do not immediately require server persistence

## Component State

Use normal React component state for small isolated state.

Do not put everything into Zustand.

---

# SUGGESTED PROJECT STRUCTURE

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   │
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── workspace/
│   │   ├── board/
│   │   ├── archive/
│   │   ├── trash/
│   │   └── settings/
│   │
│   ├── api/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── app/
│   ├── board/
│   ├── canvas/
│   │   ├── canvas.tsx
│   │   ├── canvas-card.tsx
│   │   ├── canvas-grid.tsx
│   │   ├── minimap.tsx
│   │   ├── selection-box.tsx
│   │   ├── zoom-controls.tsx
│   │   └── resize-handles.tsx
│   │
│   ├── cards/
│   ├── editor/
│   │   ├── editor.tsx
│   │   ├── slash-menu.tsx
│   │   ├── toolbar.tsx
│   │   └── extensions/
│   │
│   ├── kanban/
│   ├── calendar/
│   ├── timeline/
│   ├── dashboard/
│   ├── settings/
│   ├── dialogs/
│   ├── menus/
│   └── ui/
│
├── features/
│   ├── auth/
│   ├── workspaces/
│   ├── boards/
│   ├── notes/
│   ├── categories/
│   ├── tags/
│   ├── reminders/
│   ├── attachments/
│   ├── history/
│   └── search/
│
├── hooks/
├── lib/
│   ├── supabase/
│   ├── validation/
│   ├── storage/
│   ├── sync/
│   ├── editor/
│   └── utils/
│
├── stores/
│   ├── workspace-store.ts
│   ├── board-store.ts
│   ├── canvas-store.ts
│   ├── selection-store.ts
│   ├── settings-store.ts
│   └── history-store.ts
│
├── types/
├── styles/
└── config/
```

---

# DESIGN SYSTEM

The UI should feel:

- Modern
- Clean
- Cozy
- Creative
- Responsive
- Smooth
- Minimal when idle
- Powerful when needed

Advanced functionality should appear through:

- Right-click context menus
- Dropdowns
- Command palette
- Settings panels
- Toolbars
- Keyboard shortcuts

Avoid permanently displaying every possible action.

## Theme System

Use CSS variables so themes can change the entire interface without rewriting components.

Example:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --card: 48 100% 90%;
  --card-foreground: 222 47% 11%;
  --accent: 239 84% 67%;
  --radius: 0.75rem;
}
```

Theme presets can update variables and workspace/background settings.

---

# BACKGROUND SYSTEM

Supported background types:

```text
solid
gradient
image
pattern
animated
video
```

Background settings:

```ts
interface BackgroundSettings {
  type: "solid" | "gradient" | "image" | "pattern" | "animated" | "video";
  source?: string;
  blur: number;
  brightness: number;
  saturation: number;
  contrast: number;
  opacity: number;
  vignette: number;
  grain: number;
  tint?: string;
}
```

The blur/effects should apply to the background layer, not blur the note content.

---

# SEARCH SYSTEM

Search should cover:

- Titles
- Note text
- Rich editor text
- Tags
- Categories
- Subtasks
- Attachments
- File names
- Links
- Board names
- Workspace names

Start with PostgreSQL text search and normal indexed filtering.

More advanced search can be added later.

---

# COMMAND PALETTE

Use a global command palette with:

```text
Ctrl + K
```

Commands:

- Create note
- Create task
- Create board
- Search
- Switch workspace
- Switch board
- Change layout
- Open calendar
- Open settings
- Toggle theme
- Create category
- Focus selected note

Use shadcn/ui Command as a base.

---

# KEYBOARD SHORTCUTS

Initial shortcuts:

```text
Ctrl + N    New note
Ctrl + K    Command menu
Ctrl + F    Search
Ctrl + Z    Undo
Ctrl + Y    Redo
Ctrl + D    Duplicate selected note
Ctrl + A    Select all visible notes
Delete      Delete selected note(s)
Esc         Close / deselect
Enter       Open selected note
```

Avoid intercepting browser shortcuts in inappropriate contexts.

When a text editor is focused, editor behavior has priority where necessary.

---

# UNDO / REDO

Undo/redo should eventually cover:

- Move
- Resize
- Rotate
- Delete
- Restore
- Recolor
- Group
- Ungroup
- Stack
- Unstack
- Complete
- Incomplete
- Bulk changes

Do not store huge full-application snapshots for every pointer movement.

Prefer command/history entries or meaningful snapshots at completed interactions.

---

# RESPONSIVE DESIGN

Desktop is the primary experience for Canvas Mode.

The application must still support:

- Laptop
- Tablet
- Mobile

Mobile behavior:

- Touch dragging
- Long press
- Pinch zoom
- Swipe actions
- Compact toolbar
- Bottom sheets where appropriate

Do not simply shrink the desktop UI.

---

# PERFORMANCE REQUIREMENTS

The application should remain usable with hundreds or thousands of notes.

Use:

- Memoized components
- Virtualization for long lists
- Selective rendering
- Indexed database queries
- Debounced writes
- Optimistic updates
- Image optimization
- Lazy loading
- Pagination where useful
- Reduced unnecessary React re-renders

Canvas optimization should receive special attention.

Do not rerender every note when only one card moves.

---

# ACCESSIBILITY

Include:

- Keyboard navigation
- Visible focus states
- ARIA labels where needed
- Accessible dialogs
- Accessible dropdowns
- Sufficient text contrast
- Reduced-motion support
- Screen-reader friendly form controls

---

# ERROR HANDLING

The app should never silently fail.

Provide useful states for:

- Database errors
- Upload failures
- Authentication failures
- Offline state
- Sync conflicts
- Missing permissions
- Invalid import file
- Unsupported attachment
- Storage limits

Use user-friendly errors while preserving detailed development logging.

---

# DEVELOPMENT PHASES

## Phase 1 — Foundation

Build first:

- Next.js project
- TypeScript
- Tailwind
- shadcn/ui
- Supabase connection
- Authentication
- Base database schema
- Main app shell
- Header
- Sidebar
- Workspace creation
- Board creation
- Basic note CRUD

## Phase 2 — Core Sticky Notes

Implement:

- Create note
- Edit note
- Delete note
- Duplicate note
- Color/style
- Pin
- Lock
- Complete
- Archive
- Trash
- Autosave

## Phase 3 — Signature Canvas

Implement:

- Infinite canvas
- Pan
- Zoom
- Drag
- Resize
- Rotate
- Z-index
- Multi-select
- Selection rectangle
- Snap-to-grid
- Layers
- Mini-map
- Groups
- Stacks

This phase is critical.

## Phase 4 — Rich Editor

Implement Tiptap:

- Paragraph
- Heading
- Lists
- Checklists
- Slash menu
- Quotes
- Dividers
- Code
- Links
- Images
- Videos
- Files
- Tables

## Phase 5 — Organization

Implement:

- Categories
- Tags
- Priority
- Search
- Sort
- Filters
- Related notes
- Board organization
- Workspace organization

## Phase 6 — Layout Views

Implement:

- Grid
- Row
- Column
- List
- Masonry
- Kanban
- Calendar
- Timeline

The same notes should appear in different views without duplicating the underlying note data.

## Phase 7 — Customization

Implement:

- Backgrounds
- Blur
- Brightness
- Saturation
- Contrast
- Vignette
- Grain
- Themes
- Note appearance options
- Card covers
- Font settings
- Interface preferences

## Phase 8 — Productivity

Implement:

- Due dates
- Start dates
- Reminders
- Recurring tasks
- Subtasks
- Progress
- Dashboard
- Statistics

## Phase 9 — Reliability

Implement:

- Offline cache
- Sync queue
- Version history
- Activity history
- Import
- Export
- Backups
- Board screenshot
- Undo/redo improvements

## Phase 10 — Collaboration

Only after the personal workspace is stable:

- Shared boards
- Invitations
- Presence
- Comments
- Mentions
- Assignments
- Realtime collaboration

---

# INITIAL MVP

The first usable release should NOT attempt to include every feature.

The MVP should contain:

- Authentication
- One or more workspaces
- Boards
- Canvas Mode
- Create/edit/delete sticky notes
- Dragging
- Resizing
- Basic note styles/colors
- Rich text
- Checklists
- Completion state
- Tags/categories
- Search
- Supabase persistence
- Basic settings
- Responsive app shell

After the MVP is stable, expand into the advanced features.

---

# AGENT IMPLEMENTATION RULES

These rules are important when an AI coding agent works on this project.

## 1. Read Before Editing

Before changing an existing feature:

- Read the relevant source files.
- Understand the current implementation.
- Reuse existing patterns where practical.

## 2. Do Not Rebuild Working Systems Unnecessarily

If a working component or utility already exists, improve or extend it rather than replacing it without reason.

## 3. Keep Components Focused

Avoid massive components.

Split complex systems into:

- UI components
- Hooks
- Stores
- Services
- Validation
- Data access
- Types

## 4. Keep Types Strong

Do not solve TypeScript errors by spreading `any`.

Fix the actual types.

## 5. Preserve User Data

Never change schema behavior in a way that can silently delete user content.

Use migrations.

## 6. Supabase Security Is Required

Whenever a new user-owned table or bucket is created:

- Add Row Level Security
- Add correct policies
- Verify ownership checks

## 7. Optimize Canvas Interactions

High-frequency pointer actions should stay local during movement.

Persist only meaningful completed changes.

## 8. Do Not Overfetch

Fetch only what is needed for the current workspace/board where possible.

## 9. Use Optimistic UX

Creating, moving, completing, or updating a note should feel instant.

Server synchronization should happen behind the immediate UI.

## 10. Do Not Break Existing Features

When adding a feature:

- Preserve current behavior unless the specification intentionally changes it.
- Test affected workflows.
- Reuse shared components.

## 11. Maintain Consistent Design

Do not create isolated styles that look unrelated to the existing application.

Use design tokens and shared UI components.

## 12. Prefer Incremental Development

Complete one usable feature at a time.

Do not create dozens of incomplete placeholder systems.

---

# DEFINITION OF DONE

A feature is not complete only because it visually appears.

A feature is considered complete when applicable items are satisfied:

- UI works
- TypeScript passes
- Data persists
- Loading state exists
- Empty state exists
- Error state exists
- User permissions are enforced
- Responsive behavior is acceptable
- Existing features still work
- No obvious console errors
- User feedback is visible
- Data survives refresh
- Data belongs to the correct user

---

# PRODUCT PRIORITY

When implementation choices conflict, prioritize in this order:

1. Data safety
2. User privacy/security
3. Reliable note editing
4. Smooth Canvas Mode
5. Fast interactions
6. Clear organization
7. Customization
8. Advanced productivity features
9. Collaboration

---

# FINAL PRODUCT DIRECTION

This product should not feel like a traditional rigid task manager.

It should feel like a **personal digital desk**.

Users should be able to:

- Throw down a quick sticky note
- Build a structured project board
- Write a long document
- Track a checklist
- Add images and videos
- Plan using Kanban
- Organize a calendar
- Spread ideas across an infinite canvas
- Customize the visual environment
- Arrange everything in a way that feels natural to them

The core differentiator is the combination of:

```text
Freedom of a real desk
+
Structure of a productivity application
+
Richness of a digital notebook
+
Customization of a personal workspace
```

Canvas Mode should remain the signature experience.

The interface should stay visually calm and uncluttered while exposing advanced functionality when the user asks for it.
