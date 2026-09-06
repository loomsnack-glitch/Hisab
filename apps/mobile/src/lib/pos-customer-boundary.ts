import { normalizePhoneNumber, type CreateCustomerJSON, type CustomerListQuery, type CustomersListResponse, type ServiceResponse } from "@repo/types";
import { createPosCustomer, updatePosCustomer } from "@repo/services";
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
    directory: (scope: PosCustomerScope | null, query: unknown) =>
        [...posCustomerKeys.all, "directory", scope?.organizationId ?? null, scope?.storeId ?? null, scope?.deviceId ?? null, query] as const,
};

export const buildPosCustomerDirectoryQuery = (
    filters: Pick<CustomerListQuery, "search" | "status" | "sort">,
): CustomerListQuery => ({
    search: filters.search?.trim() || undefined,
    status: filters.status,
    sort: filters.sort,
    limit: 20,
});

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

export const normalizePosCustomerUpdatePayload = (name: string, phone: string) => {
    const result = normalizePosCustomerCreatePayload(name, phone);
    return result.kind === "valid" ? { kind: "valid" as const, payload: { ...result.payload, phone: result.payload.phone ?? null } } : result;
};

export const createPosCustomerResponse = async (payload: CreateCustomerJSON) =>
    unwrapCatalogResponse(await createPosCustomer(payload), "Unable to create POS Customer");

export const updatePosCustomerResponse = async (customerId: string, payload: Parameters<typeof updatePosCustomer>[1]) =>
    unwrapCatalogResponse(await updatePosCustomer(customerId, payload), "Unable to update POS Customer");
