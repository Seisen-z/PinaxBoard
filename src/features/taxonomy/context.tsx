"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import { LOCAL_VOCABULARY_KEY, parseVocabulary } from "@/features/import-export/vocabulary";
import { useTaxonomy, type Taxonomy } from "@/features/taxonomy/queries";

/**
 * The workspace's tags and categories, made ambient.
 *
 * A context rather than props because the consumers are scattered and deep:
 * the Filter menu in the toolbar, the pickers inside every note's menu, and
 * the category badge on every card. Threading a tag list from the shell down
 * through the board, the lane and the card to reach a submenu would be four
 * layers of pass-through for data none of them use.
 *
 * The cost is that creating a tag re-renders every card. That is the right
 * trade here — it happens when a user types a tag name, not while they drag.
 */

/**
 * What a tree with no provider sees.
 *
 * Deliberately a working value rather than a thrown error: a card rendered in
 * isolation, in a test or a future embed, should show its tags rather than
 * crash. Nothing is editable, because there is no workspace to write to.
 */
const FALLBACK_TAXONOMY: Taxonomy = {
  tags: [],
  categories: [],
  editable: false,
  loading: false,
  error: null,
  createTag: () => {},
  renameTag: () => {},
  deleteTag: () => {},
  createCategory: () => {},
  updateCategory: () => {},
  deleteCategory: () => {},
};

const TaxonomyContext = createContext<Taxonomy>(FALLBACK_TAXONOMY);

export interface TaxonomyProviderProps {
  /** The active workspace, or `null` when signed out. */
  workspaceId: string | null;
  /** The signed-in user's id, or `null`. */
  ownerId: string | null;
  children: ReactNode;
  canManage?: boolean;
}

export function TaxonomyProvider({
  workspaceId,
  ownerId,
  children, canManage = true,
}: TaxonomyProviderProps) {
  const taxonomy = useTaxonomy(workspaceId, ownerId);
  const localRaw = useSyncExternalStore(subscribeVocabulary, readVocabulary, () => "");
  const value = useMemo(() => {
    if (ownerId || !localRaw) return taxonomy;
    try { const local = parseVocabulary(JSON.parse(localRaw)); return { ...taxonomy, tags: [...taxonomy.tags, ...local.tags.filter((item) => !taxonomy.tags.some((tag) => tag.id === item.id))], categories: local.categories }; } catch { return taxonomy; }
  }, [ownerId, localRaw, taxonomy]);

  return (
    <TaxonomyContext.Provider value={canManage ? value : { ...value, editable: false }}>
      {children}
    </TaxonomyContext.Provider>
  );
}

/** The workspace's vocabulary and the mutations that change it. */
export function useTaxonomyContext(): Taxonomy {
  return useContext(TaxonomyContext);
}

function readVocabulary():string{try{return localStorage.getItem(LOCAL_VOCABULARY_KEY)??"";}catch{return"";}}
function subscribeVocabulary(listener:()=>void){window.addEventListener("tackly:vocabulary",listener);window.addEventListener("storage",listener);return()=>{window.removeEventListener("tackly:vocabulary",listener);window.removeEventListener("storage",listener);};}
