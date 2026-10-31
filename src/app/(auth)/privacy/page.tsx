import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy · Tackly" };

const CONTACT = "tackly.no@gmail.com";

/**
 * Plain-language description of what the app actually does with data.
 * Every statement here is backed by code or configuration; when behaviour
 * changes (analytics, new processors, retention jobs) this page must change
 * with it. Have it reviewed against the laws that apply to your audience.
 */
export default function PrivacyPage() {
  return (
    <article className="flex w-full max-w-2xl flex-col gap-5 rounded-[var(--radius-lg)] border border-border bg-surface-raised p-6 text-sm leading-relaxed">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Privacy notice</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: 31 October 2026</p>
      </header>

      <section>
        <h2 className="font-medium">What we collect</h2>
        <ul className="mt-1 list-disc pl-5">
          <li>Account details: your email address, a hashed password and an optional display name.</li>
          <li>What you create: boards, columns, notes, tags, schedules, attached files and note history.</li>
          <li>For shared boards: who has access, and the cursor position and name shown to collaborators while you are on the board.</li>
          <li>A one-way hash of your email address or network address, used only to limit repeated signup attempts. It is not reversible to the original value.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-medium">Without an account</h2>
        <p className="mt-1">
          If you use Tackly without signing in, your notes are stored only in
          your browser (local storage) and are never sent to us.
        </p>
      </section>

      <section>
        <h2 className="font-medium">Cookies and storage</h2>
        <p className="mt-1">
          We use only what is needed to run the app: sign-in session cookies, a
          short-lived (30 minute) cookie that remembers which email you are
          verifying, and browser storage for your preferences and offline copy.
          We do not use advertising or analytics trackers.
        </p>
      </section>

      <section>
        <h2 className="font-medium">Who handles your data</h2>
        <ul className="mt-1 list-disc pl-5">
          <li>Supabase hosts the database, file storage and sign-in. Our project is in the EU (Stockholm) region.</li>
          <li>Gmail (Google) sends the verification emails, so your email address passes through it.</li>
          <li>Our hosting provider processes requests and may keep ordinary server logs, including network addresses.</li>
        </ul>
        <p className="mt-1">We do not sell your data.</p>
      </section>

      <section>
        <h2 className="font-medium">Keeping and deleting data</h2>
        <p className="mt-1">
          Your content is kept until you delete it or ask us to delete your
          account. Deleted notes may remain in note history and backups for a
          time. Email us to access, correct, export or delete your data.
        </p>
      </section>

      <section>
        <h2 className="font-medium">Contact</h2>
        <p className="mt-1">
          <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
      </section>

      <Link href="/login" className="text-xs underline">Back to sign in</Link>
    </article>
  );
}
