import { normalizePhoneNumber, type CreateCustomerJSON, type CustomersListResponse, type ServiceResponse } from "@repo/types";
import { createPosCustomer } from "@repo/services";
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

export const normalizePosCustomerCreatePayload = (name: string, phone: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) {
        return { kind: "invalid" as const, field: "name" as const };
    }

    const normalizedPhone = phone.trim() ? normalizePhoneNumber(phone.trim()) : undefined;
    if (phone.trim() && !normalizedPhone) {
        return { kind: "invalid" as const, field: "phone" as const };
    }

    return {
        kind: "valid" as const,
        payload: { name: normalizedName, phone: normalizedPhone } satisfies CreateCustomerJSON,
    };
};

export const createPosCustomerResponse = async (payload: CreateCustomerJSON) =>
    unwrapCatalogResponse(await createPosCustomer(payload), "Unable to create POS Customer");
