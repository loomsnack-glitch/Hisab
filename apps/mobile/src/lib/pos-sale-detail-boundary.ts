import type { SaleDetailDTO, SaleResponse, ServiceResponse } from "@repo/types";

export const posSaleKeys = {
    all: ["pos", "sale"] as const,
    detail: (scope: { organizationId: string; storeId: string; deviceId: string } | null, saleId: string) => [
        ...posSaleKeys.all,
        scope?.organizationId ?? null,
        scope?.storeId ?? null,
        scope?.deviceId ?? null,
        saleId,
    ] as const,
};

export const unwrapPosSaleResponse = (response: ServiceResponse<SaleResponse | null>): SaleDetailDTO => {
    if (response.status !== "success" || !response.data) {
        throw new Error(response.message || "Unable to load POS Sale");
    }
    return response.data.sale;
};
