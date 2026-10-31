"use client";
import { useBoardAccess, canWriteBoard } from "@/features/collaboration/access";
import { useDialogFocusReturn } from "@/hooks/use-dialog-focus-return";
import { Download, FileUp } from "lucide-react";
import { Dialog } from "radix-ui";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { parseVocabulary, remapVocabulary, writeLocalVocabulary, type Vocabulary } from "@/features/import-export/vocabulary";
import { useRef, useState } from "react";
import { ClayButton } from "@/components/ui/clay-button";
import { imageImportDraft, makeBackup, materializeImport, parseImport, serializeExport, MAX_IMPORT_BYTES, type TacklyBackup, type ImportDraft } from "@/features/import-export/format";
import { blobDataUrl, boardPng, downloadFile, notesPdf, safeName } from "@/features/import-export/browser";
import { stageImport, finishImport, recoverInterruptedImport } from "@/features/import-export/storage-transaction";
import type { Note } from "@/types/note";
import type { Lane } from "@/types/lane";
import { fetchExportBoards } from "@/features/import-export/workspace";
import { fetchBoardContents } from "@/features/notes/repository";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import { useLaneStore } from "@/stores/lane-store";
import { useNoteStore, type BoardContext } from "@/stores/note-store";
import type { Board } from "@/types/board";

export interface ImportExportDialogProps { open: boolean; onOpenChange: (open: boolean) => void; board: Board | null; boards?: Board[]; scope: BoardContext; ready: boolean; }
export function ImportExportDialog({ open, onOpenChange, board, scope, ready }: ImportExportDialogProps) {
  const focusReturn = useDialogFocusReturn(() => document.querySelector<HTMLButtonElement>("[data-import-export-trigger]"));
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [sourceVocabulary, setSourceVocabulary] = useState<Vocabulary>({tags:[],categories:[]});
  const [notice, setNotice] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [exportScope, setExportScope] = useState("board"), [selectedNote, setSelectedNote] = useState("");
  const [drafts, setDrafts] = useState<{ name: string; draft: ImportDraft }[]>([]), [draftIndex, setDraftIndex] = useState(0);
  const notes = useNoteStore((state) => state.notes); const taxonomy = useTaxonomyContext();
  const activeNotes = notes.filter((note) => note.boardId === scope.boardId && note.ownerId === scope.ownerId);
  function assertScope() { const current = useNoteStore.getState().boardContext; if (!ready || current.boardId !== scope.boardId || current.ownerId !== scope.ownerId) throw Error("The board changed. Close and reopen Import / Export."); }
  const exportData = async (format: "json" | "markdown" | "txt" | "pdf" | "png" | "backup") => {
    setBusy(true); setError(null); setNotice(null);
    try {
      assertScope();
      if (format === "png") { const blob = await boardPng(); downloadFile(blob, `${safeName(board?.name ?? "board")}.png`, "image/png"); setNotice("Visible board image downloaded."); return; }
      if (taxonomy.loading || taxonomy.error) throw Error("Wait for tags and categories to finish loading, then retry the export.");
      const state = useNoteStore.getState(); const lanes = useLaneStore.getState().lanes;
      const selection = exportScope === "note" ? state.notes.filter((note) => note.id === selectedNote) : state.notes;
      if (exportScope === "note" && !selection.length) throw Error("Choose a note first.");
      const pack: TacklyBackup[] = [];
      if (exportScope === "workspace" && board) {
        for (const item of await fetchExportBoards(board.workspaceId)) {
          const contents = item.id === scope.boardId ? { lanes, notes: state.notes } : await fetchBoardContents(item.id);
          pack.push(makeBackup("board", item, contents.lanes, contents.notes));
        }
        if (!pack.length) throw Error("Wait for the workspace board list to load, then retry.");
      } else pack.push(makeBackup(exportScope === "note" ? "note" : "board", board, lanes, selection));
      assertScope();
      const allNotes = pack.flatMap((item) => item.notes);
      const name = exportScope === "note" ? selection[0]?.title || "note" : exportScope === "workspace" ? "workspace" : board?.name ?? "board";
      if (format === "pdf") { downloadFile(await notesPdf(allNotes, name), `${safeName(name)}.pdf`, "application/pdf"); }
      else if (format === "backup" || format === "json") {
        const payload = exportScope === "workspace" ? { format: "tackly-workspace-backup", version: 1, boards: pack, tags: taxonomy.tags, categories: taxonomy.categories } : { ...pack[0], tags: taxonomy.tags, categories: taxonomy.categories };
        downloadFile(JSON.stringify(payload, null, 2), `${safeName(name)}.${format === "backup" ? "tackly-backup." : ""}json`, "application/json");
      } else {
        const text = pack.map((item) => `${item.board?.name ?? name}\n\n${serializeExport(format, item).text}`).join("\n\n---\n\n");
        downloadFile(text, `${safeName(name)}.${format === "markdown" ? "md" : "txt"}`, "text/plain;charset=utf-8");
      }
      setNotice(`${exportScope} ${format.toUpperCase()} downloaded. Backups include note records, columns and vocabulary; uploaded media files and version history remain separate.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Export failed. Retry."); } finally { setBusy(false); }
  };
  const readImport = async (file: File) => {
    setBusy(true); setError(null); setNotice(null); setDrafts([]);
    try {
      assertScope(); if (file.size > MAX_IMPORT_BYTES) throw Error("Import files must be 10 MB or smaller.");
      const ext = file.name.split(".").pop()?.toLowerCase(); let next: { name: string; draft: ImportDraft }[];
      if (/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
        const url = await blobDataUrl(file); const image = new Image(); image.src = url;
        try { await image.decode(); } catch { throw Error("This file is not a readable raster image."); }
        next = [{ name: file.name, draft: imageImportDraft(file.name, url) }];
      }
      else {
        const kind = ext === "json" ? "json" : ext === "csv" ? "csv" : ext === "md" || ext === "markdown" ? "markdown" : ext === "txt" ? "text" : null;
        if (!kind) throw Error("Choose JSON, Markdown, TXT, CSV, PNG, JPEG, GIF or WebP.");
        const text = await file.text(); let value: { format?: string; version?: number; boards?: TacklyBackup[] } = {};
        if (kind === "json") { try { value = JSON.parse(text); } catch { /* parseImport reports a precise error */ } setSourceVocabulary(parseVocabulary(value)); }
        if (value?.format === "tackly-workspace-backup") {
          if (value.version !== 1 || !Array.isArray(value.boards) || !value.boards.length) throw Error("Invalid workspace backup.");
          next = value.boards.map((item) => ({ name: item.board?.name ?? "Board", draft: parseImport(JSON.stringify(item), "json") }));
        } else next = [{ name: file.name, draft: parseImport(text, kind, file.name) }];
      }
      assertScope(); setDrafts(next); setDraftIndex(0);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Import failed. Nothing changed."); } finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  const commitImport = async () => {
    if (!canWriteBoard(scope.boardId)) { setError("This board is view-only. Ask the owner for editor access."); return; }
    setBusy(true); setError(null);
    let previous: {notes:Note[];lanes:Lane[]} | null = null;
    try { assertScope(); const draft = drafts[draftIndex]?.draft; if (!draft) return;
      const state = useNoteStore.getState(); const currentLanes = useLaneStore.getState().lanes;
      materializeImport(draft, scope.boardId, scope.ownerId, currentLanes, state.notes); // Validate the whole batch and capacity before creating vocabulary.
      const mapped = await remapVocabulary(draft, sourceVocabulary, taxonomy, board ? {workspaceId:board.workspaceId,ownerId:scope.ownerId} : null);
      assertScope();
      const latest = useNoteStore.getState();
      const next = materializeImport(mapped.draft, scope.boardId, scope.ownerId, useLaneStore.getState().lanes, latest.notes, useBoardAccess.getState().actorId ?? scope.ownerId);
      previous = { notes: latest.notes, lanes: useLaneStore.getState().lanes };
      stageImport(previous, next);
      if (!board) writeLocalVocabulary(mapped.vocabulary);
      else { void queryClient.invalidateQueries({queryKey:queryKeys.tags(board.workspaceId)}); void queryClient.invalidateQueries({queryKey:queryKeys.categories(board.workspaceId)}); }
      useLaneStore.getState().reset(next.lanes, scope.boardId); useNoteStore.getState().reset(next.notes, scope);
      setNotice(`Imported ${draft.notes.length} notes into this board. Existing records were preserved.`); setDrafts([]); finishImport();
    } catch (caught) {
      setNotice(null);
      if (previous) { try { recoverInterruptedImport(); useLaneStore.getState().reset(previous.lanes, scope.boardId); useNoteStore.getState().reset(previous.notes, scope); } catch { /* Keep the recovery marker for the next reload. */ } }
      setError(caught instanceof Error ? caught.message : "Import failed. Retry.");
    } finally { setBusy(false); }
  };
  return <Dialog.Root open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-surface-sunken/70" />
    <Dialog.Content {...focusReturn} className="fixed left-1/2 top-1/2 z-[var(--z-overlay)] max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-lg)] border border-border bg-surface-raised p-6">
      <Dialog.Title className="text-lg font-semibold">Import / Export</Dialog.Title>
      <Dialog.Description className="mt-2 text-sm text-muted-foreground">Preview before importing. Imports create new records in the current board and never overwrite existing notes. Restore each board from a workspace backup by selecting it below.</Dialog.Description>
      <section className="mt-6"><h2 className="flex items-center gap-2 font-medium"><FileUp size={16} aria-hidden="true" /> Import</h2>
        <input ref={input} type="file" className="sr-only" aria-label="Choose import file" accept=".json,.md,.markdown,.txt,.csv,image/png,image/jpeg,image/gif,image/webp" disabled={busy || !ready || !canWriteBoard(scope.boardId)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void readImport(file); }} />
        <ClayButton className="mt-3" disabled={busy || !ready || !canWriteBoard(scope.boardId)} onClick={() => input.current?.click()}>{busy ? "Working…" : "Choose file"}</ClayButton>
        {drafts.length ? <div className="mt-3 space-y-3"><label className="block text-sm">Board to restore<select aria-label="Board to restore" className="ml-2 rounded border border-border bg-surface p-2" value={draftIndex} onChange={(event) => setDraftIndex(Number(event.target.value))}>{drafts.map((item, index) => <option key={index} value={index}>{item.name}</option>)}</select></label><p className="text-sm">{drafts[draftIndex]?.draft.notes.length} notes · {drafts[draftIndex]?.draft.lanes.length} columns. IDs will be regenerated.</p><ClayButton disabled={busy} onClick={() => void commitImport()}>Confirm import</ClayButton><ClayButton variant="ghost" onClick={() => setDrafts([])}>Cancel import</ClayButton></div> : null}
      </section>
      <section className="mt-6 border-t border-border pt-5"><h2 className="flex items-center gap-2 font-medium"><Download size={16} aria-hidden="true" /> Export</h2>
        <label className="mt-3 block text-sm">Export scope<select aria-label="Export scope" value={exportScope} onChange={(event) => setExportScope(event.target.value)} className="ml-2 rounded border border-border bg-surface p-2"><option value="note">Note</option><option value="board">Board</option><option value="workspace">Workspace</option></select></label>
        {exportScope === "note" ? <label className="mt-2 block text-sm">Note<select aria-label="Note to export" value={selectedNote} onChange={(event) => setSelectedNote(event.target.value)} className="ml-2 max-w-full rounded border border-border bg-surface p-2"><option value="">Choose note</option>{activeNotes.map((note) => <option key={note.id} value={note.id}>{note.title || "Untitled"}</option>)}</select></label> : null}
        <div className="mt-3 flex flex-wrap gap-2">{(["json", "markdown", "txt", "pdf", "backup"] as const).map((format) => <ClayButton key={format} size="sm" variant="ghost" className="border border-border" disabled={busy || !ready || !canWriteBoard(scope.boardId)} onClick={() => void exportData(format)}>{format.toUpperCase()}</ClayButton>)}<ClayButton size="sm" variant="ghost" disabled={busy || !ready || !canWriteBoard(scope.boardId)} onClick={() => void exportData("png")}>Visible board PNG</ClayButton></div>
      </section>
      {notice ? <p role="status" className="mt-4 text-sm">{notice}</p> : null}{error ? <p role="alert" className="mt-4 text-sm text-destructive">{error} Choose the file or export format again to retry.</p> : null}
      <div className="mt-5 flex justify-end"><ClayButton variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>Close</ClayButton></div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
