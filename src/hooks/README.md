# Hooks

Cross-feature React hooks. A hook used by exactly one feature lives beside that
feature in `src/features/<feature>/` instead — `useNoteActions` and
`useLaneActions` are the current examples.

| Hook | Purpose |
| --- | --- |
| `use-pointer-drag.ts` | The `requestAnimationFrame` drag loop behind every canvas gesture |
| `use-store-hydration.ts` | Restores the persisted note store after mount |
| `use-theme-sync.ts` | Applies the selected theme to `<html>` |
| `use-horizontal-wheel-scroll.ts` | Lets a mouse wheel scroll the Board sideways |
| `use-debounced-callback.ts` | The autosave debounce |

Planned: `use-keyboard-shortcuts`.
