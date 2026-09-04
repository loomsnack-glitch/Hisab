import type {
    ComboChoiceGroupResponseDTO,
    ProductAddOnAttachmentResponseDTO,
} from "@repo/types";

export type PosConfigurationSelection = {
    groupId: string;
    optionProductId: string;
    quantity: number;
};

export const getActiveProductAddOns = (
    attachments: readonly ProductAddOnAttachmentResponseDTO[],
    productId: string,
) =>
    attachments.filter(
        (attachment) =>
            attachment.productId === productId &&
            attachment.status === "active" &&
            attachment.addOn.status === "active",
    );

export const getActiveChoiceGroups = (groups: readonly ComboChoiceGroupResponseDTO[]) =>
    groups
        .filter((group) => group.options.length > 0)
        .map((group) => ({
            ...group,
            options: group.options.filter((option) => option.product.status === "active"),
        }))
        .filter((group) => group.options.length > 0);

export const clampSelectionQuantity = (current: number, delta: number, cap: number) =>
    Math.max(0, Math.min(cap, current + delta));

export const countGroupSelections = (
    selections: readonly PosConfigurationSelection[],
    groupId: string,
) => selections
    .filter((selection) => selection.groupId === groupId)
    .reduce((total, selection) => total + selection.quantity, 0);

export const isComboConfigurationValid = (
    groups: readonly ComboChoiceGroupResponseDTO[],
    selections: readonly PosConfigurationSelection[],
) => groups.every((group) => {
    const count = countGroupSelections(selections, group.id);
    return count >= group.minSelections && count <= group.maxSelections;
});
