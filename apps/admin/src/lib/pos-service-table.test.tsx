import { describe, expect, test } from "bun:test";

import {
  getPosServiceTableAction,
  getPosServiceTableStateLabel,
  shouldReturnToPosTablesAfterSale,
} from "./pos-service-table";
import { serviceTableKeys } from "./query-keys";

const tableId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("POS Service Table helpers", () => {
  test("shows Allocate only for a Free table and Free only for an Allocated table", () => {
    expect(getPosServiceTableAction("free")).toBe("allocate");
    expect(getPosServiceTableAction("allocated")).toBe("free");
    expect(getPosServiceTableAction("engaged")).toBeNull();
    expect(getPosServiceTableAction("ready_to_bill")).toBeNull();
    expect(getPosServiceTableAction("payment_due")).toBeNull();
    expect(getPosServiceTableAction("paid")).toBeNull();
  });

  test("uses the operator-facing state labels", () => {
    expect(getPosServiceTableStateLabel("free")).toBe("Free");
    expect(getPosServiceTableStateLabel("allocated")).toBe("Allocated");
    expect(getPosServiceTableStateLabel("engaged")).toBe("Engaged");
    expect(getPosServiceTableStateLabel("ready_to_bill")).toBe("Engaged");
    expect(getPosServiceTableStateLabel("payment_due")).toBe("Payment due");
  });

  test("returns cashiers to Tables after a table-linked draft save or place", () => {
    expect(shouldReturnToPosTablesAfterSale({ serviceTableId: tableId })).toBe(true);
    expect(shouldReturnToPosTablesAfterSale({ serviceTableId: null })).toBe(false);
    expect(shouldReturnToPosTablesAfterSale({})).toBe(false);
  });

  test("keeps POS table cache entries isolated by Store", () => {
    expect(serviceTableKeys.pos("org-a", "store-a")).not.toEqual(
      serviceTableKeys.pos("org-a", "store-b"),
    );
  });
});
