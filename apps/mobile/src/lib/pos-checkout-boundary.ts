import { checkoutPosTableOrder, collectPosPayment, commitPosSale, completePosSale } from "@repo/services";
import type {
    CommitSaleJSON,
    CompleteSaleJSON,
    CheckoutTableOrderJSON,
    CreatePaymentJSON,
    PaymentResponse,
    SaleDetailDTO,
    SaleResponse,
    ServiceResponse,
    ServiceTableSaleResponse,
} from "@repo/types";
import { buildPosDraftPayload, type PosDraftCartInput } from "./pos-draft-boundary";
import { mapPosPaymentRowsToInputs, type PosPaymentRow } from "./pos-payment-boundary";
import type { PosTableContext } from "./pos-service-mode-boundary";

export type PosCheckoutCartInput = Omit<PosDraftCartInput, "draftSaleId" | "draftRequestId"> & {
    draftSaleId: string | null;
    payments: readonly PosPaymentRow[];
    requestId: string;
    tableContext?: PosTableContext | null;
};

export type PosCheckoutOperation =
    | { kind: "new_sale"; payload: CompleteSaleJSON }
    | { kind: "draft"; saleId: string; payload: CommitSaleJSON }
    | { kind: "table_order"; tableId: string; payload: CheckoutTableOrderJSON }
    | { kind: "collection"; saleId: string; payment: CreatePaymentJSON };

export type PosCheckoutServices = {
    complete: typeof completePosSale;
    commit: typeof commitPosSale;
    collect: typeof collectPosPayment;
    tableCheckout?: typeof checkoutPosTableOrder;
};

const defaultServices: PosCheckoutServices = {
    complete: completePosSale,
    commit: commitPosSale,
    collect: collectPosPayment,
    tableCheckout: checkoutPosTableOrder,
};

export const resolvePosCheckoutRequestId = (
    currentRequestId: string | null,
    createRequestId: () => string,
) => currentRequestId ?? createRequestId();

const requireResponseData = <T>(response: ServiceResponse<T | null>, fallbackMessage: string): T => {
    if (response.status !== "success" || !response.data) {
        throw new Error(response.message || fallbackMessage);
    }

    return response.data;
};

const getDraftFields = (input: PosCheckoutCartInput) => {
    const { draftRequestId: _draftRequestId, ...fields } = buildPosDraftPayload({
        items: input.items,
        customer: input.customer,
        discount: input.discount,
        draftRequestId: undefined,
        serviceMode: input.serviceMode,
    });
    return fields;
};

const buildPosSalePayload = (input: PosCheckoutCartInput) => ({
    requestId: input.requestId,
    ...getDraftFields(input),
    payments: mapPosPaymentRowsToInputs(input.payments),
});

export const buildPosTableOrderCheckoutPayload = (input: PosCheckoutCartInput): CheckoutTableOrderJSON => ({
    requestId: input.requestId,
    customerId: input.customer?.id ?? null,
    orderDiscountAmount: getDraftFields(input).orderDiscountAmount,
    notes: null,
    payments: mapPosPaymentRowsToInputs(input.payments),
});

export const buildPosCompleteSalePayload = (input: PosCheckoutCartInput): CompleteSaleJSON => buildPosSalePayload(input);

export const buildPosCommitSalePayload = (input: PosCheckoutCartInput): CommitSaleJSON => buildPosSalePayload(input);

export const createPosCheckoutOperation = (
    input: PosCheckoutCartInput,
): Exclude<PosCheckoutOperation, { kind: "collection" }> => input.tableContext?.tableOrderId
    ? { kind: "table_order", tableId: input.tableContext.tableId, payload: buildPosTableOrderCheckoutPayload(input) }
    : input.draftSaleId
    ? { kind: "draft", saleId: input.draftSaleId, payload: buildPosCommitSalePayload(input) }
    : { kind: "new_sale", payload: buildPosCompleteSalePayload(input) };

export const createPosCollectionOperation = (saleId: string, payment: CreatePaymentJSON): PosCheckoutOperation => ({
    kind: "collection",
    saleId,
    payment,
});

export const executePosCheckout = async (
    operation: PosCheckoutOperation,
    services: PosCheckoutServices = defaultServices,
): Promise<SaleDetailDTO> => {
    if (operation.kind === "new_sale") {
        const response = await services.complete(operation.payload);
        return requireResponseData<SaleResponse>(response, "Unable to complete POS Sale").sale;
    }

    if (operation.kind === "draft") {
        const response = await services.commit(operation.saleId, operation.payload);
        return requireResponseData<SaleResponse>(response, "Unable to commit POS Draft").sale;
    }

    if (operation.kind === "table_order") {
        if (!services.tableCheckout) {
            throw new Error("POS Table Order checkout is unavailable");
        }
        const response = await services.tableCheckout(operation.tableId, operation.payload);
        const data = requireResponseData<ServiceTableSaleResponse>(response, "Unable to checkout POS Table Order");
        if (!data.sale) {
            throw new Error("POS Table Order checkout did not return a Sale");
        }
        return data.sale;
    }

    const response = await services.collect(operation.saleId, operation.payment);
    return requireResponseData<PaymentResponse>(response, "Unable to collect POS Payment").sale;
};
