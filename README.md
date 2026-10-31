# Tackly

A customizable to-do list, sticky-note board, digital notebook and productivity
workspace. It should feel like organizing real paper on a desk, with the power
of a digital application behind it.

## Status

Milestones 0–8 complete — the MVP's persistence path is in place: project
initialization, design system, application shell, the interactive note system,
Canvas Mode, the Supabase foundation, authentication, cloud-backed workspaces
and boards, and note persistence with autosave.

| Milestone | State |
| --- | --- |
| 0 — Project initialization | ✅ |
| 1 — Design system | ✅ |
| 2 — Application shell | ✅ |
| 3 — Basic note system | ✅ |
| 4 — Canvas Mode core | ✅ |
| 5 — Supabase foundation | ✅ |
| 6 — Authentication | ✅ |
| 7 — Real workspaces and boards | ✅ |
| 8 — Note persistence | ✅ |
| 9 — Rich note editor (Tiptap) | next |

Connect a Supabase project and everything syncs: accounts, workspaces, boards,
columns and notes. Edits save locally first and reach the database after a
short pause, with the status shown in the header.

Without a project the app still runs — it saves to your browser, and the
account menu offers a way to sign in.

Board columns are **yours** — the five the app starts with are seeds. Rename
one by double-clicking its title, or use its menu to recolour, reorder, add or
delete.

Right-click a note for its actions, or the empty board/canvas for that
surface's settings. The Board and the Canvas have deliberately different
settings.

**The Board and the Canvas hold different things.** Every note lives on a
column and shows up on the Board; the Canvas starts empty and holds only what
you put there. Use **Add to Canvas** on a note, **Send to Canvas** on a whole
column, or add one directly from the canvas controls. Taking a note off the
Canvas leaves it on its column.

`IMPLEMENTATION_PLAN.md` has the full milestone list.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

No backend or environment variables are needed yet — the Board runs on local
state — it saves to your browser. To enable accounts, connect a Supabase
project by following `supabase/README.md`.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run verify` | typecheck + lint + test |

## Stack

Next.js · React · TypeScript · Supabase · Tailwind CSS · shadcn/ui · Zustand ·
Tiptap · dnd-kit · TanStack Query · Motion · Zod · Geist · Lucide React.

## Documentation

| File | Contents |
| --- | --- |
| `PRODUCT_SPEC.md` | Product scope, data model, technical decisions |
| `FRONTEND_SPEC.md` | Visual language, interaction model, component structure |
| `IMPLEMENTATION_PLAN.md` | Build order, milestone by milestone |
| `AGENTS.md` | Rules for anyone (human or agent) writing code here |
| `docs/ARCHITECTURE.md` | How the code is arranged; component and hook reference |
| `docs/HANDOFF.md` | Where the project stands, decisions made, and what is next |
| `supabase/README.md` | Connecting a project, migrations, and verifying RLS |
