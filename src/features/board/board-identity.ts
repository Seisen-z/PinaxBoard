/**
 * Identifiers for the single local board.
 *
 * Split out from `mock-board.ts` so the lane and note stores can reference the
 * board without importing the mock note fixtures — which would otherwise
 * create a cycle, since the fixtures depend on the lane seeds.
 *
 * Milestone 7 replaces these with real workspace and board records.
 */
export const MOCK_OWNER_ID = "mock-owner";
export const MOCK_WORKSPACE_ID = "mock-workspace";
export const MOCK_BOARD_ID = "mock-board";
export const MOCK_WORKSPACE_NAME = "Personal";
