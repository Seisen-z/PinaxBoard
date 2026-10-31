"use client";

import { useEffect, useState } from "react";

import { useLaneStore } from "@/stores/lane-store";
import { recoverInterruptedImport } from "@/features/import-export/storage-transaction";
import { useNoteStore } from "@/stores/note-store";

/**
 * Rehydrates the persisted note store after mount.
 *
 * `useNoteStore` is created with `skipHydration: true`. The server has no
 * `localStorage`, so reading it during render would produce server markup that
 * disagrees with the client's first render — React would discard the tree and
 * log a hydration error. Rehydrating in an effect means the server renders the
 * empty state, and saved notes swap in immediately afterwards.
 *
 * Returns whether hydration has finished, so a caller can hold back UI that
 * would otherwise flash starter content.
 *
 * @example
 * const hydrated = useStoreHydration();
 * if (!hydrated) return <BoardSkeleton />;
 */
export function useStoreHydration(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try { recoverInterruptedImport(); } catch (error) { console.error("Import recovery awaits writable browser storage", error); }
    void useLaneStore.persist.rehydrate();

    const finish = () => {
      if (!cancelled) setHydrated(true);
    };

    // A corrupt or unreadable localStorage entry must not leave the board
    // stuck on a skeleton, so failure resolves to "hydrated" with the seeded
    // state rather than rejecting.
    void useNoteStore
      .persist.rehydrate()
      ?.then(finish)
      .catch((error: unknown) => {
        console.error("Failed to restore saved notes", error);
        finish();
      });

    // `rehydrate()` returns void for a synchronous storage, so settle anyway.
    finish();

    return () => {
      cancelled = true;
    };
  }, []);

  return hydrated;
}
