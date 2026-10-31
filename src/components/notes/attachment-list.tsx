"use client";

import {
  AlertTriangle,
  File as FileIcon,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { AttachmentPreview } from "@/components/notes/attachment-preview";
import { ClayButton } from "@/components/ui/clay-button";
import { IconButton } from "@/components/ui/icon-button";
import { formatBytes } from "@/features/attachments/upload-policy";
import type { AttachmentUploads } from "@/features/attachments/queries";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types/note";

export interface AttachmentListProps {
  attachments: readonly Attachment[];
  uploads: AttachmentUploads;
  /** False while the note is locked, or the user is signed out. */
  editable: boolean;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/**
 * A note's files (IMPLEMENTATION_PLAN.md §16).
 *
 * Covers the four states every async surface here needs — loading, empty,
 * error and retry (AGENTS.md rule 10) — plus the fifth this one has: uploads
 * in flight, which are neither server state nor nothing.
 *
 * Drag-and-drop is on the whole list rather than a separate drop zone: a
 * dedicated target that only accepts files in one small rectangle is a worse
 * version of dropping them on the thing they belong to.
 */
export function AttachmentList({
  attachments,
  uploads,
  editable,
  loading = false,
  error = null,
  onRetry,
}: AttachmentListProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Counted, not a boolean: dragging over a child fires `dragleave` on the
  // parent, so a boolean flickers off the moment the pointer crosses a row.
  const dragDepth = useRef(0);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      void uploads.upload(Array.from(files));
    },
    [uploads],
  );

  const isEmpty = attachments.length === 0 && uploads.tasks.length === 0;

  return (
    <section
      aria-label="Attachments"
      data-testid="attachment-list"
      onDragEnter={(event) => {
        if (!editable) return;
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (editable) event.preventDefault();
      }}
      onDragLeave={() => {
        if (!editable) return;
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) {
          dragDepth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        if (!editable) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-dashed border-transparent",
        "transition-colors duration-[var(--motion-fast)]",
        dragging && "border-ring bg-surface-raised/40 p-2",
      )}
    >
      <div className="flex items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-medium text-current/70">
          <Paperclip size={13} aria-hidden="true" />
          Files
          {attachments.length > 0 ? (
            <span className="tabular-nums">({attachments.length})</span>
          ) : null}
        </h3>

        {editable ? (
          <>
            <ClayButton
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => inputRef.current?.click()}
            >
              Add file
            </ClayButton>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="sr-only"
              aria-label="Add files to this note"
              onChange={(event) => {
                handleFiles(event.target.files);
                // Cleared so re-picking the same file fires `change` again.
                event.target.value = "";
              }}
            />
          </>
        ) : null}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-current/60">
          <Loader2 size={13} aria-hidden="true" className="animate-spin" />
          Loading files…
        </p>
      ) : null}

      {error ? (
        <p className="flex items-center gap-2 text-xs text-danger">
          <AlertTriangle size={13} aria-hidden="true" />
          <span className="flex-1">{error.message}</span>
          {onRetry ? (
            <ClayButton variant="ghost" size="sm" onClick={onRetry}>
              Retry
            </ClayButton>
          ) : null}
        </p>
      ) : null}

      {!loading && !error && isEmpty ? (
        <p className="text-xs text-current/50">
          {editable ? "Drop files here, or use Add file." : "No files."}
        </p>
      ) : null}

      <ul className="flex flex-col gap-1.5">
        {uploads.tasks.map((task) => (
          <li
            key={task.id}
            data-testid="upload-task"
            className="flex items-center gap-2 rounded-md bg-current/5 px-2 py-1.5 text-xs"
          >
            {task.status === "uploading" ? (
              <Loader2 size={14} aria-hidden="true" className="shrink-0 animate-spin" />
            ) : (
              <AlertTriangle size={14} aria-hidden="true" className="shrink-0 text-danger" />
            )}

            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{task.fileName}</span>
              <span
                className={cn(
                  "block truncate",
                  task.status === "error" ? "text-danger" : "text-current/55",
                )}
              >
                {task.status === "error"
                  ? task.error
                  : `Uploading… ${formatBytes(task.fileSize)}`}
              </span>
            </span>

            {task.status === "uploading" ? (
              <span role="status" className="sr-only">
                Uploading {task.fileName}
              </span>
            ) : (
              <IconButton
                label={`Dismiss ${task.fileName}`}
                icon={<X size={14} />}
                variant="ghost"
                size="sm"
                onClick={() => uploads.dismiss(task.id)}
              />
            )}
          </li>
        ))}

        {attachments.map((attachment) => (
          <AttachmentRow
            key={attachment.id}
            attachment={attachment}
            editable={editable}
            removing={uploads.removing}
            onRemove={() => uploads.remove(attachment)}
          />
        ))}
      </ul>
    </section>
  );
}

interface AttachmentRowProps {
  attachment: Attachment;
  editable: boolean;
  removing: boolean;
  onRemove: () => void;
}

function AttachmentRow({
  attachment,
  editable,
  removing,
  onRemove,
}: AttachmentRowProps) {
  const isImage = attachment.mimeType.startsWith("image/");

  return (
    <li
      data-testid="attachment-row"
      className="flex items-center gap-2 rounded-md bg-current/5 px-2 py-1.5 text-xs"
    >
      {isImage ? (
        <AttachmentPreview attachment={attachment} />
      ) : (
        <FileGlyph mimeType={attachment.mimeType} />
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{attachment.fileName}</span>
        <span className="block text-current/55">
          {formatBytes(attachment.fileSize)}
        </span>
      </span>

      {editable ? (
        <IconButton
          label={`Remove ${attachment.fileName}`}
          icon={<X size={14} />}
          variant="ghost"
          size="sm"
          disabled={removing}
          onClick={onRemove}
        />
      ) : null}
    </li>
  );
}

/**
 * A glyph for the file's family — a type the user recognises at a glance.
 *
 * A component rather than a function returning one: picking an icon component
 * inside a render body makes React's linter (rightly) suspect a component
 * created per render, which would reset its state every time.
 */
function FileGlyph({ mimeType }: { mimeType: string }) {
  const className = "shrink-0 opacity-70";

  if (mimeType.startsWith("image/")) {
    return <ImageIcon size={14} aria-hidden="true" className={className} />;
  }
  if (mimeType.startsWith("video/")) {
    return <Film size={14} aria-hidden="true" className={className} />;
  }
  if (mimeType.startsWith("text/") || mimeType === "application/pdf") {
    return <FileText size={14} aria-hidden="true" className={className} />;
  }

  return <FileIcon size={14} aria-hidden="true" className={className} />;
}
