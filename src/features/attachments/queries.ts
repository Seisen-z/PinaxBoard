"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  fetchAttachments,
  removeAttachment,
  uploadAttachment,
} from "@/features/attachments/repository";
import {
  bucketForFile,
  validateFile,
  type AttachmentBucket,
} from "@/features/attachments/upload-policy";
import { queryKeys } from "@/lib/query-client";
import { createId } from "@/lib/utils";
import type { Attachment } from "@/types/note";

/**
 * Server state for a note's files (IMPLEMENTATION_PLAN.md §16).
 *
 * TanStack Query owns the list. Uploads in flight are **not** in that cache —
 * they are local state in {@link useAttachmentUploads}, because a half-uploaded
 * file is not a server fact, and putting one in the cache means every other
 * reader of that list has to know how to skip it.
 */

export function useAttachments(
  noteId: string | null,
  enabled: boolean,
): UseQueryResult<Attachment[], Error> {
  return useQuery({
    queryKey: queryKeys.attachments(noteId ?? "none"),
    queryFn: () => fetchAttachments(noteId as string),
    enabled: enabled && Boolean(noteId),
  });
}

/** An upload the user can see: queued, running, done or failed. */
export interface UploadTask {
  id: string;
  fileName: string;
  fileSize: number;
  bucket: AttachmentBucket;
  status: "uploading" | "error";
  /**
   * 0–1, or `null` when unknown.
   *
   * supabase-js resolves its upload promise without reporting progress, so
   * this is deliberately `null` rather than a fake animation: a progress bar
   * that is not measuring anything is a lie about how long the wait will be.
   * The UI shows indeterminate activity instead.
   */
  progress: number | null;
  /** Set when `status` is "error". Already user-facing. */
  error?: string;
}

export interface AttachmentUploads {
  /** Uploads in flight or failed, in the order they were started. */
  tasks: readonly UploadTask[];
  /** Validates and uploads. Resolves to the saved attachments. */
  upload: (files: readonly File[], bucket?: AttachmentBucket) => Promise<Attachment[]>;
  /** Clears a failed task the user has acknowledged. */
  dismiss: (taskId: string) => void;
  remove: (attachment: Attachment) => void;
  removing: boolean;
}

/**
 * Upload and removal for one note.
 *
 * Each file is its own task, so one rejected file does not take down a
 * multi-file drop — the user gets the three that worked plus a message about
 * the fourth, rather than nothing and an error.
 */
export function useAttachmentUploads(
  noteId: string | null,
  ownerId: string | null,
): AttachmentUploads {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<readonly UploadTask[]>([]);

  const removal = useMutation({
    mutationFn: removeAttachment,
    onSuccess: (_result, attachment) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.attachments(attachment.noteId),
      });
    },
  });

  const dismiss = useCallback((taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }, []);

  const upload = useCallback(
    async (files: readonly File[], bucket?: AttachmentBucket) => {
      if (!noteId || !ownerId) {
        throw new Error("Sign in to attach files to a note.");
      }

      const saved: Attachment[] = [];

      for (const file of files) {
        const target = bucket ?? bucketForFile(file);
        const taskId = createId();

        // Validated before the task is shown, so an oversized file reports the
        // reason immediately rather than appearing to upload and then failing.
        const validation = validateFile(file, target);
        if (!validation.ok) {
          setTasks((current) => [
            ...current,
            {
              id: taskId,
              fileName: file.name,
              fileSize: file.size,
              bucket: target,
              status: "error",
              progress: null,
              error: validation.message,
            },
          ]);
          continue;
        }

        setTasks((current) => [
          ...current,
          {
            id: taskId,
            fileName: file.name,
            fileSize: file.size,
            bucket: target,
            status: "uploading",
            progress: null,
          },
        ]);

        try {
          const attachment = await uploadAttachment({
            file,
            noteId,
            ownerId,
            bucket: target,
          });

          saved.push(attachment);
          // The task is done, so it leaves the list — the attachment itself is
          // now in the query cache and renders from there.
          setTasks((current) => current.filter((task) => task.id !== taskId));
        } catch (cause) {
          setTasks((current) =>
            current.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    status: "error" as const,
                    error:
                      cause instanceof Error
                        ? cause.message
                        : `Could not upload ${file.name}.`,
                  }
                : task,
            ),
          );
        }
      }

      if (saved.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.attachments(noteId),
        });
      }

      return saved;
    },
    [noteId, ownerId, queryClient],
  );

  return {
    tasks,
    upload,
    dismiss,
    remove: removal.mutate,
    removing: removal.isPending,
  };
}
