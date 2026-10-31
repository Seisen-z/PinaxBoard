import { render, screen } from "@/test/render";
import { describe, expect, it } from "vitest";
import { TacklyMark } from "./tackly-mark";

describe("shared Tackly brand mark", () => {
  it("uses the new scalable clay asset without duplicating surrounding accessible text", () => {
    render(<TacklyMark />); const mark = screen.getByTestId("tackly-mark");
    expect(mark).toHaveAttribute("src", "/brand/tackly-mark.svg"); expect(mark).toHaveAttribute("alt", "");
    expect(mark).toHaveAttribute("aria-hidden", "true"); expect(mark).toHaveAttribute("width", "32");
  });
  it("supports compact sidebar and larger auth sizes without distortion", () => {
    render(<TacklyMark size={44} className="hidden md:block" />); const mark = screen.getByTestId("tackly-mark");
    expect(mark).toHaveAttribute("width", "44"); expect(mark).toHaveAttribute("height", "44"); expect(mark).toHaveClass("hidden", "md:block");
  });
});
