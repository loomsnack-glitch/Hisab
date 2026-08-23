import { describe, expect, test } from "bun:test";

import { getKitchenKotContext } from "./pos-kitchen-kot";

describe("kitchen KOT fulfillment context", () => {
  test("labels standalone dine-in and pick-up KOTs from fulfillment", () => {
    expect(
      getKitchenKotContext({ fulfillmentType: "dine_in", tableLabel: null }),
    ).toEqual({
      label: "Order type",
      value: "Dine-In",
    });
    expect(
      getKitchenKotContext({ fulfillmentType: "pick_up", tableLabel: null }),
    ).toEqual({
      label: "Order type",
      value: "Parcel",
    });
  });

  test("keeps a table label only for a dine-in table KOT", () => {
    expect(
      getKitchenKotContext({ fulfillmentType: "dine_in", tableLabel: "T-4" }),
    ).toEqual({
      label: "Table",
      value: "T-4",
    });
    expect(
      getKitchenKotContext({ fulfillmentType: "pick_up", tableLabel: "T-4" }),
    ).toEqual({
      label: "Order type",
      value: "Parcel",
    });
  });
});
