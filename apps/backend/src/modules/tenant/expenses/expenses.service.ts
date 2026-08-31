import {
    STATUS_CODES,
    canAcceptOutgoingExpensePayment,
    expenseCalendarDateInTimeZone,
    deriveExpensePayableState,
    deriveExpensePayableStateFromPayments,
    isExpenseCategorySelectableForDraftExpense,
    isExpenseEffectiveDateAllowed,
    isOutgoingPaymentActive,
    roundExpenseMoney,
    roundOutgoingPaymentMoney,
    type CreateDraftExpenseSVC,
    type CreateExpenseREPO,
    type CreateOutgoingPaymentSVC,
    type ExpenseCategoryDTO,
    type ExpenseDTO,
    type ExpenseResponse,
    type ExpensesListResponse,
    type RecordExpenseSVC,
    type ReverseOutgoingPaymentSVC,
    type ServiceResponse,
    type StatusCode,
    type UpdateDraftExpenseSVC,
    type UpdateExpenseREPO,
    type VoidExpenseSVC,
} from "@repo/types";
import { pg } from "@/config/db";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as expenseCategoriesRepository from "@/modules/tenant/expense-categories/expense-categories.repository";
import * as outgoingPaymentsRepository from "@/modules/tenant/outgoing-payments/outgoing-payments.repository";
import {
    createOutgoingExpensePaymentMovement,
    createOutgoingExpensePaymentReversalMovement,
    isOutgoingPaymentFundingError,
    resolveOutgoingPaymentFunding,
} from "@/modules/tenant/outgoing-payments/outgoing-payment-funding";
import * as moneyAccountsRepository from "@/modules/tenant/money-accounts/money-accounts.repository";
import * as expensesRepository from "./expenses.repository";

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

const expenseCategoryNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Expense Category not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const expenseNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Expense not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const inactiveExpenseCategory = (): ServiceResponse<null> => ({
    status: "error",
    message: "Only an active Expense Category can be used on a Draft Expense",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const futureEffectiveDate = (): ServiceResponse<null> => ({
    status: "error",
    message: "Effective date cannot be in the future",
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

const applyOutgoingExpensePaymentInTx = async (
    tx: Bun.TransactionSQL,
    params: {
        userId: string;
        organizationId: string;
        expense: ExpenseDTO;
        paymentData: CreateOutgoingPaymentSVC;
        paidAt?: Date;
    },
): Promise<ExpenseDTO> => {
    const amount = roundOutgoingPaymentMoney(params.paymentData.amount);
    const paidAt = params.paidAt ?? new Date();

    if (params.expense.lifecycle !== "recorded") {
        throw Object.assign(
            new Error("Outgoing Payments can only be recorded against a recorded Expense"),
            { code: STATUS_CODES.BAD_REQUEST, expose: true },
        );
    }

    if (
        !canAcceptOutgoingExpensePayment({
            lifecycle: params.expense.lifecycle,
            total: params.expense.total,
            outgoingPayments: params.expense.outgoingPayments,
            amount,
        })
    ) {
        throw Object.assign(
            new Error("Outgoing Payment cannot exceed the remaining due amount"),
            { code: STATUS_CODES.CONFLICT, expose: true },
        );
    }

    const funding = await resolveOutgoingPaymentFunding(tx, {
        organizationId: params.organizationId,
        storeId: params.expense.storeId,
        payment: {
            ...params.paymentData,
            amount,
        },
    });

    const createdPayment = await outgoingPaymentsRepository.createOutgoingPayment(
        {
            id: crypto.randomUUID(),
            organizationId: params.organizationId,
            purchaseId: null,
            expenseId: params.expense.id,
            amount,
            paymentMethod: params.paymentData.paymentMethod,
            moneyAccountId: funding.moneyAccount?.id ?? null,
            reference: normalizeOptionalText(params.paymentData.reference),
            notes: normalizeOptionalText(params.paymentData.notes),
            paidAt,
            reversedAt: null,
            reversalReason: null,
            reversalKind: null,
            createdBy: params.userId,
        },
        tx,
    );
    if (!createdPayment) {
        throw new Error("Failed to create Outgoing Payment");
    }

    if (funding.trackingActive && funding.moneyAccount) {
        await createOutgoingExpensePaymentMovement(tx, {
            organizationId: params.organizationId,
            storeId: params.expense.storeId,
            moneyAccount: funding.moneyAccount,
            payment: createdPayment,
        });
    }

    const settlement = deriveExpensePayableStateFromPayments({
        lifecycle: "recorded",
        total: params.expense.total,
        outgoingPayments: [...params.expense.outgoingPayments, createdPayment],
    });

    const header: UpdateExpenseREPO = {
        id: params.expense.id,
        organizationId: params.organizationId,
        storeId: params.expense.storeId,
        expenseCategoryId: params.expense.expenseCategoryId,
        expenseCategoryName: params.expense.expenseCategoryName,
        lifecycle: "recorded",
        payableStatus: settlement.payableStatus,
        effectiveDate: params.expense.effectiveDate,
        invoiceReference: params.expense.invoiceReference,
        notes: params.expense.notes,
        total: params.expense.total,
        paidTotal: settlement.paidTotal,
        dueAmount: settlement.dueAmount,
        recordedAt: params.expense.recordedAt,
        voidedAt: params.expense.voidedAt,
        voidReason: params.expense.voidReason,
        updatedBy: params.userId,
    };
    const updated = await expensesRepository.updateExpense(header, tx);
    if (!updated) {
        throw new Error("Failed to update Expense settlement");
    }

    return expensesRepository.getExpenseById(params.organizationId, params.expense.id, tx) ?? updated;
};

const outgoingPaymentErrorResponse = (
    error: unknown,
): ServiceResponse<null> | null => {
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
    if (
        error instanceof Error &&
        (error.message === "Failed to create Outgoing Payment" ||
            error.message === "Failed to create money account movement" ||
            error.message === "Failed to update Expense settlement")
    ) {
        return {
            status: "error",
            message: "Failed to record Outgoing Payment",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }
    return null;
};

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

const requireActiveExpenseCategory = async (
    organizationId: string,
    expenseCategoryId: string,
): Promise<LookupResult<ExpenseCategoryDTO>> => {
    const expenseCategory = await expenseCategoriesRepository.getExpenseCategoryById(
        organizationId,
        expenseCategoryId,
    );
    if (!expenseCategory) {
        return { ok: false, error: expenseCategoryNotFound() };
    }
    if (!isExpenseCategorySelectableForDraftExpense(expenseCategory)) {
        return { ok: false, error: inactiveExpenseCategory() };
    }
    return { ok: true, value: expenseCategory };
};

const toDraftPayable = (total: number) =>
    deriveExpensePayableState({
        lifecycle: "draft",
        total,
        paidTotal: 0,
    });

export const getExpenses = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<ExpensesListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const expenses = await expensesRepository.getExpensesByOrganizationId(organizationId);
    return {
        status: "success",
        data: { expenses },
        message: "Expenses fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getExpenseDetails = async (
    userId: string,
    organizationId: string,
    expenseId: string,
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const expense = await expensesRepository.getExpenseById(organizationId, expenseId);
    if (!expense) {
        return expenseNotFound();
    }

    return {
        status: "success",
        data: { expense },
        message: "Expense fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createDraftExpense = async (
    userId: string,
    organizationId: string,
    expenseData: CreateDraftExpenseSVC,
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const storeResult = await requireStore(organizationId, expenseData.storeId);
    if (!storeResult.ok) {
        return storeResult.error;
    }

    const categoryResult = await requireActiveExpenseCategory(
        organizationId,
        expenseData.expenseCategoryId,
    );
    if (!categoryResult.ok) {
        return categoryResult.error;
    }

    const effectiveDate = expenseData.effectiveDate ?? expenseCalendarDateInTimeZone();
    if (!isExpenseEffectiveDateAllowed(effectiveDate)) {
        return futureEffectiveDate();
    }

    const total = roundExpenseMoney(expenseData.total);
    const payable = toDraftPayable(total);
    const header: CreateExpenseREPO = {
        id: crypto.randomUUID(),
        organizationId,
        storeId: storeResult.value.id,
        expenseCategoryId: categoryResult.value.id,
        expenseCategoryName: categoryResult.value.name,
        lifecycle: "draft",
        payableStatus: payable.payableStatus,
        effectiveDate,
        invoiceReference: normalizeOptionalText(expenseData.invoiceReference),
        notes: normalizeOptionalText(expenseData.notes),
        total,
        paidTotal: 0,
        dueAmount: payable.dueAmount,
        recordedAt: null,
        createdBy: userId,
    };

    const expense = await expensesRepository.createExpense(header);
    if (!expense) {
        return {
            status: "error",
            message: "Failed to create Expense",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { expense },
        message: "Draft Expense created successfully",
        code: STATUS_CODES.CREATED,
    };
};

export const updateDraftExpense = async (
    userId: string,
    organizationId: string,
    expenseId: string,
    expenseData: UpdateDraftExpenseSVC,
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const existing = await expensesRepository.getExpenseById(organizationId, expenseId);
    if (!existing) {
        return expenseNotFound();
    }

    if (existing.lifecycle !== "draft") {
        return {
            status: "error",
            message: "Only a Draft Expense can be edited",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const nextStoreId = expenseData.storeId ?? existing.storeId;
    const storeResult = await requireStore(organizationId, nextStoreId);
    if (!storeResult.ok) {
        return storeResult.error;
    }

    const nextCategoryId = expenseData.expenseCategoryId ?? existing.expenseCategoryId;
    const categoryResult = await requireActiveExpenseCategory(organizationId, nextCategoryId);
    if (!categoryResult.ok) {
        return categoryResult.error;
    }

    const effectiveDate = expenseData.effectiveDate ?? existing.effectiveDate;
    if (!isExpenseEffectiveDateAllowed(effectiveDate)) {
        return futureEffectiveDate();
    }

    const total = roundExpenseMoney(expenseData.total ?? existing.total);
    const payable = toDraftPayable(total);
    const header: UpdateExpenseREPO = {
        id: expenseId,
        organizationId,
        storeId: storeResult.value.id,
        expenseCategoryId: categoryResult.value.id,
        expenseCategoryName: categoryResult.value.name,
        lifecycle: "draft",
        payableStatus: payable.payableStatus,
        effectiveDate,
        invoiceReference:
            expenseData.invoiceReference === undefined
                ? existing.invoiceReference
                : normalizeOptionalText(expenseData.invoiceReference),
        notes:
            expenseData.notes === undefined
                ? existing.notes
                : normalizeOptionalText(expenseData.notes),
        total,
        paidTotal: 0,
        dueAmount: payable.dueAmount,
        recordedAt: null,
        voidedAt: null,
        voidReason: null,
        updatedBy: userId,
    };

    const expense = await expensesRepository.updateExpense(header);
    if (!expense) {
        return {
            status: "error",
            message: "Failed to update Expense",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { expense },
        message: "Draft Expense updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const discardDraftExpense = async (
    userId: string,
    organizationId: string,
    expenseId: string,
): Promise<ServiceResponse<{ discarded: true } | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const existing = await expensesRepository.getExpenseById(organizationId, expenseId);
    if (!existing) {
        return expenseNotFound();
    }

    if (existing.lifecycle !== "draft") {
        return {
            status: "error",
            message: "Only a Draft Expense can be discarded",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const discarded = await expensesRepository.deleteExpense(organizationId, expenseId);
    if (!discarded) {
        return {
            status: "error",
            message: "Failed to discard Expense",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { discarded: true },
        message: "Draft Expense discarded successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const recordExpense = async (
    userId: string,
    organizationId: string,
    expenseId: string,
    recordData: RecordExpenseSVC = {},
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const existing = await expensesRepository.getExpenseById(organizationId, expenseId);
    if (!existing) {
        return expenseNotFound();
    }

    if (existing.lifecycle !== "draft") {
        return {
            status: "error",
            message: "Only a Draft Expense can be recorded",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const storeResult = await requireStore(organizationId, existing.storeId);
    if (!storeResult.ok) {
        return storeResult.error;
    }

    const categoryResult = await requireActiveExpenseCategory(
        organizationId,
        existing.expenseCategoryId,
    );
    if (!categoryResult.ok) {
        return categoryResult.error;
    }

    if (!isExpenseEffectiveDateAllowed(existing.effectiveDate)) {
        return futureEffectiveDate();
    }

    const total = roundExpenseMoney(existing.total);
    if (total <= 0) {
        return {
            status: "error",
            message: "A recorded Expense total must be greater than 0",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const payable = deriveExpensePayableState({
        lifecycle: "recorded",
        total,
        paidTotal: 0,
    });
    const header: UpdateExpenseREPO = {
        id: expenseId,
        organizationId,
        storeId: storeResult.value.id,
        expenseCategoryId: categoryResult.value.id,
        expenseCategoryName: categoryResult.value.name,
        lifecycle: "recorded",
        payableStatus: payable.payableStatus,
        effectiveDate: existing.effectiveDate,
        invoiceReference: existing.invoiceReference,
        notes: existing.notes,
        total,
        paidTotal: 0,
        dueAmount: payable.dueAmount,
        recordedAt: new Date(),
        voidedAt: null,
        voidReason: null,
        updatedBy: userId,
    };

    try {
        const expense = recordData.payment
            ? await pg.begin(async (tx) => {
                const recorded = await expensesRepository.updateExpense(header, tx);
                if (!recorded) {
                    throw new Error("Failed to record Expense");
                }

                return applyOutgoingExpensePaymentInTx(tx, {
                    userId,
                    organizationId,
                    expense: recorded,
                    paymentData: recordData.payment!,
                });
            })
            : await expensesRepository.updateExpense(header);

        if (!expense) {
            return {
                status: "error",
                message: "Failed to record Expense",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }

        return {
            status: "success",
            data: { expense },
            message: "Expense recorded successfully",
            code: STATUS_CODES.SUCCESS,
        };
    } catch (error) {
        const paymentError = outgoingPaymentErrorResponse(error);
        if (paymentError) {
            return paymentError;
        }
        if (error instanceof Error && error.message === "Failed to record Expense") {
            return {
                status: "error",
                message: "Failed to record Expense",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }
        throw error;
    }
};

export const createOutgoingExpensePayment = async (
    userId: string,
    organizationId: string,
    expenseId: string,
    paymentData: CreateOutgoingPaymentSVC,
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    try {
        const expense = await pg.begin(async (tx) => {
            const existing = await expensesRepository.lockExpenseById(
                organizationId,
                expenseId,
                tx,
            );
            if (!existing) {
                return null;
            }

            return applyOutgoingExpensePaymentInTx(tx, {
                userId,
                organizationId,
                expense: existing,
                paymentData,
            });
        });

        if (!expense) {
            return expenseNotFound();
        }

        return {
            status: "success",
            data: { expense },
            message: "Outgoing Payment recorded successfully",
            code: STATUS_CODES.CREATED,
        };
    } catch (error) {
        const paymentError = outgoingPaymentErrorResponse(error);
        if (paymentError) {
            return paymentError;
        }
        throw error;
    }
};

const reverseActiveExpensePayment = async (
    tx: Bun.TransactionSQL,
    params: {
        organizationId: string;
        payment: ExpenseDTO["outgoingPayments"][number];
        reason: string;
        reversalKind: "payment_reversal" | "payable_void";
        reversedAt: Date;
    },
): Promise<ExpenseDTO["outgoingPayments"][number]> => {
    if (!isOutgoingPaymentActive(params.payment)) {
        return params.payment;
    }

    const reversed = await outgoingPaymentsRepository.reverseOutgoingPayment(
        {
            id: params.payment.id,
            organizationId: params.organizationId,
            reversedAt: params.reversedAt,
            reversalReason: params.reason,
            reversalKind: params.reversalKind,
        },
        tx,
    );
    if (!reversed) {
        throw new Error("Failed to reverse Outgoing Payment");
    }

    const originalMovement = await moneyAccountsRepository.getMovementByOutgoingPaymentId(
        params.organizationId,
        params.payment.id,
        tx,
    );
    if (originalMovement) {
        await createOutgoingExpensePaymentReversalMovement(tx, {
            organizationId: params.organizationId,
            originalMovement,
            sourceKind:
                params.reversalKind === "payable_void"
                    ? "outgoing_expense_void_reversal"
                    : "outgoing_expense_payment_reversal",
            occurredAt: params.reversedAt,
        });
    }

    return reversed;
};

const toRecordedSettlementHeader = (
    expense: ExpenseDTO,
    organizationId: string,
    userId: string,
    outgoingPayments: ExpenseDTO["outgoingPayments"],
): UpdateExpenseREPO => {
    const settlement = deriveExpensePayableStateFromPayments({
        lifecycle: "recorded",
        total: expense.total,
        outgoingPayments,
    });

    return {
        id: expense.id,
        organizationId,
        storeId: expense.storeId,
        expenseCategoryId: expense.expenseCategoryId,
        expenseCategoryName: expense.expenseCategoryName,
        lifecycle: "recorded",
        payableStatus: settlement.payableStatus,
        effectiveDate: expense.effectiveDate,
        invoiceReference: expense.invoiceReference,
        notes: expense.notes,
        total: expense.total,
        paidTotal: settlement.paidTotal,
        dueAmount: settlement.dueAmount,
        recordedAt: expense.recordedAt,
        voidedAt: expense.voidedAt,
        voidReason: expense.voidReason,
        updatedBy: userId,
    };
};

export const reverseOutgoingExpensePayment = async (
    userId: string,
    organizationId: string,
    expenseId: string,
    paymentId: string,
    reversalData: ReverseOutgoingPaymentSVC,
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const reason = reversalData.reason.trim();
    const reversedAt = new Date();

    try {
        const expense = await pg.begin(async (tx) => {
            const existing = await expensesRepository.lockExpenseById(
                organizationId,
                expenseId,
                tx,
            );
            if (!existing) {
                return null;
            }

            const payment = existing.outgoingPayments.find((item) => item.id === paymentId);
            if (!payment) {
                throw Object.assign(new Error("Outgoing Payment not found"), {
                    code: STATUS_CODES.NOT_FOUND,
                    expose: true,
                });
            }

            if (!isOutgoingPaymentActive(payment)) {
                return existing;
            }

            if (existing.lifecycle !== "recorded") {
                throw Object.assign(
                    new Error("Outgoing Payments can only be reversed on a recorded Expense"),
                    { code: STATUS_CODES.BAD_REQUEST, expose: true },
                );
            }

            const reversed = await reverseActiveExpensePayment(tx, {
                organizationId,
                payment,
                reason,
                reversalKind: "payment_reversal",
                reversedAt,
            });

            const nextPayments = existing.outgoingPayments.map((item) =>
                item.id === reversed.id ? reversed : item,
            );
            const updated = await expensesRepository.updateExpense(
                toRecordedSettlementHeader(existing, organizationId, userId, nextPayments),
                tx,
            );
            if (!updated) {
                throw new Error("Failed to update Expense settlement");
            }
            return updated;
        });

        if (!expense) {
            return expenseNotFound();
        }

        return {
            status: "success",
            data: { expense },
            message: "Outgoing Payment reversed successfully",
            code: STATUS_CODES.SUCCESS,
        };
    } catch (error) {
        if (error instanceof Error && "expose" in error && error.expose === true) {
            return {
                status: "error",
                message: error.message,
                data: null,
                code: (error as Error & { code?: StatusCode }).code ?? STATUS_CODES.BAD_REQUEST,
            };
        }
        if (
            error instanceof Error &&
            (error.message === "Failed to reverse Outgoing Payment" ||
                error.message === "Failed to create money account movement" ||
                error.message === "Failed to update Expense settlement")
        ) {
            return {
                status: "error",
                message: "Failed to reverse Outgoing Payment",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }
        throw error;
    }
};

export const voidExpense = async (
    userId: string,
    organizationId: string,
    expenseId: string,
    voidData: VoidExpenseSVC,
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const reason = voidData.reason.trim();
    const voidedAt = new Date();

    try {
        const expense = await pg.begin(async (tx) => {
            const existing = await expensesRepository.lockExpenseById(
                organizationId,
                expenseId,
                tx,
            );
            if (!existing) {
                return null;
            }

            if (existing.lifecycle === "voided") {
                return existing;
            }

            if (existing.lifecycle !== "recorded") {
                throw Object.assign(new Error("Only a recorded Expense can be voided"), {
                    code: STATUS_CODES.BAD_REQUEST,
                    expose: true,
                });
            }

            const nextPayments = [...existing.outgoingPayments];
            for (const [index, payment] of existing.outgoingPayments.entries()) {
                if (!isOutgoingPaymentActive(payment)) {
                    continue;
                }
                nextPayments[index] = await reverseActiveExpensePayment(tx, {
                    organizationId,
                    payment,
                    reason,
                    reversalKind: "payable_void",
                    reversedAt: voidedAt,
                });
            }

            const header: UpdateExpenseREPO = {
                id: existing.id,
                organizationId,
                storeId: existing.storeId,
                expenseCategoryId: existing.expenseCategoryId,
                expenseCategoryName: existing.expenseCategoryName,
                lifecycle: "voided",
                payableStatus: null,
                effectiveDate: existing.effectiveDate,
                invoiceReference: existing.invoiceReference,
                notes: existing.notes,
                total: existing.total,
                paidTotal: 0,
                dueAmount: null,
                recordedAt: existing.recordedAt,
                voidedAt,
                voidReason: reason,
                updatedBy: userId,
            };
            const updated = await expensesRepository.updateExpense(header, tx);
            if (!updated) {
                throw new Error("Failed to void Expense");
            }
            return updated;
        });

        if (!expense) {
            return expenseNotFound();
        }

        return {
            status: "success",
            data: { expense },
            message: "Expense voided successfully",
            code: STATUS_CODES.SUCCESS,
        };
    } catch (error) {
        if (error instanceof Error && "expose" in error && error.expose === true) {
            return {
                status: "error",
                message: error.message,
                data: null,
                code: (error as Error & { code?: StatusCode }).code ?? STATUS_CODES.BAD_REQUEST,
            };
        }
        if (
            error instanceof Error &&
            (error.message === "Failed to reverse Outgoing Payment" ||
                error.message === "Failed to create money account movement" ||
                error.message === "Failed to void Expense")
        ) {
            return {
                status: "error",
                message: "Failed to void Expense",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }
        throw error;
    }
};
