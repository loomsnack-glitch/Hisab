import { pg } from "@/config/db";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import {
    STATUS_CODES,
    type CreatePurchaseJSON,
    type DeviceSessionDTO,
    type PurchaseActor,
    type PurchaseListQuery,
    type PurchaseResponse,
    type PurchaseSummaryResponse,
    type PurchasesListResponse,
    type ServiceResponse,
    type UpdatePurchaseJSON,
    type VoidPurchaseJSON,
} from "@repo/types";
import * as purchaseRepository from "./purchase.repository";

const normalizeText = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const round = (value: number, decimals: number) => {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
};

const preparePurchase = (data: CreatePurchaseJSON) => {
    const items = data.items.map((item) => {
        const quantity = round(Number(item.quantity), 3);
        const rate = round(Number(item.rate), 2);
        return {
            itemName: item.itemName.trim(),
            description: normalizeText(item.description),
            quantity,
            rate,
            lineTotal: round(quantity * rate, 2),
        };
    });

    return {
        purchaseDate: data.purchaseDate,
        supplierName: data.supplierName.trim(),
        invoiceNumber: normalizeText(data.invoiceNumber),
        notes: normalizeText(data.notes),
        items,
        totalAmount: round(items.reduce((total, item) => total + item.lineTotal, 0), 2),
    };
};

const getScopeError = async (userId: string, organizationId: string, storeId: string) => {
    const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error" as const,
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const store = await organizationRepository.getStoreById(organizationId, storeId);
    if (!store) {
        return {
            status: "error" as const,
            message: "Store not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return null;
};

const getPurchaseResponse = async (
    organizationId: string,
    storeId: string,
    purchaseId: string,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    const purchase = await purchaseRepository.getPurchaseDetails(organizationId, storeId, purchaseId);
    if (!purchase) {
        return { status: "error", message: "Purchase not found", data: null, code: STATUS_CODES.NOT_FOUND };
    }

    return {
        status: "success",
        message: "Purchase fetched successfully",
        data: { purchase },
        code: STATUS_CODES.SUCCESS,
    };
};

const createPurchaseInStore = async (
    organizationId: string,
    storeId: string,
    data: CreatePurchaseJSON,
    actor: PurchaseActor,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    const prepared = preparePurchase(data);
    const purchaseId = crypto.randomUUID();
    let created = false;

    try {
        await pg.begin(async (tx) => {
            const purchase = await purchaseRepository.createPurchase({
                id: purchaseId,
                organizationId,
                storeId,
                purchaseDate: prepared.purchaseDate,
                supplierName: prepared.supplierName,
                invoiceNumber: prepared.invoiceNumber,
                notes: prepared.notes,
                totalAmount: prepared.totalAmount,
                status: "recorded",
                createdByUserId: actor.userId,
                createdByDeviceId: actor.deviceId,
            }, tx);
            if (!purchase) throw new Error("Failed to create purchase");

            for (const item of prepared.items) {
                const createdItem = await purchaseRepository.createPurchaseItem({
                    id: crypto.randomUUID(),
                    purchaseId,
                    ...item,
                }, tx);
                if (!createdItem) throw new Error("Failed to create purchase item");
            }
            created = true;
        });
    } catch {
        return { status: "error", message: "Failed to create purchase", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
    }

    if (!created) {
        return { status: "error", message: "Failed to create purchase", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
    }

    return getPurchaseResponse(organizationId, storeId, purchaseId);
};

const updatePurchaseInStore = async (
    organizationId: string,
    storeId: string,
    purchaseId: string,
    data: UpdatePurchaseJSON,
    actor: PurchaseActor,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    const prepared = preparePurchase(data);
    try {
        await pg.begin(async (tx) => {
            const purchase = await purchaseRepository.updatePurchase({
                id: purchaseId,
                organizationId,
                storeId,
                purchaseDate: prepared.purchaseDate,
                supplierName: prepared.supplierName,
                invoiceNumber: prepared.invoiceNumber,
                notes: prepared.notes,
                totalAmount: prepared.totalAmount,
                updatedByUserId: actor.userId,
                updatedByDeviceId: actor.deviceId,
            }, tx);
            if (!purchase) throw new Error("Purchase not found or already voided");

            await purchaseRepository.deletePurchaseItems(purchaseId, tx);
            for (const item of prepared.items) {
                await purchaseRepository.createPurchaseItem({ id: crypto.randomUUID(), purchaseId, ...item }, tx);
            }
        });
    } catch (error) {
        const message = error instanceof Error && error.message.includes("not found")
            ? "Purchase not found or already voided"
            : "Failed to update purchase";
        return { status: "error", message, data: null, code: message.startsWith("Purchase not") ? STATUS_CODES.NOT_FOUND : STATUS_CODES.INTERNAL_SERVER_ERROR };
    }

    return getPurchaseResponse(organizationId, storeId, purchaseId);
};

export const getPurchases = async (
    userId: string,
    organizationId: string,
    storeId: string,
    query: PurchaseListQuery,
): Promise<ServiceResponse<PurchasesListResponse | null>> => {
    const scopeError = await getScopeError(userId, organizationId, storeId);
    if (scopeError) return scopeError;
    return { status: "success", message: "Purchases fetched successfully", data: { purchases: await purchaseRepository.getPurchasesByStore(organizationId, storeId, query) }, code: STATUS_CODES.SUCCESS };
};

export const getPurchase = async (userId: string, organizationId: string, storeId: string, purchaseId: string) => {
    const scopeError = await getScopeError(userId, organizationId, storeId);
    if (scopeError) return scopeError;
    return getPurchaseResponse(organizationId, storeId, purchaseId);
};

export const createPurchase = async (userId: string, organizationId: string, storeId: string, data: CreatePurchaseJSON) => {
    const scopeError = await getScopeError(userId, organizationId, storeId);
    if (scopeError) return scopeError;
    return createPurchaseInStore(organizationId, storeId, data, { userId });
};

export const updatePurchase = async (userId: string, organizationId: string, storeId: string, purchaseId: string, data: UpdatePurchaseJSON) => {
    const scopeError = await getScopeError(userId, organizationId, storeId);
    if (scopeError) return scopeError;
    return updatePurchaseInStore(organizationId, storeId, purchaseId, data, { userId });
};

export const voidPurchase = async (userId: string, organizationId: string, storeId: string, purchaseId: string, data: VoidPurchaseJSON) => {
    const scopeError = await getScopeError(userId, organizationId, storeId);
    if (scopeError) return scopeError;
    const purchase = await purchaseRepository.voidPurchase(organizationId, storeId, purchaseId, data.reason.trim(), { userId });
    if (!purchase) return { status: "error" as const, message: "Purchase not found or already voided", data: null, code: STATUS_CODES.NOT_FOUND };
    return getPurchaseResponse(organizationId, storeId, purchaseId);
};

export const getSummary = async (userId: string, organizationId: string, storeId: string): Promise<ServiceResponse<PurchaseSummaryResponse | null>> => {
    const scopeError = await getScopeError(userId, organizationId, storeId);
    if (scopeError) return scopeError;
    return { status: "success", message: "Purchase summary fetched successfully", data: { summary: await purchaseRepository.getPurchaseSummary(organizationId, storeId) }, code: STATUS_CODES.SUCCESS };
};

const getDeviceScope = (session: DeviceSessionDTO) => ({ organizationId: session.organization.id, storeId: session.store.id });

export const getPurchasesForDevice = async (session: DeviceSessionDTO, query: PurchaseListQuery) => {
    const scope = getDeviceScope(session);
    return { status: "success" as const, message: "Purchases fetched successfully", data: { purchases: await purchaseRepository.getPurchasesByStore(scope.organizationId, scope.storeId, query) }, code: STATUS_CODES.SUCCESS };
};

export const getPurchaseForDevice = async (session: DeviceSessionDTO, purchaseId: string) => {
    const scope = getDeviceScope(session);
    return getPurchaseResponse(scope.organizationId, scope.storeId, purchaseId);
};

export const createPurchaseForDevice = async (session: DeviceSessionDTO, data: CreatePurchaseJSON) => {
    const scope = getDeviceScope(session);
    return createPurchaseInStore(scope.organizationId, scope.storeId, data, { deviceId: session.device.id });
};

export const updatePurchaseForDevice = async (session: DeviceSessionDTO, purchaseId: string, data: UpdatePurchaseJSON) => {
    const scope = getDeviceScope(session);
    return updatePurchaseInStore(scope.organizationId, scope.storeId, purchaseId, data, { deviceId: session.device.id });
};

export const voidPurchaseForDevice = async (session: DeviceSessionDTO, purchaseId: string, data: VoidPurchaseJSON) => {
    const scope = getDeviceScope(session);
    const purchase = await purchaseRepository.voidPurchase(scope.organizationId, scope.storeId, purchaseId, data.reason.trim(), { deviceId: session.device.id });
    if (!purchase) return { status: "error" as const, message: "Purchase not found or already voided", data: null, code: STATUS_CODES.NOT_FOUND };
    return getPurchaseResponse(scope.organizationId, scope.storeId, purchaseId);
};

export const getSummaryForDevice = async (session: DeviceSessionDTO) => {
    const scope = getDeviceScope(session);
    return { status: "success" as const, message: "Purchase summary fetched successfully", data: { summary: await purchaseRepository.getPurchaseSummary(scope.organizationId, scope.storeId) }, code: STATUS_CODES.SUCCESS };
};
