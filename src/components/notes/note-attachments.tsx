"use client";

import { Download, File as FileIcon, FileText, Film } from "lucide-react";
import { useState } from "react";

import { AttachmentPreview } from "@/components/notes/attachment-preview";
import { IconButton } from "@/components/ui/icon-button";
import { attachmentDownloadUrl } from "@/features/attachments/repository";
import { formatBytes } from "@/features/attachments/upload-policy";
import type { Attachment } from "@/types/note";

/** Saves an attachment under its original file name. */
export async function downloadAttachmentFile(attachment: Attachment): Promise<void> {
  const url = await attachmentDownloadUrl(attachment);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const MAX_IMAGES = 3;
const MAX_FILES = 4;

/**
 * A note's files, drawn on the card itself: images as pictures, everything
 * else as a row with a Download button.
 */
export function NoteAttachments({ attachments }: { attachments: readonly Attachment[] }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (attachments.length === 0) return null;

  const images = attachments.filter((attachment) => attachment.mimeType.startsWith("image/"));
  const files = attachments.filter((attachment) => !attachment.mimeType.startsWith("image/"));
  const hidden = Math.max(0, images.length - MAX_IMAGES) + Math.max(0, files.length - MAX_FILES);
  const download = (attachment: Attachment) =>
    downloadAttachmentFile(attachment).then(() => setFailed(null), () => setFailed(attachment.id));

  return (
    <div data-testid="note-attachments" className="flex flex-col gap-2">
      {images.slice(0, MAX_IMAGES).map((attachment) => (
        <div key={attachment.id} className="relative">
          <AttachmentPreview attachment={attachment} size="large" className="max-h-44" />
          <IconButton
            label={`Download ${attachment.fileName}`}
            icon={<Download size={14} />}
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 bg-surface/80"
            onClick={() => void download(attachment)}
          />
        </div>
      ))}

      {files.slice(0, MAX_FILES).map((attachment) => (
        <div key={attachment.id} className="flex items-center gap-2 rounded-md bg-current/5 px-2 py-1 text-xs">
          <FileGlyph mimeType={attachment.mimeType} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{attachment.fileName}</span>
            <span className={failed === attachment.id ? "block text-danger" : "block text-current/55"}>
              {failed === attachment.id ? "Could not download. Retry." : formatBytes(attachment.fileSize)}
            </span>
          </span>
          <IconButton
            label={`Download ${attachment.fileName}`}
            icon={<Download size={14} />}
            variant="ghost"
            size="sm"
            onClick={() => void download(attachment)}
          />
        </div>
      ))}

      {hidden > 0 ? <p className="text-xs text-current/55">+{hidden} more in the note</p> : null}
    </div>
  );
}

function FileGlyph({ mimeType }: { mimeType: string }) {
  const className = "shrink-0 opacity-70";
  if (mimeType.startsWith("video/")) return <Film size={14} aria-hidden="true" className={className} />;
  if (mimeType.startsWith("text/") || mimeType === "application/pdf") return <FileText size={14} aria-hidden="true" className={className} />;
  return <FileIcon size={14} aria-hidden="true" className={className} />;
}
