"use client";
import { useDialogFocusReturn } from "@/hooks/use-dialog-focus-return";

import { Check, ImagePlus } from "lucide-react";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ClayButton } from "@/components/ui/clay-button";
import {
  BUILTIN_BACKGROUNDS, CUSTOM_COLORS, EFFECTS, EFFECT_LOOKS, GRADIENTS, PATTERNS, SOLID_COLORS,
  customGradient, gradientControls, isHexColor, patternSize,
} from "@/features/background/settings";
import { readBackgroundFile, validateBackgroundFile } from "@/features/background/repository";
import { cn } from "@/lib/utils";
import type { BackgroundSettings } from "@/types/board";

export interface BackgroundCustomizerProps {
  open: boolean;
  onClose: () => void;
  settings: BackgroundSettings;
  fallback: BackgroundSettings;
  onChange: (settings: BackgroundSettings) => void;
  onSave: (settings: BackgroundSettings, file: File | null) => Promise<void>;
  cloud: boolean;
  busy: boolean;
}

type Tab = "colors" | "gradients" | "patterns" | "scenes";
const TABS: readonly { id: Tab; label: string }[] = [
  { id: "colors", label: "Colors" },
  { id: "gradients", label: "Gradients" },
  { id: "patterns", label: "Patterns" },
  { id: "scenes", label: "Scenes" },
];
const TAB_FOR_TYPE: Partial<Record<BackgroundSettings["type"], Tab>> = {
  solid: "colors", gradient: "gradients", pattern: "patterns", image: "scenes", animated: "scenes", video: "scenes",
};

/** One selectable preview: a swatch of the real material, a label and a check. */
function Tile({ label, ariaLabel, selected, onClick, previewStyle, children }: {
  label: string; ariaLabel?: string; selected: boolean; onClick: () => void; previewStyle: CSSProperties; children?: ReactNode;
}) {
  return (
    <button
      type="button" aria-label={ariaLabel ?? label} aria-pressed={selected} onClick={onClick}
      className={cn(
        "group flex flex-col gap-1.5 rounded-[var(--radius-md)] p-1 text-left text-xs transition",
        "hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-ring",
        selected && "bg-surface-raised",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative block aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-sm)] border",
          selected ? "border-foreground ring-2 ring-foreground/70" : "border-border",
        )}
        style={previewStyle}
      >
        {children}
        {selected ? (
          <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-foreground text-background shadow">
            <Check size={12} strokeWidth={3} />
          </span>
        ) : null}
      </span>
      <span aria-hidden="true" className="truncate px-0.5 text-muted-foreground group-aria-pressed:text-foreground">{label}</span>
    </button>
  );
}

const EFFECT_GROUPS: readonly { title: string; keys: readonly (typeof EFFECTS)[number]["key"][] }[] = [
  { title: "Adjust", keys: ["brightness", "saturation", "contrast", "opacity"] },
  { title: "Atmosphere", keys: ["blur", "overlay", "vignette", "grain"] },
];

function formatEffect(key: string, value: number): string {
  return key === "blur" ? `${value}px` : `${Math.round(value * 100)}%`;
}

/** A labelled slider with its value in a pill; the filled track follows the thumb. */
function EffectSlider({ effect, value, onChange }: { effect: (typeof EFFECTS)[number]; value: number; onChange: (value: number) => void }) {
  const fill = ((value - effect.min) / (effect.max - effect.min)) * 100;
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between text-sm">
        <span>{effect.label}</span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{formatEffect(effect.key, value)}</span>
      </span>
      <input
        aria-label={effect.label} type="range" className="tk-range" style={{ ["--fill" as string]: `${fill}%` }}
        min={effect.min} max={effect.max} step={effect.step} value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

/** A gallery drawer: the real board stays visible and previews every change. */
export function BackgroundCustomizer({ open, onClose, settings, fallback, onChange, onSave, cloud, busy }: BackgroundCustomizerProps) {
  const focusReturn = useDialogFocusReturn();
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tab, setTab] = useState<Tab>(() => TAB_FOR_TYPE[settings.type] ?? "colors");
  const [start, setStart] = useState(() => gradientControls(settings.source).start);
  const [end, setEnd] = useState(() => gradientControls(settings.source).end);
  const [angle, setAngle] = useState(() => gradientControls(settings.source).angle);
  const pending = busy || reading;
  const choose = (type: BackgroundSettings["type"], source: string | null) => {
    setFile(null); setError(null); onChange({ ...settings, type, source });
  };
  const is = (type: BackgroundSettings["type"], source: string) => settings.type === type && settings.source === source;
  const close = () => { if (!pending) { setFile(null); setError(null); onClose(); } };
  const upload = async (selected: File | undefined) => {
    if (!selected) return;
    setReading(true); setError(null);
    try {
      validateBackgroundFile(selected, cloud);
      const source = await readBackgroundFile(selected);
      if (!alive.current) return;
      setFile(cloud ? selected : null);
      onChange({ ...settings, type: "image", source });
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "Could not read the background image. Retry."); }
    finally { if (alive.current) setReading(false); }
  };
  const save = async () => {
    setError(null);
    try { await onSave(settings, file); setFile(null); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the background. Retry."); }
  };
  const customColor = settings.type === "solid" && settings.source && isHexColor(settings.source) ? settings.source : CUSTOM_COLORS.start;
  const uploaded = settings.type === "image" && settings.source?.startsWith("data:");

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-surface-sunken/20" />
        <Dialog.Content {...focusReturn} className="fixed inset-y-0 right-0 z-[var(--z-overlay)] flex w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-5 shadow-xl"
          onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }} onPointerDownOutside={(event) => { if (pending) event.preventDefault(); }}>
          <header className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-semibold">Background</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted-foreground">
                Pick a look. Your board behind this panel previews every change.
              </Dialog.Description>
            </div>
            <ClayButton size="sm" variant="ghost" disabled={pending} onClick={close}>Cancel</ClayButton>
          </header>
          <p className="text-xs text-muted-foreground">{cloud ? "Saved to this board across devices." : "Saved on this device."} Light/dark mode stays independent.</p>

          <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
            <div role="tablist" aria-label="Background type" className="grid grid-cols-4 gap-1 rounded-[var(--radius-md)] bg-surface-sunken p-1">
              {TABS.map((item) => (
                <button
                  key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}
                  className={cn(
                    "rounded-[var(--radius-sm)] px-2 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-ring",
                    tab === item.id ? "bg-surface font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >{item.label}</button>
              ))}
            </div>

            {tab === "colors" ? (
              <section aria-label="Colors">
                <div className="grid grid-cols-3 gap-2">
                  {SOLID_COLORS.map((item) => (
                    <Tile key={item.label} label={item.label} ariaLabel={`${item.label.toLowerCase()} background`}
                      selected={is("solid", item.source)} onClick={() => choose("solid", item.source)}
                      previewStyle={{ background: item.source }} />
                  ))}
                  <label className="flex cursor-pointer flex-col gap-1.5 rounded-[var(--radius-md)] p-1 text-xs hover:bg-surface-raised">
                    <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-sm)] border border-dashed border-border" style={{ background: customColor }}>
                      <input
                        aria-label="Custom solid color" type="color" value={customColor}
                        onChange={(event) => choose("solid", event.target.value)}
                        className="absolute inset-0 size-full cursor-pointer opacity-0"
                      />
                    </span>
                    <span aria-hidden="true" className="px-0.5 text-muted-foreground">Custom…</span>
                  </label>
                </div>
              </section>
            ) : null}

            {tab === "gradients" ? (
              <section aria-label="Gradients" className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">
                  {GRADIENTS.map((item) => (
                    <Tile key={item.label} label={item.label} selected={is("gradient", item.source)}
                      onClick={() => choose("gradient", item.source)} previewStyle={{ background: item.source }} />
                  ))}
                </div>
                <details className="rounded-[var(--radius-md)] border border-border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Custom gradient</summary>
                  <div className="mt-3 flex flex-col gap-3">
                    <p className="text-xs text-muted-foreground">Editing these controls replaces the selected preset.</p>
                    <label className="flex items-center justify-between text-sm">Gradient start
                      <input type="color" aria-label="Gradient start" className="tk-swatch" value={start} onChange={(event) => { setStart(event.target.value); choose("gradient", customGradient(event.target.value, end, angle)); }} />
                    </label>
                    <label className="flex items-center justify-between text-sm">Gradient end
                      <input type="color" aria-label="Gradient end" className="tk-swatch" value={end} onChange={(event) => { setEnd(event.target.value); choose("gradient", customGradient(start, event.target.value, angle)); }} />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">Gradient angle: {angle} degrees
                      <input type="range" aria-label="Gradient angle" className="tk-range" style={{ ["--fill" as string]: `${(angle / 360) * 100}%` }} min={0} max={360} value={angle} onChange={(event) => { const next = Number(event.target.value); setAngle(next); choose("gradient", customGradient(start, end, next)); }} />
                    </label>
                  </div>
                </details>
              </section>
            ) : null}

            {tab === "patterns" ? (
              <section aria-label="Patterns">
                <div className="grid grid-cols-3 gap-2">
                  {PATTERNS.map((item) => (
                    <Tile key={item.label} label={item.label} selected={is("pattern", item.source)}
                      onClick={() => choose("pattern", item.source)}
                      previewStyle={{ backgroundImage: item.source, backgroundSize: patternSize(item.source) }} />
                  ))}
                </div>
              </section>
            ) : null}

            {tab === "scenes" ? (
              <section aria-label="Scenes" className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2">
                  {BUILTIN_BACKGROUNDS.map((item) => (
                    <Tile key={item.id} label={item.label} selected={is("image", item.source)}
                      onClick={() => choose("image", item.source)}
                      previewStyle={{ backgroundImage: `url(${JSON.stringify(item.source)})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                  ))}
                </div>
                <div>
                  <SectionTitle>Your own image</SectionTitle>
                  <label className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-border p-3 text-sm hover:bg-surface-raised",
                    uploaded && "border-foreground bg-surface-raised",
                  )}>
                    <ImagePlus size={20} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                    <span className="flex flex-col">
                      <span className="font-medium">{uploaded ? "Uploaded image selected" : "Upload an image"}</span>
                      <span className="text-xs text-muted-foreground">PNG, JPEG, WebP or AVIF, up to {cloud ? "10" : "2"} MB.</span>
                    </span>
                    <input
                      type="file" aria-label="Upload background" accept="image/png,image/jpeg,image/webp,image/avif" className="sr-only"
                      onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }}
                    />
                  </label>
                </div>
              </section>
            ) : null}

            <details className="rounded-[var(--radius-lg)] border border-border bg-surface-sunken/60 p-4">
              <summary className="cursor-pointer text-sm font-medium">Effects</summary>
              <div className="mt-4 flex flex-col gap-6">
                <div>
                  <SectionTitle>Looks</SectionTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {EFFECT_LOOKS.map((look) => {
                      const active = (Object.keys(look.values) as (keyof typeof look.values)[]).every((key) => settings[key] === look.values[key]);
                      return (
                        <button
                          key={look.label} type="button" aria-pressed={active} onClick={() => onChange({ ...settings, ...look.values })}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition focus-visible:outline-2 focus-visible:outline-ring",
                            active ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:bg-surface-raised",
                          )}
                        >{look.label}</button>
                      );
                    })}
                  </div>
                </div>
                {EFFECT_GROUPS.map((group) => (
                  <div key={group.title}>
                    <SectionTitle>{group.title}</SectionTitle>
                    <div className="flex flex-col gap-4">
                      {group.keys.map((key) => {
                        const effect = EFFECTS.find((item) => item.key === key)!;
                        return <EffectSlider key={key} effect={effect} value={settings[key]} onChange={(value) => onChange({ ...settings, [key]: value })} />;
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                  <label className="flex items-center gap-3 text-sm">
                    <input type="color" aria-label="Tint" className="tk-swatch" value={settings.tint ?? CUSTOM_COLORS.tint} onChange={(event) => onChange({ ...settings, tint: event.target.value })} />
                    <span className="flex flex-col"><span>Tint</span><span className="text-xs text-muted-foreground">{settings.tint ?? "Off"}</span></span>
                  </label>
                  <ClayButton size="sm" variant="ghost" onClick={() => onChange({ ...settings, tint: null })}>Remove tint</ClayButton>
                </div>
              </div>
            </details>

            <ClayButton size="sm" variant="ghost" onClick={() => { setFile(null); setError(null); onChange({ ...fallback, source: null }); }}>Reset to theme background</ClayButton>
          </fieldset>

          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <footer className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
            <span role="status" className="text-xs text-muted-foreground">{reading ? "Reading image..." : busy ? "Saving..." : "Preview - Save to keep"}</span>
            <ClayButton size="sm" variant="primary" disabled={pending} onClick={() => void save()}>{error ? "Retry save" : "Save background"}</ClayButton>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
