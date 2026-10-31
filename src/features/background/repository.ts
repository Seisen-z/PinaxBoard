"use client";

import { storagePath, validateFile } from "@/features/attachments/upload-policy";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createId } from "@/lib/utils";
import type { BackgroundSettings } from "@/types/board";
import { normalizeBackground } from "./settings";

/** Local images are kept in settings storage; cap them before base64 expansion. */
export function validateBackgroundFile(file: File, cloud: boolean): void {
  const validation = validateFile(file, "covers");
  if (!validation.ok) throw new Error(validation.message);
  if (!cloud && file.size > 2 * 1024 * 1024) throw new Error("Local background images must be 2 MB or smaller. Choose a smaller image and retry.");
}
export function readBackgroundFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read the image. Try again."));
    reader.onerror = () => reject(new Error("Could not read the image. Try again."));
    reader.onabort = () => reject(new Error("Image reading was cancelled."));
    reader.readAsDataURL(file);
  });
}

/** Existing 0003 public backgrounds bucket; owner-first path, never a signed URL. */
export async function uploadBackground(file: File, ownerId: string, boardId: string): Promise<{ source: string; path: string }> {
  validateBackgroundFile(file, true);
  const client = getSupabaseBrowserClient();
  const bucket = client.storage.from("backgrounds");
  const path = storagePath({ ownerId, noteId: boardId, fileName: file.name, id: createId() });
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error("Could not upload the background. Check your connection and retry.");
  return { path, source: bucket.getPublicUrl(path).data.publicUrl };
}
export async function removeBackground(path: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().storage.from("backgrounds").remove([path]);
  if (error) console.error("Could not clean up the unused background object", error);
}
export async function saveBoardBackground(boardId: string, settings: BackgroundSettings): Promise<void> {
  const { data, error } = await getSupabaseBrowserClient().from("boards")
    .update({ background: { ...normalizeBackground(settings) } }).eq("id", boardId).select("id").single();
  if (error || !data) throw new Error("Could not save the background. Check your connection and retry.");
}

/** Only an object uploaded for this owner/board may be cleaned up automatically. */
export function backgroundObjectPath(source: string | null, ownerId: string, boardId: string): string | null {
  if (!source) return null;
  try {
    const pathname = new URL(source).pathname;
    const marker = "/storage/v1/object/public/backgrounds/";
    if (!pathname.startsWith(marker)) return null;
    const path = decodeURIComponent(pathname.slice(marker.length));
    const parts = path.split("/");
    return parts.length === 3 && parts[0] === ownerId && parts[1] === boardId && /^[a-z0-9-]+\.[a-z0-9]+$/i.test(parts[2] ?? "") ? path : null;
  } catch { return null; }
}
