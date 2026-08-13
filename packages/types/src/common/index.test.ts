import { describe, expect, test } from "bun:test";
import {
  formatPhoneDisplay,
  getPhoneNumberParts,
  normalizePhoneNumber,
  phoneSchema,
} from "./index";

describe("phone number helpers", () => {
  test("defaults a valid Indian local number to India", () => {
    expect(normalizePhoneNumber("9876543210")).toBe("+919876543210");
  });

  test("normalizes international numbers from other countries", () => {
    expect(normalizePhoneNumber("+1 415 555 2671")).toBe("+14155552671");
    expect(normalizePhoneNumber("+44 20 7946 0958")).toBe("+442079460958");
  });

  test("rejects invalid numbers", () => {
    expect(normalizePhoneNumber("12345")).toBeNull();
    expect(normalizePhoneNumber("+999 123456789")).toBeNull();
  });

  test("validates canonical international numbers", () => {
    expect(phoneSchema.safeParse("+14155552671").success).toBe(true);
    expect(phoneSchema.safeParse("+12345678").success).toBe(false);
  });

  test("returns the selected country and national number", () => {
    expect(getPhoneNumberParts("+14155552671")).toEqual({
      country: "US",
      nationalNumber: "4155552671",
    });
  });

  test("formats a number for confirmation UI", () => {
    expect(formatPhoneDisplay("+919876543210")).toBe("+91 98765 43210");
  });
});
