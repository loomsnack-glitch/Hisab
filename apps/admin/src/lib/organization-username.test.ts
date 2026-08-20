import { describe, expect, test } from "bun:test";

import { slugifyBusinessName } from "./organization-username";

describe("business username generation", () => {
  test("uses underscores between words", () => {
    expect(slugifyBusinessName("Demo Grocery Mart")).toBe("demo_grocery_mart");
  });

  test("normalizes punctuation and repeated separators", () => {
    expect(slugifyBusinessName("  Demo---Grocery__Mart!  ")).toBe(
      "demo_grocery_mart",
    );
  });

  test("trims the result to the username limit without a trailing separator", () => {
    expect(slugifyBusinessName(`${"a".repeat(63)} Grocery`)).toBe(
      "a".repeat(63),
    );
  });

  test("returns an empty username when no valid characters remain", () => {
    expect(slugifyBusinessName("!!!")).toBe("");
  });
});
