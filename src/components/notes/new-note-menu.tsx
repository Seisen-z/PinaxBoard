"use client";

import {
  BookOpen,
  CalendarRange,
  ChevronDown,
  GraduationCap,
  Lightbulb,
  ListChecks,
  NotebookPen,
  Plane,
  Plus,
  Rocket,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ClayButton } from "@/components/ui/clay-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NOTE_TEMPLATES, TEMPLATE_GROUPS, type NoteTemplate } from "@/features/notes/templates";

const ICONS: Record<string, LucideIcon> = {
  checklist: ListChecks,
  shopping: ShoppingCart,
  reading: BookOpen,
  "weekly-plan": CalendarRange,
  trip: Plane,
  project: Rocket,
  meeting: Users,
  journal: NotebookPen,
  study: GraduationCap,
  brainstorm: Lightbulb,
};

export interface NewNoteMenuProps {
  disabled?: boolean;
  /** Creates an empty note, exactly as the old button did. */
  onBlank: () => void;
  onTemplate: (templateId: string) => void;
}

function TemplateIcon({ template }: { template: NoteTemplate }) {
  const Icon = ICONS[template.id] ?? ListChecks;

  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] border"
      style={{
        background: `var(--paper-${template.color})`,
        color: `var(--paper-${template.color}-ink)`,
        borderColor: `var(--paper-${template.color}-edge)`,
      }}
    >
      <Icon size={17} aria-hidden="true" />
    </span>
  );
}

/**
 * "New note" as one control: a blank note, or a starting point.
 *
 * Blank stays first and one click away, so the fast path is no slower than
 * the old button; templates are grouped underneath. Every template makes an
 * ordinary note, opened for editing straight away.
 */
export function NewNoteMenu({ disabled, onBlank, onTemplate }: NewNoteMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ClayButton variant="primary" size="sm" disabled={disabled}>
          <Plus size={15} aria-hidden="true" />
          New note
          <ChevronDown size={14} aria-hidden="true" className="-mr-0.5 opacity-80" />
        </ClayButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[340px] max-h-[min(70vh,560px)] p-1.5">
        <DropdownMenuItem onSelect={onBlank} className="gap-3 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] border border-border bg-surface-sunken">
            <Plus size={17} aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="font-medium">Blank note</span>
            <span className="text-xs text-muted-foreground">Start empty and type anything</span>
          </span>
        </DropdownMenuItem>

        {TEMPLATE_GROUPS.map((group) => (
          <div key={group}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group}
            </DropdownMenuLabel>
            {NOTE_TEMPLATES.filter((template) => template.group === group).map((template) => (
              <DropdownMenuItem key={template.id} onSelect={() => onTemplate(template.id)} className="gap-3 py-2">
                <TemplateIcon template={template} />
                <span className="flex flex-col">
                  <span className="font-medium">{template.label}</span>
                  <span className="text-xs text-muted-foreground">{template.description}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
