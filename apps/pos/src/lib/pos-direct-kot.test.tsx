import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { KotDTO, SaleDetailDTO } from "@repo/types";

import {
  buildDirectKotGenerationFields,
  isDirectGenerateKotVisible,
  isKotBackedDirectDraft,
  isOrderTypeSelectorVisible,
  saleItemsToComposerItems,
  selectedStandaloneKotItemsToComposerItems,
  splitKotBackedDraftComposer,
} from "./pos-direct-kot";
import {
  PosGenerateKotToggle,
  PosStandaloneKotList,
} from "./pos-direct-kot-components";

const now = new Date("2026-08-21T12:00:00.000Z");

const kot = (kotNumber: string, id: string): KotDTO => ({
  id,
  organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  saleId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  tableOrderId: null,
  kotType: "parcel",
  fulfillmentType: "dine_in",
  saleBatchSequence: 1,
  kotNumber,
  kotSequenceNumber: Number(kotNumber.slice(-3)),
  kotPeriodKey: "20260821",
  createdAt: now,
  updatedAt: now,
  items: [],
});

describe("Direct POS KOT workflow", () => {
  test("shows Generate KOT only for a KOT-enabled direct device session", () => {
    expect(
      isDirectGenerateKotVisible({
        isDeviceMode: true,
        kotSystemEnabled: true,
        hasActiveTableOrder: false,
        isReplacingSale: false,
      }),
    ).toBe(true);
    expect(
      isDirectGenerateKotVisible({
        isDeviceMode: true,
        kotSystemEnabled: false,
        hasActiveTableOrder: false,
        isReplacingSale: false,
      }),
    ).toBe(false);
    expect(
      isDirectGenerateKotVisible({
        isDeviceMode: true,
        kotSystemEnabled: true,
        hasActiveTableOrder: true,
        isReplacingSale: false,
      }),
    ).toBe(false);
  });

  test("keeps Order type visible for direct POS even when KOT is disabled", () => {
    expect(
      isOrderTypeSelectorVisible({
        hasActiveTableOrder: false,
        showTableKotFulfillmentSelector: false,
      }),
    ).toBe(true);
    expect(
      isOrderTypeSelectorVisible({
        hasActiveTableOrder: true,
        showTableKotFulfillmentSelector: false,
      }),
    ).toBe(false);
  });

  test("renders the default-on Generate KOT toggle for KOT-enabled stores", () => {
    const markup = renderToStaticMarkup(
      <PosGenerateKotToggle
        available
        checked
        disabled={false}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain("Generate KOT");
    expect(markup).toContain("generate-kot-toggle");
    expect(markup).toContain('aria-checked="true"');
  });

  test("treats a default-on toggle with no pending items as no KOT for save and place", () => {
    const fields = buildDirectKotGenerationFields({
      visible: true,
      toggleEnabled: true,
      pendingItems: [],
    });

    expect(fields).toEqual({ generateKot: false });
    expect({ action: "save_draft", ...fields }).toEqual({
      action: "save_draft",
      generateKot: false,
    });
    expect({ action: "place_order", ...fields }).toEqual({
      action: "place_order",
      generateKot: false,
    });
  });

  test("does not render the Parcel KOT cart action component", () => {
    const markup = renderToStaticMarkup(
      <PosGenerateKotToggle
        available
        checked
        disabled={false}
        onChange={() => undefined}
      />,
    );

    expect(markup).not.toContain("Parcel KOT");
    expect(markup).not.toContain("parcel-kot-action");
  });

  test("lists standalone KOT numbers separately from the composer", () => {
    const list = renderToStaticMarkup(
      <PosStandaloneKotList
        kots={[kot("KOT-101", "11111111-1111-4111-8111-111111111111")]}
        selectedKotId={null}
        onSelect={() => undefined}
      />,
    );

    expect(list).toContain("standalone-kot-list");
    expect(list).toContain("KOT-101");
    expect(list).not.toContain("Table KOTs");
  });

  test("loads a selected standalone KOT into the composer for editing", () => {
    const selectedKot = kot("KOT-101", "11111111-1111-4111-8111-111111111111");
    selectedKot.items = [
      {
        id: "22222222-2222-4222-8222-222222222222",
        organizationId: selectedKot.organizationId,
        storeId: selectedKot.storeId,
        kotId: selectedKot.id,
        productId: "99999999-9999-4999-8999-999999999999",
        quantity: 1,
        configurationSignature: "",
        productNameSnapshot: "Chai",
        unitPriceSnapshot: 50,
        discountAmount: 0,
        lineSubtotal: 50,
        lineTotal: 50,
        addOns: [],
        bundleComponents: [],
        createdAt: now,
        updatedAt: now,
      },
    ];

    expect(
      selectedStandaloneKotItemsToComposerItems(
        [selectedKot],
        selectedKot.id,
      )[0]?.name,
    ).toBe("Chai");
    expect(
      selectedStandaloneKotItemsToComposerItems([selectedKot], null),
    ).toEqual([]);
  });

  test("detects a KOT-backed draft and maps sale items for baseline totals", () => {
    const sale = {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      kotNumbers: ["KOT-101"],
      standaloneKots: [kot("KOT-101", "11111111-1111-4111-8111-111111111111")],
      items: [
        {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          saleId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          productId: "99999999-9999-4999-8999-999999999999",
          quantity: 1,
          configurationSignature: "",
          productNameSnapshot: "Chai",
          unitPriceSnapshot: 50,
          discountAmount: 0,
          lineSubtotal: 50,
          lineTotal: 50,
          addOns: [],
          bundleComponents: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
    } as SaleDetailDTO;

    expect(isKotBackedDirectDraft(sale)).toBe(true);
    expect(saleItemsToComposerItems(sale.items)[0]?.name).toBe("Chai");
  });

  test("keeps historic KOT quantities separate and leaves only ungenerated quantities pending", () => {
    const priorKot = kot("KOT-101", "11111111-1111-4111-8111-111111111111");
    priorKot.items = [
      {
        id: "22222222-2222-4222-8222-222222222222",
        organizationId: priorKot.organizationId,
        storeId: priorKot.storeId,
        kotId: priorKot.id,
        productId: "99999999-9999-4999-8999-999999999999",
        quantity: 1,
        configurationSignature: "plain",
        productNameSnapshot: "Sandwich",
        unitPriceSnapshot: 80,
        discountAmount: 0,
        lineSubtotal: 80,
        lineTotal: 80,
        addOns: [],
        bundleComponents: [],
        createdAt: now,
        updatedAt: now,
      },
    ];
    const saleItems = [
      {
        id: "33333333-3333-4333-8333-333333333333",
        organizationId: priorKot.organizationId,
        storeId: priorKot.storeId,
        saleId: priorKot.saleId!,
        productId: priorKot.items[0]!.productId,
        quantity: 2,
        configurationSignature: "plain",
        productNameSnapshot: "Sandwich",
        unitPriceSnapshot: 80,
        discountAmount: 0,
        lineSubtotal: 160,
        lineTotal: 160,
        addOns: [],
        bundleComponents: [],
        createdAt: now,
        updatedAt: now,
      },
    ] as SaleDetailDTO["items"];

    const split = splitKotBackedDraftComposer(saleItems, [priorKot]);
    expect(split.generatedItems[0]?.quantity).toBe(1);
    expect(split.pendingItems[0]?.quantity).toBe(1);
  });
});
