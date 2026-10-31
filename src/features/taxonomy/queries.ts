"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  fetchCategories,
  fetchTags,
  renameTag,
  updateCategory,
} from "@/features/taxonomy/repository";
import { queryKeys } from "@/lib/query-client";
import { useNoteStore } from "@/stores/note-store";
import type { Category, Tag } from "@/types/note";

/**
 * The workspace's tags and categories (IMPLEMENTATION_PLAN.md §17).
 *
 * TanStack Query owns the catalogue; the notes that reference it live in
 * Zustand and hold only ids. That split is deliberate — a note carrying a copy
 * of a tag would go stale the moment the tag was renamed.
 *
 * Signed out there is no workspace to scope a tag to, so the catalogue starts empty
 * and creation is unavailable. The alternative — a parallel local tag
 * store that has to be merged on sign-in — is a migration problem in exchange
 * for a feature nobody can keep.
 */

export function useTags(
  workspaceId: string | null,
  enabled: boolean,
): UseQueryResult<Tag[], Error> {
  return useQuery({
    queryKey: queryKeys.tags(workspaceId ?? "none"),
    queryFn: () => fetchTags(workspaceId as string),
    enabled: enabled && Boolean(workspaceId),
  });
}

export function useCategories(
  workspaceId: string | null,
  enabled: boolean,
): UseQueryResult<Category[], Error> {
  return useQuery({
    queryKey: queryKeys.categories(workspaceId ?? "none"),
    queryFn: () => fetchCategories(workspaceId as string),
    enabled: enabled && Boolean(workspaceId),
  });
}

export interface Taxonomy {
  tags: readonly Tag[];
  categories: readonly Category[];
  /** False when signed out — local vocabulary creation is unavailable. */
  editable: boolean;
  loading: boolean;
  error: Error | null;

  /**
   * Creates a tag. `onCreated` runs once the server has assigned an id —
   * which is how "new tag" on a note then puts it on that note.
   */
  createTag: (
    name: string,
    color: string | null,
    onCreated?: (tag: Tag) => void,
  ) => void;
  renameTag: (tagId: string, name: string) => void;
  deleteTag: (tagId: string) => void;

  createCategory: (
    name: string,
    color: string | null,
    emoji: string | null,
    onCreated?: (category: Category) => void,
  ) => void;
  updateCategory: (input: {
    categoryId: string;
    name?: string;
    color?: string | null;
    emoji?: string | null;
  }) => void;
  deleteCategory: (categoryId: string) => void;
}

/**
 * The workspace's vocabulary, plus the mutations that change it.
 *
 * Deleting a tag or category also detaches it from every note in the store.
 * The database does the same thing server-side — `note_tags` cascades, and
 * `deleteCategory` clears `category_id` — but the store is the working copy
 * the board renders from, so without this the pill stays on screen until the
 * next reload.
 */
export function useTaxonomy(
  workspaceId: string | null,
  ownerId: string | null,
): Taxonomy {
  const queryClient = useQueryClient();
  const cloudEnabled = Boolean(ownerId && workspaceId);

  const tags = useTags(workspaceId, cloudEnabled);
  const categories = useCategories(workspaceId, cloudEnabled);

  const removeTagEverywhere = useNoteStore((state) => state.removeTagEverywhere);
  const clearCategoryEverywhere = useNoteStore(
    (state) => state.clearCategoryEverywhere,
  );

  const invalidateTags = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.tags(workspaceId ?? "none"),
    });
  }, [queryClient, workspaceId]);

  const invalidateCategories = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.categories(workspaceId ?? "none"),
    });
  }, [queryClient, workspaceId]);

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: invalidateTags,
  });

  const renameTagMutation = useMutation({
    mutationFn: ({ tagId, name }: { tagId: string; name: string }) =>
      renameTag(tagId, name),
    onSuccess: invalidateTags,
  });

  const deleteTagMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: (_result, tagId) => {
      removeTagEverywhere(tagId);
      invalidateTags();
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: invalidateCategories,
  });

  const updateCategoryMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: invalidateCategories,
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: (_result, categoryId) => {
      clearCategoryEverywhere(categoryId);
      invalidateCategories();
    },
  });

  const createTagMutate = createTagMutation.mutate;
  const renameTagMutate = renameTagMutation.mutate;
  const deleteTagMutate = deleteTagMutation.mutate;
  const createCategoryMutate = createCategoryMutation.mutate;
  const updateCategoryMutate = updateCategoryMutation.mutate;
  const deleteCategoryMutate = deleteCategoryMutation.mutate;

  return useMemo<Taxonomy>(
    () => ({
      tags: cloudEnabled ? (tags.data ?? []) : [],
      categories: cloudEnabled ? (categories.data ?? []) : [],
      editable: cloudEnabled,
      loading: tags.isLoading || categories.isLoading,
      error: tags.error ?? categories.error,

      createTag: (name, color, onCreated) => {
        if (!workspaceId || !ownerId) return;
        createTagMutate(
          { workspaceId, ownerId, name, color },
          onCreated ? { onSuccess: onCreated } : {},
        );
      },
      renameTag: (tagId, name) => renameTagMutate({ tagId, name }),
      deleteTag: (tagId) => deleteTagMutate(tagId),

      createCategory: (name, color, emoji, onCreated) => {
        if (!workspaceId || !ownerId) return;
        createCategoryMutate(
          { workspaceId, ownerId, name, color, emoji },
          onCreated ? { onSuccess: onCreated } : {},
        );
      },
      updateCategory: (input) => updateCategoryMutate(input),
      deleteCategory: (categoryId) => deleteCategoryMutate(categoryId),
    }),
    [
      categories.data,
      categories.error,
      categories.isLoading,
      cloudEnabled,
      createCategoryMutate,
      createTagMutate,
      deleteCategoryMutate,
      deleteTagMutate,
      ownerId,
      renameTagMutate,
      tags.data,
      tags.error,
      tags.isLoading,
      updateCategoryMutate,
      workspaceId,
    ],
  );
}
