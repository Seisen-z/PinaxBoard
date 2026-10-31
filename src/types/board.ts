import type { ISODateString, LayoutMode, UUID } from "@/types/common";

/** Background layer configuration (PRODUCT_SPEC.md → "Background System"). */
export const BACKGROUND_TYPES = [
  "solid",
  "gradient",
  "image",
  "pattern",
  "animated",
  "video",
] as const;
export type BackgroundType = (typeof BACKGROUND_TYPES)[number];

/**
 * Every numeric effect is expressed the way CSS consumes it, so the background
 * layer can map settings straight onto custom properties with no conversion:
 *
 *  - `blur` in pixels
 *  - `brightness` / `saturation` / `contrast` / `opacity` as multipliers (1 = neutral)
 *  - `overlay` / `vignette` / `grain` as 0–1 alphas
 */
export interface BackgroundSettings {
  type: BackgroundType;
  /** Image/video URL or CSS gradient, depending on `type`. */
  source: string | null;
  blur: number;
  brightness: number;
  saturation: number;
  contrast: number;
  opacity: number;
  overlay: number;
  vignette: number;
  grain: number;
  tint: string | null;
}

/** A board owns notes and picks how they are laid out. */
export interface Board {
  id: UUID;
  workspaceId: UUID;
  ownerId: UUID;
  name: string;
  icon: string | null;
  color: string | null;
  layoutMode: LayoutMode;
  background: BackgroundSettings;
  /** Sort order within the workspace, ascending. */
  position: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  archivedAt: ISODateString | null;
}

/** Canvas viewport, persisted per board/user (PRODUCT_SPEC.md → Canvas). */
export interface CanvasViewport {
  x: number;
  y: number;
  /** 1 = 100%. */
  zoom: number;
}
