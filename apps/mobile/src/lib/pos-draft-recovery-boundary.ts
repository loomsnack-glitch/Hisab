import type { ComboProductsListResponse, ProductAddOnAttachmentsListResponse, ProductResponseDTO, SaleDetailDTO } from "@repo/types";
import type { PosCartCustomer, PosCartDiscount, PosCartItem } from "./pos-cart-boundary";

export type PosDraftRecoveryResult =
    | { kind: "success"; items: PosCartItem[]; customer: PosCartCustomer | null; discount: PosCartDiscount | null }
    | { kind: "invalid"; reason: "missing-product" | "missing-combo-group" | "missing-configuration"; productId?: string };

type PosDraftRecoveryConfiguration = {
    combos: ComboProductsListResponse["combos"];
    attachments: ProductAddOnAttachmentsListResponse["attachments"];
};

export const buildPosCartFromDraft = (
    sale: SaleDetailDTO,
    products: readonly ProductResponseDTO[],
    configuration: PosDraftRecoveryConfiguration,
): PosDraftRecoveryResult => {
    const items: PosCartItem[] = [];

    for (const saleItem of sale.items) {
        const product = products.find((candidate) => candidate.id === saleItem.productId);
        if (!product) {
            return { kind: "invalid", reason: "missing-product", productId: saleItem.productId };
        }

        const hasActiveAddOn = (productId: string, addOnId: string) => configuration.attachments.some(
            (attachment) => attachment.productId === productId && attachment.addOnId === addOnId && attachment.status === "active" && attachment.addOn.status === "active",
        );
        if (saleItem.addOns.some((addOn) => !hasActiveAddOn(product.id, addOn.addOnId))) {
            return { kind: "invalid", reason: "missing-configuration", productId: product.id };
        }

        const combo = configuration.combos.find((candidate) => candidate.product.id === product.id);
        const comboSelections = product.productType === "combo" ? saleItem.bundleComponents.map((component) => {
            if (!component.choiceGroupId) {
                return null;
            }

            const group = combo?.choiceGroups.find((candidate) => candidate.id === component.choiceGroupId);
            const option = group?.options.find((candidate) => candidate.optionProductId === component.componentProductId && candidate.product.status === "active");
            const componentProduct = products.find((candidate) => candidate.id === component.componentProductId);
            if (!componentProduct || !option || component.addOns.some((addOn) => !hasActiveAddOn(component.componentProductId, addOn.addOnId))) {
                return null;
            }

            return {
                groupId: component.choiceGroupId,
                optionProductId: component.componentProductId,
                quantity: component.quantityPerBundle,
                priceAdjustment: component.priceAdjustmentSnapshot,
                addOns: component.addOns.map((addOn) => ({
                    addOnId: addOn.addOnId,
                    quantity: addOn.quantityPerComponent,
                    unitPrice: addOn.unitPriceSnapshot,
                    unitDiscount: addOn.unitDiscountSnapshot,
                })),
            };
        }) : [];
        if (comboSelections.some((selection) => selection === null)) {
            return { kind: "invalid", reason: product.productType === "combo" ? "missing-combo-group" : "missing-configuration" };
        }

        const addOns = saleItem.addOns.map((addOn) => ({
            addOnId: addOn.addOnId,
            quantity: addOn.quantityPerParent,
            unitPrice: addOn.unitPriceSnapshot,
            unitDiscount: addOn.unitDiscountSnapshot,
        }));
        const cartConfiguration = addOns.length > 0 || comboSelections.length > 0
            ? { addOns, comboSelections: comboSelections as Exclude<(typeof comboSelections)[number], null>[] }
            : undefined;

        items.push({
            id: product.id,
            categoryId: product.categoryId,
            name: product.name,
            price: product.price,
            discount: product.discount,
            productType: product.productType,
            quantity: saleItem.quantity,
            unitId: product.unitId,
            defaultSellingQuantity: Number(product.defaultSellingQuantity) > 0 ? Number(product.defaultSellingQuantity) : 1,
            allowCustomSellingQuantity: product.allowCustomSellingQuantity === true,
            unitLabel: product.unitLabel || "pc",
            soldQuantity: Number(saleItem.soldQuantity) > 0
                ? Number(saleItem.soldQuantity)
                : Number(product.defaultSellingQuantity) > 0
                  ? Number(product.defaultSellingQuantity)
                  : 1,
            lineId: saleItem.id,
            configuration: cartConfiguration,
        });
    }

    return {
        kind: "success",
        items,
        customer: sale.customer
            ? { id: sale.customer.id, name: sale.customer.name, phone: sale.customer.phone ?? null }
            : sale.customerId && sale.customerNameSnapshot
              ? { id: sale.customerId, name: sale.customerNameSnapshot, phone: sale.customerPhoneSnapshot ?? null }
              : null,
        discount: sale.orderDiscountAmount > 0 ? { mode: "amount", value: sale.orderDiscountAmount } : null,
    };
};
