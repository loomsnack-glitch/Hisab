import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

const testWindow = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
  window: testWindow,
  localStorage: testWindow.localStorage,
});

const {
  getReceiptPaperWidth,
  isReceiptPaperSize,
  persistReceiptPaperSize,
  readReceiptPaperSize,
} = await import("./receipt-paper-size");

describe("receipt paper size", () => {
  afterEach(() => {
    testWindow.localStorage.clear();
  });

  test("defaults to 80 mm with a 42-character width", () => {
    expect(readReceiptPaperSize("pos")).toBe("80mm");
    expect(getReceiptPaperWidth("80mm")).toBe(42);
    expect(getReceiptPaperWidth("58mm")).toBe(32);
  });

  test("persists a selected paper size for this device", () => {
    persistReceiptPaperSize("pos", "58mm");

    expect(readReceiptPaperSize("pos")).toBe("58mm");
    expect(readReceiptPaperSize("admin")).toBe("80mm");
  });

  test("ignores corrupt stored values", () => {
    window.localStorage.setItem("hisab_pos_receipt_paper_size", "120mm");

    expect(isReceiptPaperSize("120mm")).toBe(false);
    expect(readReceiptPaperSize("pos")).toBe("80mm");
  });
});
