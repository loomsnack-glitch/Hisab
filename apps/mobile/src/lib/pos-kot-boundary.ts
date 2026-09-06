import type { CreateTableKotJSON, KitchenKotsListResponse, ServiceResponse, ServiceTableSaleResponse } from "@repo/types";
import { mapPosCartItemsToSaleInputs } from "./pos-draft-boundary";
import type { PosCartCustomer, PosCartItem } from "./pos-cart-boundary";
import type { PosServiceMode } from "./pos-service-mode-boundary";

export const buildPosTableKotPayload = ({
    items,
    customer,
    serviceMode,
    requestId,
}: {
    items: readonly PosCartItem[];
    customer: PosCartCustomer | null;
    serviceMode: PosServiceMode;
    requestId: string;
}): CreateTableKotJSON => ({
    requestId,
    items: mapPosCartItemsToSaleInputs(items),
    fulfillmentType: serviceMode,
    customerId: customer?.id ?? null,
    notes: null,
});

export const unwrapPosTableKotResponse = (
    response: ServiceResponse<ServiceTableSaleResponse | null>,
): ServiceTableSaleResponse => {
    if (response.status !== "success" || !response.data) {
        throw new Error(response.message || "Unable to send POS KOT");
    }
    return response.data;
};

export const unwrapPosKitchenKotsResponse = (
    response: ServiceResponse<KitchenKotsListResponse | null>,
): KitchenKotsListResponse => {
    if (response.status !== "success" || !response.data) {
        throw new Error(response.message || "Unable to load POS Kitchen");
    }
    return response.data;
};
