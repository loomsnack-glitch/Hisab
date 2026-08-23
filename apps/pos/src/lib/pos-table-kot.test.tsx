import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { KotDTO, TableOrderDTO } from "@repo/types";

import {
  composerItemsFromTableKot,
  formatKotFulfillmentPrintLabel,
  hasActiveTableWorkspace,
  isTableCartKotActionVisible,
  isTableKotFulfillmentSelectorVisible,
  isTableKotWorkflowEnabled,
  kotPrintsAsParcel,
  remainingTableKotItemCount,
  resolveTableCheckoutMode,
  resolveStableTableKotRequest,
  selectedTableKotItems,
  shouldOpenMobileCartOnComposerHandoff,
} from "./pos-table-kot";
import { PosTableKotList } from "./pos-table-kot-components";

const now = new Date("2026-08-21T12:00:00.000Z");
const kot = (
  kotNumber: string,
  id: string,
  fulfillmentType: KotDTO["fulfillmentType"] = "dine_in",
): KotDTO => ({
  id,
  organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  saleId: null,
  tableOrderId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  kotType: "table",
  fulfillmentType,
  saleBatchSequence: null,
  kotNumber,
  kotSequenceNumber: Number(kotNumber.slice(-3)),
  kotPeriodKey: "20260821",
  createdAt: now,
  updatedAt: now,
  items: [
    {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      kotId: id,
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 1,
      configurationSignature: "",
      productNameSnapshot: "Pav Bhaji",
      unitPriceSnapshot: 100,
      discountAmount: 10,
      lineSubtotal: 100,
      lineTotal: 90,
      addOns: [],
      bundleComponents: [],
      createdAt: now,
      updatedAt: now,
    },
  ],
});

const tableOrder: TableOrderDTO = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  serviceTableId: "99999999-9999-4999-8999-999999999999",
  customerId: null,
  saleId: null,
  status: "active",
  remainingSubtotal: 100,
  remainingDiscountTotal: 10,
  remainingGrandTotal: 90,
  createdAt: now,
  updatedAt: now,
  kots: [
    kot("KOT-001", "dddddddd-dddd-4ddd-8ddd-dddddddddddd", "dine_in"),
    kot("KOT-002", "f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1", "pick_up"),
  ],
};

describe("Table KOT POS workflow", () => {
  test("reuses the generation request id for an unchanged retry", () => {
    const first = resolveStableTableKotRequest({
      existing: null,
      fingerprint: "table-1:items-a",
      createRequestId: () => "request-1",
    });
    const retried = resolveStableTableKotRequest({
      existing: first,
      fingerprint: "table-1:items-a",
      createRequestId: () => "request-2",
    });
    const changed = resolveStableTableKotRequest({
      existing: first,
      fingerprint: "table-1:items-b",
      createRequestId: () => "request-2",
    });

    expect(retried.requestId).toBe("request-1");
    expect(changed.requestId).toBe("request-2");
  });

  test("is available only when both the KOT System and Table Management are enabled", () => {
    expect(
      isTableKotWorkflowEnabled({
        kotSystemEnabled: true,
        tableManagementEnabled: true,
      }),
    ).toBe(true);
    expect(
      isTableKotWorkflowEnabled({
        kotSystemEnabled: true,
        tableManagementEnabled: false,
      }),
    ).toBe(false);
  });

  test("never shows the legacy cart-level Generate KOT action", () => {
    expect(isTableCartKotActionVisible()).toBe(false);
  });

  test("resolves checkout modes for new items, edits, and final placement", () => {
    const base = {
      tableKotWorkflowEnabled: true,
      hasActiveTableOrder: true,
    };

    expect(
      resolveTableCheckoutMode({
        ...base,
        hasNewComposerItems: true,
        isEditingKot: false,
        hasExistingKots: false,
      }),
    ).toBe("generate_kot");
    expect(
      resolveTableCheckoutMode({
        ...base,
        hasNewComposerItems: false,
        isEditingKot: true,
        hasExistingKots: true,
      }),
    ).toBe("save_kot");
    expect(
      resolveTableCheckoutMode({
        ...base,
        hasNewComposerItems: false,
        isEditingKot: false,
        hasExistingKots: true,
      }),
    ).toBe("place_order");
    expect(
      resolveTableCheckoutMode({
        ...base,
        hasNewComposerItems: false,
        isEditingKot: false,
        hasExistingKots: false,
      }),
    ).toBe(null);
    expect(
      resolveTableCheckoutMode({
        tableKotWorkflowEnabled: false,
        hasActiveTableOrder: true,
        hasNewComposerItems: false,
        isEditingKot: false,
        hasExistingKots: true,
      }),
    ).toBe("place_order");
  });

  test("shows fulfillment selection only while generating a new table KOT", () => {
    expect(isTableKotFulfillmentSelectorVisible("generate_kot")).toBe(true);
    expect(isTableKotFulfillmentSelectorVisible("save_kot")).toBe(false);
    expect(isTableKotFulfillmentSelectorVisible("place_order")).toBe(false);
    expect(isTableKotFulfillmentSelectorVisible(null)).toBe(false);
  });

  test("prints only pick-up table KOTs as Parcel", () => {
    expect(kotPrintsAsParcel("pick_up")).toBe(true);
    expect(kotPrintsAsParcel("dine_in")).toBe(false);
    expect(formatKotFulfillmentPrintLabel("pick_up")).toBe("Parcel");
    expect(formatKotFulfillmentPrintLabel("dine_in")).toBe("Dine-In");
  });

  test("renders the table's KOT numbers", () => {
    const list = renderToStaticMarkup(
      <PosTableKotList
        tableOrder={tableOrder}
        selectedKotId={tableOrder.kots[0]!.id}
        onSelect={() => undefined}
      />,
    );

    expect(list).toContain("KOT-001");
    expect(list).toContain("KOT-002");
    expect(list).toContain("table-kot-list");
    expect(list).not.toContain("table-kot-action");
  });

  test("treats an engaged table with an Active Table Order as reopenable", () => {
    expect(
      hasActiveTableWorkspace({
        state: "engaged",
        currentSaleId: null,
        currentTableOrderId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).toBe(true);
    expect(
      hasActiveTableWorkspace({
        state: "engaged",
        currentSaleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        currentTableOrderId: null,
      }),
    ).toBe(true);
    expect(
      hasActiveTableWorkspace({
        state: "allocated",
        currentSaleId: null,
        currentTableOrderId: null,
      }),
    ).toBe(false);
  });

  test("keeps the mobile cart closed when a table order is handed into POS", () => {
    expect(shouldOpenMobileCartOnComposerHandoff({ tableOrder })).toBe(false);
    expect(shouldOpenMobileCartOnComposerHandoff({ tableOrder: null })).toBe(
      true,
    );
    expect(shouldOpenMobileCartOnComposerHandoff({})).toBe(true);
  });

  test("loads the selected KOT's remaining items into the composer", () => {
    expect(remainingTableKotItemCount(tableOrder)).toBe(2);
    expect(
      selectedTableKotItems(tableOrder, tableOrder.kots[1]!.id),
    ).toHaveLength(1);

    const items = composerItemsFromTableKot(tableOrder, tableOrder.kots[0]!.id);
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("Pav Bhaji");
    expect(items[0]?.unitPrice).toBe(100);
    expect(items[0]?.unitDiscount).toBe(10);
    expect(composerItemsFromTableKot(tableOrder, "missing")).toEqual([]);
  });
});
