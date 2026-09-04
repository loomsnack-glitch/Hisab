import type { CustomersListResponse, ServiceResponse } from "@repo/types";
import { unwrapCatalogResponse } from "./pos-catalog-boundary";

export type PosCustomerScope = {
    organizationId: string;
    storeId: string;
    deviceId: string;
};

export const posCustomerKeys = {
    all: ["pos", "customers"] as const,
    list: (scope: PosCustomerScope | null, search: string) =>
        [...posCustomerKeys.all, scope?.organizationId ?? null, scope?.storeId ?? null, scope?.deviceId ?? null, search] as const,
};

export const unwrapCustomerResponse = (
    response: ServiceResponse<CustomersListResponse | null>,
) => unwrapCatalogResponse(response, "Unable to load POS Customers");
