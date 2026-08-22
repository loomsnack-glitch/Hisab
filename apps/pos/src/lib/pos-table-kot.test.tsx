import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { KotDTO, TableOrderDTO } from "@repo/types";

import {
  composerItemsFromTableKot,
  isTableKotActionVisible,
  isTableKotWorkflowEnabled,
  PosTableKotAction,
  PosTableKotList,
  hasActiveTableWorkspace,
  remainingTableKotItemCount,
  selectedTableKotItems,
  shouldOpenMobileCartOnComposerHandoff,
} from "./pos-table-kot";

const now = new Date("2026-08-21T12:00:00.000Z");
const kot = (kotNumber: string, id: string): KotDTO => ({
  id,
  organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  saleId: null,
  tableOrderId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  kotType: "table",
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
    kot("KOT-001", "dddddddd-dddd-4ddd-8ddd-dddddddddddd"),
    kot("KOT-002", "f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1"),
  ],
};

describe("Table KOT POS actions", () => {
  test("is available only when both the KOT System and Table Management are enabled", () => {
    expect(
      isTableKotWorkflowEnabled({ kotSystemEnabled: true, tableManagementEnabled: true }),
    ).toBe(true);
    expect(
      isTableKotWorkflowEnabled({ kotSystemEnabled: true, tableManagementEnabled: false }),
    ).toBe(false);
    expect(
      isTableKotActionVisible({
        isDeviceMode: true,
        kotSystemEnabled: true,
        tableManagementEnabled: true,
        hasActiveTableOrder: true,
        isReplacingSale: false,
      }),
    ).toBe(true);
    expect(
      isTableKotActionVisible({
        isDeviceMode: true,
        kotSystemEnabled: true,
        tableManagementEnabled: true,
        hasActiveTableOrder: false,
        isReplacingSale: false,
      }),
    ).toBe(false);
  });

  test("renders Generate KOT and the table's KOT numbers", () => {
    const action = renderToStaticMarkup(
      <PosTableKotAction
        available
        disabled={false}
        isPending={false}
        editing={false}
        onGenerate={() => undefined}
      />,
    );
    const list = renderToStaticMarkup(
      <PosTableKotList
        tableOrder={tableOrder}
        selectedKotId={tableOrder.kots[0]!.id}
        onSelect={() => undefined}
      />,
    );

    expect(action).toContain("Generate KOT");
    expect(action).toContain("table-kot-action");
    expect(list).toContain("KOT-001");
    expect(list).toContain("KOT-002");
    expect(list).toContain("table-kot-list");
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
    expect(shouldOpenMobileCartOnComposerHandoff({ tableOrder: null })).toBe(true);
    expect(shouldOpenMobileCartOnComposerHandoff({})).toBe(true);
  });

  test("loads the selected KOT's remaining items into the composer", () => {
    expect(remainingTableKotItemCount(tableOrder)).toBe(2);
    expect(selectedTableKotItems(tableOrder, tableOrder.kots[1]!.id)).toHaveLength(1);

    const items = composerItemsFromTableKot(tableOrder, tableOrder.kots[0]!.id);
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("Pav Bhaji");
    expect(items[0]?.unitPrice).toBe(100);
    expect(items[0]?.unitDiscount).toBe(10);
    expect(composerItemsFromTableKot(tableOrder, "missing")).toEqual([]);
  });
});
