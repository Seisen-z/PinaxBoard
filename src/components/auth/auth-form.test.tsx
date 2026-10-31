import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuthForm } from "@/components/auth/auth-form";
import type { AuthFormState } from "@/features/auth/schemas";

/** An action that simply reports back whatever state the test wants. */
function actionReturning(state: AuthFormState) {
  return vi.fn(async () => state);
}

/**
 * Fills the required inputs and submits.
 *
 * jsdom enforces `required`, so clicking submit on an empty form blocks the
 * post and the action never runs — the test would then fail for a reason that
 * has nothing to do with what it is checking.
 */
async function submit(buttonName: string) {
  await userEvent.type(screen.getByLabelText("Email"), "sam@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "hunter22");
  await userEvent.click(screen.getByRole("button", { name: buttonName }));
}

describe("sign-in form", () => {
  it("renders email and password, but no name field", () => {
    render(<AuthForm mode="sign-in" action={actionReturning({ status: "idle" })} />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("asks the password manager for the existing password", () => {
    render(<AuthForm mode="sign-in" action={actionReturning({ status: "idle" })} />);

    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("submits to the action", async () => {
    const action = actionReturning({ status: "idle" });
    render(<AuthForm mode="sign-in" action={action} />);

    await submit("Sign in");

    await waitFor(() => expect(action).toHaveBeenCalled());
  });
});

describe("sign-up form", () => {
  it("adds an optional name field", () => {
    render(<AuthForm mode="sign-up" action={actionReturning({ status: "idle" })} />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).not.toBeRequired();
  });

  it("asks the password manager for a new password", () => {
    render(<AuthForm mode="sign-up" action={actionReturning({ status: "idle" })} />);

    // Otherwise a manager autofills the existing password into a new account.
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });

  it("states the length requirement up front", () => {
    render(<AuthForm mode="sign-up" action={actionReturning({ status: "idle" })} />);
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
  });
});

describe("errors", () => {
  it("announces a form-level error", async () => {
    const action = actionReturning({
      status: "error",
      message: "That email and password do not match an account.",
    });
    render(<AuthForm mode="sign-in" action={action} />);

    await submit("Sign in");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("do not match an account");
  });

  it("ties a field error to its input for screen readers", async () => {
    const action = actionReturning({
      status: "error",
      fieldErrors: { email: "That does not look like an email address" },
    });
    render(<AuthForm mode="sign-in" action={action} />);

    await submit("Sign in");

    const email = await screen.findByLabelText("Email");
    expect(email).toHaveAttribute("aria-invalid", "true");
    // The reason must be announced, not just "invalid".
    expect(email).toHaveAccessibleDescription(
      "That does not look like an email address",
    );
  });

  it("shows a success message without navigating", async () => {
    const action = actionReturning({
      status: "success",
      message: "Check your inbox to confirm your email address.",
    });
    render(<AuthForm mode="sign-up" action={action} />);

    await submit("Create account");

    expect(await screen.findByRole("status")).toHaveTextContent("Check your inbox");
  });
});

describe("when no Supabase project is connected", () => {
  const REASON = "Accounts are unavailable on this instance.";

  it("explains why and disables submission", () => {
    render(
      <AuthForm
        mode="sign-in"
        action={actionReturning({ status: "idle" })}
        disabledReason={REASON}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(REASON);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });
});
