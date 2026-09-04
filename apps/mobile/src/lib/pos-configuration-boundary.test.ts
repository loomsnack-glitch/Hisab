import { describe, expect, it } from "bun:test";
import {
    clampSelectionQuantity,
    countGroupSelections,
    getActiveChoiceGroups,
    getActiveProductAddOns,
    isComboConfigurationValid,
} from "./pos-configuration-boundary";

const group = (overrides: Record<string, unknown> = {}) => ({
    id: "group-1",
    organizationId: "organization-1",
    comboProductId: "combo-1",
    name: "Choose a side",
    minSelections: 1,
    maxSelections: 1,
    sortOrder: 0,
    createdBy: "user-1",
    createdAt: "2026-08-10T00:00:00.000Z",
    options: [
        {
            id: "option-1",
            organizationId: "organization-1",
            choiceGroupId: "group-1",
            optionProductId: "side-1",
            maxQuantity: 1,
            priceAdjustment: 0,
            sortOrder: 0,
            createdBy: "user-1",
            createdAt: "2026-08-10T00:00:00.000Z",
            product: { id: "side-1", status: "active", name: "Fries" },
        },
    ],
    ...overrides,
});

describe("mobile POS configuration boundary", () => {
    it("keeps only active Combo options and non-empty groups", () => {
        const result = getActiveChoiceGroups([
            group({ options: [{ ...group().options[0], product: { id: "inactive", status: "inactive" } }] }),
            group({ id: "empty", options: [] }),
        ] as never);

        expect(result).toEqual([]);
    });

    it("caps Add-on quantities and counts Combo selections", () => {
        expect(clampSelectionQuantity(1, 1, 2)).toBe(2);
        expect(clampSelectionQuantity(2, 1, 2)).toBe(2);
        expect(countGroupSelections([{ groupId: "group-1", optionProductId: "side-1", quantity: 1 }], "group-1")).toBe(1);
    });

    it("validates required Combo group limits", () => {
        const required = [group()] as never;
        expect(isComboConfigurationValid(required, [])).toBe(false);
        expect(isComboConfigurationValid(required, [{ groupId: "group-1", optionProductId: "side-1", quantity: 1 }])).toBe(true);
    });

    it("rejects inactive, unknown, and over-cap Combo selections", () => {
        const configured = [group({
            options: [
                { ...group().options[0], maxQuantity: 2 },
                { ...group().options[0], id: "option-2", optionProductId: "inactive-side", product: { id: "inactive-side", status: "inactive" } },
            ],
            maxSelections: 3,
        })] as never;

        expect(isComboConfigurationValid(configured, [{ groupId: "group-1", optionProductId: "side-1", quantity: 3 }])).toBe(false);
        expect(isComboConfigurationValid(configured, [{ groupId: "group-1", optionProductId: "unknown", quantity: 1 }])).toBe(false);
        expect(isComboConfigurationValid(configured, [{ groupId: "group-1", optionProductId: "inactive-side", quantity: 1 }])).toBe(false);
        expect(isComboConfigurationValid(configured, [{ groupId: "group-1", optionProductId: "side-1", quantity: 2 }])).toBe(true);
    });

    it("filters Add-on attachments by Product and active statuses", () => {
        const attachments = [
            { id: "attachment-1", productId: "product-1", addOnId: "addon-1", status: "active", addOn: { id: "addon-1", status: "active" } },
            { id: "attachment-2", productId: "product-1", addOnId: "addon-2", status: "inactive", addOn: { id: "addon-2", status: "active" } },
            { id: "attachment-3", productId: "product-2", addOnId: "addon-3", status: "active", addOn: { id: "addon-3", status: "active" } },
        ];

        expect(getActiveProductAddOns(attachments as never, "product-1")).toHaveLength(1);
    });
});
