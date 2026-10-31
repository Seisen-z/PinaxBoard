import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { MOCK_BOARD_ID } from "@/features/board/board-identity";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { createDefaultLanes, useLaneStore } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";
import { useSelectionStore } from "@/stores/selection-store";
import { SETTINGS_DEFAULTS, useSettingsStore } from "@/stores/settings-store";

afterEach(() => {
  cleanup();
});

/**
 * Zustand stores are module singletons, so without this a note added in one
 * test is still there in the next — and an assertion on a lane's note count
 * would pass or fail depending on file order.
 */
beforeEach(() => {
  localStorage.clear();
  useLaneStore.getState().reset(createDefaultLanes(MOCK_BOARD_ID));
  useNoteStore.getState().reset(MOCK_NOTES);
  useSelectionStore.getState().clear();
  // Board filters and the colour mode are singletons too: a filter set in one
  // test would otherwise hide notes in the next.
  useSettingsStore.setState(SETTINGS_DEFAULTS);
});

/**
 * jsdom implements neither of these, and both are used by components under
 * test (reduced-motion queries, and textarea auto-grow which reads layout).
 */
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

/**
 * Layout geometry for ProseMirror, which the rich editor is built on.
 *
 * jsdom does no layout, so `Range.getClientRects`, `Range.getBoundingClientRect`
 * and `document.elementFromPoint` are missing outright — and ProseMirror calls
 * all three on every transaction to decide where the caret is on screen.
 * Without these, typing one character into a note throws.
 *
 * Zeros are the honest answer: there is no layout to report. The editor's
 * behaviour does not depend on the values, only the slash menu's screen
 * position does, and that is the one thing these tests cannot check anyway.
 */
const EMPTY_RECT: DOMRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
  toJSON: () => ({}),
};

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = function getClientRects() {
    const list = [EMPTY_RECT] as unknown as DOMRectList;
    return list;
  };
}

if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => EMPTY_RECT;
}

if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}

/**
 * `scrollIntoView` is not implemented by jsdom either.
 *
 * Keyboard lists — the command palette, the slash menu — call it to keep the
 * highlighted row visible. There is nothing to scroll in a test, so a no-op is
 * the honest stub; guarding the call in product code would be defending
 * against a browser API that always exists.
 */
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
