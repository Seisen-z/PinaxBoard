"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useState } from "react";

import { cn } from "@/lib/utils";

type LaneId = "todo" | "doing" | "done";

interface DemoNote {
  id: string;
  title: string;
  detail: string;
  paper: "yellow" | "pink" | "blue" | "mint" | "peach";
  tilt: number;
  checklist?: readonly { label: string; done: boolean }[];
}

const LANES: readonly { id: LaneId; name: string; color: string }[] = [
  { id: "todo", name: "To Do", color: "var(--status-todo)" },
  { id: "doing", name: "In Progress", color: "var(--status-in-progress)" },
  { id: "done", name: "Done", color: "var(--status-done)" },
];

const NOTES: Record<string, DemoNote> = {
  passport: { id: "passport", title: "Renew passport", detail: "Due 14 Nov · High priority", paper: "yellow", tilt: -1.4 },
  landlord: { id: "landlord", title: "Reply to landlord", detail: "About the lease renewal", paper: "pink", tilt: 1.1 },
  dentist: { id: "dentist", title: "Book dentist", detail: "Before the end of the month", paper: "blue", tilt: -0.8 },
  thesis: {
    id: "thesis", title: "Thesis, chapter 3", detail: "", paper: "peach", tilt: 1.2,
    checklist: [
      { label: "Outline", done: true },
      { label: "Literature table", done: true },
      { label: "Write discussion", done: false },
    ],
  },
  cebu: { id: "cebu", title: "Plan Cebu trip", detail: "Flights and ferry", paper: "yellow", tilt: -1.1 },
  groceries: { id: "groceries", title: "Order groceries", detail: "Completed Tuesday", paper: "mint", tilt: 1 },
  bill: { id: "bill", title: "Pay electricity bill", detail: "Completed Monday", paper: "pink", tilt: -0.9 },
};

const START: Record<LaneId, string[]> = {
  todo: ["passport", "landlord", "dentist"],
  doing: ["thesis", "cebu"],
  done: ["groceries", "bill"],
};

/**
 * The product, playable: three columns built from the app's own lane and
 * paper tokens. Dragging a note to another column works the way it does in
 * the real board, including by keyboard (Space to lift, arrows to move).
 */
export function HeroBoard() {
  const [lanes, setLanes] = useState(START);
  const [moved, setMoved] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const noteId = String(active.id);
    const target = over.id as LaneId;
    setLanes((current) => {
      const from = (Object.keys(current) as LaneId[]).find((lane) => current[lane].includes(noteId));
      if (!from || from === target) return current;
      return {
        ...current,
        [from]: current[from].filter((id) => id !== noteId),
        [target]: [...current[target], noteId],
      };
    });
    setMoved(true);
  }

  return (
    <div>
      <DndContext id="landing-board" sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="A sample board. Drag a note to another column.">
          {LANES.map((lane) => (
            <Lane key={lane.id} id={lane.id} name={lane.name} color={lane.color} count={lanes[lane.id].length}>
              {lanes[lane.id].map((id) => (
                <Note key={id} note={NOTES[id]!} />
              ))}
            </Lane>
          ))}
        </div>
      </DndContext>
      <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
        {moved ? "That is how it works in the real board." : "Try it: drag a note to another column."}
      </p>
    </div>
  );
}

function Lane({ id, name, color, count, children }: { id: LaneId; name: string; color: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      aria-label={name}
      className={cn("min-h-[380px] rounded-[var(--radius-lg)] border border-border p-3.5 transition-shadow", isOver && "ring-2 ring-ring")}
      style={{ background: `color-mix(in srgb, ${color} 9%, var(--surface))` }}
    >
      <header className="mb-3 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: `color-mix(in srgb, ${color} 18%, var(--surface))` }}
        >
          <span className="size-2 rounded-full" style={{ background: color }} />
          {name}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      </header>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

function Note({ note }: { note: DemoNote }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: note.id });
  const paper = note.paper;

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "tk-paper cursor-grab touch-none rounded-[var(--radius-note)] border px-4 py-3.5 text-[15px] leading-snug outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "relative z-10 shadow-[var(--note-shadow-drag)]",
      )}
      style={{
        background: `var(--paper-${paper})`,
        color: `var(--paper-${paper}-ink)`,
        borderColor: `var(--paper-${paper}-edge)`,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${note.tilt}deg)`
          : `rotate(${note.tilt}deg)`,
      }}
    >
      <b className="block font-semibold">{note.title}</b>
      {note.detail ? <span className="mt-1 block text-xs opacity-75">{note.detail}</span> : null}
      {note.checklist?.map((item) => (
        <span key={item.label} className="mt-1.5 flex items-center gap-1.5 text-xs">
          <span className={cn("size-3 shrink-0 rounded-[3px] border-[1.5px] border-current", item.done && "bg-current")} />
          <span className={cn(item.done && "line-through opacity-70")}>{item.label}</span>
        </span>
      ))}
    </article>
  );
}
