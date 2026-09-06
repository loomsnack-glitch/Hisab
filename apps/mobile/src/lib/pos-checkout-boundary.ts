import { collectPosPayment, commitPosSale, completePosSale } from "@repo/services";
import type {
    CommitSaleJSON,
    CompleteSaleJSON,
    CreatePaymentJSON,
    PaymentResponse,
    SaleDetailDTO,
    SaleResponse,
    ServiceResponse,
} from "@repo/types";
import { buildPosDraftPayload, type PosDraftCartInput } from "./pos-draft-boundary";
import { mapPosPaymentRowsToInputs, type PosPaymentRow } from "./pos-payment-boundary";

export type PosCheckoutCartInput = Omit<PosDraftCartInput, "draftSaleId" | "draftRequestId"> & {
    draftSaleId: string | null;
    payments: readonly PosPaymentRow[];
    requestId: string;
};

export type PosCheckoutOperation =
    | { kind: "new_sale"; payload: CompleteSaleJSON }
    | { kind: "draft"; saleId: string; payload: CommitSaleJSON }
    | { kind: "collection"; saleId: string; payment: CreatePaymentJSON };

export type PosCheckoutServices = {
    complete: typeof completePosSale;
    commit: typeof commitPosSale;
    collect: typeof collectPosPayment;
};

const defaultServices: PosCheckoutServices = {
    complete: completePosSale,
    commit: commitPosSale,
    collect: collectPosPayment,
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
    });
    return fields;
};

const buildPosSalePayload = (input: PosCheckoutCartInput) => ({
    requestId: input.requestId,
    ...getDraftFields(input),
    payments: mapPosPaymentRowsToInputs(input.payments),
});

export const buildPosCompleteSalePayload = (input: PosCheckoutCartInput): CompleteSaleJSON => buildPosSalePayload(input);

export const buildPosCommitSalePayload = (input: PosCheckoutCartInput): CommitSaleJSON => buildPosSalePayload(input);

export const createPosCheckoutOperation = (
    input: PosCheckoutCartInput,
): Exclude<PosCheckoutOperation, { kind: "collection" }> => input.draftSaleId
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

    const response = await services.collect(operation.saleId, operation.payment);
    return requireResponseData<PaymentResponse>(response, "Unable to collect POS Payment").sale;
};
