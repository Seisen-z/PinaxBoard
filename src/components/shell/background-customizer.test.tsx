import { act, fireEvent, render, screen, waitFor } from "@/test/render";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BackgroundCustomizer } from "./background-customizer";
import { AppBackground } from "./app-background";
import { AppShell } from "./app-shell";
import { ThemeToggle } from "./theme-toggle";
import { DEFAULT_BACKGROUND, getTheme } from "@/config/themes";
import { useBackground } from "@/features/background/use-background";
import { saveBoardBackground, uploadBackground, removeBackground } from "@/features/background/repository";
import { queryKeys } from "@/lib/query-client";
import { useSettingsStore } from "@/stores/settings-store";
import { useNoteStore } from "@/stores/note-store";
import type { Board } from "@/types/board";

vi.mock("@/features/background/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/background/repository")>();
  return { ...actual, saveBoardBackground: vi.fn(), uploadBackground: vi.fn(), removeBackground: vi.fn() };
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(saveBoardBackground).mockResolvedValue();
  vi.mocked(uploadBackground).mockResolvedValue({ path: "owner/a/new.png", source: "https://project.test/storage/v1/object/public/backgrounds/owner/a/new.png" });
  vi.mocked(removeBackground).mockResolvedValue();
});
function board(id: string): Board {
  return { id, workspaceId: "workspace", ownerId: "owner", name: id, icon: null, color: null, layoutMode: "canvas", background: DEFAULT_BACKGROUND,
    position: 0, createdAt: "2026-10-14", updatedAt: "2026-10-14", archivedAt: null };
}
function Harness({ activeBoard = null }: { activeBoard?: Board | null }) {
  const mode = useSettingsStore((state) => state.themeMode);
  const fallback = getTheme(mode).background;
  const bg = useBackground(activeBoard, activeBoard ? "owner" : null, fallback);
  const [open, setOpen] = useState(true);
  return <><AppBackground settings={bg.rendered} /><ThemeToggle />
    <button onClick={() => setOpen(true)}>Customize background</button>
    <BackgroundCustomizer key={`${bg.key}:${open}`} open={open} settings={bg.settings} fallback={fallback}
      busy={bg.busy} cloud={Boolean(activeBoard)} onChange={bg.change} onSave={bg.save}
      onClose={() => { bg.cancel(); setOpen(false); }} /></>;
}
const TAB_NAMES: Record<string, string> = { solid: "Colors", gradient: "Gradients", pattern: "Patterns", image: "Scenes" };
/** Opens a gallery tab. Choosing a look is a separate click, so a tab never changes the board by itself. */
function type(value: string) { fireEvent.click(screen.getByRole("tab", { name: TAB_NAMES[value] ?? value })); }
/** The old "Solid" type switched to sand by itself; now it is an explicit choice. */
function pickSand() { type("solid"); fireEvent.click(screen.getByRole("button", { name: "sand background" })); }
function imageCss() { return screen.getByTestId("app-background").style.getPropertyValue("--bg-image"); }
function colorCss() { return screen.getByTestId("app-background").style.getPropertyValue("--bg-color"); }

describe("background customization", () => {
  it("previews solids and Cancel restores the saved background without persistence", () => {
    render(<Harness />); const before = imageCss();
    type("solid"); fireEvent.click(screen.getByRole("button", { name: "sage background" }));
    expect(colorCss()).toBe("var(--desk-sage)");
    expect(useSettingsStore.getState().localBackground).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(imageCss()).toBe(before);
    expect(useSettingsStore.getState().localBackground).toBeNull();
  });
  it("saves locally, survives reopening, and does not mutate notes or their creation flow", async () => {
    const notes = useNoteStore.getState().notes;
    render(<Harness />); type("solid");
    fireEvent.change(screen.getByLabelText("Custom solid color"), { target: { value: "#123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Save background" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(localStorage.getItem("tackly:settings")).toContain("#123456");
    fireEvent.click(screen.getByRole("button", { name: "Customize background" }));
    expect(screen.getByLabelText("Custom solid color")).toHaveValue("#123456");
    expect(useNoteStore.getState().notes).toBe(notes);
  });
  it("previews custom gradients and patterns on the actual layer", () => {
    render(<Harness />); fireEvent.click(screen.getByText("Custom gradient"));
    fireEvent.change(screen.getByLabelText("Gradient start"), { target: { value: "#123456" } });
    fireEvent.change(screen.getByLabelText("Gradient end"), { target: { value: "#abcdef" } });
    fireEvent.change(screen.getByLabelText("Gradient angle"), { target: { value: "90" } });
    expect(imageCss()).toBe("linear-gradient(90deg, #123456, #abcdef)");
    type("pattern"); fireEvent.click(screen.getByRole("button", { name: "Graph paper" }));
    expect(imageCss()).toContain("repeating-linear-gradient");
  });
  it("previews both built-in image assets and wraps their paths as CSS URLs", () => {
    render(<Harness />); type("image");
    fireEvent.click(screen.getByRole("button", { name: "Quiet hills" }));
    expect(imageCss()).toBe('url("/backgrounds/hills.svg")');
    fireEvent.click(screen.getByRole("button", { name: "Evening dunes" }));
    expect(imageCss()).toBe('url("/backgrounds/dunes.svg")');
  });
  it("changes every effect, tint and reset without blurring foreground controls", () => {
    render(<Harness />); fireEvent.click(screen.getByText("Effects"));
    for (const label of ["Blur", "Brightness", "Saturation", "Contrast", "Opacity", "Darkening overlay", "Vignette", "Grain"]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value: label === "Blur" ? "12" : "0.5" } });
    }
    const bg = screen.getByTestId("app-background");
    expect(bg.style.getPropertyValue("--bg-blur")).toBe("12px");
    expect(bg.style.getPropertyValue("--bg-opacity")).toBe("0.5");
    fireEvent.change(screen.getByLabelText("Tint"), { target: { value: "#123456" } });
    expect(bg.style.getPropertyValue("--bg-tint")).toBe("#123456");
    fireEvent.click(screen.getByRole("button", { name: "Remove tint" }));
    expect(bg.style.getPropertyValue("--bg-tint")).toBe("transparent");
    expect(document.querySelectorAll(".tk-background-layer")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Reset to theme background" }));
    expect(bg.style.getPropertyValue("--bg-blur")).toBe("0px");
    expect(imageCss()).toBe(getTheme(useSettingsStore.getState().themeMode).background.source);
  });
  it("previews and persists a local uploaded image without cloud requests", async () => {
    render(<Harness />); type("image");
    fireEvent.change(screen.getByLabelText("Upload background"), { target: { files: [new File(["image"], "local.png", { type: "image/png" })] } });
    await waitFor(() => expect(imageCss()).toContain("data:image/png;base64,"));
    fireEvent.click(screen.getByRole("button", { name: "Save background" }));
    await waitFor(() => expect(useSettingsStore.getState().localBackground?.source).toMatch(/^data:image/));
    expect(uploadBackground).not.toHaveBeenCalled();
  });
  it("reports invalid uploads without replacing the previous preview", async () => {
    render(<Harness />); type("image"); const before = imageCss();
    fireEvent.change(screen.getByLabelText("Upload background"), { target: { files: [new File(["bad"], "bad.txt", { type: "text/plain" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/type|image|supported/i);
    expect(imageCss()).toBe(before);
  });
  it("keeps failed local saves as drafts and supports retry", async () => {
    render(<Harness />); pickSand();
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Full"); });
    fireEvent.click(screen.getByRole("button", { name: "Save background" }));
    await screen.findByRole("alert"); spy.mockRestore();
    expect(useSettingsStore.getState().localBackground).toBeNull();
    expect(colorCss()).toBe("var(--desk-sand)");
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(useSettingsStore.getState().localBackground?.type).toBe("solid"));
  });
  it("cleans failed cloud uploads, retains the preview and retries without persisting data URLs", async () => {
    render(<Harness activeBoard={board("a")} />); type("image");
    fireEvent.change(screen.getByLabelText("Upload background"), { target: { files: [new File(["image"], "cloud.png", { type: "image/png" })] } });
    await waitFor(() => expect(imageCss()).toContain("data:image/png"));
    vi.mocked(saveBoardBackground).mockRejectedValueOnce(new Error("Offline. Retry."));
    fireEvent.click(screen.getByRole("button", { name: "Save background" }));
    await screen.findByRole("alert");
    expect(removeBackground).toHaveBeenCalledWith("owner/a/new.png");
    expect(useSettingsStore.getState().localBackground).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(saveBoardBackground).toHaveBeenCalledTimes(2));
    expect(saveBoardBackground).toHaveBeenLastCalledWith("a", expect.objectContaining({ source: "https://project.test/storage/v1/object/public/backgrounds/owner/a/new.png" }));
  });
  it("targets the captured board even when navigation changes during a save", async () => {
    const a = board("a"); const b = board("b");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(queryKeys.boards("workspace"), [a, b]);
    let finish = () => {};
    vi.mocked(saveBoardBackground).mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const ui = (activeBoard: Board) => <QueryClientProvider client={client}><Harness activeBoard={activeBoard} /></QueryClientProvider>;
    const view = render(ui(a)); pickSand();
    fireEvent.click(screen.getByRole("button", { name: "Save background" }));
    await waitFor(() => expect(saveBoardBackground).toHaveBeenCalledWith("a", expect.objectContaining({ type: "solid" })));
    view.rerender(ui(b));
    expect(imageCss()).toBe(DEFAULT_BACKGROUND.source);
    await act(async () => { finish(); });
    const cached = client.getQueryData<Board[]>(queryKeys.boards("workspace"));
    expect(cached?.find((item) => item.id === "a")?.background.type).toBe("solid");
    expect(cached?.find((item) => item.id === "b")?.background).toEqual(DEFAULT_BACKGROUND);
  });
  it("retains custom backgrounds while toggling and persisting only light/dark", async () => {
    render(<Harness />); pickSand();
    fireEvent.click(screen.getByRole("button", { name: "Save background" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(useSettingsStore.getState().themeMode).toBe("dark");
    expect(colorCss()).toBe("var(--desk-sand)");
    expect(localStorage.getItem("tackly:settings")).toContain('"themeMode":"dark"');
  });
  it("is reachable from the real app shell without bringing back Kanban", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Customize background" }));
    expect(screen.getByRole("dialog", { name: "Background" })).toBeInTheDocument();
    pickSand(); expect(colorCss()).toBe("var(--desk-sand)");
    expect(screen.queryByRole("button", { name: "Kanban" })).not.toBeInTheDocument();
  });
});
