import type { CustomerDTO, ProductResponseDTO } from "@repo/types";

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

export type PosCartItem = Pick<
    ProductResponseDTO,
    "id" | "categoryId" | "name" | "price" | "discount" | "productType"
> & {
    quantity: number;
    lineId: string;
    configuration?: PosCartConfiguration;
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
    product: Pick<
        ProductResponseDTO,
        "id" | "categoryId" | "name" | "price" | "discount" | "productType"
    >,
): PosCartItem[] => {
    const existing = items.find((item) => item.id === product.id && !item.configuration);
    if (existing) {
        return items.map((item) =>
            item.lineId === existing.lineId ? { ...item, quantity: item.quantity + 1 } : item,
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
    const unitPrice = finiteDisplayMoney(Number(item.price));
    const unitDiscount = Math.min(unitPrice, finiteDisplayMoney(Number(item.discount)));
    const quantity = Math.max(0, item.quantity);
    const directAddOnSubtotal = (item.configuration?.addOns ?? []).reduce(
        (total, addOn) => total + finiteDisplayMoney(Number(addOn.unitPrice)) * Math.max(0, addOn.quantity) * quantity,
        0,
    );
    const directAddOnDiscount = (item.configuration?.addOns ?? []).reduce(
        (total, addOn) => total + finiteDisplayMoney(Number(addOn.unitDiscount)) * Math.max(0, addOn.quantity) * quantity,
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
            (selectionTotal, addOn) => selectionTotal + finiteDisplayMoney(Number(addOn.unitDiscount)) * Math.max(0, addOn.quantity) * Math.max(0, selection.quantity) * quantity,
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
