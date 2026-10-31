import { CalendarDays, Check, ChevronDown, FileText, ImageIcon, Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Static renderings of the real screens, with one coherent set of sample
 * data: a student finishing a thesis and planning a trip. They use the app's
 * tokens, so they track light and dark mode and never drift from the product.
 */

type Paper = "yellow" | "pink" | "blue" | "mint" | "peach" | "lavender";

function paperStyle(paper: Paper) {
  return {
    background: `var(--paper-${paper})`,
    color: `var(--paper-${paper}-ink)`,
    borderColor: `var(--paper-${paper}-edge)`,
  } as const;
}

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs"
      style={color ? { background: `color-mix(in srgb, ${color} 18%, var(--surface))` } : { background: "var(--surface)" }}
    >
      {children}
    </span>
  );
}

/** The note editor: rich text, checklist, dates, tags and attachments. */
export function EditorVisual() {
  const checklist = [
    { label: "Summarise the survey results", done: true },
    { label: "Compare with the three models in chapter 2", done: true },
    { label: "Draft the limitations paragraph", done: false },
    { label: "Send to Dr. Ramos for comments", done: false },
  ];

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[0_8px_24px_rgb(10_8_4/0.08)]" aria-hidden="true">
      <p className="text-2xl font-semibold tracking-tight">Thesis, chapter 3</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip color="var(--priority-high)">High priority</Chip>
        <Chip><CalendarDays size={12} /> Due Fri 20 Nov</Chip>
        <Chip color="var(--status-in-progress)">#thesis</Chip>
        <Chip color="var(--status-ideas)">#writing</Chip>
      </div>

      <h4 className="mt-5 text-lg font-semibold">Discussion</h4>
      <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
        Results are consistent with the second model, except for the
        part-time group.
      </p>

      <ul className="mt-3 space-y-2">
        {checklist.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 text-[15px]">
            <span
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-foreground/60",
                item.done && "border-transparent bg-foreground text-background",
              )}
            >
              {item.done ? <Check size={11} strokeWidth={3} /> : null}
            </span>
            <span className={cn(item.done && "text-muted-foreground line-through")}>{item.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Paperclip size={13} /> Files (2)
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2 text-sm">
            <FileText size={16} className="text-muted-foreground" />
            <span className="flex-1">survey-results.pdf</span>
            <span className="text-xs text-muted-foreground">1.9 MB</span>
          </div>
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2 text-sm">
            <ImageIcon size={16} className="text-muted-foreground" />
            <span className="flex-1">figure-3.png</span>
            <span className="text-xs text-muted-foreground">640 KB</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const CALENDAR_EVENTS: Record<number, { title: string; paper: Paper; time?: string }[]> = {
  3: [{ title: "Submit lab form", paper: "mint" }],
  10: [{ title: "Reply to landlord", paper: "pink" }],
  14: [{ title: "Renew passport", paper: "yellow", time: "9:00" }],
  18: [{ title: "Advisor meeting", paper: "blue", time: "2:30" }],
  20: [{ title: "Thesis ch. 3 due", paper: "peach" }],
  24: [{ title: "Dentist", paper: "blue", time: "3:00" }],
  27: [{ title: "Cebu flights", paper: "lavender" }, { title: "Pack", paper: "mint" }],
};

/** November 2026: a month view with dated notes and a reminder time. */
export function CalendarVisual() {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // 1 November 2026 is a Sunday, so the grid starts on day 1.
  const days = Array.from({ length: 30 }, (_, index) => index + 1);

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[0_8px_24px_rgb(10_8_4/0.08)]" aria-hidden="true">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xl font-semibold tracking-tight">November 2026</p>
        <span className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs">
          Month <ChevronDown size={12} />
        </span>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-[var(--radius-md)] border border-border text-xs">
        {weekdays.map((day) => (
          <div key={day} className="border-b border-border bg-surface-sunken px-2 py-1.5 text-muted-foreground">{day}</div>
        ))}
        {days.map((day) => (
          <div key={day} className="min-h-[56px] border-b sm:min-h-[84px] border-r border-border p-1 last:border-r-0 [&:nth-child(7n+7)]:border-r-0">
            <span
              className={cn(
                "mb-1 grid size-6 place-items-center rounded-md text-[11px]",
                day === 10 && "bg-foreground text-background",
              )}
            >
              {day}
            </span>
            {(CALENDAR_EVENTS[day] ?? []).map((event) => (
              <div
                key={event.title}
                className="mb-0.5 h-1.5 rounded-full border sm:h-auto sm:break-words sm:rounded sm:px-1 sm:py-0.5 sm:text-[10px] sm:leading-tight"
                style={paperStyle(event.paper)}
              >
                <span className="hidden sm:inline">{event.title}</span>
                {event.time ? <span className="hidden opacity-70 sm:block">{event.time}</span> : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CanvasNote(props: {
  paper: Paper; left: string; top: string; width: number; tilt: number; title: string; lines?: string[]; selected?: boolean;
}) {
  return (
    <div
      className="tk-paper relative rounded-[var(--radius-note)] border px-3.5 py-3 text-sm leading-snug sm:absolute sm:left-[var(--l)] sm:top-[var(--t)] sm:w-[var(--w)]"
      style={{
        ...paperStyle(props.paper),
        ["--l" as string]: props.left,
        ["--t" as string]: props.top,
        ["--w" as string]: `${props.width}px`,
        transform: `rotate(${props.tilt}deg)`,
      }}
    >
      <b className="block font-semibold">{props.title}</b>
      {props.lines?.map((line) => (
        <span key={line} className="mt-0.5 block text-xs opacity-80">{line}</span>
      ))}
      {props.selected ? (
        <>
          <span className="pointer-events-none absolute -inset-1.5 rounded-[16px] border-2 border-[var(--status-in-progress)]" />
          {["-left-2 -top-2", "-right-2 -top-2", "-bottom-2 -left-2", "-bottom-2 -right-2"].map((corner) => (
            <span key={corner} className={`absolute ${corner} size-2.5 rounded-[3px] border-2 border-[var(--status-in-progress)] bg-surface`} />
          ))}
        </>
      ) : null}
    </div>
  );
}

/** The free canvas: notes placed anywhere, one selected with resize handles. */
export function CanvasVisual() {
  return (
    <div
      className="relative flex flex-col gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface p-4 pt-14 shadow-[0_8px_24px_rgb(10_8_4/0.08)] sm:block sm:h-[420px] sm:p-0"
      style={{ backgroundImage: "radial-gradient(var(--border-strong) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      aria-hidden="true"
    >
      <p className="absolute left-4 top-4 text-lg font-semibold tracking-tight sm:left-5">Cebu trip</p>
      <CanvasNote paper="yellow" left="5%" top="22%" width={190} tilt={-1.6} title="Day 1 · Arrive" lines={["Land 10:40", "Hotel check-in 2pm"]} />
      <CanvasNote paper="blue" left="34%" top="14%" width={200} tilt={1.2} title="Ferry to Bohol" lines={["7:00 am, Pier 1", "Bring passport"]} selected />
      <CanvasNote paper="peach" left="62%" top="26%" width={180} tilt={-1} title="Budget" lines={["Flights ₱6,400", "Stay ₱8,200", "Food ₱3,400"]} />
      <CanvasNote paper="mint" left="12%" top="62%" width={170} tilt={1.4} title="Pack" lines={["Charger, adaptor", "Sunscreen"]} />
      <CanvasNote paper="pink" left="42%" top="66%" width={190} tilt={-1.2} title="Ask Mara" lines={["Island-hopping tour?"]} />
    </div>
  );
}

/** The share dialog: roles and a single-use invite link. */
export function ShareVisual() {
  const people = [
    { name: "Mara Santos", role: "Owner", initials: "MS", color: "var(--status-done)" },
    { name: "Jo Reyes", role: "Editor", initials: "JR", color: "var(--status-in-progress)" },
    { name: "Alex Lim", role: "Viewer", initials: "AL", color: "var(--status-ideas)" },
  ];

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[0_12px_32px_rgb(10_8_4/0.14)]" aria-hidden="true">
      <p className="text-base font-semibold">Share this board</p>
      <ul className="mt-3 space-y-2.5">
        {people.map((person) => (
          <li key={person.name} className="flex items-center gap-3 text-sm">
            <span
              className="grid size-8 place-items-center rounded-full text-xs font-semibold"
              style={{ background: `color-mix(in srgb, ${person.color} 30%, var(--surface))` }}
            >
              {person.initials}
            </span>
            <span className="flex-1">{person.name}</span>
            <span className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
              {person.role} {person.role !== "Owner" ? <ChevronDown size={12} /> : null}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <span className="rounded-md border border-border px-2.5 py-1.5 text-xs">Editor</span>
        <span className="tk-clay rounded-md bg-[image:var(--clay-primary-gradient)] px-3 py-1.5 text-xs font-medium text-primary-foreground">
          Create invite link
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">The link works once and expires in 7 days.</p>
    </div>
  );
}
