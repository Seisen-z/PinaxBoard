import Link from "next/link";

import { HeroBoard } from "@/components/landing/hero-board";
import { TacklyMark } from "@/components/brand/tackly-mark";

const clayPrimary =
  "tk-clay inline-flex h-12 items-center justify-center rounded-lg bg-[image:var(--clay-primary-gradient)] px-6 text-base font-medium text-primary-foreground transition hover:brightness-110 active:tk-clay-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const clayNav =
  "tk-clay inline-flex h-9 items-center justify-center rounded-md bg-[image:var(--clay-primary-gradient)] px-3.5 text-sm font-medium text-primary-foreground transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const quietLink =
  "text-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** A feature tile tinted with one of the app's own lane colors. */
function Tile({ color, className = "", children }: { color: string; className?: string; children: React.ReactNode }) {
  return (
    <article
      className={`flex flex-col rounded-[var(--radius-xl)] border border-border p-6 ${className}`}
      style={{ background: `color-mix(in srgb, ${color} 10%, var(--surface))` }}
    >
      {children}
    </article>
  );
}

/**
 * What a signed-out visitor sees at `/`.
 *
 * Built from the app's own tokens (surfaces, lane colors, paper colors, clay
 * buttons, Geist) so the page and the product read as one thing, and the
 * hero is the real board interaction rather than a picture of it.
 */
export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-background text-foreground">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8 lg:px-12">
        <nav className="flex items-center justify-between py-5" aria-label="Main">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <TacklyMark size={34} />
            Pinax Board
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/login" className={quietLink}>Sign in</Link>
            <Link href="/register" className={clayNav}>Create an account</Link>
          </div>
        </nav>

        <main>
          <section className="grid items-center gap-10 pb-16 pt-6 lg:grid-cols-[4.4fr_7.6fr] lg:gap-12 lg:pt-12" aria-labelledby="hero-title">
            <div>
              <p className="mb-4 text-sm text-muted-foreground">
                <span lang="el" className="font-medium text-foreground">πίναξ</span> · Greek for a writing board
              </p>
              <h1 id="hero-title" className="text-[clamp(2.4rem,4.6vw,4rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
                Pin down everything you need to remember.
              </h1>
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">
                Sticky notes on columns or a free canvas, with rich text,
                reminders and files. Share a board when someone else needs to
                see it.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href="/register" className={clayPrimary}>Create an account</Link>
                <Link href="/app" className={quietLink}>Try it without an account</Link>
              </div>
              <p className="mt-4 max-w-[46ch] text-sm text-muted-foreground">
                Without an account, your notes stay in this browser and are
                never uploaded.
              </p>
            </div>

            <HeroBoard />
          </section>

          <section className="border-t border-border py-16" aria-labelledby="what-title">
            <h2 id="what-title" className="max-w-[18ch] text-[clamp(1.9rem,3.4vw,2.9rem)] font-semibold leading-[1.08] tracking-[-0.025em]">
              What goes on the board
            </h2>
            <p className="mt-3 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
              One set of notes, seen as a board, a grid, a list, a calendar, a
              timeline or a free canvas.
            </p>

            <div className="mt-10 grid grid-cols-12 gap-4">
              <Tile color="var(--status-in-progress)" className="col-span-12 md:col-span-7 md:row-span-2">
                <h3 className="text-lg font-semibold tracking-tight">A canvas for notes that don&apos;t fit in columns</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  Drag, resize and rotate notes anywhere. Add a note to the
                  canvas, or send a whole column over. Taking a note off the
                  canvas leaves it on its column.
                </p>
                <div className="relative mt-6 min-h-[300px] flex-1 rounded-[var(--radius-lg)] border border-dashed border-border bg-background/60" aria-hidden="true">
                  <CanvasNote paper="yellow" left="6%" top="10%" tilt={-1.5} title="Trip ideas" detail="Cebu, Batanes" />
                  <CanvasNote paper="blue" left="38%" top="34%" tilt={1.2} title="Budget" detail="Flights first" />
                  <CanvasNote paper="pink" left="66%" top="8%" tilt={-1} title="Pack" detail="Charger, adaptor" />
                  <CanvasNote paper="mint" left="12%" top="60%" tilt={1.4} title="Book" detail="Ferry tickets" />
                </div>
              </Tile>

              <Tile color="var(--status-ideas)" className="col-span-12 md:col-span-5">
                <h3 className="text-lg font-semibold tracking-tight">Write in rich text</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Type / in any note to insert a block.</p>
                <ul className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface text-sm" aria-hidden="true">
                  {["Checklist", "Heading 1", "Image", "Quote"].map((label) => (
                    <li key={label} className="border-b border-border px-3 py-2 last:border-b-0">{label}</li>
                  ))}
                </ul>
              </Tile>

              <Tile color="var(--status-review)" className="col-span-12 md:col-span-5">
                <h3 className="text-lg font-semibold tracking-tight">Due dates and reminders</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  Set a start date, a due date and a repeat. Reminders show in
                  the app while it&apos;s open, and as browser alerts if you
                  allow them.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Calendar", "Timeline", "Repeat"].map((label) => (
                    <span key={label} className="rounded-full border border-border bg-surface px-3 py-1 text-xs">{label}</span>
                  ))}
                </div>
              </Tile>

              <Tile color="var(--status-done)" className="col-span-12 md:col-span-4">
                <h3 className="text-lg font-semibold tracking-tight">Share one board</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  Invite someone as a viewer or an editor. The link works once
                  and expires in 7 days. Only that board is shared.
                </p>
              </Tile>

              <Tile color="var(--status-todo)" className="col-span-12 md:col-span-4">
                <h3 className="text-lg font-semibold tracking-tight">Saves first, syncs when you sign in</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  Edits save in your browser straight away and reach your
                  account a moment later. Attach images, videos and files to
                  any note once you&apos;re signed in.
                </p>
              </Tile>

              <Tile color="var(--priority-high)" className="col-span-12 md:col-span-4">
                <h3 className="text-lg font-semibold tracking-tight">Take your notes with you</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  Export a note, a board or a workspace as JSON, Markdown,
                  text, PDF or a full backup, and import them back.
                </p>
              </Tile>
            </div>
          </section>

          <section className="grid gap-6 border-t border-border py-16 md:grid-cols-[7fr_5fr] md:items-end" aria-labelledby="start-title">
            <h2 id="start-title" className="max-w-[16ch] text-[clamp(1.9rem,3.4vw,2.9rem)] font-semibold leading-[1.08] tracking-[-0.025em]">
              Start with an empty board.
            </h2>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/register" className={clayPrimary}>Create an account</Link>
              <Link href="/app" className={quietLink}>Try it without an account</Link>
            </div>
          </section>
        </main>

        <footer className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border py-7 text-sm text-muted-foreground">
          <span>Pinax Board</span>
          <Link href="/privacy" className="underline underline-offset-4">Privacy</Link>
          <Link href="/login" className="underline underline-offset-4">Sign in</Link>
        </footer>
      </div>
    </div>
  );
}

function CanvasNote({ paper, left, top, tilt, title, detail }: { paper: string; left: string; top: string; tilt: number; title: string; detail: string }) {
  return (
    <div
      className="tk-paper absolute w-[min(150px,34%)] rounded-[var(--radius-note)] border px-3 py-2.5 text-sm"
      style={{
        left, top, transform: `rotate(${tilt}deg)`,
        background: `var(--paper-${paper})`, color: `var(--paper-${paper}-ink)`, borderColor: `var(--paper-${paper}-edge)`,
      }}
    >
      <b className="block font-semibold">{title}</b>
      <span className="block text-xs opacity-75">{detail}</span>
    </div>
  );
}
