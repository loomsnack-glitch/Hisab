import {
    createPosDraftSale,
    deletePosDraftSale,
    getPosSale,
    updatePosDraftSale,
} from "@repo/services";
import type {
    CreateDraftSaleJSON,
    SaleResponse,
    ServiceResponse,
    UpdateDraftSaleJSON,
} from "@repo/types";
import {
    getPosCartOrderDiscountAmount,
    getCartDisplayTotals,
    type PosCartCustomer,
    type PosCartDiscount,
    type PosCartItem,
} from "./pos-cart-boundary";
import { unwrapCatalogResponse } from "./pos-catalog-boundary";

export type PosDraftCartInput = {
    items: readonly PosCartItem[];
    customer: PosCartCustomer | null;
    discount: PosCartDiscount | null;
    draftSaleId: string | null;
    draftRequestId?: string;
};

export const mapPosCartItemsToSaleInputs = (items: readonly PosCartItem[]): CreateDraftSaleJSON["items"] =>
    items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        addOns: item.configuration?.addOns ?? [],
        comboSelections: item.configuration?.comboSelections?.map((selection) => ({
            groupId: selection.groupId,
            optionProductId: selection.optionProductId,
            quantity: selection.quantity,
            addOns: selection.addOns,
        })),
    }));

export const buildPosDraftPayload = ({
    items,
    customer,
    discount,
    draftRequestId,
}: Omit<PosDraftCartInput, "draftSaleId">): CreateDraftSaleJSON => {
    const saleItems = mapPosCartItemsToSaleInputs(items);
    const displayTotals = getCartDisplayTotals(items, discount);
    const orderDiscountAmount = getPosCartOrderDiscountAmount(
        discount,
        Math.max(0, displayTotals.subtotal - displayTotals.discount),
    );

    return {
        draftRequestId,
        customerId: customer?.id ?? null,
        orderDiscountAmount,
        notes: null,
        serviceMode: "dine_in",
        generateKot: false,
        items: saleItems,
    };
};

export const buildPosDraftUpdatePayload = (input: Omit<PosDraftCartInput, "draftSaleId" | "draftRequestId">): UpdateDraftSaleJSON => {
    const payload = buildPosDraftPayload({ ...input, draftRequestId: undefined });
    const { draftRequestId: _draftRequestId, ...updatePayload } = payload;
    return updatePayload;
};

export const createPosDraftSaleResponse = async (payload: CreateDraftSaleJSON) =>
    unwrapCatalogResponse(await createPosDraftSale(payload), "Unable to save POS Draft");

export const updatePosDraftSaleResponse = async (saleId: string, payload: UpdateDraftSaleJSON) =>
    unwrapCatalogResponse(await updatePosDraftSale(saleId, payload), "Unable to update POS Draft");

export const getPosDraftSaleResponse = async (saleId: string) =>
    unwrapCatalogResponse(await getPosSale(saleId), "Unable to load POS Draft");

export const deletePosDraftSaleResponse = async (saleId: string): Promise<ServiceResponse<null>> => {
    const response = await deletePosDraftSale(saleId);
    if (response.status !== "success") {
        throw new Error(response.message || "Unable to delete POS Draft");
    }
    return response;
};

export type PosDraftSale = SaleResponse["sale"];
