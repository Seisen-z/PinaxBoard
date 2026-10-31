"use client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { boardFromRow } from "@/lib/mappers/workspace";
import type { Board } from "@/types/board";
/** Exports include archived boards too; normal navigation intentionally does not. RLS remains authoritative. */
export async function fetchExportBoards(workspaceId: string): Promise<Board[]> {
  const result: Board[] = []; let expected: number | null = null;
  do {
    const { data, error, count } = await getSupabaseBrowserClient().from("boards").select("*", { count: "exact" }).eq("workspace_id", workspaceId).order("position", { ascending: true }).order("id").range(result.length, result.length + 499);
    if (error || count === null || expected !== null && expected !== count) throw Error("Workspace boards could not be loaded consistently. Retry the export while online.");
    expected = count;
    if (!data?.length && result.length < count) throw Error("Workspace export received an incomplete page. Retry.");
    result.push(...(data ?? []).map(boardFromRow));
  } while (result.length < expected);
  return result;
}
