import { describe, expect, test } from "bun:test";

import {
  LAYOUT_DND_TOUCH_DELAY_MS,
  resolveSameListMove,
} from "./layout-dnd";

describe("layout dnd", () => {
  test("resolves a move only when both ids are in the same list", () => {
    expect(resolveSameListMove(["t1", "t2", "t3"], "t1", "t3")).toEqual({
      fromIndex: 0,
      toIndex: 2,
    });
    expect(resolveSameListMove(["t1", "t2"], "t1", "t1")).toBeNull();
    expect(resolveSameListMove(["t1", "t2"], "t1", "t9")).toBeNull();
    expect(resolveSameListMove(["t1", "t2"], "t1", null)).toBeNull();
  });

  test("waits before activating touch drag so the page can still scroll", () => {
    expect(LAYOUT_DND_TOUCH_DELAY_MS).toBeGreaterThanOrEqual(200);
  });
});
