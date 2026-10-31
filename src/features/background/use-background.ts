"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settings-store";
import { queryKeys } from "@/lib/query-client";
import type { Board, BackgroundSettings } from "@/types/board";
import { resolvedBackground, normalizeBackground } from "./settings";
import { uploadBackground, saveBoardBackground, removeBackground, backgroundObjectPath } from "./repository";

interface SaveInput {
  board: Board | null;
  ownerId: string | null;
  settings: BackgroundSettings;
  file: File | null;
}
/** A board-scoped, disposable preview; only Save writes durable data. */
export function useBackground(board: Board | null, ownerId: string | null, fallback: BackgroundSettings) {
  const client = useQueryClient();
  const local = useSettingsStore((state) => state.localBackground);
  const saveLocal = useSettingsStore((state) => state.setLocalBackground);
  const key = ownerId ? `cloud:${ownerId}:${board?.id ?? "pending"}` : "local";
  const [preview, setPreview] = useState<{ key: string; settings: BackgroundSettings } | null>(null);
  const saved = resolvedBackground(ownerId ? board?.background ?? null : local, fallback);
  const settings = preview?.key === key ? preview.settings : saved;

  const mutation = useMutation({
    mutationFn: async (input: SaveInput) => {
      let next = normalizeBackground(input.settings);
      if (!input.ownerId) {
        try { saveLocal(next); }
        catch { throw new Error("Could not save locally. Browser storage may be full or blocked. Choose a smaller image and retry."); }
        return;
      }
      if (!input.board) throw new Error("Open a board before saving its background.");
      const board = input.board;
      const queryKey = queryKeys.boards(board.workspaceId);
      await client.cancelQueries({ queryKey });
      let uploaded: string | null = null;
      try {
        if (input.file) {
          const result = await uploadBackground(input.file, input.ownerId, board.id);
          uploaded = result.path;
          next = { ...next, type: "image", source: result.source };
        }
        await saveBoardBackground(board.id, next);
      } catch (error) {
        if (uploaded) await removeBackground(uploaded).catch((cause: unknown) => console.error("Background cleanup failed", cause));
        throw error;
      }
      // Captured ids target the saved board even if navigation changed mid-flight.
      client.setQueryData<Board[]>(queryKey, (boards) => boards?.map((item) => item.id === board.id ? { ...item, background: next } : item));
      void client.invalidateQueries({ queryKey });
      const previousPath = backgroundObjectPath(board.background.source, input.ownerId, board.id);
      if (previousPath && board.background.source !== next.source) {
        await removeBackground(previousPath).catch((cause: unknown) => console.error("Background cleanup failed", cause));
      }
    },
  });

  return {
    key, settings, rendered: resolvedBackground(settings, fallback), saved, busy: mutation.isPending,
    change: (settings: BackgroundSettings) => setPreview({ key, settings }),
    cancel: () => setPreview((current) => current?.key === key ? null : current),
    save: async (settings: BackgroundSettings, file: File | null) => {
      await mutation.mutateAsync({ board, ownerId, settings, file });
      setPreview((current) => current?.key === key && current.settings === settings ? null : current);
    },
  };
}
