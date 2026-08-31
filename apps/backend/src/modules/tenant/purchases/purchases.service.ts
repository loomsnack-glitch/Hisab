import {
    STATUS_CODES,
    calculatePurchaseTotals,
    calculateVendorOutstanding,
    calendarDateInTimeZone,
    canAcceptOutgoingPayment,
    derivePurchasePayableState,
    derivePurchasePayableStateFromPayments,
    isPurchaseEffectiveDateAllowed,
    isVendorItemSelectableForDraftPurchase,
    isVendorSelectableForDraftPurchase,
    roundOutgoingPaymentMoney,
    type CreateDraftPurchaseSVC,
    type CreateOutgoingPaymentSVC,
    type CreatePurchaseLineREPO,
    type CreatePurchaseREPO,
    type PurchaseDTO,
    type PurchaseLineInputJSON,
    type PurchaseResponse,
    type PurchasesListResponse,
    type ServiceResponse,
    type StatusCode,
    type UpdateDraftPurchaseSVC,
    type UpdatePurchaseREPO,
    type VendorDTO,
} from "@repo/types";
import { pg } from "@/config/db";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as unitsRepository from "@/modules/tenant/units/units.repository";
import * as vendorsRepository from "@/modules/tenant/vendors/vendors.repository";
import {
    createOutgoingPurchasePaymentMovement,
    isOutgoingPaymentFundingError,
    resolveOutgoingPaymentFunding,
} from "@/modules/tenant/outgoing-payments/outgoing-payment-funding";
import * as outgoingPaymentsRepository from "@/modules/tenant/outgoing-payments/outgoing-payments.repository";
import * as purchasesRepository from "./purchases.repository";

const getOrganizationForUser = async (organizationId: string, userId: string) =>
    organizationRepository.getOrganizationByIdForUser(organizationId, userId);

const organizationNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Organization not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const storeNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Store not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const vendorNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Vendor not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const vendorItemNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Vendor Item not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const purchaseNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Purchase not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const inactiveVendor = (): ServiceResponse<null> => ({
    status: "error",
    message: "Only an active Vendor can be used on a Draft Purchase",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const inactiveVendorItem = (): ServiceResponse<null> => ({
    status: "error",
    message: "Only the selected Vendor's active Vendor Items can be used on a Draft Purchase",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const futureEffectiveDate = (): ServiceResponse<null> => ({
    status: "error",
    message: "Effective date cannot be in the future",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const negativeTotal = (): ServiceResponse<null> => ({
    status: "error",
    message: "Purchase total cannot be negative",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const normalizeOptionalText = (value: string | null | undefined): string | null => {
    if (value === undefined || value === null) {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
};

type LookupResult<T> = { ok: true; value: T } | { ok: false; error: ServiceResponse<null> };

const requireStore = async (
    organizationId: string,
    storeId: string,
): Promise<LookupResult<{ id: string; name: string }>> => {
    const store = await organizationRepository.getStoreById(organizationId, storeId);
    if (!store) {
        return { ok: false, error: storeNotFound() };
    }
    return { ok: true, value: store };
};

const requireActiveVendor = async (
    organizationId: string,
    vendorId: string,
): Promise<LookupResult<VendorDTO>> => {
    const vendor = await vendorsRepository.getVendorById(organizationId, vendorId);
    if (!vendor) {
        return { ok: false, error: vendorNotFound() };
    }
    if (!isVendorSelectableForDraftPurchase(vendor)) {
        return { ok: false, error: inactiveVendor() };
    }
    return { ok: true, value: vendor };
};

type ResolvedLine = CreatePurchaseLineREPO;

const resolveDraftLines = async (
    organizationId: string,
    purchaseId: string,
    vendor: VendorDTO,
    lineInputs: PurchaseLineInputJSON[],
): Promise<LookupResult<ResolvedLine[]>> => {
    const lines: ResolvedLine[] = [];

    for (const lineInput of lineInputs) {
        const vendorItem = await vendorsRepository.getVendorItemById(
            organizationId,
            lineInput.vendorItemId,
        );
        if (!vendorItem) {
            return { ok: false, error: vendorItemNotFound() };
        }

        if (
            !isVendorItemSelectableForDraftPurchase({
                vendorStatus: vendor.status,
                itemStatus: vendorItem.status,
                vendorId: vendorItem.vendorId,
                selectedVendorId: vendor.id,
            })
        ) {
            return { ok: false, error: inactiveVendorItem() };
        }

        const unit = await unitsRepository.getUnitById(organizationId, vendorItem.unitId);
        if (!unit) {
            return {
                ok: false,
                error: {
                    status: "error",
                    message: "Unit not found",
                    data: null,
                    code: STATUS_CODES.NOT_FOUND,
                },
            };
        }

        const agreedUnitPrice = lineInput.agreedUnitPrice ?? vendorItem.defaultPurchasePrice;
        const { linesTotal: lineTotal } = calculatePurchaseTotals([
            { quantity: lineInput.quantity, agreedUnitPrice },
        ]);

        lines.push({
            id: crypto.randomUUID(),
            organizationId,
            purchaseId,
            vendorItemId: vendorItem.id,
            vendorItemName: vendorItem.name,
            unitId: unit.id,
            unitLabel: unit.label,
            quantity: lineInput.quantity,
            agreedUnitPrice,
            lineTotal,
        });
    }

    return { ok: true, value: lines };
};

const toLineInputs = (purchase: PurchaseDTO): PurchaseLineInputJSON[] =>
    purchase.lines.map((line) => ({
        vendorItemId: line.vendorItemId,
        quantity: line.quantity,
        agreedUnitPrice: line.agreedUnitPrice,
    }));

const persistPurchase = async (input: {
    organizationId: string;
    purchaseId: string;
    lines: ResolvedLine[];
    saveHeader: (tx: Bun.TransactionSQL) => Promise<PurchaseDTO | null>;
}): Promise<PurchaseDTO | null> => {
    return pg.begin(async (tx) => {
        const saved = await input.saveHeader(tx);
        if (!saved) {
            throw new Error("Failed to save Purchase");
        }

        await purchasesRepository.replacePurchaseLines(
            input.organizationId,
            input.purchaseId,
            input.lines,
            tx,
        );

        return purchasesRepository.getPurchaseById(input.organizationId, input.purchaseId, tx);
    });
};

export const getPurchases = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<PurchasesListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const purchases = await purchasesRepository.getPurchasesByOrganizationId(organizationId);
    return {
        status: "success",
        data: {
            purchases,
            vendorOutstanding: calculateVendorOutstanding(purchases),
        },
        message: "Purchases fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getPurchaseDetails = async (
    userId: string,
    organizationId: string,
    purchaseId: string,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const purchase = await purchasesRepository.getPurchaseById(organizationId, purchaseId);
    if (!purchase) {
        return purchaseNotFound();
    }

    return {
        status: "success",
        data: { purchase },
        message: "Purchase fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createDraftPurchase = async (
    userId: string,
    organizationId: string,
    purchaseData: CreateDraftPurchaseSVC,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const storeResult = await requireStore(organizationId, purchaseData.storeId);
    if (!storeResult.ok) {
        return storeResult.error;
    }

    const vendorResult = await requireActiveVendor(organizationId, purchaseData.vendorId);
    if (!vendorResult.ok) {
        return vendorResult.error;
    }

    const effectiveDate = purchaseData.effectiveDate ?? calendarDateInTimeZone();
    if (!isPurchaseEffectiveDateAllowed(effectiveDate)) {
        return futureEffectiveDate();
    }

    const purchaseId = crypto.randomUUID();
    const resolved = await resolveDraftLines(
        organizationId,
        purchaseId,
        vendorResult.value,
        purchaseData.lines ?? [],
    );
    if (!resolved.ok) {
        return resolved.error;
    }

    const adjustment = purchaseData.adjustment ?? 0;
    const { linesTotal, total } = calculatePurchaseTotals(
        resolved.value.map((line) => ({
            quantity: line.quantity,
            agreedUnitPrice: line.agreedUnitPrice,
        })),
        adjustment,
    );
    if (total < 0) {
        return negativeTotal();
    }

    const payable = derivePurchasePayableState({
        lifecycle: "draft",
        total,
        paidTotal: 0,
    });

    try {
        const header: CreatePurchaseREPO = {
            id: purchaseId,
            organizationId,
            storeId: storeResult.value.id,
            vendorId: vendorResult.value.id,
            vendorName: vendorResult.value.name,
            lifecycle: "draft",
            payableStatus: payable.payableStatus,
            effectiveDate,
            invoiceReference: normalizeOptionalText(purchaseData.invoiceReference),
            notes: normalizeOptionalText(purchaseData.notes),
            adjustment,
            linesTotal,
            total,
            paidTotal: 0,
            dueAmount: payable.dueAmount,
            recordedAt: null,
            createdBy: userId,
        };
        const purchase = await persistPurchase({
            organizationId,
            purchaseId,
            lines: resolved.value,
            saveHeader: (tx) => purchasesRepository.createPurchase(header, tx),
        });

        if (!purchase) {
            return {
                status: "error",
                message: "Failed to create Purchase",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }

        return {
            status: "success",
            data: { purchase },
            message: "Draft Purchase created successfully",
            code: STATUS_CODES.CREATED,
        };
    } catch (error) {
        if (error instanceof Error && error.message === "Failed to save Purchase") {
            return {
                status: "error",
                message: "Failed to create Purchase",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }
        throw error;
    }
};

export const updateDraftPurchase = async (
    userId: string,
    organizationId: string,
    purchaseId: string,
    purchaseData: UpdateDraftPurchaseSVC,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const existing = await purchasesRepository.getPurchaseById(organizationId, purchaseId);
    if (!existing) {
        return purchaseNotFound();
    }

    if (existing.lifecycle !== "draft") {
        return {
            status: "error",
            message: "Only a Draft Purchase can be edited",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const nextStoreId = purchaseData.storeId ?? existing.storeId;
    const storeResult = await requireStore(organizationId, nextStoreId);
    if (!storeResult.ok) {
        return storeResult.error;
    }

    const nextVendorId = purchaseData.vendorId ?? existing.vendorId;
    const vendorResult = await requireActiveVendor(organizationId, nextVendorId);
    if (!vendorResult.ok) {
        return vendorResult.error;
    }

    const effectiveDate = purchaseData.effectiveDate ?? existing.effectiveDate;
    if (!isPurchaseEffectiveDateAllowed(effectiveDate)) {
        return futureEffectiveDate();
    }

    const vendorChanged = nextVendorId !== existing.vendorId;
    const nextLineInputs =
        purchaseData.lines ??
        (vendorChanged ? [] : toLineInputs(existing));

    const resolved = await resolveDraftLines(
        organizationId,
        purchaseId,
        vendorResult.value,
        nextLineInputs,
    );
    if (!resolved.ok) {
        return resolved.error;
    }

    const adjustment = purchaseData.adjustment ?? existing.adjustment;
    const { linesTotal, total } = calculatePurchaseTotals(
        resolved.value.map((line) => ({
            quantity: line.quantity,
            agreedUnitPrice: line.agreedUnitPrice,
        })),
        adjustment,
    );
    if (total < 0) {
        return negativeTotal();
    }

    const payable = derivePurchasePayableState({
        lifecycle: "draft",
        total,
        paidTotal: 0,
    });

    try {
        const header: UpdatePurchaseREPO = {
            id: purchaseId,
            organizationId,
            storeId: storeResult.value.id,
            vendorId: vendorResult.value.id,
            vendorName: vendorResult.value.name,
            lifecycle: "draft",
            payableStatus: payable.payableStatus,
            effectiveDate,
            invoiceReference:
                purchaseData.invoiceReference === undefined
                    ? existing.invoiceReference
                    : normalizeOptionalText(purchaseData.invoiceReference),
            notes:
                purchaseData.notes === undefined
                    ? existing.notes
                    : normalizeOptionalText(purchaseData.notes),
            adjustment,
            linesTotal,
            total,
            paidTotal: 0,
            dueAmount: payable.dueAmount,
            recordedAt: null,
            updatedBy: userId,
        };
        const purchase = await persistPurchase({
            organizationId,
            purchaseId,
            lines: resolved.value,
            saveHeader: (tx) => purchasesRepository.updatePurchase(header, tx),
        });

        if (!purchase) {
            return {
                status: "error",
                message: "Failed to update Purchase",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }

        return {
            status: "success",
            data: { purchase },
            message: "Draft Purchase updated successfully",
            code: STATUS_CODES.SUCCESS,
        };
    } catch (error) {
        if (error instanceof Error && error.message === "Failed to save Purchase") {
            return {
                status: "error",
                message: "Failed to update Purchase",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }
        throw error;
    }
};

export const discardDraftPurchase = async (
    userId: string,
    organizationId: string,
    purchaseId: string,
): Promise<ServiceResponse<{ discarded: true } | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const existing = await purchasesRepository.getPurchaseById(organizationId, purchaseId);
    if (!existing) {
        return purchaseNotFound();
    }

    if (existing.lifecycle !== "draft") {
        return {
            status: "error",
            message: "Only a Draft Purchase can be discarded",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const discarded = await purchasesRepository.deletePurchase(organizationId, purchaseId);
    if (!discarded) {
        return {
            status: "error",
            message: "Failed to discard Purchase",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { discarded: true },
        message: "Draft Purchase discarded successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const recordPurchase = async (
    userId: string,
    organizationId: string,
    purchaseId: string,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const existing = await purchasesRepository.getPurchaseById(organizationId, purchaseId);
    if (!existing) {
        return purchaseNotFound();
    }

    if (existing.lifecycle !== "draft") {
        return {
            status: "error",
            message: "Only a Draft Purchase can be recorded",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    if (existing.lines.length === 0) {
        return {
            status: "error",
            message: "A recorded Purchase must include at least one Purchase Line",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const storeResult = await requireStore(organizationId, existing.storeId);
    if (!storeResult.ok) {
        return storeResult.error;
    }

    const vendorResult = await requireActiveVendor(organizationId, existing.vendorId);
    if (!vendorResult.ok) {
        return vendorResult.error;
    }

    if (!isPurchaseEffectiveDateAllowed(existing.effectiveDate)) {
        return futureEffectiveDate();
    }

    const resolved = await resolveDraftLines(
        organizationId,
        purchaseId,
        vendorResult.value,
        toLineInputs(existing),
    );
    if (!resolved.ok) {
        return resolved.error;
    }

    const { linesTotal, total } = calculatePurchaseTotals(
        resolved.value.map((line) => ({
            quantity: line.quantity,
            agreedUnitPrice: line.agreedUnitPrice,
        })),
        existing.adjustment,
    );
    if (total <= 0) {
        return {
            status: "error",
            message: "A recorded Purchase total must be greater than 0",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const payable = derivePurchasePayableState({
        lifecycle: "recorded",
        total,
        paidTotal: 0,
    });
    const recordedAt = new Date();

    try {
        const header: UpdatePurchaseREPO = {
            id: purchaseId,
            organizationId,
            storeId: storeResult.value.id,
            vendorId: vendorResult.value.id,
            vendorName: vendorResult.value.name,
            lifecycle: "recorded",
            payableStatus: payable.payableStatus,
            effectiveDate: existing.effectiveDate,
            invoiceReference: existing.invoiceReference,
            notes: existing.notes,
            adjustment: existing.adjustment,
            linesTotal,
            total,
            paidTotal: 0,
            dueAmount: payable.dueAmount,
            recordedAt,
            updatedBy: userId,
        };
        const purchase = await persistPurchase({
            organizationId,
            purchaseId,
            lines: resolved.value,
            saveHeader: (tx) => purchasesRepository.updatePurchase(header, tx),
        });

        if (!purchase) {
            return {
                status: "error",
                message: "Failed to record Purchase",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }

        return {
            status: "success",
            data: { purchase },
            message: "Purchase recorded successfully",
            code: STATUS_CODES.SUCCESS,
        };
    } catch (error) {
        if (error instanceof Error && error.message === "Failed to save Purchase") {
            return {
                status: "error",
                message: "Failed to record Purchase",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }
        throw error;
    }
};

export const createOutgoingPurchasePayment = async (
    userId: string,
    organizationId: string,
    purchaseId: string,
    paymentData: CreateOutgoingPaymentSVC,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const amount = roundOutgoingPaymentMoney(paymentData.amount);
    const paidAt = new Date();

    try {
        const purchase = await pg.begin(async (tx) => {
            const existing = await purchasesRepository.lockPurchaseById(
                organizationId,
                purchaseId,
                tx,
            );
            if (!existing) {
                return null;
            }

            if (existing.lifecycle !== "recorded") {
                throw Object.assign(
                    new Error("Outgoing Payments can only be recorded against a recorded Purchase"),
                    { code: STATUS_CODES.BAD_REQUEST, expose: true },
                );
            }

            if (
                !canAcceptOutgoingPayment({
                    lifecycle: existing.lifecycle,
                    total: existing.total,
                    outgoingPayments: existing.outgoingPayments,
                    amount,
                })
            ) {
                throw Object.assign(
                    new Error("Outgoing Payment cannot exceed the remaining due amount"),
                    { code: STATUS_CODES.CONFLICT, expose: true },
                );
            }

            const funding = await resolveOutgoingPaymentFunding(tx, {
                organizationId,
                storeId: existing.storeId,
                payment: {
                    ...paymentData,
                    amount,
                },
            });

            const createdPayment = await outgoingPaymentsRepository.createOutgoingPayment(
                {
                    id: crypto.randomUUID(),
                    organizationId,
                    purchaseId,
                    expenseId: null,
                    amount,
                    paymentMethod: paymentData.paymentMethod,
                    moneyAccountId: funding.moneyAccount?.id ?? null,
                    reference: normalizeOptionalText(paymentData.reference),
                    notes: normalizeOptionalText(paymentData.notes),
                    paidAt,
                    reversedAt: null,
                    createdBy: userId,
                },
                tx,
            );
            if (!createdPayment) {
                throw new Error("Failed to create Outgoing Payment");
            }

            if (funding.trackingActive && funding.moneyAccount) {
                await createOutgoingPurchasePaymentMovement(tx, {
                    organizationId,
                    storeId: existing.storeId,
                    moneyAccount: funding.moneyAccount,
                    payment: createdPayment,
                });
            }

            const settlement = derivePurchasePayableStateFromPayments({
                lifecycle: "recorded",
                total: existing.total,
                outgoingPayments: [...existing.outgoingPayments, createdPayment],
            });

            const header: UpdatePurchaseREPO = {
                id: existing.id,
                organizationId,
                storeId: existing.storeId,
                vendorId: existing.vendorId,
                vendorName: existing.vendorName,
                lifecycle: "recorded",
                payableStatus: settlement.payableStatus,
                effectiveDate: existing.effectiveDate,
                invoiceReference: existing.invoiceReference,
                notes: existing.notes,
                adjustment: existing.adjustment,
                linesTotal: existing.linesTotal,
                total: existing.total,
                paidTotal: settlement.paidTotal,
                dueAmount: settlement.dueAmount,
                recordedAt: existing.recordedAt,
                updatedBy: userId,
            };
            const updated = await purchasesRepository.updatePurchase(header, tx);
            if (!updated) {
                throw new Error("Failed to update Purchase settlement");
            }
            return updated;
        });

        if (!purchase) {
            return purchaseNotFound();
        }

        return {
            status: "success",
            data: { purchase },
            message: "Outgoing Payment recorded successfully",
            code: STATUS_CODES.CREATED,
        };
    } catch (error) {
        if (isOutgoingPaymentFundingError(error)) {
            return {
                status: "error",
                message: error.message,
                data: null,
                code: error.code,
            };
        }
        if (error instanceof Error && "expose" in error && error.expose === true) {
            return {
                status: "error",
                message: error.message,
                data: null,
                code: (error as Error & { code?: StatusCode }).code ?? STATUS_CODES.BAD_REQUEST,
            };
        }
        if (error instanceof Error && error.message === "Failed to create Outgoing Payment") {
            return {
                status: "error",
                message: "Failed to record Outgoing Payment",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }
        if (
            error instanceof Error &&
            (error.message === "Failed to create money account movement" ||
                error.message === "Failed to update Purchase settlement")
        ) {
            return {
                status: "error",
                message: "Failed to record Outgoing Payment",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }
        throw error;
    }
};
