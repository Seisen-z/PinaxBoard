import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AccountMenu } from "@/components/shell/account-menu";
import type { SessionUser } from "@/features/auth/types";

const USER: SessionUser = {
  id: "user-1",
  email: "sam@example.com",
  displayName: "Sam Rivera",
  avatarUrl: null,
  initials: "SR",
};

describe("signed out", () => {
  it("labels the trigger as signed out", () => {
    render(<AccountMenu user={null} />);
    expect(
      screen.getByRole("button", { name: "Account — signed out" }),
    ).toBeInTheDocument();
  });

  it("offers a way in without blocking the app", async () => {
    render(<AccountMenu user={null} />);
    await userEvent.click(screen.getByRole("button"));

    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      within(menu).getByRole("menuitem", { name: "Create an account" }),
    ).toHaveAttribute("href", "/register");
  });
});

describe("signed in", () => {
  it("shows the user's initials and names them on the trigger", () => {
    render(<AccountMenu user={USER} onSignOut={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Account: Sam Rivera" });
    expect(trigger).toHaveTextContent("SR");
  });

  it("shows the display name and email", async () => {
    render(<AccountMenu user={USER} onSignOut={vi.fn()} />);
    await userEvent.click(screen.getByRole("button"));

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Sam Rivera")).toBeInTheDocument();
    expect(within(menu).getByText("sam@example.com")).toBeInTheDocument();
  });

  it("offers sign out", async () => {
    render(<AccountMenu user={USER} onSignOut={vi.fn()} />);
    await userEvent.click(screen.getByRole("button"));

    expect(
      within(screen.getByRole("menu")).getByRole("menuitem", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  it("submits the sign-out form before the menu can unmount it", async () => {
    const onSignOut = vi.fn(async () => {});
    render(<AccountMenu user={USER} onSignOut={onSignOut} />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    await waitFor(() => expect(onSignOut).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("omits sign out entirely when no action is wired", async () => {
    render(<AccountMenu user={USER} />);
    await userEvent.click(screen.getByRole("button"));

    // Better an absent control than one that quietly does nothing.
    expect(
      within(screen.getByRole("menu")).queryByRole("menuitem", {
        name: "Sign out",
      }),
    ).not.toBeInTheDocument();
  });
});
