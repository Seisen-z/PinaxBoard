"use client";
import { NoteLibrary } from "@/components/notes/note-library";
import { ShareBoardDialog } from "@/components/shell/share-board-dialog";
import { InvitationNotice } from "@/components/shell/invitation-notice";
import { CollaboratorCursors } from "@/components/shell/collaborator-cursors";
import { useBoardCollaboration } from "@/features/collaboration/use-board-collaboration";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";


import { useProvisionWorkspace } from "@/features/workspaces/use-provision-workspace";
import { useOfflineDirectory, useOfflineShell } from "@/features/offline/use-offline-directory";
import { LifecycleWorkspace } from "@/components/lifecycle/lifecycle-workspace";
import { useLocalHistory } from "@/features/history/use-local-history";
import { ReminderCenter } from "@/components/shell/reminder-center";
import { useReminders } from "@/features/reminders/use-reminders";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";
import { ImportExportDialog } from "@/components/shell/import-export-dialog";
import { AnalyticsWorkspace } from "@/components/analytics/analytics-workspace";

import { TimelineWorkspace } from "@/components/timeline/timeline-workspace";
import { timelineBar, timelineWindow, type TimelineScope } from "@/features/timeline/range";
import { CalendarWorkspace } from "@/components/calendar/calendar-workspace";
import { dayKey, dueAtForDay, monthDays, parseDate, startOfMonth } from "@/features/calendar/month";
import { BoardStatus } from "@/components/board/board-status";
import { BoardToolbar } from "@/components/board/board-toolbar";
import { ListWorkspace } from "@/components/list/list-workspace";
import { GridWorkspace } from "@/components/grid/grid-workspace";
import { visibleNotes } from "@/features/board/visible-notes";
import { useSettingsStore } from "@/stores/settings-store";
import { BoardWorkspace } from "@/components/board/board-workspace";
import { Canvas, notesBoundingBox } from "@/components/canvas/canvas";
import { CommandPalette } from "@/components/search/command-palette";
import { NoteFocusDialog } from "@/components/notes/note-focus-dialog";
import { TaxonomyProvider } from "@/features/taxonomy/context";
import { screenToCanvas } from "@/lib/canvas";
import { BackgroundCustomizer } from "@/components/shell/background-customizer";
import { useBackground } from "@/features/background/use-background";
import { AppBackground } from "@/components/shell/app-background";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { BreadcrumbBar } from "@/components/shell/breadcrumb-bar";
import { NAV_ITEMS, type NavItemId } from "@/components/shell/nav-items";
import { BOARD_VIEW_ID, DEFAULT_ZOOM, type BoardViewId } from "@/config/layouts";
import { getLayout } from "@/config/layouts";
import { useActiveWorkspace } from "@/features/workspaces/use-active-workspace";
import { useBoardContents } from "@/features/notes/use-board-contents";
import { useBoardSync } from "@/features/notes/use-board-sync";
import { useCommandShortcut } from "@/hooks/use-command-shortcut";
import { useStoreHydration } from "@/hooks/use-store-hydration";
import { useThemeSync } from "@/hooks/use-theme-sync";
import { firstLaneId, useLaneStore } from "@/stores/lane-store";
import { useCanvasStore } from "@/stores/canvas-store";
import { findNoteTemplate } from "@/features/notes/templates";
import { LOCAL_BOARD_CONTEXT, useNoteStore } from "@/stores/note-store";
import type { SessionUser } from "@/features/auth/types";
import type { BackgroundSettings } from "@/types/board";

export interface AppShellProps {
  /**
   * Explicit embed override. Otherwise board/local background preferences apply.
   */
  background?: BackgroundSettings;
  /** `null` when signed out, or when no Supabase project is connected. */
  user?: SessionUser | null;
  /**
   * The sign-out server action, handed down from the page.
   *
   * Optional so the shell can be rendered without auth wiring â€” in tests, and
   * in any future surface that embeds the board. The account menu simply omits
   * Sign out when it is absent, rather than offering a control that does
   * nothing.
   */
  onSignOut?: () => Promise<void>;
}

/**
 * The Tackly application shell.
 *
 * Composition:
 *
 *   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 *   â”‚ sidebar  â”‚ breadcrumb bar               â”‚
 *   â”‚ (nav)    â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
 *   â”‚          â”‚ board toolbar                â”‚
 *   â”‚          â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
 *   â”‚          â”‚ surface: columns, or Canvas  â”‚
 *   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
 *
 * This reverses FRONTEND_SPEC.md Â§10/Â§11 â€” a permanent sidebar instead of a
 * top navigation bar, and fixed chrome instead of floating clusters over the
 * board. See "Decisions made" in docs/HANDOFF.md for why.
 *
 * `AppBackground` still sits behind everything as the only blurred layer; on
 * the default Workspace theme it is a flat wash rather than a scene.
 *
 * @example
 * <AppShell />
 */
export function AppShell({ background, user = null, onSignOut }: AppShellProps) {
  useOfflineDirectory(user?.id ?? null);
  useOfflineShell(user?.id ?? null);
  const [activeNavItem, setActiveNavItem] = useState<NavItemId>("board");
  const [backgroundOpenScope, setBackgroundOpenScope] = useState<string | null>(null);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [conflictNotice, setConflictNotice] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  useCommandShortcut(openSearch);
  const [activeView, setActiveView] = useState<BoardViewId>(BOARD_VIEW_ID);

  // Restores notes saved in localStorage. The board starts empty
  // until saved personal notes are restored. When a board is open
  // in the cloud, `useBoardContents` replaces that with the server's copy.
  useStoreHydration();

  const cloudEnabled = Boolean(user?.id);
  const localHistory = useLocalHistory(!cloudEnabled);
  const workspace = useActiveWorkspace(cloudEnabled);
  const { activeWorkspace, activeBoard } = workspace;
  const provisioning = useProvisionWorkspace(user?.id ?? null, workspace);
  const queryClient = useQueryClient();
  const boardId = activeBoard?.id ?? null;

  const collaborationView = activeNavItem === "board" ? `board:${activeView}` : activeNavItem;
  const collaboration = useBoardCollaboration(boardId, user, collaborationView);
  const canEdit = !cloudEnabled || collaboration.role === "owner" || collaboration.role === "editor";
  useEffect(() => { const notice = () => setConflictNotice(true); window.addEventListener("tackly:conflict-copy", notice); return () => window.removeEventListener("tackly:conflict-copy", notice); }, []);

  // Autosave. Started before hydration so `markClean` is available to it.
  const sync = useBoardSync({
    boardId,
    ownerId: user?.id ?? null,
    enabled: cloudEnabled,
    boardOwnerId: activeBoard?.ownerId ?? null, canWrite: canEdit, shared: Boolean(collaboration.role),
  });

  const boardContents = useBoardContents({
    boardId,
    ownerId: user?.id ?? null,
    enabled: cloudEnabled && Boolean(collaboration.role) && !collaboration.error,
    // Hydration fills the stores from the server, so nothing is pending yet â€”
    // without this the first diff would write the whole board straight back.
    onHydrated: sync.markClean,
    boardOwnerId: activeBoard?.ownerId ?? null, canWrite: canEdit,
  });

  // Applies the selected theme's tokens to <html> and gives us its background.
  const theme = useThemeSync();
  const backdrop = useBackground(activeBoard, user?.id ?? null, theme.background);
  const backgroundOpen = backgroundOpenScope === backdrop.key;

  const [timelineAnchor, setTimelineAnchor] = useState(() => new Date());
  const [timelineScope, setTimelineScope] = useState<TimelineScope>("month");
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const isDashboard = activeNavItem === "dashboard";
  const isLibrary = activeNavItem === "inbox" || activeNavItem === "mine" || activeNavItem === "notes";
  const isAnalytics = activeNavItem === "analytics";
  const isLifecycle = activeNavItem === "archive" || activeNavItem === "trash";
  const isCanvas = !isDashboard && !isLifecycle && !isAnalytics && !isLibrary && activeView === "canvas";

  const notes = useNoteStore((state) => state.notes);
  const sampleCleanupPending = useNoteStore((state) => state.legacySamplesPending);
  const context = useNoteStore((state) => state.boardContext);
  const dashboardReady = cloudEnabled
    ? Boolean(boardId) && context.boardId === boardId && context.ownerId === activeBoard?.ownerId
    : context.boardId === LOCAL_BOARD_CONTEXT.boardId && context.ownerId === LOCAL_BOARD_CONTEXT.ownerId;

  const reminderNotes = useMemo(() => dashboardReady ? notes.filter((note) => note.boardId === context.boardId && note.ownerId === context.ownerId) : [], [dashboardReady, notes, context.boardId, context.ownerId]);
  const openReminderNote = useCallback((id: string) => {
    const state = useNoteStore.getState();
    if (state.boardContext.boardId !== context.boardId || state.boardContext.ownerId !== context.ownerId) return;
    if (state.notes.some((note) => note.id === id && !note.archived && !note.deletedAt)) state.expandNote(id);
  }, [context.boardId, context.ownerId]);
  const reminderScope = cloudEnabled ? `${user?.id}:${boardId ?? "none"}` : `${LOCAL_BOARD_CONTEXT.ownerId}:${LOCAL_BOARD_CONTEXT.boardId}`;
  const reminders = useReminders(reminderNotes, reminderScope, openReminderNote);

  // What the toolbar counts: live notes on the surface the user is looking at.
  const filters = useSettingsStore((state) => state.boardFilters);
  const showCompleted = useSettingsStore((state) => state.boardShowCompleted);
  const sort = useSettingsStore((state) => state.boardSort);
  const visibleNoteCount = useMemo(() => isCanvas
    ? notes.filter((note) => !note.archived && !note.deletedAt && note.onCanvas).length
    : visibleNotes(notes, filters, showCompleted, sort).filter((note) => activeView === "timeline" ? timelineBar(note, timelineWindow(timelineAnchor, timelineScope)) !== null : activeView !== "calendar" ||
      (parseDate(note.dueAt) !== null && monthDays(calendarMonth).some((day) => day.key === dayKey(parseDate(note.dueAt)!)))).length,
  [notes, isCanvas, filters, showCompleted, sort, activeView, calendarMonth, timelineAnchor, timelineScope]);

  const canvasZoom = useCanvasStore((state) => state.viewport.zoom);
  const canvasViewportSize = useCanvasStore((state) => state.viewportSize);
  const setCanvasZoom = useCanvasStore((state) => state.setZoom);
  const resetCanvasViewport = useCanvasStore((state) => state.resetViewport);
  const fitTo = useCanvasStore((state) => state.fitTo);

  // The lane Board has no viewport of its own, so its zoom readout is local.
  const [laneZoom, setLaneZoom] = useState(DEFAULT_ZOOM);

  const handleZoomChange = useCallback(
    (zoom: number) => {
      if (!isCanvas) {
        setLaneZoom(zoom);
        return;
      }

      // Zoom from the centre of the canvas, since this control has no cursor
      // position to anchor to.
      setCanvasZoom(zoom, {
        x: canvasViewportSize.width / 2,
        y: canvasViewportSize.height / 2,
      });
    },
    [canvasViewportSize.height, canvasViewportSize.width, isCanvas, setCanvasZoom],
  );

  const handleResetZoom = useCallback(() => {
    if (isCanvas) resetCanvasViewport();
    else setLaneZoom(DEFAULT_ZOOM);
  }, [isCanvas, resetCanvasViewport]);

  /** A blank note in the first column â€” the sidebar's compose shortcut. */
  const handleAddNote = useCallback(() => {
    if (!canEdit || cloudEnabled && !dashboardReady) return;
    const laneId = firstLaneId(useLaneStore.getState());
    if (!laneId) return;

    useNoteStore.getState().addNote(laneId);
  }, [cloudEnabled, dashboardReady, canEdit]);

  /** A note prefilled from a template, opened straight away for editing. */
  const handleAddNoteFromTemplate = useCallback((templateId: string) => {
    if (!canEdit || cloudEnabled && !dashboardReady) return;
    const template = findNoteTemplate(templateId);
    const laneId = firstLaneId(useLaneStore.getState());
    if (!template || !laneId) return;

    const id = useNoteStore.getState().addNote(laneId, { template });
    if (id) useNoteStore.getState().expandNote(id);
  }, [cloudEnabled, dashboardReady, canEdit]);

  const handleAddTimelineNote = useCallback(() => {
    const laneId = firstLaneId(useLaneStore.getState());
    if (!laneId) return;
    const date = timelineAnchor;
    const id = useNoteStore.getState().addNote(laneId, {
      startAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0).toISOString(),
      dueAt: dueAtForDay(date),
    });
    useNoteStore.getState().expandNote(id);
  }, [timelineAnchor]);

  const handleAddCalendarNote = useCallback(() => {
    const laneId = firstLaneId(useLaneStore.getState());
    if (!laneId) return;
    const id = useNoteStore.getState().addNote(laneId, { dueAt: dueAtForDay(calendarDate) });
    useNoteStore.getState().expandNote(id);
  }, [calendarDate]);

  const handleAddCanvasNote = useCallback(() => {
    const laneId = firstLaneId(useLaneStore.getState());
    if (!laneId) return;

    // Dropped at the centre of the current view, so it lands where the user is
    // looking rather than at the canvas origin they may have panned away from.
    const { viewport, viewportSize } = useCanvasStore.getState();
    const centre = screenToCanvas(
      { x: viewportSize.width / 2, y: viewportSize.height / 2 },
      viewport,
    );

    useNoteStore.getState().addNote(laneId, {
      onCanvas: true,
      // Offset by half a default note so the card is centred, not its corner.
      x: Math.round(centre.x - 140),
      y: Math.round(centre.y - 120),
    });
  }, []);

  const handleFitToContent = useCallback(() => {
    // Read the notes imperatively: this runs on a click, so subscribing to
    // the whole list here would re-render the shell on every note edit.
    const canvasNotes = useNoteStore
      .getState()
      .notes.filter((note) => !note.archived && !note.deletedAt);

    fitTo(notesBoundingBox(canvasNotes), canvasViewportSize);
  }, [canvasViewportSize, fitTo]);

  return (
    // The shell owns the viewport height: surfaces scroll inside themselves
    // rather than the page scrolling, which is what keeps the chrome fixed.
    //
    // The taxonomy provider wraps everything because its consumers are
    // scattered: the toolbar's Filter menu, every note menu's pickers, and the
    // category badge on every card.
    <TaxonomyProvider canManage={!cloudEnabled || activeWorkspace?.ownerId === user?.id}
      workspaceId={activeWorkspace?.id ?? null}
      ownerId={user?.id ?? null}
    >
    <div className="relative flex h-dvh overflow-hidden pb-14 md:pb-0">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-overlay)] focus:rounded focus:bg-surface focus:p-3">Skip to notes</a>
      <button type="button" aria-label="Quick add note" disabled={!dashboardReady} onClick={() => { handleAddNote(); setActiveNavItem("board"); setActiveView(BOARD_VIEW_ID); }} className="fixed bottom-20 right-4 z-[var(--z-header)] grid size-12 place-items-center rounded-full border border-border bg-primary text-2xl text-primary-foreground md:hidden">+</button>
      <AppBackground settings={background ?? backdrop.rendered} />
      <BackgroundCustomizer key={`${backdrop.key}:${backgroundOpen}`} open={backgroundOpen}
        settings={backdrop.settings} fallback={theme.background} cloud={cloudEnabled} busy={backdrop.busy}
        onChange={backdrop.change} onSave={backdrop.save}
        onClose={() => { backdrop.cancel(); setBackgroundOpenScope((scope) => scope === backdrop.key ? null : scope); }} />

      <AppSidebar
        activeItem={activeNavItem}
        onSelectItem={(id) => {
          setActiveNavItem(id);
          if (id === "board" || id === "canvas" || id === "calendar" || id === "timeline") setActiveView(id);
        }}
        ownerId={user?.id ?? null}
        onOpenImportExport={() => setImportExportOpen(true)}
        onCompose={isDashboard || isLifecycle || isLibrary ? () => {
          if (!dashboardReady || !canEdit) return;
          handleAddNote(); setActiveNavItem("board"); setActiveView(BOARD_VIEW_ID);
        } : handleAddNote}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <BreadcrumbBar
          section={sectionLabel(activeNavItem, activeView)}
          onOpenShare={() => setShareOpen(true)}
          onOpenSearch={openSearch}
          onOpenNotifications={() => setRemindersOpen(true)}
          notificationCount={reminders.unread}
          {...(!background && (!cloudEnabled || activeBoard && collaboration.role === "owner") ? { onOpenBackground: () => { if (!cloudEnabled || collaboration.role === "owner") setBackgroundOpenScope(backdrop.key); } } : {})}
          user={user}
          syncVisible={cloudEnabled && Boolean(boardId)}
          onRetrySync={sync.retry}
          {...(onSignOut ? { onSignOut } : {})}
        />

        <InvitationNotice signedIn={cloudEnabled} onAccepted={async (id) => {
          const {data,error}=await getSupabaseBrowserClient().from("boards").select("workspace_id").eq("id",id).single();
          if(error||!data) throw Error("Joined, but the board could not be opened yet. Retry.");
          await queryClient.invalidateQueries({queryKey:queryKeys.workspaces()});
          await queryClient.invalidateQueries({queryKey:queryKeys.boards(data.workspace_id),refetchType:"all"});
          useWorkspaceStore.getState().setActiveWorkspace(data.workspace_id);useWorkspaceStore.getState().setActiveBoard(id);
          setActiveNavItem("board");setActiveView("board");
        }} />
        {cloudEnabled && boardId ? <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-2 text-xs text-muted-foreground" aria-label="Collaboration status">
          <span role="status">{collaboration.error ? "Sharing connection interrupted" : collaboration.loading ? "Checking access…" : collaboration.role ? `${collaboration.role === "viewer" ? "View only" : "Can edit"} · ${collaboration.status}` : "Board access removed"}</span>
          {collaboration.cursors.length ? <span>{Array.from(new Set(collaboration.cursors.map(cursor=>cursor.name))).join(", ")} online</span> : null}
          {collaboration.error ? <button className="underline" onClick={collaboration.retry}>Retry sharing connection</button> : null}
        </div> : null}
        {!cloudEnabled && sampleCleanupPending ? <div role="status" className="flex items-center gap-3 border-b border-border bg-surface-raised px-4 py-2 text-sm">Sample cleanup needs browser storage space. Your saved notes are kept.<button className="ml-auto underline" onClick={() => void useNoteStore.persist.rehydrate()}>Retry cleanup</button></div> : null}
        {conflictNotice ? <div role="status" className="flex items-center gap-3 border-b border-border bg-surface-raised px-4 py-2 text-sm">Concurrent edits were kept for review. Look for conflict copies in your notes or columns.<button className="ml-auto underline" onClick={()=>setConflictNotice(false)}>Dismiss</button></div> : null}
        {!isDashboard && !isLifecycle && !isAnalytics && !isLibrary ? <BoardToolbar
          canAddNote={dashboardReady && canEdit}
          showViewSwitcher={activeNavItem === "board"}
          activeView={activeView}
          onSelectView={(view) => { setActiveView(view); setActiveNavItem("board"); }}
          noteCount={visibleNoteCount}
          zoom={isCanvas ? canvasZoom : laneZoom}
          onZoomChange={handleZoomChange}
          onResetZoom={handleResetZoom}
          onAddNoteFromTemplate={handleAddNoteFromTemplate}
          onAddNote={isCanvas ? handleAddCanvasNote : activeView === "calendar" ? handleAddCalendarNote : activeView === "timeline" ? handleAddTimelineNote : handleAddNote}
          onFitToContent={handleFitToContent}
          onAddCanvasNote={handleAddCanvasNote}
        /> : null}

        <BoardStatus
          loading={boardContents.loading || provisioning.busy || (cloudEnabled && workspace.loading)}
          error={boardContents.error ?? provisioning.error ?? (cloudEnabled ? workspace.error : null)}
          onRetry={() => { provisioning.retry(); boardContents.refetch(); void queryClient.refetchQueries({queryKey:queryKeys.workspaces()}); if(activeWorkspace) void queryClient.refetchQueries({queryKey:queryKeys.boards(activeWorkspace.id)}); }}
        />

        {cloudEnabled && !dashboardReady ? (
          <main id="main-content" tabIndex={-1} aria-label="Preparing workspace" className="relative z-[var(--z-board)] flex-1 p-6"><p role="status">Preparing your workspace and board…</p></main>
        ) : isLifecycle ? (
          <LifecycleWorkspace key={`${activeNavItem}:${context.ownerId}:${context.boardId}`} mode={activeNavItem as "archive"|"trash"}
            notes={reminderNotes} scope={context} ready={dashboardReady} cloud={cloudEnabled} boardName={activeBoard?.name??(cloudEnabled?"No board selected":"Local board")}
            beforePurge={cloudEnabled?sync.savePending:async()=>{localHistory.flush();return true;}}
            onPurged={cloudEnabled?sync.acceptPurged:(ids)=>useNoteStore.getState().removePurgedNotes(ids)} />
        ) : isDashboard ? (
          <DashboardWorkspace
            notes={dashboardReady ? notes.filter((note) => note.boardId === context.boardId && note.ownerId === context.ownerId) : []} boards={cloudEnabled ? workspace.boards : []}
            boardName={activeBoard?.name ?? (cloudEnabled ? "No board selected" : "Local board")}
            cloud={cloudEnabled} canAddNote={dashboardReady && canEdit}
            loading={cloudEnabled && (workspace.loading || boardContents.loading || (Boolean(boardId) && !dashboardReady && !workspace.error && !boardContents.error))}
            error={cloudEnabled ? workspace.error ?? boardContents.error : null}
            onRetry={() => {
              void queryClient.refetchQueries({ queryKey: queryKeys.workspaces() });
              if (activeWorkspace) void queryClient.refetchQueries({ queryKey: queryKeys.boards(activeWorkspace.id) });
              boardContents.refetch();
            }}
            onOpenNote={(id) => useNoteStore.getState().expandNote(id)}
            onOpenBoard={(id) => { useWorkspaceStore.getState().setActiveBoard(id); setActiveNavItem("board"); setActiveView(BOARD_VIEW_ID); }}
            onAddNote={() => { handleAddNote(); setActiveNavItem("board"); setActiveView(BOARD_VIEW_ID); }}
          />
        ) : isLibrary ? (
          <NoteLibrary key={activeNavItem} mode={activeNavItem === "inbox" ? "inbox" : activeNavItem === "notes" ? "all" : "mine"} actorId={user?.id ?? context.ownerId} onCapture={() => {
            if (!canEdit || !dashboardReady) return;const laneId=firstLaneId(useLaneStore.getState());if(!laneId)return;
            const id=useNoteStore.getState().addNote(laneId,{inbox:activeNavItem === "inbox"});if(id)useNoteStore.getState().expandNote(id);
          }} />
        ) : isAnalytics ? (
          <AnalyticsWorkspace boards={workspace.boards} cloud={cloudEnabled} ownerId={user?.id ?? null} notes={dashboardReady ? notes.filter((note) => note.boardId === context.boardId && note.ownerId === context.ownerId) : []} />
        ) : isCanvas ? (
          <Canvas onFitToContent={handleFitToContent} />
        ) : activeView === "grid" ? (
          <GridWorkspace />
        ) : activeView === "list" ? (
          <ListWorkspace />
        ) : activeView === "timeline" ? (
          <TimelineWorkspace anchor={timelineAnchor} scope={timelineScope} onChangeAnchor={setTimelineAnchor} onChangeScope={setTimelineScope} />
        ) : activeView === "calendar" ? (
          <CalendarWorkspace month={calendarMonth} selectedDate={calendarDate}
            onChangeMonth={(month) => { setCalendarMonth(month); setCalendarDate(month); }} onSelectDate={setCalendarDate} onAddNote={handleAddCalendarNote} />
        ) : (
          <BoardWorkspace />
        )}
      </div>

      {/*
        One full-screen editor for the whole app, driven by the store. Edit on
        a card, on the canvas or in a right-click menu all open this.
      */}
      <CollaboratorCursors cursors={collaboration.cursors} view={collaborationView} />
      <ShareBoardDialog key={boardId ?? "local"} open={shareOpen} onOpenChange={setShareOpen} boardId={boardId} boardName={activeBoard?.name ?? "board"} role={collaboration.role} signedIn={cloudEnabled} />
      <ImportExportDialog open={importExportOpen} onOpenChange={setImportExportOpen} board={activeBoard} boards={workspace.boards} scope={context} ready={dashboardReady} />
      <ReminderCenter open={remindersOpen} onClose={() => setRemindersOpen(false)}
        items={reminders.items} permission={reminders.permission} error={reminders.error}
        onRetry={reminders.retry} onEnableBrowser={() => void reminders.requestPermission()}
        onRead={reminders.markRead} onOpenNote={openReminderNote} />
      <NoteFocusDialog ownerId={user?.id ?? null} onShare={() => setShareOpen(true)}
        beforeHistoryRestore={cloudEnabled?sync.savePending:async()=>{localHistory.flush();return true;}}
        onHistoryRestored={cloudEnabled?sync.acceptRestored:(note)=>useNoteStore.getState().applyRestoredNote(note)}
        onOpenHistory={localHistory.flush} />

      <CommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        ownerId={user?.id ?? null}
      />
    </div>
    </TaxonomyProvider>
  );
}

/**
 * The trailing breadcrumb: the destination, or the layout when the user has
 * switched the board's view away from its columns.
 */
function sectionLabel(navItem: NavItemId, view: BoardViewId): string {
  const destination =
    NAV_ITEMS.find((item) => item.id === navItem)?.label ?? "Board";

  if (navItem !== "board" || view === BOARD_VIEW_ID) return destination;

  return getLayout(view)?.label ?? destination;
}



