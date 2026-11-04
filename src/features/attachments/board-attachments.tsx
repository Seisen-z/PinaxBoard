"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { fetchAttachmentsForNotes } from "@/features/attachments/repository";
import type { Attachment } from "@/types/note";

const EMPTY: readonly Attachment[] = [];
const BoardAttachmentsContext = createContext<ReadonlyMap<string, readonly Attachment[]> | null>(null);

export interface BoardAttachmentsProviderProps {
  boardId: string | null;
  /** Notes on the open board. Only their files are fetched. */
  noteIds: readonly string[];
  /** False when signed out: files live in cloud storage. */
  enabled: boolean;
  children: ReactNode;
}

/**
 * One request for every file on the open board, so a card can show its images
 * and downloads without each card querying for itself.
 *
 * Re-fetched when the editor uploads or removes a file, and when a
 * collaborator's save arrives.
 */
export function BoardAttachmentsProvider({ boardId, noteIds, enabled, children }: BoardAttachmentsProviderProps) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["board-attachments", boardId],
    queryFn: () => fetchAttachmentsForNotes(noteIds),
    enabled: enabled && Boolean(boardId) && noteIds.length > 0,
    staleTime: 60_000,
  });

  useEffect(() => {
    const refresh = (event: Event) => {
      if ((event as CustomEvent<string>).detail === boardId) void client.invalidateQueries({ queryKey: ["board-attachments", boardId] });
    };
    window.addEventListener("tackly:remote-board", refresh);
    return () => window.removeEventListener("tackly:remote-board", refresh);
  }, [client, boardId]);

  const byNote = useMemo(() => {
    const map = new Map<string, Attachment[]>();
    for (const attachment of query.data ?? []) map.set(attachment.noteId, [...(map.get(attachment.noteId) ?? []), attachment]);
    return map;
  }, [query.data]);

  return <BoardAttachmentsContext.Provider value={byNote}>{children}</BoardAttachmentsContext.Provider>;
}

/** The files on one note, from the board-wide fetch. Empty outside a provider. */
export function useNoteAttachments(noteId: string): readonly Attachment[] {
  return useContext(BoardAttachmentsContext)?.get(noteId) ?? EMPTY;
}
