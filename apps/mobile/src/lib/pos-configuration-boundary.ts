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
) => {
    const activeOptionsByGroup = new Map(
        groups.map((group) => [
            group.id,
            new Map(
                group.options
                    .filter((option) => option.product.status === "active")
                    .map((option) => [option.optionProductId, option.maxQuantity]),
            ),
        ]),
    );
    const quantitiesByOption = new Map<string, number>();

    for (const selection of selections) {
        const options = activeOptionsByGroup.get(selection.groupId);
        const optionCap = options?.get(selection.optionProductId);
        if (optionCap === undefined || selection.quantity <= 0 || !Number.isInteger(selection.quantity)) {
            return false;
        }

        const key = `${selection.groupId}:${selection.optionProductId}`;
        const quantity = (quantitiesByOption.get(key) ?? 0) + selection.quantity;
        if (quantity > optionCap) {
            return false;
        }
        quantitiesByOption.set(key, quantity);
    }

    return groups.every((group) => {
        const count = countGroupSelections(selections, group.id);
        const hasAvailableOptions = activeOptionsByGroup.get(group.id)?.size !== 0;
        return hasAvailableOptions
            ? count >= group.minSelections && count <= group.maxSelections
            : group.minSelections === 0 && count === 0;
    });
};
