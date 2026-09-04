import type { PosCartConfiguration } from "./pos-cart-boundary";

export type PosCartReviewAddOn = {
    addOnId: string;
    name: string;
    quantity: number;
};

export type PosCartReviewComboSelection = {
    groupId: string;
    groupName: string;
    optionProductId: string;
    optionName: string;
    quantity: number;
    addOns: PosCartReviewAddOn[];
};

export type PosCartConfigurationLookup = {
    addOnNames: ReadonlyMap<string, string>;
    comboGroups: readonly {
        id: string;
        name: string;
        options: readonly { optionProductId: string; name: string }[];
    }[];
};

export const resolvePosCartConfiguration = (
    configuration: PosCartConfiguration | undefined,
    lookup: PosCartConfigurationLookup,
) => {
    const comboGroups = new Map(lookup.comboGroups.map((group) => [group.id, group]));

    return {
        addOns: (configuration?.addOns ?? [])
            .filter((addOn) => addOn.quantity > 0)
            .map((addOn) => ({
                ...addOn,
                name: lookup.addOnNames.get(addOn.addOnId) ?? addOn.addOnId,
            })),
        comboSelections: (configuration?.comboSelections ?? [])
            .filter((selection) => selection.quantity > 0)
            .map((selection) => {
                const group = comboGroups.get(selection.groupId);
                const option = group?.options.find((candidate) => candidate.optionProductId === selection.optionProductId);
                return {
                    ...selection,
                    groupName: group?.name ?? selection.groupId,
                    optionName: option?.name ?? selection.optionProductId,
                    addOns: selection.addOns
                        .filter((addOn) => addOn.quantity > 0)
                        .map((addOn) => ({
                            ...addOn,
                            name: lookup.addOnNames.get(addOn.addOnId) ?? addOn.addOnId,
                        })),
                };
            }),
    } satisfies {
        addOns: PosCartReviewAddOn[];
        comboSelections: PosCartReviewComboSelection[];
    };
};
