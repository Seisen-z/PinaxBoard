import { describe, expect, it } from "vitest";

import { DEFAULT_BACKGROUND } from "@/config/themes";
import { boardFromRow, workspaceFromRow } from "@/lib/mappers/workspace";
import type { BoardRow, WorkspaceRow } from "@/types/database";

function workspaceRow(overrides: Partial<WorkspaceRow> = {}): WorkspaceRow {
  return {
    id: "ws-1",
    owner_id: "owner-1",
    name: "Personal",
    icon: null,
    color: null,
    position: 0,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-02T00:00:00.000Z",
    archived_at: null,
    ...overrides,
  };
}

function boardRow(overrides: Partial<BoardRow> = {}): BoardRow {
  return {
    id: "b-1",
    workspace_id: "ws-1",
    owner_id: "owner-1",
    name: "Assignments",
    icon: null,
    color: null,
    layout_mode: "canvas",
    background: {},
    settings: {},
    position: 2,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-02T00:00:00.000Z",
    archived_at: null,
    ...overrides,
  };
}

describe("workspaceFromRow", () => {
  it("maps the columns onto the domain shape", () => {
    expect(workspaceFromRow(workspaceRow())).toMatchObject({
      id: "ws-1",
      ownerId: "owner-1",
      name: "Personal",
      position: 0,
      archivedAt: null,
    });
  });

  it("carries the archived timestamp through", () => {
    const archived = workspaceFromRow(
      workspaceRow({ archived_at: "2026-09-05T00:00:00.000Z" }),
    );
    expect(archived.archivedAt).toBe("2026-09-05T00:00:00.000Z");
  });
});

describe("boardFromRow", () => {
  it("maps the columns onto the domain shape", () => {
    expect(boardFromRow(boardRow())).toMatchObject({
      id: "b-1",
      workspaceId: "ws-1",
      layoutMode: "canvas",
      position: 2,
    });
  });

  it("falls back for a layout this build does not know", () => {
    // `'board'` is the lane surface, which is not a LayoutMode; so is anything
    // written by a newer client.
    expect(boardFromRow(boardRow({ layout_mode: "board" })).layoutMode).toBe(
      "canvas",
    );
    expect(boardFromRow(boardRow({ layout_mode: "hologram" })).layoutMode).toBe(
      "canvas",
    );
  });

  it("merges a partial background over the defaults", () => {
    // A row written before an effect existed must still produce a complete
    // settings object — a missing value would render as `undefined` in a CSS
    // variable and break the background layer.
    const merged = boardFromRow(boardRow({ background: { blur: 4 } })).background;

    expect(merged.blur).toBe(4);
    expect(merged.vignette).toBe(DEFAULT_BACKGROUND.vignette);
    expect(merged.type).toBe(DEFAULT_BACKGROUND.type);
  });

  it("falls back entirely for a non-object background", () => {
    expect(boardFromRow(boardRow({ background: null })).background).toEqual(
      DEFAULT_BACKGROUND,
    );
    expect(boardFromRow(boardRow({ background: "broken" })).background).toEqual(
      DEFAULT_BACKGROUND,
    );
  });
});
