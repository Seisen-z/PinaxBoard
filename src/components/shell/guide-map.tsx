"use client";
import { Compass, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ClayButton } from "@/components/ui/clay-button";

export interface GuideStep {
  id: string;
  title: string;
  body: string;
  /** Moves the app to the place this feature lives, before it is highlighted. */
  go?: () => void;
  /** Finds the element to highlight once the app has moved. */
  find: () => HTMLElement | null;
}

export interface GuideMapProps {
  steps: readonly GuideStep[];
}

const PAD = 6;

/** A sidebar destination, found by its label. */
export const guideNav = (label: string) => () =>
  Array.from(document.querySelectorAll<HTMLElement>('nav[aria-label="Primary"] button')).find(
    (button) => button.textContent?.trim() === label || button.getAttribute("aria-label") === label,
  ) ?? null;

export const guideSelector = (selector: string) => () => document.querySelector<HTMLElement>(selector);

/**
 * The interactive guide: a list of features. Choosing one takes you to where
 * it lives and highlights it, with a short explanation beside it.
 */
export function GuideMap({ steps }: GuideMapProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = active === null ? null : steps[active] ?? null;

  // A missed lookup keeps the previous highlight, so it glides to the next
  // target instead of vanishing; only the last attempt gives up.
  const measure = useCallback((final = false) => {
    const target = step?.find() ?? null;
    if (target) setRect(target.getBoundingClientRect());
    else if (final) setRect(null);
  }, [step]);

  // Move first, then measure a few times: the destination renders a beat later.
  useEffect(() => {
    if (!step) return;
    step.go?.();
    const timers = [60, 250, 600].map((delay) => window.setTimeout(() => measure(delay === 600), delay));
    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [step, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (active !== null) setActive(null);
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, active]);

  const close = () => { setActive(null); setRect(null); setOpen(false); };
  const select = (index: number) => setActive(index);

  const vw = typeof window === "undefined" ? 1024 : window.innerWidth;
  const vh = typeof window === "undefined" ? 768 : window.innerHeight;
  const tipWidth = Math.min(320, vw - 24);
  // Under the highlighted element, or above it when it sits near the bottom.
  const tipStyle = rect
    ? {
        width: tipWidth,
        left: Math.max(12, Math.min(rect.left, vw - tipWidth - 12)),
        // Always positioned by `top` so it can glide; 180px is the card's height.
        top: rect.bottom + 190 > vh ? Math.max(12, rect.top - PAD - 8 - 180) : rect.bottom + PAD + 8,
      }
    : { width: tipWidth, left: Math.max(12, (vw - tipWidth) / 2), top: 96 };

  const hole = rect
    ? `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${rect.left - PAD}px ${rect.top - PAD}px, ${rect.left - PAD}px ${rect.bottom + PAD}px, ${rect.right + PAD}px ${rect.bottom + PAD}px, ${rect.right + PAD}px ${rect.top - PAD}px, ${rect.left - PAD}px ${rect.top - PAD}px)`
    : undefined;

  return (
    <>
      <button
        type="button"
        aria-label="Open feature guide"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="fixed bottom-20 left-4 z-[var(--z-header)] grid size-11 place-items-center rounded-full border border-border bg-surface text-foreground md:bottom-4 md:left-auto md:right-4"
      >
        <Compass size={18} aria-hidden="true" />
      </button>

      {open && active === null ? (
        <section
          role="dialog"
          aria-label="Feature guide"
          className="fixed bottom-36 left-4 z-[var(--z-overlay)] flex max-h-[70dvh] w-[min(22rem,calc(100vw-2rem))] flex-col rounded-[var(--radius-lg)] border border-border-strong bg-surface p-4 shadow-panel-md md:bottom-20 md:left-auto md:right-4"
        >
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Guide</h2>
            <button type="button" aria-label="Close guide" onClick={close} className="rounded p-1 text-muted-foreground hover:text-foreground">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Pick a feature and we will take you there and point it out.</p>
          <ul className="tk-scrollbar-thin flex flex-col gap-1 overflow-y-auto">
            {steps.map((item, index) => (
              <li key={item.id}>
                <button type="button" onClick={() => select(index)} className="w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-surface-raised">
                  <span className="font-medium">{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step && active !== null ? (
        <div className="fixed inset-0 z-[var(--z-overlay)] animate-in fade-in duration-300" role="dialog" aria-label={`Guide: ${step.title}`}>
          {/* Dims everything except the highlighted feature. */}
          <div className="absolute inset-0 bg-surface-sunken/60 transition-[clip-path] duration-500 ease-in-out motion-reduce:transition-none" style={hole ? { clipPath: hole } : {}} onClick={() => setActive(null)} />
          {rect ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute rounded-md border-2 border-ring transition-[left,top,width,height] duration-500 ease-in-out motion-reduce:transition-none"
              style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
            />
          ) : null}
          <div className="absolute rounded-[var(--radius-lg)] border border-border-strong bg-surface p-3 shadow-panel-md transition-[left,top] duration-500 ease-in-out motion-reduce:transition-none" style={tipStyle}>
            <p className="text-xs text-muted-foreground">{active + 1} of {steps.length}</p>
            <h3 className="text-sm font-semibold">{step.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{rect ? step.body : `${step.body} (Not visible on screen right now.)`}</p>
            <div className="mt-3 flex items-center gap-2">
              <ClayButton size="sm" variant="ghost" disabled={active === 0} onClick={() => select(active - 1)}>Back</ClayButton>
              {active < steps.length - 1
                ? <ClayButton size="sm" variant="primary" onClick={() => select(active + 1)}>Next</ClayButton>
                : <ClayButton size="sm" variant="primary" onClick={close}>Done</ClayButton>}
              <ClayButton size="sm" variant="ghost" className="ml-auto" onClick={() => setActive(null)}>All features</ClayButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
