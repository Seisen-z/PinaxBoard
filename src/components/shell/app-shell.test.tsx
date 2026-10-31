import { render, screen, within } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/components/shell/app-shell";
import { NAV_ITEMS } from "@/components/shell/nav-items";
import { DEFAULT_LANE_SEEDS } from "@/config/lanes";
import { MOCK_NOTES } from "@/features/board/mock-board";

/**
 * Shell composition tests.
 *
 * These assert the rules that are easy to regress: the sidebar and its
 * destinations, the columns and their order, the toolbar that replaced the
 * floating clusters, and one-action blank note creation.
 */

const notesIn = (laneId: string) =>
  MOCK_NOTES.filter((note) => note.laneId === laneId);

describe("application shell", () => {
  it("renders every destination in the sidebar", () => {
    render(<AppShell />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const item of NAV_ITEMS) {
      expect(
        within(nav).getByRole("button", { name: item.label }),
      ).toBeInTheDocument();
    }
  });

  it("marks Board as the current destination on first render", () => {
    render(<AppShell />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("button", { name: "Board" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("renders the customizable background as a decorative layer", () => {
    render(<AppShell />);

    expect(screen.getByTestId("app-background")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("renders the seeded columns in order", () => {
    render(<AppShell />);

    const laneNames = screen
      .getAllByRole("region")
      .map((lane) => lane.getAttribute("aria-label"));

    expect(laneNames).toEqual(DEFAULT_LANE_SEEDS.map((seed) => seed.name));
  });

  it("gives every column its own tinted panel, keyed to its accent colour", () => {
    render(<AppShell />);

    // The panel reads its tint from `--lane-accent`; without it every column
    // would mix against `transparent` and render identically.
    for (const seed of DEFAULT_LANE_SEEDS) {
      const panel = screen.getByTestId(`board-lane-${seed.id}`);

      expect(panel).toHaveClass("tk-lane-panel");
      expect(panel.style.getPropertyValue("--lane-accent")).toBe(
        `var(${seed.colorVar})`,
      );
    }

    // The dividers the open columns needed are gone with them.
    expect(screen.queryByTestId("lane-divider")).not.toBeInTheDocument();
  });

  it("renders the permanent sidebar and the breadcrumb bar", () => {
    render(<AppShell />);

    expect(screen.getByRole("complementary", { name: "Workspace" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });

  it("puts the view, settings and zoom controls in the toolbar", () => {
    render(<AppShell />);

    expect(screen.getByRole("group", { name: "Board view" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Board settings" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Zoom" })).toBeInTheDocument();
  });

  it("renders the mock notes as paper cards", () => {
    render(<AppShell />);
    expect(screen.getAllByTestId("paper-note-card")).toHaveLength(
      MOCK_NOTES.length,
    );
  });

  it("places each mock note in its own column", () => {
    render(<AppShell />);

    for (const seed of DEFAULT_LANE_SEEDS) {
      const rendered = within(
        screen.getByTestId(`board-lane-${seed.id}`),
      ).getAllByTestId("paper-note-card");

      expect(rendered, `${seed.name} note count`).toHaveLength(
        notesIn(seed.id).length,
      );
    }
  });
});

describe("one Add control per column", () => {
  it("offers exactly one note-creation control in a populated column", () => {
    render(<AppShell />);

    const lane = screen.getByTestId("board-lane-lane-todo");
    const addButtons = within(lane)
      .getAllByRole("button")
      .filter((button) =>
        /^add note to/i.test(button.getAttribute("aria-label") ?? ""),
      );

    // The header's Add. A second one at the foot of the column was redundant.
    expect(addButtons).toHaveLength(1);
  });

  it("turns an empty column's placeholder into a distinct target", async () => {
    render(<AppShell />);

    // Review holds two mock notes; move them elsewhere to empty the column.
    const lane = screen.getByTestId("board-lane-lane-review");
    for (const card of within(lane).getAllByTestId("paper-note-card")) {
      const title = card.getAttribute("aria-label") ?? "";
      await userEvent.click(
        within(card).getByRole("button", { name: `More actions for ${title}` }),
      );
      await userEvent.click(
        screen.getByRole("menuitem", { name: "Archive" }),
      );
    }

    const emptyLane = screen.getByTestId("board-lane-lane-review");

    // Distinct from the header's "Add note to Review", so the column still has
    // exactly one control with that name.
    expect(
      within(emptyLane).getByRole("button", {
        name: "Add the first note to Review",
      }),
    ).toBeInTheDocument();
    expect(
      within(emptyLane).getAllByRole("button", { name: /^add note to/i }),
    ).toHaveLength(1);
  });
});

describe("one-action note creation (FRONTEND_SPEC Â§23)", () => {
  it("creates a blank editable card immediately, with no dialog", async () => {
    render(<AppShell />);

    const lane = screen.getByTestId("board-lane-lane-in-progress");
    const before = within(lane).getAllByTestId("paper-note-card").length;

    await userEvent.click(
      within(lane).getByRole("button", { name: "Add note to In Progress" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(lane).getAllByTestId("paper-note-card")).toHaveLength(
      before + 1,
    );

    const titleInput = document.activeElement;
    expect(titleInput).toHaveAccessibleName("Note title");
    expect(titleInput).toHaveValue("");
    expect(lane).toContainElement(titleInput as HTMLElement);
  });

  it("adds the note to the column whose Add button was used", async () => {
    render(<AppShell />);

    const ideas = screen.getByTestId("board-lane-lane-ideas");
    const before = within(ideas).getAllByTestId("paper-note-card").length;

    await userEvent.click(
      within(ideas).getByRole("button", { name: "Add note to Ideas" }),
    );

    expect(within(ideas).getAllByTestId("paper-note-card")).toHaveLength(
      before + 1,
    );
    expect(
      within(screen.getByTestId("board-lane-lane-todo")).getAllByTestId(
        "paper-note-card",
      ),
    ).toHaveLength(notesIn("lane-todo").length);
  });

  it("lets the user type a title straight into the new card", async () => {
    render(<AppShell />);

    await userEvent.click(
      within(screen.getByTestId("board-lane-lane-todo")).getByRole("button", {
        name: "Add note to To Do",
      }),
    );

    const titleInput = document.activeElement;
    if (!(titleInput instanceof HTMLTextAreaElement)) {
      throw new Error("expected the new note's title field to hold focus");
    }

    // Short on purpose: every keystroke re-renders the shell in jsdom, and the
    // point is that typing reaches the new card â€” not how fast it is.
    await userEvent.type(titleInput, "Venue");
    expect(titleInput).toHaveValue("Venue");
  });

  it("increments the count shown in the column header", async () => {
    render(<AppShell />);

    const lane = screen.getByTestId("board-lane-lane-review");
    const count = notesIn("lane-review").length;

    expect(within(lane).getByText(String(count))).toBeInTheDocument();

    await userEvent.click(
      within(lane).getByRole("button", { name: "Add note to Review" }),
    );

    expect(within(lane).getByText(String(count + 1))).toBeInTheDocument();
  });
});

describe("zoom controls", () => {
  it("steps through the preset zoom stops and clamps at the bounds", async () => {
    render(<AppShell />);

    const zoomGroup = screen.getByRole("group", { name: "Zoom" });
    const zoomIn = within(zoomGroup).getByRole("button", { name: "Zoom in" });

    expect(
      within(zoomGroup).getByRole("button", { name: /Zoom level 100 percent/ }),
    ).toBeInTheDocument();

    await userEvent.click(zoomIn);
    expect(
      within(zoomGroup).getByRole("button", { name: /Zoom level 125 percent/ }),
    ).toBeInTheDocument();

    await userEvent.click(zoomIn);
    await userEvent.click(zoomIn);
    expect(
      within(zoomGroup).getByRole("button", { name: /Zoom level 200 percent/ }),
    ).toBeInTheDocument();
  });

  it("returns to 100% when the zoom readout is clicked", async () => {
    render(<AppShell />);

    const zoomGroup = screen.getByRole("group", { name: "Zoom" });
    await userEvent.click(
      within(zoomGroup).getByRole("button", { name: "Zoom in" }),
    );
    await userEvent.click(
      within(zoomGroup).getByRole("button", { name: /Zoom level 125 percent/ }),
    );

    expect(
      within(zoomGroup).getByRole("button", { name: /Zoom level 100 percent/ }),
    ).toBeInTheDocument();
  });
});


describe("sidebar view navigation", () => {
  it("keeps Board/Grid/List and Filter/Display in the toolbar", () => {
    render(<AppShell />);
    const views = screen.getByRole("group", { name: "Board view" });
    expect(within(views).getAllByRole("button").map((button) => button.textContent)).toEqual(["Board", "Grid", "List"]);
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Board settings" })).toBeInTheDocument();
    expect(screen.getByTestId("app-sidebar")).not.toHaveClass("hidden");
  });

  it("switches sidebar destinations to actual surfaces and returns via sidebar before changing Board layouts", async () => {
    render(<AppShell />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const name of ["Canvas", "Calendar", "Timeline"]) {
      const destination = within(nav).getByRole("button", { name });
      await userEvent.click(destination);
      expect(destination).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("main", { name })).toBeInTheDocument();
      expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByText(name)).toBeInTheDocument();
    }
    expect(screen.queryByRole("group", {name:"Board view"})).not.toBeInTheDocument();
    await userEvent.click(within(nav).getByRole("button",{name:"Board"}));
    const views=screen.getByRole("group",{name:"Board view"});
    for (const name of ["Grid", "List", "Board"]) {
      await userEvent.click(within(views).getByRole("button", { name }));
      expect(within(nav).getByRole("button", { name: "Board" })).toHaveAttribute("aria-current", "page");
      if (name !== "Board") expect(screen.getByRole("main", { name })).toBeInTheDocument();
    }
    expect(screen.getAllByTestId("paper-note-card")).toHaveLength(MOCK_NOTES.length);
  });
});

