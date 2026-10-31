import type { ISODateString, UUID } from "@/types/common";

/** The top container a user owns; holds boards, categories and tags. */
export interface Workspace {
  id: UUID;
  ownerId: UUID;
  name: string;
  icon: string | null;
  color: string | null;
  /** Sort order in the workspace picker, ascending. */
  position: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  archivedAt: ISODateString | null;
}

/** Public profile record, keyed by the Supabase auth user id. */
export interface Profile {
  id: UUID;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
