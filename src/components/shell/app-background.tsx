import type { CSSProperties } from "react";

import { backgroundToCssVariables } from "@/config/themes";
import type { BackgroundSettings } from "@/types/board";

export interface AppBackgroundProps {
  settings: BackgroundSettings;
}

type BackgroundStyle = CSSProperties & Record<`--${string}`, string>;

/**
 * The customizable scenic background (FRONTEND_SPEC.md §8).
 *
 * This is the **only** element in the application permitted to use blur or
 * other filters (§53). Overlay, vignette and grain are separate unfiltered
 * siblings, so raising the blur never softens them.
 *
 * The filtered layer is inset negatively: blurring an element flush to the
 * viewport edge samples transparent pixels outside it and produces a visible
 * light rim, so it is grown past the edges and clipped by the wrapper.
 *
 * @example
 * <AppBackground settings={DEFAULT_BACKGROUND} />
 */
export function AppBackground({ settings }: AppBackgroundProps) {
  const style = backgroundToCssVariables(settings) as BackgroundStyle;

  return (
    <div
      aria-hidden="true"
      data-testid="app-background"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
      style={style}
    >
      <div
        data-testid="app-background-layer"
        className="tk-background-layer absolute -inset-16 bg-cover bg-center"
        style={{ backgroundImage: "var(--bg-image)", backgroundColor: "var(--bg-color)" }}
      />

      {/* Darkening overlay — keeps paper notes the brightest thing on screen. */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgb(12 10 6 / var(--bg-overlay))" }}
      />

      {/* Optional tint. */}
      <div
        className="absolute inset-0 mix-blend-color"
        style={{ backgroundColor: "var(--bg-tint)" }}
      />

      {/* Vignette. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 40%, transparent 45%, rgb(12 10 6 / var(--bg-vignette)) 100%)",
        }}
      />

      {/* Film grain, drawn as a tiny repeating dot pattern. */}
      <div
        className="absolute inset-0"
        style={{
          opacity: "var(--bg-grain)",
          backgroundImage:
            "radial-gradient(rgb(255 252 244 / 0.6) 0.5px, transparent 0.5px)",
          backgroundSize: "3px 3px",
        }}
      />
    </div>
  );
}
