import type { ProductResponseDTO } from "@repo/types";

export type PosCartAddOnSelection = {
    addOnId: string;
    quantity: number;
};

export type PosCartComboSelection = {
    groupId: string;
    optionProductId: string;
    quantity: number;
    addOns: PosCartAddOnSelection[];
};

export type PosCartConfiguration = {
    addOns: PosCartAddOnSelection[];
    comboSelections: PosCartComboSelection[];
};

export type PosCartItem = Pick<
    ProductResponseDTO,
    "id" | "categoryId" | "name" | "price" | "discount" | "productType"
> & {
    quantity: number;
    lineId: string;
    configuration?: PosCartConfiguration;
};

export const posCartConfigurationSignature = (configuration?: PosCartConfiguration) =>
    JSON.stringify({
        addOns: [...(configuration?.addOns ?? [])]
            .filter((addOn) => addOn.quantity > 0)
            .sort((left, right) => left.addOnId.localeCompare(right.addOnId)),
        comboSelections: [...(configuration?.comboSelections ?? [])]
            .filter((selection) => selection.quantity > 0)
            .sort((left, right) => `${left.groupId}:${left.optionProductId}`.localeCompare(`${right.groupId}:${right.optionProductId}`))
            .map((selection) => ({
                ...selection,
                addOns: [...selection.addOns]
                    .filter((addOn) => addOn.quantity > 0)
                    .sort((left, right) => left.addOnId.localeCompare(right.addOnId)),
            })),
    });

export const addProductToCart = (
    items: readonly PosCartItem[],
    product: Pick<
        ProductResponseDTO,
        "id" | "categoryId" | "name" | "price" | "discount" | "productType"
    >,
): PosCartItem[] => {
    const existing = items.find((item) => item.id === product.id);
    if (existing) {
        return items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
    }

    return [...items, { ...product, quantity: 1, lineId: product.id }];
};

export const addConfiguredProductToCart = (
    items: readonly PosCartItem[],
    product: Pick<
        ProductResponseDTO,
        "id" | "categoryId" | "name" | "price" | "discount" | "productType"
    >,
    configuration: PosCartConfiguration,
): PosCartItem[] => {
    const signature = posCartConfigurationSignature(configuration);
    const existing = items.find(
        (item) => item.id === product.id && posCartConfigurationSignature(item.configuration) === signature,
    );
    if (existing) {
        return items.map((item) =>
            item.lineId === existing.lineId ? { ...item, quantity: item.quantity + 1 } : item,
        );
    }

    return [
        ...items,
        {
            ...product,
            quantity: 1,
            lineId: `${product.id}:${signature}`,
            configuration,
        },
    ];
};

export const getCartItemCount = (items: readonly PosCartItem[]) =>
    items.reduce((total, item) => total + item.quantity, 0);
