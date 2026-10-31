import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoteCover } from "@/components/notes/note-cover";
import { isExternalCover } from "@/features/attachments/cover";

/**
 * Note covers (IMPLEMENTATION_PLAN.md §16).
 *
 * Only the external-URL path is exercised here: an uploaded cover is a private
 * object that has to be signed, which needs a live project. The split itself
 * is the thing worth proving, because getting it wrong means either storing a
 * URL that expires or signing one that never needed it.
 */

describe("telling the two kinds of cover apart", () => {
  it.each([
    ["https://example.com/a.png", true],
    ["http://example.com/a.png", true],
    ["11111111-1111-1111-1111-111111111111/note-1/abc.png", false],
    ["covers/abc.png", false],
  ])("%s is external: %s", (value, expected) => {
    expect(isExternalCover(value)).toBe(expected);
  });
});

describe("rendering", () => {
  it("renders nothing when the note has no cover", () => {
    render(<NoteCover coverUrl={null} noteTitle="Venue" />);

    expect(screen.queryByTestId("note-cover")).not.toBeInTheDocument();
  });

  it("uses an external URL as-is", async () => {
    render(<NoteCover coverUrl="https://example.com/a.png" noteTitle="Venue" />);

    const image = await screen.findByTestId("note-cover");
    expect(image).toHaveAttribute("src", "https://example.com/a.png");
    expect(image).toHaveAccessibleName("Cover image for Venue");
  });

  it("names an untitled note's cover without a dangling 'for'", async () => {
    render(<NoteCover coverUrl="https://example.com/a.png" noteTitle="" />);

    expect(await screen.findByTestId("note-cover")).toHaveAccessibleName(
      "Note cover image",
    );
  });

  it("removes itself when the image fails to load", async () => {
    render(<NoteCover coverUrl="https://example.com/gone.png" noteTitle="Venue" />);

    const image = await screen.findByTestId("note-cover");
    fireEvent.error(image);

    // A broken-image icon in the middle of a card is worse than no cover.
    await waitFor(() =>
      expect(screen.queryByTestId("note-cover")).not.toBeInTheDocument(),
    );
  });
});
