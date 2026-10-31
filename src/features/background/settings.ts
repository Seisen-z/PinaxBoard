import { DEFAULT_BACKGROUND } from "@/config/themes";
import type { BackgroundSettings } from "@/types/board";

export const BACKGROUND_KINDS = ["solid", "gradient", "image", "pattern"] as const;
export {
  BUILTIN_BACKGROUNDS,
  EFFECT_LOOKS,
  GRADIENTS,
  PATTERNS,
  SOLID_COLORS,
  patternSize,
} from "@/config/background-presets";
/** Editable native color-input defaults, not component styling. */
export const CUSTOM_COLORS = { start: "#d4c4a3", end: "#8faaa0", tint: "#c3a17e" } as const;
export const EFFECTS = [
  { key: "blur", label: "Blur", min: 0, max: 40, step: 1 },
  { key: "brightness", label: "Brightness", min: 0, max: 2, step: 0.05 },
  { key: "saturation", label: "Saturation", min: 0, max: 2, step: 0.05 },
  { key: "contrast", label: "Contrast", min: 0, max: 2, step: 0.05 },
  { key: "opacity", label: "Opacity", min: 0, max: 1, step: 0.05 },
  { key: "overlay", label: "Darkening overlay", min: 0, max: 1, step: 0.05 },
  { key: "vignette", label: "Vignette", min: 0, max: 1, step: 0.05 },
  { key: "grain", label: "Grain", min: 0, max: 1, step: 0.05 },
] as const;
export type BackgroundEffect = (typeof EFFECTS)[number]["key"];
export const isHexColor = (value: string) => /^#[a-f0-9]{6}$/i.test(value);

function validSource(type: BackgroundSettings["type"], source: string): boolean {
  if (type === "image") return /^https?:\/\//i.test(source) || /^\/backgrounds\/[a-z0-9-]+\.svg$/.test(source) || /^data:image\/(png|jpeg|webp|avif);base64,[a-z0-9+/=]+$/i.test(source);
  if (type === "solid") return isHexColor(source) || /^var\(--desk-(sand|sage|clay|slate)\)$/.test(source);
  return /^(repeating-)?(linear|radial)-gradient\(/.test(source) && !/url\(|[;{}\\]/i.test(source);
}

/** Repair old/invalid JSON before it reaches CSS or editable controls. */
export function normalizeBackground(value: unknown, fallback = DEFAULT_BACKGROUND): BackgroundSettings {
  if (!value || typeof value !== "object") return { ...fallback };
  const data = value as Record<string, unknown>;
  let type = BACKGROUND_KINDS.find((kind) => kind === data.type) ?? fallback.type;
  let source = fallback.source;
  if (data.source === null) source = null;
  else if (typeof data.source === "string" && validSource(type, data.source)) source = data.source;
  else if (data.source !== undefined || type !== fallback.type) type = fallback.type;
  const result: BackgroundSettings = { ...fallback, type, source,
    tint: typeof data.tint === "string" && isHexColor(data.tint) ? data.tint : null };
  for (const effect of EFFECTS) {
    const value = data[effect.key];
    result[effect.key] = typeof value === "number" && Number.isFinite(value)
      ? Math.min(effect.max, Math.max(effect.min, value)) : fallback[effect.key];
  }
  return result;
}

export function customGradient(start: string, end: string, angle: number): string {
  if (!isHexColor(start) || !isHexColor(end) || !Number.isFinite(angle)) throw new Error("Choose valid gradient colors and angle.");
  return `linear-gradient(${Math.max(0, Math.min(360, angle))}deg, ${start}, ${end})`;
}

/** Null source is the explicit follow-theme reset; legacy empty boards follow too. */
export function resolvedBackground(settings: BackgroundSettings | null, fallback: BackgroundSettings): BackgroundSettings {
  if (!settings) return fallback;
  if (!settings.source) return { ...settings, type: fallback.type, source: fallback.source };
  if ((Object.keys(DEFAULT_BACKGROUND) as (keyof BackgroundSettings)[]).every((key) => settings[key] === DEFAULT_BACKGROUND[key])) return fallback;
  return settings;
}

export function gradientControls(source: string | null): { start: string; end: string; angle: number } {
  const match = /^linear-gradient\((\d+(?:\.\d+)?)deg, (#[a-f0-9]{6}), (#[a-f0-9]{6})\)$/i.exec(source ?? "");
  return match ? { angle: Math.min(360, Number(match[1])), start: match[2] ?? CUSTOM_COLORS.start, end: match[3] ?? CUSTOM_COLORS.end }
    : { ...CUSTOM_COLORS, angle: 135 };
}
