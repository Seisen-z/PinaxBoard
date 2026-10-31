import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useBoardCollaboration } from "./use-board-collaboration";
import { useBoardAccess } from "./access";
const mock = vi.hoisted(() => ({ role: vi.fn(), channel: vi.fn(), remove: vi.fn(), track: vi.fn(async () => "ok"), handlers: new Map<string, () => void>(), presence: {} }));
vi.mock("./repository", () => ({ fetchBoardRole: mock.role }));
vi.mock("@/lib/supabase/client", () => ({ getSupabaseBrowserClient: () => ({ channel: mock.channel, removeChannel: mock.remove }) }));
const user = { id: "12345678-1234-4234-8234-123456789abc", email: null, displayName: "Ada", initials: "A", avatarUrl: null };
function wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>{children}</QueryClientProvider>; }
beforeEach(() => {
  vi.clearAllMocks(); mock.handlers.clear(); mock.role.mockResolvedValue("editor");
  mock.channel.mockImplementation(() => { const channel = { on: vi.fn((type: string, config: { event: string; table?: string }, callback: () => void) => { mock.handlers.set(`${type}:${config.table ?? config.event}`, callback); return channel; }), subscribe: vi.fn((callback: (status: string) => void) => { queueMicrotask(() => callback("SUBSCRIBED")); return channel; }), track: mock.track, presenceState: () => mock.presence }; return channel; });
});
afterEach(() => useBoardAccess.setState({ boardId: null, actorId: null, role: "owner" }));
it("joins a private authenticated board room, tracks presence, scopes remote refresh, and cleans up", async () => {
  const refresh = vi.fn(); window.addEventListener("tackly:remote-board", refresh);
  const { result, unmount } = renderHook(() => useBoardCollaboration("board-id", user, "canvas:canvas"), { wrapper });
  await waitFor(() => expect(result.current.status).toBe("Live"));
  expect(mock.channel).toHaveBeenCalledWith("tackly:board:board-id", expect.objectContaining({ config: expect.objectContaining({ private: true }) }));
  expect(mock.track).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id, name: "Ada", visible: false }));
  expect(useBoardAccess.getState()).toMatchObject({ actorId: user.id, role: "editor" });
  act(() => mock.handlers.get("postgres_changes:notes")?.()); expect(refresh).toHaveBeenCalled();
  unmount(); expect(mock.remove).toHaveBeenCalledOnce(); window.removeEventListener("tackly:remote-board", refresh);
});
it("does not connect in signed-out local mode", () => {
  renderHook(() => useBoardCollaboration(null, null, "board:board"), { wrapper }); expect(mock.channel).not.toHaveBeenCalled(); expect(useBoardAccess.getState().boardId).toBeNull();
});
it("does not join a room when membership has been revoked", async () => {
  mock.role.mockResolvedValue(null); const { result } = renderHook(() => useBoardCollaboration("board-id", user, "board:board"), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false)); expect(mock.channel).not.toHaveBeenCalled(); expect(useBoardAccess.getState().role).toBeNull();
});
