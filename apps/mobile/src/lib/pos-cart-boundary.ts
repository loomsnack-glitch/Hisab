import {
    catalogDefaultSellingPortion,
    catalogSoldPortionForAmount,
    formatSoldAmount,
    isPositiveDefaultSellingQuantity,
    isSameSoldAmount,
    type CustomerDTO,
    type ProductResponseDTO,
} from "@repo/types";

export type PosCartCustomer = Pick<CustomerDTO, "id" | "name" | "phone">;

export type PosCartDiscountMode = "amount" | "percent";

export type PosCartDiscount = {
    mode: PosCartDiscountMode;
    value: number;
};

export const normalizePosCartCustomer = (
    customer: Pick<CustomerDTO, "id" | "name" | "phone">,
): PosCartCustomer => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone ?? null,
});

const roundDisplayMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const finiteDisplayMoney = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

export const isPosCartDiscountValid = (discount: PosCartDiscount, baseTotal: number) => {
    if (!Number.isFinite(discount.value) || discount.value < 0 || !Number.isFinite(baseTotal) || baseTotal < 0) {
        return false;
    }

    return discount.mode === "amount"
        ? discount.value <= baseTotal
        : discount.value <= 100;
};

export const getPosCartOrderDiscountAmount = (
    discount: PosCartDiscount | null | undefined,
    baseTotal: number,
) => {
    const total = finiteDisplayMoney(baseTotal);
    if (!discount || !isPosCartDiscountValid(discount, total)) {
        return 0;
    }

    return discount.mode === "amount"
        ? roundDisplayMoney(Math.min(discount.value, total))
        : roundDisplayMoney(total * discount.value / 100);
};

export type PosCartAddOnSelection = {
    addOnId: string;
    quantity: number;
    unitPrice?: number;
    unitDiscount?: number;
};

export type PosCartComboSelection = {
    groupId: string;
    optionProductId: string;
    quantity: number;
    priceAdjustment?: number;
    addOns: PosCartAddOnSelection[];
};

export type PosCartConfiguration = {
    addOns: PosCartAddOnSelection[];
    comboSelections: PosCartComboSelection[];
};

export type PosCartProduct = Pick<
    ProductResponseDTO,
    "id" | "categoryId" | "name" | "price" | "discount" | "productType"
> & Partial<Pick<
    ProductResponseDTO,
    "unitId" | "defaultSellingQuantity" | "allowCustomSellingQuantity" | "unitLabel"
>>;

export type PosCartItem = Pick<
    ProductResponseDTO,
    "id" | "categoryId" | "name" | "price" | "discount" | "productType"
> & {
    quantity: number;
    lineId: string;
    unitId?: string;
    defaultSellingQuantity?: number;
    allowCustomSellingQuantity?: boolean;
    unitLabel?: string;
    soldQuantity?: number;
    configuration?: PosCartConfiguration;
};

const getSellingPortion = (product: Pick<PosCartProduct, "name" | "price" | "discount" | "defaultSellingQuantity" | "unitLabel">, soldQuantity?: number) => {
    const defaultPortion = catalogDefaultSellingPortion(product);
    const amount = soldQuantity ?? defaultPortion.soldQuantity;
    return catalogSoldPortionForAmount(product, amount);
};

const getDefaultSellingQuantity = (product: Pick<PosCartProduct, "defaultSellingQuantity">) => {
    const amount = Number(product.defaultSellingQuantity);
    return isPositiveDefaultSellingQuantity(amount) ? amount : 1;
};

const getSoldQuantity = (item: Pick<PosCartItem, "soldQuantity" | "defaultSellingQuantity">) => {
    const amount = Number(item.soldQuantity);
    return isPositiveDefaultSellingQuantity(amount)
        ? amount
        : getDefaultSellingQuantity(item);
};

export const posCartConfigurationSignature = (configuration?: PosCartConfiguration) => {
    if (!configuration) {
        return "unconfigured";
    }

    return JSON.stringify({
        addOns: [...(configuration?.addOns ?? [])]
            .filter((addOn) => addOn.quantity > 0)
            .sort((left, right) => left.addOnId.localeCompare(right.addOnId))
            .map(({ addOnId, quantity }) => ({ addOnId, quantity })),
        comboSelections: [...(configuration?.comboSelections ?? [])]
            .filter((selection) => selection.quantity > 0)
            .sort((left, right) => `${left.groupId}:${left.optionProductId}`.localeCompare(`${right.groupId}:${right.optionProductId}`))
            .map((selection) => ({
                groupId: selection.groupId,
                optionProductId: selection.optionProductId,
                quantity: selection.quantity,
                addOns: [...selection.addOns]
                    .filter((addOn) => addOn.quantity > 0)
                    .sort((left, right) => left.addOnId.localeCompare(right.addOnId))
                    .map(({ addOnId, quantity }) => ({ addOnId, quantity })),
            })),
    });
};

export const addProductToCart = (
    items: readonly PosCartItem[],
    product: PosCartProduct,
): PosCartItem[] => {
    const defaultSellingQuantity = getDefaultSellingQuantity(product);
    const existing = items.find((item) =>
        item.id === product.id &&
        !item.configuration &&
        getSoldQuantity(item) === defaultSellingQuantity,
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
            lineId: product.id,
            soldQuantity: defaultSellingQuantity,
        },
    ];
};

export const addConfiguredProductToCart = (
    items: readonly PosCartItem[],
    product: PosCartProduct,
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
            soldQuantity: getDefaultSellingQuantity(product),
            configuration,
        },
    ];
};

export const setCartItemSoldQuantity = (
    items: readonly PosCartItem[],
    lineId: string,
    soldQuantity: number,
) => {
    if (!isPositiveDefaultSellingQuantity(soldQuantity)) {
        return [...items];
    }

    const target = items.find((item) => item.lineId === lineId);
    if (
        !target ||
        target.productType !== "single" ||
        target.allowCustomSellingQuantity !== true
    ) {
        return [...items];
    }

    const defaultSellingQuantity = getDefaultSellingQuantity(target);
    const nextLineId = isSameSoldAmount(soldQuantity, defaultSellingQuantity) && !target.configuration
        ? target.id
        : `${target.id}:${formatSoldAmount(soldQuantity)}:${posCartConfigurationSignature(target.configuration)}`;
    const duplicate = items.find((item) =>
        item.lineId !== lineId &&
        item.id === target.id &&
        posCartConfigurationSignature(item.configuration) === posCartConfigurationSignature(target.configuration) &&
        getSoldQuantity(item) === soldQuantity,
    );

    if (duplicate) {
        return items
            .filter((item) => item.lineId !== lineId)
            .map((item) => item.lineId === duplicate.lineId
                ? { ...item, quantity: item.quantity + target.quantity }
                : item);
    }

    return items.map((item) => item.lineId === lineId
        ? { ...item, soldQuantity, lineId: nextLineId }
        : item);
};

export const removeCartItem = (items: readonly PosCartItem[], lineId: string) =>
    items.filter((item) => item.lineId !== lineId);

export const setCartItemQuantity = (
    items: readonly PosCartItem[],
    lineId: string,
    quantity: number,
) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
        return quantity <= 0 && Number.isFinite(quantity) ? removeCartItem(items, lineId) : [...items];
    }

    return items.map((item) => item.lineId === lineId ? { ...item, quantity } : item);
};

export const changeCartItemQuantity = (
    items: readonly PosCartItem[],
    lineId: string,
    delta: number,
) => {
    if (!Number.isInteger(delta)) {
        return [...items];
    }

    const item = items.find((candidate) => candidate.lineId === lineId);
    return item ? setCartItemQuantity(items, lineId, item.quantity + delta) : [...items];
};

export const getCartLineDisplayTotals = (item: PosCartItem) => {
    const portion = getSellingPortion(item, getSoldQuantity(item));
    const unitPrice = finiteDisplayMoney(Number(portion.unitPrice));
    const unitDiscount = Math.min(unitPrice, finiteDisplayMoney(Number(portion.unitDiscount)));
    const quantity = Math.max(0, item.quantity);
    const directAddOnSubtotal = (item.configuration?.addOns ?? []).reduce(
        (total, addOn) => total + finiteDisplayMoney(Number(addOn.unitPrice)) * Math.max(0, addOn.quantity) * quantity,
        0,
    );
    const directAddOnDiscount = (item.configuration?.addOns ?? []).reduce(
        (total, addOn) => {
            const unitPrice = finiteDisplayMoney(Number(addOn.unitPrice));
            const unitDiscount = Math.min(unitPrice, finiteDisplayMoney(Number(addOn.unitDiscount)));
            return total + unitDiscount * Math.max(0, addOn.quantity) * quantity;
        },
        0,
    );
    const comboAdjustmentTotal = (item.configuration?.comboSelections ?? []).reduce((total, selection) => {
        const adjustment = Number(selection.priceAdjustment);
        return Number.isFinite(adjustment)
            ? total + adjustment * Math.max(0, selection.quantity) * quantity
            : total;
    }, 0);
    const comboAddOnSubtotal = (item.configuration?.comboSelections ?? []).reduce(
        (total, selection) => total + selection.addOns.reduce(
            (selectionTotal, addOn) => selectionTotal + finiteDisplayMoney(Number(addOn.unitPrice)) * Math.max(0, addOn.quantity) * Math.max(0, selection.quantity) * quantity,
            0,
        ),
        0,
    );
    const comboAddOnDiscount = (item.configuration?.comboSelections ?? []).reduce(
        (total, selection) => total + selection.addOns.reduce(
            (selectionTotal, addOn) => {
                const unitPrice = finiteDisplayMoney(Number(addOn.unitPrice));
                const unitDiscount = Math.min(unitPrice, finiteDisplayMoney(Number(addOn.unitDiscount)));
                return selectionTotal + unitDiscount * Math.max(0, addOn.quantity) * Math.max(0, selection.quantity) * quantity;
            },
            0,
        ),
        0,
    );
    const subtotal = unitPrice * quantity + directAddOnSubtotal + comboAdjustmentTotal + comboAddOnSubtotal;
    const discount = unitDiscount * quantity + directAddOnDiscount + comboAddOnDiscount;

    return {
        subtotal: roundDisplayMoney(subtotal),
        discount: roundDisplayMoney(discount),
        total: roundDisplayMoney(Math.max(subtotal - discount, 0)),
    };
};

export const getCartLineSellingQuantityLabel = (item: PosCartItem) =>
    `${formatSoldAmount(getSoldQuantity(item))}${item.unitLabel || "pc"}`;

export const getCartLineProductPrice = (item: PosCartItem) =>
    getSellingPortion(item, getSoldQuantity(item)).unitPrice;

export const getCartDisplayTotals = (items: readonly PosCartItem[], orderDiscount?: PosCartDiscount | null) => {
    const lineTotals = items.reduce(
        (totals, item) => {
            const lineTotals = getCartLineDisplayTotals(item);
            return {
                subtotal: roundDisplayMoney(totals.subtotal + lineTotals.subtotal),
                discount: roundDisplayMoney(totals.discount + lineTotals.discount),
                total: roundDisplayMoney(totals.total + lineTotals.total),
            };
        },
        { subtotal: 0, discount: 0, total: 0 },
    );
    const baseTotal = roundDisplayMoney(Math.max(0, lineTotals.subtotal - lineTotals.discount));
    const orderDiscountAmount = getPosCartOrderDiscountAmount(orderDiscount, baseTotal);

    return {
        ...lineTotals,
        orderDiscount: orderDiscountAmount,
        total: roundDisplayMoney(Math.max(0, baseTotal - orderDiscountAmount)),
    };
};

export const getCartItemCount = (items: readonly PosCartItem[]) =>
    items.reduce((total, item) => total + item.quantity, 0);
