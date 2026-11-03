"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2 } from "lucide-react";
import { useState } from "react";

import { ClayButton } from "@/components/ui/clay-button";
import { SurfacePanel } from "@/components/ui/surface-panel";
import { acceptInvitationById, describeScope, fetchSharedOverview, revokeInvitation } from "@/features/collaboration/repository";

export interface SharedWorkspaceProps {
  signedIn: boolean;
  /** Switches the app to a board shared with the user. */
  onOpenBoard: (boardId: string, workspaceId?: string) => void | Promise<void>;
  onShare: () => void;
  /** Returns to the user's own board. */
  onBackToMine: () => void;
  /** True while a board owned by someone else is open. */
  viewingShared: boolean;
}

const date = (value: string) => new Date(value).toLocaleDateString();

/** Every share in one place: invitations for you, boards shared with you, and invitations you sent. */
export function SharedWorkspace({ signedIn, onOpenBoard, onShare, onBackToMine, viewingShared }: SharedWorkspaceProps) {
  const client = useQueryClient();
  const overview = useQuery({ queryKey: ["shared-overview"], queryFn: fetchSharedOverview, enabled: signedIn, refetchInterval: 30_000 });
  const [busy, setBusy] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const [error, setError] = useState("");
  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key); setError("");
    try { await task(); await client.invalidateQueries({ queryKey: ["shared-overview"] }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "That did not work. Retry."); }
    finally { setBusy(null); }
  };
  const data = overview.data;
  const status = (invite: NonNullable<typeof data>["sent"][number]) =>
    invite.revoked ? "Revoked" : invite.accepted ? `Accepted${invite.acceptedByName ? ` by ${invite.acceptedByName}` : ""}` : new Date(invite.expiresAt).getTime() <= now ? "Expired" : `Pending · expires ${date(invite.expiresAt)}`;

  return (
    <main id="main-content" tabIndex={-1} aria-label="Shared" className="tk-scrollbar-thin relative z-[var(--z-board)] min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Collaboration</p>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-semibold tracking-tight"><Share2 size={24} aria-hidden="true" />Shared</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Boards shared with you, invitations waiting for you, and invitations you have sent.</p>
        </div>
        <div className="flex flex-wrap gap-2"><ClayButton size="sm" disabled={!signedIn} onClick={onBackToMine}>← My board</ClayButton><ClayButton size="sm" variant="primary" disabled={!signedIn || viewingShared} onClick={onShare}>Invite to current board</ClayButton></div>
      </header>

      {!signedIn ? <SurfacePanel className="p-6"><p className="text-sm">Sign in to share boards and see what is shared with you.</p><a href="/login" className="mt-3 inline-block text-sm underline">Sign in</a></SurfacePanel> : overview.isLoading ? <p role="status" className="text-sm">Loading shared boards…</p> : overview.error ? <p role="alert" className="text-sm">{overview.error.message} <button type="button" className="underline" onClick={() => void overview.refetch()}>Retry</button></p> : data ? <div className="flex flex-col gap-6">
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

        {data.pending.length ? <section aria-label="Invitations for you"><h2 className="mb-2 text-sm font-semibold">Invitations for you ({data.pending.length})</h2>
          <SurfacePanel className="divide-y divide-border overflow-hidden">{data.pending.map((invite) => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{invite.boardName}</p><p className="text-xs text-muted-foreground">Shared from {invite.ownerName} · {describeScope(invite.scope, invite.noteCount)} · {invite.role === "editor" ? "Can edit" : "Can view"} · expires {date(invite.expiresAt)}</p></div>
            <ClayButton size="sm" variant="primary" disabled={busy === invite.id} onClick={() => void run(invite.id, async () => { const boardId = await acceptInvitationById(invite.id); await onOpenBoard(boardId); })}>Accept and open</ClayButton>
          </div>)}</SurfacePanel></section> : null}

        <section aria-label="Shared with you"><h2 className="mb-2 text-sm font-semibold">Shared with you ({data.incoming.length})</h2>
          {data.incoming.length ? <SurfacePanel className="divide-y divide-border overflow-hidden">{data.incoming.map((board) => <div key={board.boardId} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{board.boardName}</p><p className="text-xs text-muted-foreground">Shared from {board.ownerName} · {describeScope(board.scope, board.noteCount)} · {board.role === "editor" ? "Can edit" : "Can view"} · joined {date(board.joinedAt)}</p></div>
            <ClayButton size="sm" onClick={() => void onOpenBoard(board.boardId, board.workspaceId)}>Open board</ClayButton>
          </div>)}</SurfacePanel> : <p className="text-sm text-muted-foreground">No one has shared a board with you yet. Accepted invitations appear here, with who shared them.</p>}
        </section>

        <section aria-label="Invitations you sent"><h2 className="mb-2 text-sm font-semibold">Invitations you sent ({data.sent.length})</h2>
          {data.sent.length ? <SurfacePanel className="divide-y divide-border overflow-hidden">{data.sent.map((invite) => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{invite.boardName}</p><p className="text-xs text-muted-foreground">{invite.email ? `To ${invite.email}` : "Link invitation"} · {describeScope(invite.scope, invite.noteCount)} · {invite.role === "editor" ? "Can edit" : "Can view"} · {status(invite)}</p></div>
            {!invite.accepted && !invite.revoked && new Date(invite.expiresAt).getTime() > now ? <ClayButton size="sm" variant="ghost" disabled={busy === invite.id} onClick={() => void run(invite.id, () => revokeInvitation(invite.id))}>Revoke</ClayButton> : null}
          </div>)}</SurfacePanel> : <p className="text-sm text-muted-foreground">You have not sent any invitations. Use Share on a board to invite someone by link or email.</p>}
        </section>
      </div> : null}
    </main>
  );
}
