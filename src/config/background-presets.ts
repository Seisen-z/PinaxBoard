/**
 * Curated backgrounds offered by the background drawer.
 *
 * Every `source` must satisfy `validSource` in `features/background/settings`:
 * solids are hex or a `--desk-*` token, gradients and patterns start with a
 * (repeating-)linear/radial gradient and contain no `url(`, and scenes live in
 * `/public/backgrounds`. Kept free of imports so the theme module can read
 * `patternSize` without a cycle.
 */

export interface SolidPreset { label: string; source: string }
export const SOLID_COLORS: readonly SolidPreset[] = [
  { label: "Paper", source: "#f3efe6" },
  { label: "Linen", source: "#e8dfd0" },
  { label: "Sand", source: "var(--desk-sand)" },
  { label: "Sage", source: "var(--desk-sage)" },
  { label: "Clay", source: "var(--desk-clay)" },
  { label: "Slate", source: "var(--desk-slate)" },
  { label: "Mist", source: "#cfd9e0" },
  { label: "Blush", source: "#ecd3d0" },
  { label: "Lavender", source: "#d9d3e6" },
  { label: "Butter", source: "#f1e4b3" },
  { label: "Forest", source: "#2f4a3c" },
  { label: "Charcoal", source: "#2a2d30" },
];

export interface GradientPreset { label: string; source: string }
export const GRADIENTS: readonly GradientPreset[] = [
  { label: "Warm horizon", source: "linear-gradient(135deg, var(--desk-sand), var(--desk-clay))" },
  { label: "Garden shade", source: "linear-gradient(155deg, var(--desk-sage), var(--desk-slate))" },
  { label: "Peach sky", source: "linear-gradient(160deg, #fde2cf, #f6bfb0)" },
  { label: "Ocean mist", source: "linear-gradient(160deg, #d6ecf2, #9ec6d8)" },
  { label: "Lavender dusk", source: "linear-gradient(155deg, #e6dcf2, #b9a9d6)" },
  { label: "Fresh mint", source: "linear-gradient(160deg, #e1f4ea, #a6d6bf)" },
  { label: "Rose gold", source: "linear-gradient(135deg, #f7dcd3, #d9a7a0)" },
  { label: "Soft sunrise", source: "linear-gradient(180deg, #fbe7c8, #f3b8a0)" },
  { label: "Cotton candy", source: "linear-gradient(135deg, #fbd3e2, #cfdcf5)" },
  { label: "Deep slate", source: "linear-gradient(160deg, #3b4a52, #1f282d)" },
  { label: "Midnight", source: "linear-gradient(170deg, #26304a, #11151f)" },
  { label: "Evergreen", source: "linear-gradient(160deg, #3f6b57, #1f3a2f)" },
];

export interface PatternPreset { label: string; source: string; /** CSS background-size for one tile; omitted when the gradient already fills the screen. */ size?: string }
export const PATTERNS: readonly PatternPreset[] = [
  { label: "Pinstripe", source: "repeating-linear-gradient(90deg, var(--desk-sand) 0 2px, var(--desk-clay) 2px 24px)" },
  { label: "Graph paper", source: "repeating-linear-gradient(0deg, transparent 0 23px, var(--desk-slate) 23px 24px), repeating-linear-gradient(90deg, transparent 0 23px, var(--desk-slate) 23px 24px)" },
  { label: "Dot grid", source: "radial-gradient(circle at 11px 11px, rgb(120 105 80 / 0.38) 1.4px, transparent 1.7px), linear-gradient(#f4f0e8, #f4f0e8)", size: "22px 22px, 100% 100%" },
  { label: "Notebook lines", source: "repeating-linear-gradient(0deg, transparent 0 31px, rgb(110 140 170 / 0.3) 31px 32px), linear-gradient(#f7f4ec, #f7f4ec)" },
  { label: "Blueprint", source: "repeating-linear-gradient(0deg, transparent 0 39px, rgb(255 252 244 / 0.18) 39px 40px), repeating-linear-gradient(90deg, transparent 0 39px, rgb(255 252 244 / 0.18) 39px 40px), linear-gradient(#27507a, #1d3e63)" },
  { label: "Gingham", source: "repeating-linear-gradient(0deg, rgb(214 120 120 / 0.26) 0 16px, transparent 16px 32px), repeating-linear-gradient(90deg, rgb(214 120 120 / 0.26) 0 16px, transparent 16px 32px), linear-gradient(#fbf3ef, #fbf3ef)" },
  { label: "Polka dots", source: "radial-gradient(circle at 24px 24px, rgb(240 170 160 / 0.5) 8px, transparent 8.5px), linear-gradient(#fdf4ee, #fdf4ee)", size: "48px 48px, 100% 100%" },
  { label: "Soft stripes", source: "repeating-linear-gradient(45deg, #f1ebdd 0 14px, #ebe3d1 14px 28px)" },
];

export interface ScenePreset { id: string; label: string; source: string }
export const BUILTIN_BACKGROUNDS: readonly ScenePreset[] = [
  { id: "hills", label: "Quiet hills", source: "/backgrounds/hills.svg" },
  { id: "dunes", label: "Evening dunes", source: "/backgrounds/dunes.svg" },
  { id: "aurora", label: "Soft aurora", source: "/backgrounds/aurora.svg" },
  { id: "waves", label: "Calm waves", source: "/backgrounds/waves.svg" },
  { id: "mountains", label: "Misty mountains", source: "/backgrounds/mountains.svg" },
  { id: "sunrise", label: "Sunrise sea", source: "/backgrounds/sunrise.svg" },
  { id: "blossom", label: "Blossom", source: "/backgrounds/blossom.svg" },
  { id: "confetti", label: "Confetti", source: "/backgrounds/confetti.svg" },
  { id: "forest", label: "Pine forest", source: "/backgrounds/forest.svg" },
  { id: "night", label: "Starry night", source: "/backgrounds/night.svg" },
];

/** Effect values only; applying one never touches the chosen material. */
export interface EffectLook {
  label: string;
  values: { blur: number; brightness: number; saturation: number; contrast: number; opacity: number; overlay: number; vignette: number; grain: number };
}
const NEUTRAL = { blur: 0, brightness: 1, saturation: 1, contrast: 1, opacity: 1, overlay: 0, vignette: 0, grain: 0 };
export const EFFECT_LOOKS: readonly EffectLook[] = [
  { label: "Original", values: NEUTRAL },
  { label: "Soft focus", values: { ...NEUTRAL, blur: 6, brightness: 1.05, overlay: 0.05 } },
  { label: "Dim", values: { ...NEUTRAL, brightness: 0.85, overlay: 0.2, vignette: 0.25 } },
  { label: "Dreamy", values: { ...NEUTRAL, blur: 12, saturation: 1.2, brightness: 1.08 } },
  { label: "Vivid", values: { ...NEUTRAL, saturation: 1.3, contrast: 1.1 } },
  { label: "Moody", values: { ...NEUTRAL, brightness: 0.8, contrast: 1.15, vignette: 0.45, grain: 0.15 } },
];

/** The tile size a pattern needs, or `cover` for everything else. */
export function patternSize(source: string | null): string {
  return PATTERNS.find((pattern) => pattern.source === source)?.size ?? "cover";
}
