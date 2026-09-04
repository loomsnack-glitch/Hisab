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

export const posCartConfigurationSignature = (configuration?: PosCartConfiguration) => {
    if (!configuration) {
        return "unconfigured";
    }

    return JSON.stringify({
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

    return {
        subtotal: roundDisplayMoney(unitPrice * quantity),
        discount: roundDisplayMoney(unitDiscount * quantity),
        total: roundDisplayMoney((unitPrice - unitDiscount) * quantity),
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
