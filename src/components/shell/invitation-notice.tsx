"use client";
import { useEffect, useState } from "react";
import { acceptInvitation } from "@/features/collaboration/repository";
import { ClayButton } from "@/components/ui/clay-button";

const KEY = "tackly:pending-invitation";
export function InvitationNotice({ signedIn, onAccepted }: { signedIn: boolean; onAccepted: (boardId: string) => Promise<void> }) {
  const [token, setToken] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    const read = () => { const hash = new URLSearchParams(location.hash.slice(1)); const value = hash.get("invite");
      try { if (value) { if (!/^[0-9a-f]{64}$/.test(value)) { setError("This invitation link is invalid."); return; } sessionStorage.setItem(KEY, value); history.replaceState(null, "", location.pathname + location.search); }
        setToken(sessionStorage.getItem(KEY) ?? ""); } catch { setError("Browser storage is unavailable. Keep the invitation link and reopen it after signing in."); }
    }; read(); window.addEventListener("hashchange", read); return () => window.removeEventListener("hashchange", read);
  }, []);
  if (!token && !error) return null;
  return <section aria-label="Board invitation" className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-raised p-4 text-sm"><div className="min-w-0 flex-1"><p className="font-medium">You have a board invitation</p><p className="text-xs text-muted-foreground">{signedIn ? "Accept to join this shared board." : "Sign in first; your invitation will wait in this tab."}</p>{error ? <p role="alert" className="mt-1 text-danger">{error}</p> : null}</div>{signedIn ? <ClayButton size="sm" disabled={busy || !token} onClick={() => { setBusy(true); setError(""); void (async () => { try { const boardId = await acceptInvitation(token); await onAccepted(boardId); sessionStorage.removeItem(KEY); setToken(""); } catch (caught) { setError(caught instanceof Error ? caught.message : "Invitation failed. Retry."); } finally { setBusy(false); } })(); }}>{busy ? "Joining…" : "Accept invitation"}</ClayButton> : <a href="/login" className="underline">Sign in to accept</a>}<button type="button" className="min-h-10 px-2 text-xs underline" disabled={busy} onClick={() => { sessionStorage.removeItem(KEY); setToken(""); setError(""); }}>Dismiss invitation</button></section>;
}
