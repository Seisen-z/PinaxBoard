"use client";
import { useDialogFocusReturn } from "@/hooks/use-dialog-focus-return";

import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { ClayButton } from "@/components/ui/clay-button";
import { BACKGROUND_KINDS, BACKGROUND_SWATCHES, BUILTIN_BACKGROUNDS, CUSTOM_COLORS, EFFECTS, GRADIENTS, PATTERNS, customGradient, gradientControls } from "@/features/background/settings";
import { readBackgroundFile, validateBackgroundFile } from "@/features/background/repository";
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

/** A narrow material/effects drawer leaves the real board visible as a live preview. */
export function BackgroundCustomizer({ open, onClose, settings, fallback, onChange, onSave, cloud, busy }: BackgroundCustomizerProps) {
  const focusReturn = useDialogFocusReturn();
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [start, setStart] = useState(() => gradientControls(settings.source).start);
  const [end, setEnd] = useState(() => gradientControls(settings.source).end);
  const [angle, setAngle] = useState(() => gradientControls(settings.source).angle);
  const pending = busy || reading;
  const choose = (type: BackgroundSettings["type"], source: string | null) => {
    setFile(null); setError(null); onChange({ ...settings, type, source });
  };
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
  const fieldClass = "rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-foreground";

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-surface-sunken/20" />
        <Dialog.Content {...focusReturn} className="fixed inset-y-0 right-0 z-[var(--z-overlay)] flex w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-5 text-foreground"
          onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }} onPointerDownOutside={(event) => { if (pending) event.preventDefault(); }}>
          <header className="flex items-start justify-between gap-3">
            <div><Dialog.Title className="text-lg font-semibold">Background</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted-foreground">Set the scene. Your actual board previews every change.</Dialog.Description></div>
            <ClayButton size="sm" variant="ghost" disabled={pending} onClick={close}>Cancel</ClayButton>
          </header>
          <p className="text-xs text-muted-foreground">{cloud ? "Saved to this board across devices." : "Saved on this device."} Light/dark mode stays independent.</p>
          <fieldset disabled={pending} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">Background type
              <select aria-label="Background type" value={settings.type} className={fieldClass} onChange={(event) => {
                const type = BACKGROUND_KINDS.find((kind) => kind === event.target.value);
                if (type === "solid") choose(type, "var(--desk-sand)");
                else if (type === "gradient") choose(type, GRADIENTS[0]?.source ?? null);
                else if (type === "pattern") choose(type, PATTERNS[0]?.source ?? null);
                else if (type === "image") choose(type, BUILTIN_BACKGROUNDS[0]?.source ?? null);
              }}>
                {BACKGROUND_KINDS.map((kind) => <option key={kind} value={kind}>{kind[0]?.toUpperCase()}{kind.slice(1)}</option>)}
              </select>
            </label>
            {settings.type === "solid" ? <div className="flex flex-col gap-2">
              <div className="grid grid-cols-4 gap-2">{BACKGROUND_SWATCHES.map((color) => <button type="button" key={color} aria-label={`${color} background`} aria-pressed={settings.source === `var(--desk-${color})`}
                onClick={() => choose("solid", `var(--desk-${color})`)} className="h-12 rounded-[var(--radius-sm)] border-2 border-border aria-pressed:border-primary" style={{ backgroundColor: `var(--desk-${color})` }} />)}</div>
              <label className="flex items-center justify-between text-sm">Custom solid color<input aria-label="Custom solid color" type="color" value={settings.source?.startsWith("#") ? settings.source : CUSTOM_COLORS.start} onChange={(event) => choose("solid", event.target.value)} /></label>
            </div> : null}
            {settings.type === "gradient" ? <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">{GRADIENTS.map((item) => <ClayButton key={item.label} size="sm" variant="ghost" aria-pressed={settings.source === item.source} onClick={() => choose("gradient", item.source)}>{item.label}</ClayButton>)}</div>
              <details><summary className="cursor-pointer text-xs font-medium">Custom gradient</summary>
              <p className="my-2 text-xs text-muted-foreground">Editing these controls replaces the selected preset.</p>
              <label className="flex items-center justify-between text-sm">Gradient start<input type="color" aria-label="Gradient start" value={start} onChange={(event) => { setStart(event.target.value); choose("gradient", customGradient(event.target.value, end, angle)); }} /></label>
              <label className="flex items-center justify-between text-sm">Gradient end<input type="color" aria-label="Gradient end" value={end} onChange={(event) => { setEnd(event.target.value); choose("gradient", customGradient(start, event.target.value, angle)); }} /></label>
              <label className="flex flex-col gap-1 text-sm">Gradient angle: {angle} degrees<input type="range" aria-label="Gradient angle" min={0} max={360} value={angle} onChange={(event) => { const value = Number(event.target.value); setAngle(value); choose("gradient", customGradient(start, end, value)); }} /></label>
              </details>
            </div> : null}
            {settings.type === "pattern" ? <div className="flex gap-2">{PATTERNS.map((item) => <ClayButton key={item.label} size="sm" variant="ghost" aria-pressed={settings.source === item.source} onClick={() => choose("pattern", item.source)}>{item.label}</ClayButton>)}</div> : null}
            {settings.type === "image" ? <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">{BUILTIN_BACKGROUNDS.map((item) => <button type="button" key={item.id} aria-pressed={settings.source === item.source} onClick={() => choose("image", item.source)} className="rounded-[var(--radius-sm)] border-2 border-border p-1 text-left aria-pressed:border-primary">
                <span aria-hidden="true" className="mb-1 block h-20 rounded-[var(--radius-sm)] bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(item.source)})` }} /><span className="text-xs">{item.label}</span>
              </button>)}</div>
              <label className="flex flex-col gap-1 text-sm">Upload background<input type="file" aria-label="Upload background" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
              <p className="text-xs text-muted-foreground">PNG, JPEG, WebP or AVIF - {cloud ? "10" : "2"} MB maximum.</p>
              {settings.source?.startsWith("data:") ? <p className="text-xs text-muted-foreground">Uploaded image selected.</p> : null}
            </div> : null}
            <details><summary className="cursor-pointer text-sm font-medium">Effects</summary>
              <div className="mt-3 flex flex-col gap-3">{EFFECTS.map((effect) => <label key={effect.key} className="flex flex-col gap-1 text-xs">{effect.label}: {settings[effect.key]}
                <input aria-label={effect.label} type="range" min={effect.min} max={effect.max} step={effect.step} value={settings[effect.key]} onChange={(event) => onChange({ ...settings, [effect.key]: Number(event.target.value) })} />
              </label>)}
                <label className="flex items-center justify-between text-sm">Tint<input type="color" aria-label="Tint" value={settings.tint ?? CUSTOM_COLORS.tint} onChange={(event) => onChange({ ...settings, tint: event.target.value })} /></label>
                <ClayButton size="sm" variant="ghost" onClick={() => onChange({ ...settings, tint: null })}>Remove tint</ClayButton>
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
