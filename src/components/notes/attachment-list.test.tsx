import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AttachmentList } from "@/components/notes/attachment-list";
import type { AttachmentUploads, UploadTask } from "@/features/attachments/queries";
import type { Attachment } from "@/types/note";

/**
 * The attachment surface's states (IMPLEMENTATION_PLAN.md §16).
 *
 * The repository is not exercised here — it needs a live project — so the
 * uploads object is supplied directly. What this proves is the part a user
 * sees: that every state has a rendering, and that failure is reported rather
 * than swallowed.
 */

function makeAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: "att-1",
    noteId: "note-1",
    ownerId: "user-1",
    bucket: "attachments",
    storagePath: "user-1/note-1/abc.pdf",
    fileName: "brief.pdf",
    mimeType: "application/pdf",
    fileSize: 2048,
    publicUrl: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeUploads(overrides: Partial<AttachmentUploads> = {}): AttachmentUploads {
  return {
    tasks: [],
    upload: vi.fn().mockResolvedValue([]),
    dismiss: vi.fn(),
    remove: vi.fn(),
    removing: false,
    ...overrides,
  };
}

const uploadingTask: UploadTask = {
  id: "task-1",
  fileName: "photo.png",
  fileSize: 1024,
  bucket: "note-images",
  status: "uploading",
  progress: null,
};

const failedTask: UploadTask = {
  id: "task-2",
  fileName: "huge.mov",
  fileSize: 60 * 1024 * 1024,
  bucket: "note-videos",
  status: "error",
  progress: null,
  error: "huge.mov is 60 MB. The limit for a video is 50 MB.",
};

describe("states", () => {
  it("invites a drop when there is nothing yet", () => {
    render(
      <AttachmentList attachments={[]} uploads={makeUploads()} editable />,
    );

    expect(screen.getByText(/Drop files here/)).toBeInTheDocument();
  });

  it("does not invite uploads when the note is not editable", () => {
    render(
      <AttachmentList attachments={[]} uploads={makeUploads()} editable={false} />,
    );

    expect(screen.getByText("No files.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add file" }),
    ).not.toBeInTheDocument();
  });

  it("shows a loading state", () => {
    render(
      <AttachmentList attachments={[]} uploads={makeUploads()} editable loading />,
    );

    expect(screen.getByText("Loading files…")).toBeInTheDocument();
  });

  it("shows an error with a retry", async () => {
    const onRetry = vi.fn();

    render(
      <AttachmentList
        attachments={[]}
        uploads={makeUploads()}
        editable
        error={new Error("Could not load this note's files.")}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Could not load this note's files.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("lists saved attachments with their size", () => {
    render(
      <AttachmentList
        attachments={[makeAttachment()]}
        uploads={makeUploads()}
        editable
      />,
    );

    const row = screen.getByTestId("attachment-row");
    expect(within(row).getByText("brief.pdf")).toBeInTheDocument();
    expect(within(row).getByText("2 KB")).toBeInTheDocument();
  });
});

describe("uploads in flight", () => {
  it("shows an upload that is running, with no dismiss control", () => {
    render(
      <AttachmentList
        attachments={[]}
        uploads={makeUploads({ tasks: [uploadingTask] })}
        editable
      />,
    );

    const task = screen.getByTestId("upload-task");
    expect(within(task).getByText("photo.png")).toBeInTheDocument();
    // Nothing to dismiss while it is still working.
    expect(
      within(task).queryByRole("button", { name: /Dismiss/ }),
    ).not.toBeInTheDocument();
  });

  it("reports a failed upload and lets the user clear it", async () => {
    const uploads = makeUploads({ tasks: [failedTask] });

    render(<AttachmentList attachments={[]} uploads={uploads} editable />);

    const task = screen.getByTestId("upload-task");
    // The reason, not just "failed" — the user can act on a size limit.
    expect(within(task).getByText(/limit for a video is 50 MB/)).toBeInTheDocument();

    await userEvent.click(
      within(task).getByRole("button", { name: "Dismiss huge.mov" }),
    );
    expect(uploads.dismiss).toHaveBeenCalledWith("task-2");
  });

  it("shows a failed upload alongside the attachments that did save", () => {
    // One rejected file must not take down a multi-file drop.
    render(
      <AttachmentList
        attachments={[makeAttachment()]}
        uploads={makeUploads({ tasks: [failedTask] })}
        editable
      />,
    );

    expect(screen.getByTestId("attachment-row")).toBeInTheDocument();
    expect(screen.getByTestId("upload-task")).toBeInTheDocument();
  });
});

describe("adding and removing", () => {
  it("uploads the files chosen from the picker", async () => {
    const uploads = makeUploads();

    render(<AttachmentList attachments={[]} uploads={uploads} editable />);

    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    await userEvent.upload(
      screen.getByLabelText("Add files to this note"),
      file,
    );

    expect(uploads.upload).toHaveBeenCalledWith([file]);
  });

  it("removes an attachment", async () => {
    const uploads = makeUploads();
    const attachment = makeAttachment();

    render(
      <AttachmentList attachments={[attachment]} uploads={uploads} editable />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Remove brief.pdf" }),
    );

    expect(uploads.remove).toHaveBeenCalledWith(attachment);
  });

  it("offers no remove control on a note that is not editable", () => {
    render(
      <AttachmentList
        attachments={[makeAttachment()]}
        uploads={makeUploads()}
        editable={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /^Remove/ }),
    ).not.toBeInTheDocument();
  });

  it("uploads files dropped onto the list", () => {
    const uploads = makeUploads();

    render(<AttachmentList attachments={[]} uploads={uploads} editable />);

    const file = new File(["x"], "dropped.png", { type: "image/png" });
    const list = screen.getByTestId("attachment-list");

    // `userEvent` has no drop helper, so the payload is built by hand.
    const dataTransfer = {
      files: [file],
      items: [],
      types: ["Files"],
    } as unknown as DataTransfer;

    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
    list.dispatchEvent(event);

    expect(uploads.upload).toHaveBeenCalledWith([file]);
  });

  it("ignores a drop on a note that is not editable", () => {
    const uploads = makeUploads();

    render(
      <AttachmentList attachments={[]} uploads={uploads} editable={false} />,
    );

    const dataTransfer = {
      files: [new File(["x"], "dropped.png", { type: "image/png" })],
    } as unknown as DataTransfer;

    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
    screen.getByTestId("attachment-list").dispatchEvent(event);

    expect(uploads.upload).not.toHaveBeenCalled();
  });
});
