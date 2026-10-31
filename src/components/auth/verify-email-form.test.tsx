import { act, fireEvent, render, screen, waitFor } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VerifyEmailForm } from "./verify-email-form";
import type { AuthFormState } from "@/features/auth/schemas";

function setup(overrides: Partial<React.ComponentProps<typeof VerifyEmailForm>> = {}) {
  const props = {
    email: "sam@example.com", initialRetryAfterSeconds: 0,
    verifyAction: vi.fn(async (): Promise<AuthFormState> => ({ status: "error", message: "That code is invalid or has expired." })),
    resendAction: vi.fn(async (): Promise<AuthFormState> => ({ status: "success", message: "A new code is on its way.", retryAfterSeconds: 60 })),
    changeEmailAction: vi.fn(async () => {}), ...overrides,
  };
  render(<VerifyEmailForm {...props} />); return props;
}
describe("signup verification form", () => {
  it("shows the destination, code expiry and accessible numeric input", () => {
    setup(); const input = screen.getByLabelText("Digit 1 of 6");
    expect(screen.getByText("sam@example.com")).toBeInTheDocument();
    expect(input).toHaveAttribute("autocomplete", "one-time-code"); expect(input).toHaveAttribute("inputmode", "numeric");
    expect(screen.getAllByRole("textbox")).toHaveLength(6); expect(screen.getByRole("group", { name: "Verification code" })).toBeInTheDocument(); expect(input).toHaveAttribute("maxlength", "6"); expect(input).toHaveAccessibleDescription("The code expires 10 minutes after it is sent.");
  });
  it("accepts a pasted code and submits no email/password fields", async () => {
    const props = setup(); fireEvent.change(screen.getByLabelText("Digit 1 of 6"), { target: { value: "123 456" } });
    expect(screen.getAllByRole("textbox").map(input => (input as HTMLInputElement).value)).toEqual(["1", "2", "3", "4", "5", "6"]);
    await userEvent.click(screen.getByRole("button", { name: "Verify email" }));
    await waitFor(() => expect(props.verifyAction).toHaveBeenCalled());
    const submitted = vi.mocked(props.verifyAction).mock.calls[0]?.[1] as FormData | undefined;
    expect(submitted?.get("code")).toBe("123456"); expect(submitted?.has("password")).toBe(false); expect(submitted?.has("email")).toBe(false);
    expect(await screen.findByRole("alert")).toHaveTextContent("invalid or has expired");
  });
  it("disables resend until the initial countdown ends", () => {
    vi.useFakeTimers(); try {
      setup({ initialRetryAfterSeconds: 2 }); expect(screen.getByRole("button", { name: "Resend code in 2s" })).toBeDisabled();
      act(() => vi.advanceTimersByTime(2000)); expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
    } finally { vi.useRealTimers(); }
  });
  it("resets resend cooldown from the server response", async () => {
    const props = setup(); await userEvent.click(screen.getByRole("button", { name: "Resend code" }));
    await waitFor(() => expect(props.resendAction).toHaveBeenCalled());
    expect(await screen.findByRole("status")).toHaveTextContent("A new code");
    expect(screen.getByRole("button", { name: /Resend code in/ })).toBeDisabled();
  });
  it("offers a separate change-email action", async () => {
    const props = setup(); await userEvent.click(screen.getByRole("button", { name: "Change email" }));
    await waitFor(() => expect(props.changeEmailAction).toHaveBeenCalled());
  });
  it("announces a field-specific code error", async () => {
    setup({ verifyAction: vi.fn(async (): Promise<AuthFormState> => ({ status: "error", fieldErrors: { code: "Use the latest code" } })) });
    fireEvent.change(screen.getByLabelText("Digit 1 of 6"), { target: { value: "123456" } });
    await userEvent.click(screen.getByRole("button", { name: "Verify email" }));
    await waitFor(() => expect(screen.getByLabelText("Digit 1 of 6")).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByLabelText("Digit 1 of 6")).toHaveAccessibleDescription(/Use the latest code/);
  });
  it("advances between six digits and preserves a leading zero", async () => {
    setup(); await userEvent.type(screen.getByLabelText("Digit 1 of 6"), "029031");
    expect(screen.getAllByRole("textbox").map(input => (input as HTMLInputElement).value)).toEqual(["0", "2", "9", "0", "3", "1"]);
    expect(screen.getByLabelText("Digit 6 of 6")).toHaveFocus();
  });
  it("moves back and clears the previous digit when Backspace is pressed on an empty box", async () => {
    setup(); await userEvent.type(screen.getByLabelText("Digit 1 of 6"), "12");
    await userEvent.keyboard("{Backspace}"); expect(screen.getByLabelText("Digit 2 of 6")).toHaveFocus();
    expect(screen.getByLabelText("Digit 2 of 6")).toHaveValue(""); expect(screen.getByLabelText("Digit 1 of 6")).toHaveValue("1");
  });
  it("supports arrow, Home and End navigation and replacing a selected digit", async () => {
    setup(); fireEvent.change(screen.getByLabelText("Digit 1 of 6"), { target: { value: "123456" } });
    await userEvent.keyboard("{ArrowLeft}"); expect(screen.getByLabelText("Digit 5 of 6")).toHaveFocus();
    await userEvent.keyboard("9"); expect(screen.getByLabelText("Digit 5 of 6")).toHaveValue("9");
    await userEvent.keyboard("{Home}{ArrowLeft}"); expect(screen.getByLabelText("Digit 1 of 6")).toHaveFocus();
    await userEvent.keyboard("{End}{ArrowRight}"); expect(screen.getByLabelText("Digit 6 of 6")).toHaveFocus();
  });
  it("distributes a complete pasted code from any box", () => {
    setup(); fireEvent.paste(screen.getByLabelText("Digit 4 of 6"), { clipboardData: { getData: () => "029 031" } });
    expect(screen.getAllByRole("textbox").map(input => (input as HTMLInputElement).value)).toEqual(["0", "2", "9", "0", "3", "1"]);
    expect(screen.getByLabelText("Digit 6 of 6")).toHaveFocus();
  });
  it("ignores nonnumeric input and supports clearing a populated digit", () => {
    setup(); fireEvent.change(screen.getByLabelText("Digit 1 of 6"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Digit 1 of 6"), { target: { value: "x" } }); expect(screen.getByLabelText("Digit 1 of 6")).toHaveValue("4");
    fireEvent.change(screen.getByLabelText("Digit 1 of 6"), { target: { value: "" } }); expect(screen.getByLabelText("Digit 1 of 6")).toHaveValue("");
  });
  it("keeps incomplete codes from submitting", async () => {
    const props = setup(); await userEvent.type(screen.getByLabelText("Digit 1 of 6"), "123");
    await userEvent.click(screen.getByRole("button", { name: "Verify email" })); expect(props.verifyAction).not.toHaveBeenCalled();
  });

});
