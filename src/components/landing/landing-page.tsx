import Link from "next/link";
import { Noto_Serif_Display } from "next/font/google";

import { TacklyMark } from "@/components/brand/tackly-mark";
import "./landing.css";

/**
 * Greek-capable display face: the word "πίναξ" is part of the identity, so
 * the headline face has to set it properly rather than fall back.
 */
const display = Noto_Serif_Display({
  subsets: ["latin", "greek"],
  variable: "--font-pb-display",
  display: "swap",
});

/**
 * What a signed-out visitor sees at `/`.
 *
 * Everything shown here exists in the app. Notes use the app's own paper
 * tokens so the page reads as the product, not as marketing around it.
 */
export function LandingPage() {
  return (
    <div className={`pb ${display.variable}`}>
      <div className="pb-wrap">
        <nav className="pb-nav" aria-label="Main">
          <Link href="/" className="pb-brand">
            <TacklyMark size={34} />
            Pinax Board
          </Link>
          <Link href="/login" className="pb-signin">Sign in</Link>
        </nav>

        <main>
          <section className="pb-hero" aria-labelledby="pb-title">
            <div>
              <p className="pb-etym">
                <span lang="el">πίναξ</span> — a writing board
              </p>
              <h1 id="pb-title" className="pb-h1">
                Pin down everything you need to remember.
              </h1>
              <p className="pb-lede">
                Sticky notes on columns or a free canvas, with rich text,
                reminders and files. Share a board when someone else needs to
                see it.
              </p>
              <div className="pb-actions">
                <Link href="/register" className="pb-primary">Create an account</Link>
                <Link href="/app" className="pb-secondary">Try it without an account</Link>
              </div>
              <p className="pb-fine">
                Without an account, your notes stay in this browser and are
                never uploaded.
              </p>
            </div>

            <div className="pb-tablet-col">
              <figure className="pb-tablet" aria-label="A Pinax Board with three columns of notes">
                <div className="pb-tablet-head">
                  <span className="pb-incise" lang="el">ΠΙΝΑΞ</span>
                  <span className="pb-tablet-meta">Board · 3 columns</span>
                </div>
                <div className="pb-cols">
                  <div>
                    <h2 className="pb-col-title"><span>To Do</span><span>3</span></h2>
                    <div className="pb-note pb-yellow pb-tilt-l">
                      <b>Renew passport</b>
                      <small>Due 14 Nov · High priority</small>
                    </div>
                    <div className="pb-note pb-pink pb-tilt-r">
                      <b>Reply to landlord</b>
                      <small>About the lease renewal</small>
                    </div>
                    <div className="pb-note pb-blue pb-tilt-l">
                      <b>Book dentist</b>
                      <small>Before the end of the month</small>
                    </div>
                  </div>
                  <div>
                    <h2 className="pb-col-title"><span>In Progress</span><span>2</span></h2>
                    <div className="pb-note pb-blue pb-tilt-r">
                      <b>Thesis, chapter 3</b>
                      <div className="pb-check"><span className="pb-box on" />Outline</div>
                      <div className="pb-check"><span className="pb-box on" />Literature table</div>
                      <div className="pb-check"><span className="pb-box" />Write discussion</div>
                    </div>
                    <div className="pb-note pb-yellow pb-tilt-l">
                      <b>Plan Cebu trip</b>
                      <small>Flights and ferry</small>
                    </div>
                  </div>
                  <div>
                    <h2 className="pb-col-title"><span>Done</span><span>2</span></h2>
                    <div className="pb-note pb-mint pb-tilt-l">
                      <b>Order groceries</b>
                      <small>Completed Tuesday</small>
                    </div>
                    <div className="pb-note pb-pink pb-tilt-r">
                      <b>Pay electricity bill</b>
                      <small>Completed Monday</small>
                    </div>
                  </div>
                </div>
              </figure>
            </div>
          </section>

          <section className="pb-section" aria-labelledby="pb-what">
            <h2 id="pb-what" className="pb-h2">What goes on the board</h2>
            <p className="pb-sub">
              One set of notes, seen as a board, a grid, a list, a calendar, a
              timeline or a free canvas.
            </p>

            <div className="pb-grid">
              <article className="pb-tile pb-t-canvas">
                <h3>A canvas for notes that don&apos;t fit in columns</h3>
                <p>
                  Drag, resize and rotate notes anywhere. Add a note to the
                  canvas, or send a whole column over. Taking a note off the
                  canvas leaves it on its column.
                </p>
                <div className="pb-canvas-art" aria-hidden="true">
                  <div className="pb-note pb-yellow pb-tilt-l" style={{ left: "6%", top: "12%" }}><b>Trip ideas</b><small>Cebu, Batanes</small></div>
                  <div className="pb-note pb-blue pb-tilt-r" style={{ left: "38%", top: "34%" }}><b>Budget</b><small>Flights first</small></div>
                  <div className="pb-note pb-pink pb-tilt-l" style={{ left: "68%", top: "8%" }}><b>Pack</b><small>Charger, adaptor</small></div>
                  <div className="pb-note pb-mint pb-tilt-r" style={{ left: "14%", top: "60%" }}><b>Book</b><small>Ferry tickets</small></div>
                </div>
              </article>

              <article className="pb-tile pb-t-editor">
                <h3>Write in rich text</h3>
                <p>Type / in any note to insert a block.</p>
                <div className="pb-slash" aria-hidden="true">
                  <div><span>Checklist</span></div>
                  <div><span>Heading 1</span></div>
                  <div><span>Image</span></div>
                  <div><span>Quote</span></div>
                </div>
              </article>

              <article className="pb-tile pb-t-remind">
                <h3>Due dates and reminders</h3>
                <p>
                  Set a start date, a due date and a repeat. Reminders show in
                  the app while it&apos;s open, and as browser alerts if you
                  allow them.
                </p>
                <div className="pb-chips">
                  <span className="pb-chip">Calendar</span>
                  <span className="pb-chip">Timeline</span>
                  <span className="pb-chip">Repeat</span>
                </div>
              </article>

              <article className="pb-tile pb-t-share">
                <h3>Share one board</h3>
                <p>
                  Invite someone as a viewer or an editor. The link works once
                  and expires in 7 days. Only that board is shared.
                </p>
              </article>

              <article className="pb-tile pb-t-local">
                <h3>Saves first, syncs when you sign in</h3>
                <p>
                  Edits save in your browser straight away and reach your
                  account a moment later. Attach images, videos and files to
                  any note once you&apos;re signed in.
                </p>
              </article>

              <article className="pb-tile pb-t-export">
                <h3>Take your notes with you</h3>
                <p>
                  Export a note, a board or a workspace as JSON, Markdown,
                  text, PDF or a full backup, and import them back.
                </p>
              </article>
            </div>
          </section>

          <section className="pb-close" aria-labelledby="pb-start">
            <h2 id="pb-start" className="pb-h2">Start with an empty board.</h2>
            <div>
              <div className="pb-actions" style={{ marginTop: 0 }}>
                <Link href="/register" className="pb-primary">Create an account</Link>
                <Link href="/app" className="pb-secondary">Try it without an account</Link>
              </div>
              <p className="pb-fine">
                <span lang="el">Πίναξ</span> was the Greek word for a writing
                tablet or board. This is the one for your notes.
              </p>
            </div>
          </section>
        </main>

        <footer className="pb-foot">
          <span>Pinax Board</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/login">Sign in</Link>
        </footer>
      </div>
    </div>
  );
}
