import { ArrowRight, BookOpenText, GraduationCap, House, NotebookPen, Plane } from "lucide-react";
import Link from "next/link";

import { TacklyMark } from "@/components/brand/tackly-mark";
import { HeroBoard } from "@/components/landing/hero-board";
import {
  CalendarVisual,
  CanvasVisual,
  EditorVisual,
  ShareVisual,
} from "@/components/landing/landing-visuals";

const clayPrimary =
  "tk-clay inline-flex h-12 items-center justify-center rounded-lg bg-[image:var(--clay-primary-gradient)] px-6 text-base font-medium text-primary-foreground transition hover:brightness-110 active:tk-clay-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const clayNav =
  "tk-clay inline-flex h-9 items-center justify-center rounded-md bg-[image:var(--clay-primary-gradient)] px-3.5 text-sm font-medium text-primary-foreground transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const quietLink =
  "text-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const USE_CASES = [
  { title: "Plan a trip", icon: Plane, color: "var(--status-in-progress)" },
  { title: "Track your coursework", icon: GraduationCap, color: "var(--status-review)" },
  { title: "Run a household", icon: House, color: "var(--status-done)" },
  { title: "Keep meeting notes", icon: NotebookPen, color: "var(--status-ideas)" },
  { title: "Write a thesis or report", icon: BookOpenText, color: "var(--priority-high)" },
] as const;

/** A feature card: eyebrow, headline, link into the app, and a real screen. */
function Feature({
  eyebrow,
  title,
  className = "",
  children,
}: {
  eyebrow: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article className={`flex flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-surface-sunken ${className}`}>
      <header className="flex items-start justify-between gap-6 p-7 pb-0">
        <div>
          <p className="text-sm text-muted-foreground">{eyebrow}</p>
          <h3 className="mt-1.5 max-w-[22ch] text-xl font-semibold leading-snug tracking-tight">{title}</h3>
        </div>
        <Link
          href="/app"
          aria-label={`Try it: ${title}`}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowRight size={16} />
        </Link>
      </header>
      {children}
    </article>
  );
}

/**
 * What a signed-out visitor sees at `/`.
 *
 * Built from the app's own tokens so the page and the product read as one
 * thing. The hero is the real board interaction, and every feature shows the
 * real screen with realistic data instead of describing it.
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
          <section className="grid items-center gap-10 pb-20 pt-6 lg:grid-cols-[4.4fr_7.6fr] lg:gap-12 lg:pt-12" aria-labelledby="hero-title">
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

          <section className="pb-20" aria-labelledby="features-title">
            <h2 id="features-title" className="text-[clamp(2rem,4.2vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              Notes that go further than a list.
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Feature eyebrow="Write" title="Notes with real structure: checklists, dates, tags and files.">
                <div className="mt-6 h-[470px] overflow-hidden px-7">
                  <EditorVisual />
                </div>
              </Feature>

              <Feature eyebrow="Plan" title="See every due date and reminder on a calendar.">
                <div className="mt-6 h-[470px] overflow-hidden px-7">
                  <CalendarVisual />
                </div>
              </Feature>

              <Feature eyebrow="Lay it out" title="Move from columns to a free canvas, then share it." className="md:col-span-2">
                <div className="relative mt-6 grid gap-4 px-7 pb-7 md:block md:h-[460px] md:pb-0">
                  <div className="md:absolute md:left-7 md:right-[26%] md:top-0">
                    <CanvasVisual />
                  </div>
                  <div className="md:absolute md:right-7 md:top-16 md:w-[340px]">
                    <ShareVisual />
                  </div>
                </div>
              </Feature>
            </div>
          </section>

          <section className="pb-20" aria-labelledby="uses-title">
            <h2 id="uses-title" className="text-sm font-normal text-muted-foreground">What people use a board for</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {USE_CASES.map(({ title, icon: Icon, color }) => (
                <li key={title}>
                  <Link
                    href="/app"
                    className="flex h-full flex-col gap-8 rounded-[var(--radius-xl)] border border-border bg-surface p-5 transition hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      className="grid size-10 place-items-center rounded-full"
                      style={{ background: `color-mix(in srgb, ${color} 28%, var(--surface))` }}
                    >
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="font-semibold leading-snug">{title} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-6 border-t border-border py-16 md:grid-cols-3" aria-label="Good to know">
            <div>
              <h3 className="font-semibold">Saves first, syncs when you sign in</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                Edits save in your browser straight away and reach your
                account a moment later.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Share one board, not everything</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                Invite someone as a viewer or an editor. Only that board is
                shared, and the link expires in 7 days.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Take your notes with you</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                Export as JSON, Markdown, text, PDF or a full backup, and
                import them back.
              </p>
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
