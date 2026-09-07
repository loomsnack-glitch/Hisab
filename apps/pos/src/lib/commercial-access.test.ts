import { describe, expect, test } from "bun:test";

import {
  commercialAccessDeniedMessage,
  isCommercialAccessDeniedError,
  isCommercialAccessDeniedMessage,
} from "./commercial-access";

describe("commercial access helpers", () => {
  test("detects the server-side commercial access denial message", () => {
    expect(
      isCommercialAccessDeniedMessage(
        "Billing is not available for this Store. Review commercial access in Ganatri Admin to purchase or renew access.",
      ),
    ).toBe(true);
    expect(isCommercialAccessDeniedMessage("Store not found")).toBe(false);
  });

  test("detects commercial access errors thrown by POS queries", () => {
    expect(
      isCommercialAccessDeniedError(
        new Error(`Table Management is not available for this Store. ${commercialAccessDeniedMessage}`),
      ),
    ).toBe(true);
    expect(isCommercialAccessDeniedError(new Error("Network error"))).toBe(false);
  });
});
