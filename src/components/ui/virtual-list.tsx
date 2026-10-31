"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
export interface VirtualListProps<T> { items: readonly T[]; getKey: (item: T) => string; renderItem: (item: T) => ReactNode; focusKey?: string | null; }
/** Variable-height rows, bounded DOM, measured offsets, and explicit keyboard/screen-reader page controls. */
export function VirtualList<T>({ items, getKey, renderItem, focusKey }: VirtualListProps<T>) {
  const scroller = useRef<HTMLDivElement>(null); const [sizes, setSizes] = useState<ReadonlyMap<string, number>>(() => new Map()); const [top, setTop] = useState(0); const [height, setHeight] = useState(700);
  const offsets = useMemo(() => { const result = [0]; for (const item of items) result.push(result[result.length - 1]! + (sizes.get(getKey(item)) ?? 100)); return result; }, [items, getKey, sizes]);
  const start = Math.max(0, offsets.findIndex((offset) => offset >= top) - 5);
  const after = offsets.findIndex((offset) => offset > top + height);
  const end = Math.min(items.length, (after < 0 ? items.length : after) + 5);
  const measure = useCallback((key: string, size: number) => { if (size <= 0) return; setSizes((previous) => { if (Math.abs((previous.get(key) ?? 100) - size) <= 1) return previous; const next = new Map(previous); next.set(key, size); return next; }); }, []);
  useEffect(() => { const node = scroller.current; if (!node) return; const update = () => setHeight(node.clientHeight || 700); update(); if (typeof ResizeObserver === "undefined") return; const observer = new ResizeObserver(update); observer.observe(node); return () => observer.disconnect(); }, []);
  useEffect(() => { if (!focusKey) return; const index = items.findIndex((item) => getKey(item) === focusKey); if (index >= 0 && scroller.current) { scroller.current.scrollTop = offsets[index] ?? 0; } }, [focusKey, getKey, items, offsets]);
  const page = (direction: number) => { const node = scroller.current; if (!node) return; node.scrollTop = Math.max(0, node.scrollTop + direction * Math.max(100, height - 100)); node.focus(); setTop(node.scrollTop); };
  return <div><div className="flex items-center justify-between gap-2 border-b border-border p-2 text-xs"><span role="status">Notes {start + 1}–{end} of {items.length}</span><div><button className="rounded border border-border px-3 py-2" onClick={() => page(-1)} disabled={top <= 0}>Previous notes</button><button className="ml-2 rounded border border-border px-3 py-2" onClick={() => page(1)} disabled={top + height >= offsets[items.length]!}>Next notes</button></div></div>
    <div ref={scroller} tabIndex={0} aria-label="Scrollable notes" className="tk-scrollbar-thin relative h-[65dvh] overflow-y-auto" onScroll={(event) => setTop(event.currentTarget.scrollTop)}>
      <div role="list" aria-label="Notes" style={{ height: offsets[items.length], position: "relative" }}>
        {items.slice(start, end).map((item, index) => <MeasuredRow key={getKey(item)} id={getKey(item)} onMeasure={measure} index={start + index} count={items.length} top={offsets[start + index] ?? 0}>{renderItem(item)}</MeasuredRow>)}
      </div>
    </div></div>;
}
function MeasuredRow({ id, top, children, onMeasure, index, count }: { id: string; top: number; children: ReactNode; onMeasure: (id: string, size: number) => void; index: number; count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const node = ref.current; if (!node) return; const update = () => onMeasure(id, node.getBoundingClientRect().height); update(); if (typeof ResizeObserver === "undefined") return; const observer = new ResizeObserver(update); observer.observe(node); return () => observer.disconnect(); }, [id, onMeasure]);
  return <div ref={ref} role="listitem" aria-posinset={index + 1} aria-setsize={count} className="absolute inset-x-0" style={{ top }}>{children}</div>;
}
