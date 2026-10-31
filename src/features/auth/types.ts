/**
 * Who is signed in, as the UI needs it.
 *
 * Kept out of `session.ts` because that module is `server-only`: a Client
 * Component needs this type, and importing it from there — even with
 * `import type` — puts a server-only module one refactor away from a client
 * bundle.
 *
 * `null` covers both "signed out" and "no Supabase project connected", because
 * the interface treats them the same: the board runs on local state and the
 * header offers a way in.
 */
export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  /** Up to two letters for the header avatar. */
  initials: string;
}
