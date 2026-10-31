"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { EditorState } from "@tiptap/pm/state";
import { ListChecks, Redo2, Undo2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { SlashMenu, type SlashMenuPosition } from "@/components/notes/slash-menu";
import { noteExtensions } from "@/lib/tiptap/extensions";
import { toPlainText, type RichDocument } from "@/lib/tiptap/document";
import { filterSlashCommands, type SlashCommand } from "@/lib/tiptap/slash-commands";
import { cn } from "@/lib/utils";

/** Where the editor is rendered, which is all that differs between the two. */
export type RichEditorVariant = "card" | "focus";

export interface RichEditorProps {
  /** The document to open. Seeds the editor and tracks external changes. */
  document: RichDocument;
  /** False renders the document without an editing surface. */
  editable?: boolean;
  /**
   * Called on every change with both representations.
   *
   * The plain text is handed over rather than derived by the caller so the
   * document and `Note.excerpt` are always written from the same edit — the
   * one way the two could disagree about what a note says.
   */
  onChange?: (document: RichDocument, text: string) => void;
  /** Focuses the body on mount. Set for a note the user just created. */
  autoFocus?: boolean;
  placeholder?: string;
  variant?: RichEditorVariant;
  /** Accessible name for the editing surface. */
  ariaLabel?: string;
  className?: string;
  /**
   * Uploads dropped or pasted images and returns a URL per file, in order.
   *
   * Omitted when there is nowhere to upload to — signed out, or on a card,
   * where a drop is more likely a mis-aimed drag than an intent to attach.
   * Without it the editor leaves a drop alone rather than inserting a
   * `blob:` URL that dies with the tab.
   */
  onUploadImages?: (files: readonly File[]) => Promise<readonly string[]>;
}

/**
 * The note body (IMPLEMENTATION_PLAN.md §15).
 *
 * Replaces the plain `<textarea>` the card used through Milestone 8. The card
 * layout contract is unchanged: the body still grows with its content and
 * stops at `--note-content-max-height`, because one long note must not push
 * every other card in its lane out of view.
 *
 * The editor is **uncontrolled after mount**. Tiptap owns a ProseMirror
 * document, and re-seeding it from a prop on every keystroke would reset the
 * cursor. External changes — a board hydrating from the server — are pushed in
 * by the effect below, which compares before writing so a user's own edit
 * (which produced the incoming value) never round-trips back into the editor.
 */
export function RichEditor({
  document: initialDocument,
  editable = false,
  onChange,
  autoFocus = false,
  placeholder = "Write, or press / for blocks",
  variant = "card",
  ariaLabel = "Note content",
  className,
  onUploadImages,
}: RichEditorProps) {
  /*
   * Same reason as `runCommandRef`: ProseMirror's paste and drop handlers are
   * built once, so they cannot see a later `onUploadImages`.
   */
  const uploadRef = useRef<RichEditorProps["onUploadImages"]>(onUploadImages);

  useEffect(() => {
    uploadRef.current = onUploadImages;
  }, [onUploadImages]);

  /**
   * The editor, reachable from handlers that were built before it existed.
   *
   * `useEditor`'s `editorProps` are constructed as part of creating the
   * editor, so they cannot close over the instance they belong to.
   */
  const editorRef = useRef<Editor | null>(null);
  /**
   * The open menu, or `null`.
   *
   * Held in a ref *and* mirrored into state, because the two readers need
   * different things. Tiptap builds its keydown handler once, so that handler
   * can only see a ref — a stale `Enter` that inserts a newline instead of
   * picking a command is exactly the bug this avoids. Rendering, meanwhile,
   * needs a value that changes identity.
   *
   * Both are written together, and only ever from an editor callback or an
   * event handler — never during render.
   */
  const menuRef = useRef<SlashMenuState | null>(null);
  const [menu, setMenu] = useState<SlashMenuState | null>(null);

  /** Set in an effect below, so the keydown handler reaches the live closure. */
  const runCommandRef = useRef<(command: SlashCommand) => void>(() => {});

  const setMenuState = useCallback((next: SlashMenuState | null) => {
    menuRef.current = next;
    setMenu(next);
  }, []);

  const closeSlashMenu = useCallback(() => setMenuState(null), [setMenuState]);

  const editor = useEditor({
    extensions: noteExtensions(placeholder),
    content: initialDocument,
    editable,
    // Next renders this on the server too; without it React warns that the
    // editor's DOM did not match.
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        role: "textbox",
        "aria-multiline": "true",
        class: "tk-prose focus:outline-none",
      },
      handleKeyDown: (view, event) => {
        if (!view.editable && (event.ctrlKey || event.metaKey) && /^[zy]$/i.test(event.key)) return true;
        const open = menuRef.current;
        if (open === null) return false;

        if (event.key === "Escape") {
          closeSlashMenu();
          return true;
        }

        // Recomputed from the ref rather than mirrored: the query is already
        // the only input, so a second copy could only ever go stale.
        const list = filterSlashCommands(open.query);
        if (list.length === 0) return false;

        if (event.key === "ArrowDown") {
          setMenuState({ ...open, activeIndex: (open.activeIndex + 1) % list.length });
          return true;
        }

        if (event.key === "ArrowUp") {
          setMenuState({
            ...open,
            activeIndex: (open.activeIndex - 1 + list.length) % list.length,
          });
          return true;
        }

        if (event.key === "Enter" || event.key === "Tab") {
          const command = list[open.activeIndex];
          if (!command) return false;

          runCommandRef.current(command);
          return true;
        }

        return false;
      },

      /*
       * Pasting or dropping an image uploads it and inserts the result
       * (IMPLEMENTATION_PLAN.md §16).
       *
       * Both return `true` only when there is something to upload, so an
       * ordinary text paste and a drag of selected text still behave the way
       * ProseMirror intends.
       */
      handlePaste: (_view, event) => {
        const files = imageFilesFrom(event.clipboardData);
        if (files.length === 0) return false;

        event.preventDefault();
        void insertUploadedImages(files);
        return true;
      },

      handleDrop: (_view, event) => {
        if (!(event instanceof DragEvent)) return false;

        const files = imageFilesFrom(event.dataTransfer);
        if (files.length === 0) return false;

        event.preventDefault();
        void insertUploadedImages(files);
        return true;
      },
    },
    onUpdate: ({ editor: instance }) => {
      const json = instance.getJSON() as RichDocument;
      onChange?.(json, toPlainText(json));
    },
    onSelectionUpdate: ({ editor: instance }) => {
      syncSlashMenu(instance);
    },
    onTransaction: ({ editor: instance }) => {
      syncSlashMenu(instance);
    },
    onBlur: () => {
      // A click outside the menu is a dismissal. The menu's own buttons use
      // `onMouseDown` + `preventDefault`, so picking one never blurs first.
      closeSlashMenu();
    },
  });

  /**
   * Uploads images and inserts each returned URL at the cursor.
   *
   * Nothing is inserted until the upload resolves — no placeholder node. A
   * placeholder would have to survive the user editing around it, and a failed
   * upload would leave a permanent "loading" block in a saved document.
   */
  async function insertUploadedImages(files: readonly File[]) {
    const upload = uploadRef.current;
    if (!upload || !editorRef.current) return;

    try {
      const urls = await upload(files);
      const instance = editorRef.current;

      for (const url of urls) {
        instance.chain().focus().setImage({ src: url }).run();
      }
    } catch (cause) {
      // The upload surface reports the failure to the user; this would be a
      // second message for one event.
      console.error("Could not insert uploaded images", cause);
    }
  }

  /**
   * Opens, updates or closes the menu from the text before the cursor.
   *
   * The trigger is a "/" that starts a word — at the start of a block or after
   * a space. Without that guard, typing a date or a path would open a block
   * menu mid-sentence.
   */
  function syncSlashMenu(instance: Editor) {
    const { state } = instance;
    const { $from, empty } = state.selection;

    if (!empty || !instance.isEditable) {
      closeSlashMenu();
      return;
    }

    const textBefore = $from.parent.textBetween(
      0,
      $from.parentOffset,
      undefined,
      "￼",
    );

    const match = /(?:^|\s)\/([\p{L}\p{N}-]*)$/u.exec(textBefore);
    if (!match) {
      if (menuRef.current !== null) closeSlashMenu();
      return;
    }

    const query = match[1] ?? "";
    const from = state.selection.from - query.length - 1;
    const coords = instance.view.coordsAtPos(from);

    // Refining the query restarts the highlight at the top — the previous
    // index belonged to a list that no longer exists.
    const previous = menuRef.current;
    const activeIndex = previous?.query === query ? previous.activeIndex : 0;

    setMenuState({
      from,
      query,
      activeIndex,
      position: { left: coords.left, top: coords.bottom },
    });
  }

  const runCommand = useCallback(
    (command: SlashCommand) => {
      const trigger = menuRef.current;
      if (!editor || !trigger) return;

      // Clear the menu first: the command may open a prompt, and leaving the
      // list on screen behind a modal reads as two things listening at once.
      closeSlashMenu();

      // Remove the "/query" the user typed, then run the block command. One
      // chain would be neater, but each command owns its own chain so that
      // adding a command never means editing this function.
      editor
        .chain()
        .focus()
        .deleteRange({ from: trigger.from, to: trigger.from + trigger.query.length + 1 })
        .run();

      command.run(editor);
    },
    [closeSlashMenu, editor],
  );

  /*
   * Tiptap captured `handleKeyDown` when the editor was created, so it cannot
   * see later closures. Publishing the current `runCommand` through a ref in
   * an effect is how the handler reaches today's version of it.
   */
  useEffect(() => {
    runCommandRef.current = runCommand;
  }, [runCommand]);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Keep the editing surface in step with the `editable` prop — a note that is
  // locked mid-edit must stop accepting input.
  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editable, editor]);

  /*
   * Push external document changes in — board hydration, or an undo applied to
   * the store. Compared before writing: `setContent` resets the selection, so
   * doing it unconditionally would move the cursor to the end on every
   * keystroke.
   */
  useEffect(() => {
    if (!editor) return;

    let sameContent: boolean;
    try { sameContent = editor.state.doc.eq(editor.schema.nodeFromJSON(initialDocument)); }
    catch { sameContent = JSON.stringify(editor.getJSON()) === JSON.stringify(initialDocument); }
    if (sameContent) return;

    editor.commands.setContent(initialDocument, { emitUpdate: false });
    // A server/store replacement starts a new history boundary. Undo must not
    // put the old document back over newer external data.
    editor.view.updateState(EditorState.create({
      schema: editor.schema, doc: editor.state.doc,
      selection: editor.state.selection, plugins: editor.state.plugins,
    }));
    editor.commands.setMeta("tackly:external-document", true);
  }, [editor, initialDocument]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "relative min-w-0",
        variant === "card" &&
          "tk-scrollbar-thin max-h-[var(--note-content-max-height)] overflow-y-auto",
        variant === "focus" && "tk-scrollbar-thin flex-1 overflow-y-auto",
        className,
      )}
    >
      {variant === "focus" ? <EditorHistoryControls editor={editor} editable={editable} /> : null}
      <EditorContent editor={editor} />

      {menu ? (
        <SlashMenu
          commands={filterSlashCommands(menu.query)}
          activeIndex={menu.activeIndex}
          position={menu.position}
          onSelect={runCommand}
          onHover={(activeIndex) => setMenuState({ ...menu, activeIndex })}
        />
      ) : null}
    </div>
  );
}

/**
 * The image files on a clipboard or drag payload.
 *
 * Filtered to images on purpose: a dropped PDF is an attachment, not something
 * to inline, and it belongs in the note's file list rather than its body.
 */
function imageFilesFrom(data: DataTransfer | null): File[] {
  if (!data) return [];

  return Array.from(data.files).filter((file) => file.type.startsWith("image/"));
}

/** The open slash menu: where it was triggered, and what it is showing. */
interface SlashMenuState {
  /** Document position of the "/" that opened it. */
  from: number;
  /** Text typed after the "/". */
  query: string;
  /** Index of the highlighted row within the filtered list. */
  activeIndex: number;
  position: SlashMenuPosition;
}

/** Subscribe to real transactions, including keyboard undo and external resets. */
function EditorHistoryControls({ editor, editable }: { editor: Editor; editable: boolean }) {
  const history = useEditorState({ editor, selector: ({ editor }) => ({
    undo: editor.isEditable && editor.can().undo(),
    redo: editor.isEditable && editor.can().redo(),
    checklist: editor.isActive("taskList"),
  }) });
  return (
    <div role="toolbar" aria-label="Text history" className="mb-3 flex items-center gap-1 border-b border-current/20 pb-2">
      <IconButton label="Undo" title="Undo text edit (Ctrl/Cmd+Z)" icon={<Undo2 size={16} />} variant="ghost" size="sm"
        disabled={!editable || !history.undo} onMouseDown={(event) => event.preventDefault()}
        onClick={() => { if (editable && editor.isEditable) editor.chain().focus().undo().run(); }} />
      <IconButton label="Redo" title="Redo text edit (Ctrl/Cmd+Shift+Z)" icon={<Redo2 size={16} />} variant="ghost" size="sm"
        disabled={!editable || !history.redo} onMouseDown={(event) => event.preventDefault()}
        onClick={() => { if (editable && editor.isEditable) editor.chain().focus().redo().run(); }} />
      <span className="ml-2 text-xs text-current/60">Text history</span>
      <IconButton label="Checklist" title="Turn this line into a checklist" icon={<ListChecks size={16} />} variant="ghost" size="sm"
        className={cn("ml-auto", history.checklist && "bg-current/15")} aria-pressed={history.checklist}
        disabled={!editable} onMouseDown={(event) => event.preventDefault()}
        onClick={() => { if (editable && editor.isEditable) editor.chain().focus().toggleTaskList().run(); }} />
    </div>
  );
}
