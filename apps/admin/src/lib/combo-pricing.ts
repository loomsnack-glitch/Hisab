export type ComboPricingAddOn = {
    quantity: number;
    unitPrice: number;
    unitDiscount: number;
};

export type ComboPricingSelection = {
    quantity: number;
    priceAdjustment: number;
    addOns: ComboPricingAddOn[];
};

export type ComposerPricingItem = {
    unitPrice: number;
    unitDiscount: number;
    quantity: number;
    addOns: ComboPricingAddOn[];
    comboSelections: ComboPricingSelection[];
};

export type ComposerItemPricing = {
    subtotal: number;
    lineDiscountTotal: number;
    lineTotal: number;
    comboAdjustmentTotal: number;
    comboAddOnSubtotal: number;
    comboAddOnDiscount: number;
};

const roundCurrency = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

export const getComposerItemPricing = (
    item: ComposerPricingItem,
): ComposerItemPricing => {
    const parentQuantity = Number(item.quantity);
    const parentSubtotal = Number(item.unitPrice) * parentQuantity;
    const parentDiscount = Number(item.unitDiscount) * parentQuantity;

    const directAddOnSubtotal = item.addOns.reduce(
        (total, addOn) =>
            total + Number(addOn.unitPrice) * Number(addOn.quantity) * parentQuantity,
        0,
    );
    const directAddOnDiscount = item.addOns.reduce(
        (total, addOn) =>
            total + Number(addOn.unitDiscount) * Number(addOn.quantity) * parentQuantity,
        0,
    );

    const comboAdjustmentTotal = item.comboSelections.reduce(
        (total, selection) =>
            total + Number(selection.priceAdjustment) * Number(selection.quantity) * parentQuantity,
        0,
    );
    const comboAddOnSubtotal = item.comboSelections.reduce(
        (total, selection) =>
            total +
            selection.addOns.reduce(
                (selectionTotal, addOn) =>
                    selectionTotal +
                    Number(addOn.unitPrice) *
                        Number(addOn.quantity) *
                        Number(selection.quantity) *
                        parentQuantity,
                0,
            ),
        0,
    );
    const comboAddOnDiscount = item.comboSelections.reduce(
        (total, selection) =>
            total +
            selection.addOns.reduce(
                (selectionTotal, addOn) =>
                    selectionTotal +
                    Number(addOn.unitDiscount) *
                        Number(addOn.quantity) *
                        Number(selection.quantity) *
                        parentQuantity,
                0,
            ),
        0,
    );

    const subtotal = roundCurrency(
        parentSubtotal +
            directAddOnSubtotal +
            comboAdjustmentTotal +
            comboAddOnSubtotal,
    );
    const lineDiscountTotal = roundCurrency(
        parentDiscount + directAddOnDiscount + comboAddOnDiscount,
    );

    return {
        subtotal,
        lineDiscountTotal,
        lineTotal: roundCurrency(Math.max(subtotal - lineDiscountTotal, 0)),
        comboAdjustmentTotal: roundCurrency(comboAdjustmentTotal),
        comboAddOnSubtotal: roundCurrency(comboAddOnSubtotal),
        comboAddOnDiscount: roundCurrency(comboAddOnDiscount),
    };
};
