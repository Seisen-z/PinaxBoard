import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ClayButton } from "@/components/ui/clay-button";
import { IconButton } from "@/components/ui/icon-button";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { SurfacePanel } from "@/components/ui/surface-panel";
import { TagPill } from "@/components/ui/tag-pill";

describe("ClayButton", () => {
  it("defaults to type=button so it cannot submit a surrounding form", () => {
    render(<ClayButton>Add Note</ClayButton>);
    expect(screen.getByRole("button", { name: "Add Note" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("exposes the selected state to assistive technology", () => {
    render(<ClayButton selected>Board</ClayButton>);
    expect(screen.getByRole("button", { name: "Board" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("omits aria-pressed when the button is not a toggle", () => {
    render(<ClayButton>Board</ClayButton>);
    expect(
      screen.getByRole("button", { name: "Board" }),
    ).not.toHaveAttribute("aria-pressed");
  });

  it("does not fire onClick while disabled", async () => {
    const onClick = vi.fn();
    render(
      <ClayButton disabled onClick={onClick}>
        Canvas
      </ClayButton>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Canvas" }), {
      pointerEventsCheck: 0,
    });

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("IconButton", () => {
  it("names the control from its label and hides the icon", () => {
    render(
      <IconButton
        label="Notifications"
        icon={<svg data-testid="bell" />}
        variant="ghost"
      />,
    );

    const button = screen.getByRole("button", { name: "Notifications" });
    expect(button).toBeInTheDocument();
    // The icon itself must not contribute a second accessible name.
    expect(screen.getByTestId("bell").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("SurfacePanel", () => {
  it("renders as the requested element", () => {
    render(
      <SurfacePanel as="header" data-testid="panel">
        Header
      </SurfacePanel>,
    );
    expect(screen.getByTestId("panel").tagName).toBe("HEADER");
  });
});

describe("SurfaceCard", () => {
  it("marks completion and selection as data attributes", () => {
    render(<SurfaceCard completed selected data-testid="card" />);

    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("data-completed", "true");
    expect(card).toHaveAttribute("data-selected", "true");
  });

  it("omits the attributes when the states are off", () => {
    render(<SurfaceCard data-testid="card" />);

    const card = screen.getByTestId("card");
    expect(card).not.toHaveAttribute("data-completed");
    expect(card).not.toHaveAttribute("data-selected");
  });
});

describe("SectionHeader", () => {
  it("renders the title as a heading with the count", () => {
    render(<SectionHeader title="In Progress" count={3} />);

    expect(
      screen.getByRole("heading", { name: "In Progress" }),
    ).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("hides the count when none is supplied", () => {
    render(<SectionHeader title="Ideas" />);
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });
});

describe("TagPill", () => {
  it("prefixes the tag name with a hash", () => {
    render(<TagPill name="planning" />);
    expect(screen.getByText(/planning/)).toHaveTextContent("#planning");
  });
});

describe("PriorityBadge", () => {
  it("names the priority even in the dot variant, so color is not the only cue", () => {
    render(<PriorityBadge priority="urgent" />);
    expect(screen.getByRole("img", { name: "Priority: Urgent" })).toBeInTheDocument();
  });

  it("renders the label variant with visible text", () => {
    render(<PriorityBadge priority="high" variant="label" />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });
});
