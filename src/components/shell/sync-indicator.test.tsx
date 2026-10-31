import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SyncIndicator } from "@/components/shell/sync-indicator";
import { useSyncStore } from "@/stores/sync-store";
import { render } from "@/test/render";

beforeEach(() => {
  useSyncStore.setState({
    status: "saved",
    error: null,
    lastSavedAt: null,
    pendingCount: 0,
  });
});

describe("visibility", () => {
  it("is hidden when running on local state", () => {
    render(<SyncIndicator visible={false} onRetry={vi.fn()} />);
    expect(screen.queryByTestId("sync-indicator")).not.toBeInTheDocument();
  });
});

describe("states", () => {
  it("reads 'Saved' when everything is written", () => {
    render(<SyncIndicator visible onRetry={vi.fn()} />);

    const indicator = screen.getByTestId("sync-indicator");
    expect(indicator).toHaveAttribute("data-sync-status", "saved");
    expect(indicator).toHaveTextContent("Saved");
  });

  it("counts the backlog while saving", () => {
    useSyncStore.setState({ status: "saving", pendingCount: 4 });
    render(<SyncIndicator visible onRetry={vi.fn()} />);

    expect(screen.getByTestId("sync-indicator")).toHaveTextContent(
      "Saving 4 changes…",
    );
  });

  it("stays singular for one change", () => {
    useSyncStore.setState({ status: "saving", pendingCount: 1 });
    render(<SyncIndicator visible onRetry={vi.fn()} />);

    expect(screen.getByTestId("sync-indicator")).toHaveTextContent("Saving…");
  });

  it("reassures rather than alarms when offline", () => {
    useSyncStore.setState({ status: "offline" });
    render(<SyncIndicator visible onRetry={vi.fn()} />);

    // Nothing is lost offline — the edits are in local storage.
    expect(screen.getByTestId("sync-indicator")).toHaveTextContent(
      "saved on this device",
    );
  });

  it("announces politely rather than interrupting", () => {
    render(<SyncIndicator visible onRetry={vi.fn()} />);

    // `status`, not `alert`: a save finishing must not cut across whatever the
    // user is doing.
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("failure", () => {
  beforeEach(() => {
    useSyncStore.setState({
      status: "error",
      error: "Could not save your notes.",
    });
  });

  it("offers a retry rather than only an apology", async () => {
    const onRetry = vi.fn();
    render(<SyncIndicator visible onRetry={onRetry} />);

    await userEvent.click(screen.getByRole("button", { name: /Retry now/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("carries the reason for screen readers", () => {
    render(<SyncIndicator visible onRetry={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /Could not save your notes/ }),
    ).toBeInTheDocument();
  });
});
