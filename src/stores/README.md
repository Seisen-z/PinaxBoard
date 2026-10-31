# Zustand stores

UI and interaction state only. Cloud data belongs to TanStack Query
(`IMPLEMENTATION_PLAN.md` §49).

| Store | Milestone | Holds |
| --- | --- | --- |
| `note-store.ts` | 3 ✅ | Note records and CRUD actions, persisted to `localStorage` |
| `selection-store.ts` | 3 ✅ | Selected note ids (selection rectangle in Milestone 4) |
| `lane-store.ts` | 3 ✅ | The board's columns — user-created, renamed, reordered, deleted |
| `canvas-store.ts` | 4 ✅ | Viewport (`x`, `y`, `zoom`), grid and snap settings, measured canvas size |
| `settings-store.ts` | 4 ✅ | Selected theme and Board view settings (sort, density, completed); background and editor preferences follow in Milestone 19 |
| `workspace-store.ts` | 7 ✅ | Which workspace and board are open — selection only; the lists belong to TanStack Query |
| `sync-store.ts` | 8 ✅ | Autosave status — never persisted |

Subscribe with selectors (`useCanvasStore((s) => s.zoom)`), not by pulling the
whole store — a board of hundreds of notes cannot afford a re-render per
pointer move.
