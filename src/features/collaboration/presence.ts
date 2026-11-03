import { z } from "zod";
export const cursorSchema = z.object({ session: z.string().max(100), userId: z.string().uuid(), name: z.string().max(60), view: z.string().max(30), x: z.number().finite().min(-1e7).max(1e7), y: z.number().finite().min(-1e7).max(1e7), canvas: z.boolean(), visible: z.boolean(), anchorId: z.string().max(100).nullable().optional(), at: z.number().finite(), noteId: z.string().max(100).nullable() });
export type CollaboratorCursor = z.infer<typeof cursorSchema>;
/** Presence leaves on disconnect, so this only rejects absurd clocks; a tight window hid collaborators whose device clock drifted. */
const CLOCK_TOLERANCE_MS = 10 * 60_000;
export function parseCursors(values: unknown[], session: string, now = Date.now()): CollaboratorCursor[] {
  const sessions = new Map<string, CollaboratorCursor>();
  for (const value of values) { const parsed = cursorSchema.safeParse(value); if (parsed.success && parsed.data.session !== session && Math.abs(now - parsed.data.at) < CLOCK_TOLERANCE_MS) sessions.set(parsed.data.session, parsed.data); }
  return [...sessions.values()];
}
