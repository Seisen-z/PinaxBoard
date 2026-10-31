import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BACKGROUND } from "@/config/themes";
import { backgroundObjectPath, readBackgroundFile, removeBackground, saveBoardBackground, uploadBackground, validateBackgroundFile } from "./repository";

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const upload = vi.fn(); const remove = vi.fn();
  const getPublicUrl = vi.fn((path: string) => ({ data: { publicUrl: `https://project.test/storage/v1/object/public/backgrounds/${path}` } }));
  const storageFrom = vi.fn(() => ({ upload, remove, getPublicUrl }));
  const from = vi.fn(() => ({ update }));
  return { single, select, eq, update, upload, remove, getPublicUrl, storageFrom, from };
});
vi.mock("@/lib/supabase/client", () => ({ getSupabaseBrowserClient: () => ({ from: mocks.from, storage: { from: mocks.storageFrom } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.single.mockResolvedValue({ data: { id: "board" }, error: null });
  mocks.upload.mockResolvedValue({ error: null }); mocks.remove.mockResolvedValue({ error: null });
});
const image = () => new File(["image"], "scene.png", { type: "image/png" });
describe("background repository", () => {
  it("rejects unsupported types, empty files, and oversized local/cloud images", () => {
    expect(() => validateBackgroundFile(new File(["svg"], "scene.svg", { type: "image/svg+xml" }), true)).toThrow();
    expect(() => validateBackgroundFile(new File([], "empty.png", { type: "image/png" }), true)).toThrow();
    const file = image(); vi.spyOn(file, "size", "get").mockReturnValue(3 * 1024 * 1024);
    expect(() => validateBackgroundFile(file, false)).toThrow(/2 MB/);
    expect(() => validateBackgroundFile(file, true)).not.toThrow();
    vi.spyOn(file, "size", "get").mockReturnValue(11 * 1024 * 1024);
    expect(() => validateBackgroundFile(file, true)).toThrow(/limit/);
  });
  it("reads local images into reloadable data URLs, not ephemeral blob URLs", async () => {
    expect(await readBackgroundFile(image())).toMatch(/^data:image\/png;base64,/);
  });
  it("uploads to the existing public bucket with owner/board-scoped generated paths", async () => {
    const result = await uploadBackground(image(), "owner", "board");
    expect(mocks.storageFrom).toHaveBeenCalledWith("backgrounds");
    expect(result.path).toMatch(/^owner\/board\/[a-z0-9-]+\.png$/i);
    expect(result.source).toContain(result.path);
    expect(result.source).not.toContain("token=");
    expect(mocks.upload).toHaveBeenCalledWith(result.path, expect.any(File), { contentType: "image/png", upsert: false });
  });
  it("surfaces failed upload without reporting a saved URL", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "offline" } });
    await expect(uploadBackground(image(), "owner", "board")).rejects.toThrow(/retry/);
    expect(mocks.getPublicUrl).not.toHaveBeenCalled();
  });
  it("updates only the background field on the exact board and confirms its row", async () => {
    await saveBoardBackground("board", { ...DEFAULT_BACKGROUND, blur: 100 });
    expect(mocks.from).toHaveBeenCalledWith("boards");
    expect(mocks.eq).toHaveBeenCalledWith("id", "board");
    expect(mocks.update).toHaveBeenCalledWith({ background: { ...DEFAULT_BACKGROUND, blur: 40 } });
    expect(mocks.select).toHaveBeenCalledWith("id");
  });
  it("surfaces save failure or a missing row instead of falsely confirming", async () => {
    mocks.single.mockResolvedValue({ data: null, error: null });
    await expect(saveBoardBackground("board", DEFAULT_BACKGROUND)).rejects.toThrow(/retry/);
    mocks.single.mockResolvedValue({ data: null, error: { message: "offline" } });
    await expect(saveBoardBackground("board", DEFAULT_BACKGROUND)).rejects.toThrow(/retry/);
  });
  it("scopes cleanup to this owner's board object", () => {
    const url = "https://project.test/storage/v1/object/public/backgrounds/owner/board/file.png";
    expect(backgroundObjectPath(url, "owner", "board")).toBe("owner/board/file.png");
    expect(backgroundObjectPath(url, "another", "board")).toBeNull();
    expect(backgroundObjectPath(url, "owner", "different")).toBeNull();
    expect(backgroundObjectPath("/backgrounds/hills.svg", "owner", "board")).toBeNull();
    expect(backgroundObjectPath("https://project.test/x.png", "owner", "board")).toBeNull();
  });
  it("removes an unused upload through the background bucket", async () => {
    await removeBackground("owner/board/file.png");
    expect(mocks.remove).toHaveBeenCalledWith(["owner/board/file.png"]);
  });
});
