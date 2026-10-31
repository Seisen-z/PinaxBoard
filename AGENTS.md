<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tackly — agent rules

## Read before you build

`docs/HANDOFF.md` is the current project state — what is done, what the user
has decided, and what not to redo. Read it first. Before a session's context
fills up, **overwrite** it with a fresh handoff; never append or fork it.

`IMPLEMENTATION_PLAN.md` is the build order, `PRODUCT_SPEC.md` is the scope,
`FRONTEND_SPEC.md` is the look and feel. When they disagree, the more specific
document wins: frontend appearance → `FRONTEND_SPEC.md`, data model and
behaviour → `PRODUCT_SPEC.md`, sequencing → `IMPLEMENTATION_PLAN.md`.

Do not jump ahead of the current milestone unless asked. A stable finished
feature beats several half-built ones.

## Stack

Next.js · React · TypeScript · Supabase · Tailwind CSS · shadcn/ui · Zustand ·
Tiptap · dnd-kit · TanStack Query · Motion · Zod · Geist · Lucide React.

Do not swap any of these without approval.

## Rules that are easy to break by accident

1. **Tokens, not literals.** Colors, shadows, radii and motion timings live in
   `src/styles/tokens.css`. A hard-coded hex or `box-shadow` in a component is
   a bug. `src/styles/tokens.test.ts` guards the token set.
2. **Only the background layer may blur.** `.tk-background-layer` is the one
   element allowed a `filter`. No `backdrop-filter` anywhere.
3. **Claymorphism is for compact controls and active states only.** Never for
   a note body, a whole lane, or every button.
   **No pure black or pure white** — every neutral carries a slight warm cast.
4. **Create first, customize afterward.** Add Note produces a blank editable
   card in one action. Never add a type/style/category chooser in front of it.
5. **Columns are user data.** The five the app seeds are defaults — never
   reintroduce a status enum. Each column is an enclosed panel tinted from its
   own accent via `--lane-accent`; navigation lives in the permanent left
   sidebar. This replaced the open columns and the top nav bar of
   FRONTEND_SPEC §9/§10/§11 — see "Decisions made" in `docs/HANDOFF.md`.
6. **Canvas writes are committed, not streamed.** `pointerdown` → local state →
   `requestAnimationFrame` transforms → `pointerup` → commit. Never a database
   write per `mousemove`.
7. **TanStack Query owns server state; Zustand owns UI state.** Zustand is not
   the source of truth for cloud data.
8. **Row Level Security on every user-owned table and bucket.** Frontend
   filtering is not access control.
9. **No `any`.** Fix the type. `tsconfig.json` runs beyond `strict`; see
   `docs/ARCHITECTURE.md`.
10. **Never silently lose an edit.** Every async path needs loading, empty,
    error and retry states.
11. **A note's `content` and `excerpt` are written together.** `excerpt` is the
    plain-text projection of the Tiptap document — search, previews and sorting
    read it. Use `setContent`; see `src/lib/tiptap/document.ts`.
12. **Light and dark, no theme presets.** `tokens.css` holds both modes;
    `applyTheme` only sets `data-theme`.
13. **Storage paths carry ownership.** Build them with `storagePath()` only —
    every policy checks the first segment against `auth.uid()`. Never store a
    signed URL; it expires.

## Before you call something done

```bash
npm run verify   # typecheck + lint + tests
```

Add tests with the feature, at the layer the feature lives in. See the
"Testing" section of `docs/ARCHITECTURE.md`.
