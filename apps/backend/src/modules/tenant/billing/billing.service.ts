import { pg } from "@/config/db";
import * as catalogRepository from "@/modules/tenant/catalog/catalog.repository";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import {
    STATUS_CODES,
    type CommitSaleSVC,
    type CreateCustomerSVC,
    type CreateDraftSaleSVC,
    type CreatePaymentREPO,
    type CreatePaymentSVC,
    type CreateSaleItemREPO,
    type CustomerDTO,
    type CustomerLedgerResponse,
    type CustomerResponse,
    type CustomersListResponse,
    type DeviceSessionDTO,
    type PaymentResponse,
    type SaleDetailDTO,
    type SaleItemInput,
    type SaleResponse,
    type SalesListQuery,
    type SalesListResponse,
    type ServiceResponse,
    type UpdateCustomerSVC,
    type UpdateDraftSaleSVC,
    type VoidSaleSVC,
} from "@repo/types";
import * as billingRepository from "./billing.repository";

const normalizeOptionalText = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const normalizeOptionalUuid = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const moneyFrom = (value: number | string | null | undefined) => roundMoney(Number(value ?? 0));

const sumMoney = (values: Array<number | string | null | undefined>) =>
    roundMoney(values.reduce((total: number, value) => total + Number(value ?? 0), 0));

const getLineDiscountTotal = (items: Array<{ discountAmount: number | string | null | undefined }>) =>
    sumMoney(items.map((item) => item.discountAmount));

const deriveOrderDiscountAmount = (
    discountTotal: number | string | null | undefined,
    lineDiscountTotal: number | string | null | undefined,
) => roundMoney(Math.max(moneyFrom(discountTotal) - moneyFrom(lineDiscountTotal), 0));

type SalePricingTotals = {
    subtotal: number;
    lineDiscountTotal: number;
    orderDiscountAmount: number;
    discountTotal: number;
    grandTotal: number;
};

const buildSalePricingTotals = (
    subtotal: number | string | null | undefined,
    lineDiscountTotal: number | string | null | undefined,
    orderDiscountAmount: number | string | null | undefined,
): { error?: ServiceResponse<null>; totals?: SalePricingTotals } => {
    const normalizedSubtotal = moneyFrom(subtotal);
    const normalizedLineDiscountTotal = moneyFrom(lineDiscountTotal);
    const normalizedOrderDiscountAmount = moneyFrom(orderDiscountAmount);
    const maxOrderDiscountAmount = roundMoney(normalizedSubtotal - normalizedLineDiscountTotal);

    if (normalizedOrderDiscountAmount > maxOrderDiscountAmount) {
        return {
            error: {
                status: "error",
                message: "Order discount cannot exceed the remaining sale subtotal after line discounts",
                data: null,
                code: STATUS_CODES.BAD_REQUEST,
            },
        };
    }

    const discountTotal = roundMoney(normalizedLineDiscountTotal + normalizedOrderDiscountAmount);
    const grandTotal = roundMoney(normalizedSubtotal - discountTotal);

    return {
        totals: {
            subtotal: normalizedSubtotal,
            lineDiscountTotal: normalizedLineDiscountTotal,
            orderDiscountAmount: normalizedOrderDiscountAmount,
            discountTotal,
            grandTotal,
        },
    };
};

const getOrganizationForUser = async (organizationId: string, userId: string) => {
    return organizationRepository.getOrganizationByIdForUser(organizationId, userId);
};

const getOrganizationById = async (organizationId: string) => {
    return organizationRepository.getOrganizationById(organizationId);
};

const getStoreForOrganization = async (organizationId: string, storeId: string) => {
    return organizationRepository.getStoreById(organizationId, storeId);
};

const getCustomerForOrganization = async (organizationId: string, customerId: string) => {
    return billingRepository.getCustomerById(organizationId, customerId);
};

const getSaleForStore = async (organizationId: string, storeId: string, saleId: string) => {
    return billingRepository.getSaleById(organizationId, storeId, saleId);
};

const verifyOrganizationAndStore = async (
    userId: string,
    organizationId: string,
    storeId?: string,
): Promise<ServiceResponse<null> | null> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    if (storeId) {
        const store = await getStoreForOrganization(organizationId, storeId);
        if (!store) {
            return {
                status: "error",
                message: "Store not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }
    }

    return null;
};

const validateSalesListCustomerFilter = async (
    organizationId: string,
    query: SalesListQuery,
): Promise<ServiceResponse<null> | null> => {
    if (!query.customerId) {
        return null;
    }

    const customer = await getCustomerForOrganization(organizationId, query.customerId);
    if (!customer) {
        return {
            status: "error",
            message: "Customer not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return null;
};

const buildSaleDetails = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    tx?: Bun.TransactionSQL,
): Promise<SaleDetailDTO | null> => {
    const sale = await billingRepository.getSaleById(organizationId, storeId, saleId, tx);
    if (!sale) {
        return null;
    }

    const [items, payments] = await Promise.all([
        billingRepository.getSaleItemsBySaleId(saleId, tx),
        billingRepository.getPaymentsBySaleId(saleId, tx),
    ]);
    const lineDiscountTotal = getLineDiscountTotal(items);

    return {
        ...sale,
        items,
        payments,
        orderDiscountAmount: deriveOrderDiscountAmount(sale.discountTotal, lineDiscountTotal),
    };
};

const prepareSaleItems = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    items: SaleItemInput[],
    orderDiscountAmount: number | string | null | undefined,
): Promise<
    | { error: ServiceResponse<null>; items?: undefined; totals?: undefined }
    | {
        error?: undefined;
        items: CreateSaleItemREPO[];
        totals: SalePricingTotals;
    }
> => {
    const seenProductIds = new Set<string>();
    const preparedItems: CreateSaleItemREPO[] = [];

    for (const item of items) {
        if (seenProductIds.has(item.productId)) {
            return {
                error: {
                    status: "error",
                    message: "Duplicate products are not allowed within the same sale",
                    data: null,
                    code: STATUS_CODES.CONFLICT,
                },
            };
        }

        seenProductIds.add(item.productId);

        const product = await catalogRepository.getProductById(organizationId, item.productId);
        if (!product) {
            return {
                error: {
                    status: "error",
                    message: `Product not found: ${item.productId}`,
                    data: null,
                    code: STATUS_CODES.NOT_FOUND,
                },
            };
        }

        const quantity = Number(item.quantity);
        const unitPrice = roundMoney(item.unitPrice ?? moneyFrom(product.price));
        const lineSubtotal = roundMoney(quantity * unitPrice);
        const discountAmount = roundMoney(item.discountAmount ?? moneyFrom(product.discount) * quantity);

        if (discountAmount > lineSubtotal) {
            return {
                error: {
                    status: "error",
                    message: `Discount for product "${product.name}" cannot exceed the line subtotal`,
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        preparedItems.push({
            id: crypto.randomUUID(),
            organizationId,
            storeId,
            saleId,
            productId: product.id,
            quantity,
            productNameSnapshot: product.name,
            unitPriceSnapshot: unitPrice,
            discountAmount,
            lineSubtotal,
            lineTotal: roundMoney(lineSubtotal - discountAmount),
        });
    }

    const pricingTotals = buildSalePricingTotals(
        sumMoney(preparedItems.map((item) => item.lineSubtotal)),
        getLineDiscountTotal(preparedItems),
        orderDiscountAmount,
    );

    if (pricingTotals.error || !pricingTotals.totals) {
        return {
            error: pricingTotals.error ?? {
                status: "error",
                message: "Failed to calculate sale totals",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            },
        };
    }

    return {
        items: preparedItems,
        totals: pricingTotals.totals,
    };
};

const validateCustomerAssignment = async (
    organizationId: string,
    customerId: string | null,
): Promise<ServiceResponse<null> | { customer: CustomerDTO | null }> => {
    if (!customerId) {
        return { customer: null };
    }

    const customer = await getCustomerForOrganization(organizationId, customerId);
    if (!customer) {
        return {
            status: "error",
            message: "Customer not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return { customer };
};

const appendCustomerLedgerEntry = async (
    tx: Bun.TransactionSQL,
    params: {
        customer: CustomerDTO;
        organizationId: string;
        amount: number;
        entryType: "sale" | "payment" | "void" | "adjustment";
        saleId?: string | null;
        paymentId?: string | null;
        notes?: string | null;
    },
) => {
    const nextBalance = roundMoney(moneyFrom(params.customer.balance) + params.amount);
    const updatedCustomer = await billingRepository.updateCustomerBalance(
        params.organizationId,
        params.customer.id,
        nextBalance,
        tx,
    );

    if (!updatedCustomer) {
        throw new Error("Failed to update customer balance");
    }

    const entry = await billingRepository.createCustomerLedgerEntry(
        {
            id: crypto.randomUUID(),
            organizationId: params.organizationId,
            customerId: params.customer.id,
            saleId: params.saleId ?? null,
            paymentId: params.paymentId ?? null,
            entryType: params.entryType,
            amount: roundMoney(params.amount),
            balanceAfter: nextBalance,
            notes: normalizeOptionalText(params.notes),
        },
        tx,
    );

    if (!entry) {
        throw new Error("Failed to create customer ledger entry");
    }

    return updatedCustomer;
};

const getCustomersInOrganization = async (
    organizationId: string,
    query: { search?: string; limit?: number },
): Promise<ServiceResponse<CustomersListResponse | null>> => {
    const customers = await billingRepository.getCustomersByOrganizationId(organizationId, query);
    return {
        status: "success",
        data: { customers },
        message: "Customers fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

const createCustomerInOrganization = async (
    organizationId: string,
    createdBy: string,
    customerData: CreateCustomerSVC,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    const phone = normalizeOptionalText(customerData.phone);
    if (phone) {
        const alreadyExists = await billingRepository.customerPhoneExistsInOrganization(organizationId, phone);
        if (alreadyExists) {
            return {
                status: "error",
                message: "Customer with the same phone already exists in this organization",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
    }

    const customer = await billingRepository.createCustomer({
        id: crypto.randomUUID(),
        organizationId,
        name: customerData.name,
        phone,
        balance: 0,
        isActive: customerData.isActive ?? true,
        createdBy,
    });

    if (!customer) {
        return {
            status: "error",
            message: "Failed to create customer",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { customer },
        message: "Customer created successfully",
        code: STATUS_CODES.CREATED,
    };
};

const getSalesInStore = async (
    organizationId: string,
    storeId: string,
    query: SalesListQuery,
): Promise<ServiceResponse<SalesListResponse | null>> => {
    const invalidCustomerFilter = await validateSalesListCustomerFilter(organizationId, query);
    if (invalidCustomerFilter) {
        return invalidCustomerFilter;
    }

    const sales = await billingRepository.getSalesByStore(organizationId, storeId, query);
    return {
        status: "success",
        data: { sales },
        message: "Sales fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

const getSaleDetailsInStore = async (
    organizationId: string,
    storeId: string,
    saleId: string,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const sale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!sale) {
        return {
            status: "error",
            message: "Sale not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return {
        status: "success",
        data: { sale },
        message: "Sale fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

type SaleWriteActor = {
    userId?: string | null;
    deviceId?: string | null;
};

const createDraftSaleInStore = async (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    saleData: CreateDraftSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const customerId = normalizeOptionalUuid(saleData.customerId);
    const customerResult = await validateCustomerAssignment(organizationId, customerId);
    if ("status" in customerResult) {
        return customerResult;
    }

    const saleId = crypto.randomUUID();
    const prepared = await prepareSaleItems(
        organizationId,
        storeId,
        saleId,
        saleData.items ?? [],
        saleData.orderDiscountAmount,
    );
    if (prepared.error) {
        return prepared.error;
    }

    await pg.begin(async (tx) => {
        const sale = await billingRepository.createSale(
            {
                id: saleId,
                organizationId,
                storeId,
                customerId,
                userId: actor.userId ?? null,
                createdByDeviceId: actor.deviceId ?? null,
                updatedByDeviceId: actor.deviceId ?? null,
                status: "draft",
                paymentStatus: "pending",
                subtotal: prepared.totals.subtotal,
                discountTotal: prepared.totals.discountTotal,
                grandTotal: prepared.totals.grandTotal,
                notes: normalizeOptionalText(saleData.notes),
            },
            tx,
        );

        if (!sale) {
            throw new Error("Failed to create draft sale");
        }

        for (const item of prepared.items) {
            const createdItem = await billingRepository.createSaleItem(item, tx);
            if (!createdItem) {
                throw new Error("Failed to create sale item");
            }
        }
    });

    const sale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!sale) {
        return {
            status: "error",
            message: "Failed to fetch draft sale",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { sale },
        message: "Draft sale created successfully",
        code: STATUS_CODES.CREATED,
    };
};

const updateDraftSaleInStore = async (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    saleId: string,
    saleData: UpdateDraftSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const existingSale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!existingSale) {
        return {
            status: "error",
            message: "Sale not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    if (existingSale.status !== "draft") {
        return {
            status: "error",
            message: "Only draft sales can be updated",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const customerId = saleData.customerId === undefined
        ? existingSale.customerId ?? null
        : normalizeOptionalUuid(saleData.customerId);

    const customerResult = await validateCustomerAssignment(organizationId, customerId);
    if ("status" in customerResult) {
        return customerResult;
    }

    const nextNotes = saleData.notes === undefined
        ? existingSale.notes ?? null
        : normalizeOptionalText(saleData.notes);
    const nextOrderDiscountAmount = saleData.orderDiscountAmount === undefined
        ? moneyFrom(existingSale.orderDiscountAmount)
        : moneyFrom(saleData.orderDiscountAmount);

    const preparedItems = saleData.items === undefined
        ? (() => {
            const pricingTotals = buildSalePricingTotals(
                existingSale.subtotal,
                getLineDiscountTotal(existingSale.items),
                nextOrderDiscountAmount,
            );

            if (pricingTotals.error || !pricingTotals.totals) {
                return {
                    error: pricingTotals.error ?? {
                        status: "error" as const,
                        message: "Failed to calculate sale totals",
                        data: null,
                        code: STATUS_CODES.INTERNAL_SERVER_ERROR,
                    },
                };
            }

            return {
                items: existingSale.items.map((item) => ({
                    id: item.id,
                    organizationId: item.organizationId,
                    storeId: item.storeId,
                    saleId: item.saleId,
                    productId: item.productId,
                    quantity: Number(item.quantity),
                    productNameSnapshot: item.productNameSnapshot,
                    unitPriceSnapshot: Number(item.unitPriceSnapshot),
                    discountAmount: Number(item.discountAmount),
                    lineSubtotal: Number(item.lineSubtotal),
                    lineTotal: Number(item.lineTotal),
                })),
                totals: pricingTotals.totals,
            };
        })()
        : await prepareSaleItems(organizationId, storeId, saleId, saleData.items, nextOrderDiscountAmount);

    if ("error" in preparedItems && preparedItems.error) {
        return preparedItems.error;
    }

    await pg.begin(async (tx) => {
        const updatedSale = await billingRepository.updateSale(
            {
                id: saleId,
                organizationId,
                storeId,
                customerId,
                status: "draft",
                paymentStatus: "pending",
                updatedByDeviceId: actor.deviceId ?? null,
                subtotal: preparedItems.totals.subtotal,
                discountTotal: preparedItems.totals.discountTotal,
                grandTotal: preparedItems.totals.grandTotal,
                notes: nextNotes,
            },
            tx,
        );

        if (!updatedSale) {
            throw new Error("Failed to update draft sale");
        }

        if (saleData.items !== undefined) {
            await billingRepository.deleteSaleItemsBySaleId(organizationId, storeId, saleId, tx);

            for (const item of preparedItems.items) {
                const createdItem = await billingRepository.createSaleItem(item, tx);
                if (!createdItem) {
                    throw new Error("Failed to recreate sale item");
                }
            }
        }
    });

    const sale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!sale) {
        return {
            status: "error",
            message: "Failed to fetch updated draft sale",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { sale },
        message: "Draft sale updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

const commitSaleInStore = async (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    saleId: string,
    commitData: CommitSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const existingSale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!existingSale) {
        return {
            status: "error",
            message: "Sale not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    if (existingSale.status !== "draft") {
        return {
            status: "error",
            message: "Only draft sales can be committed",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    if (existingSale.items.length === 0 || moneyFrom(existingSale.grandTotal) <= 0) {
        return {
            status: "error",
            message: "A sale must have at least one billable item before it can be committed",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const customerId = commitData.customerId === undefined
        ? existingSale.customerId ?? null
        : normalizeOptionalUuid(commitData.customerId);

    const customerResult = await validateCustomerAssignment(organizationId, customerId);
    if ("status" in customerResult) {
        return customerResult;
    }

    const payments = commitData.payments ?? [];
    const totalPayment = sumMoney(payments.map((payment) => payment.amount));
    const nextOrderDiscountAmount = commitData.orderDiscountAmount === undefined
        ? moneyFrom(existingSale.orderDiscountAmount)
        : moneyFrom(commitData.orderDiscountAmount);
    const pricingTotals = buildSalePricingTotals(
        existingSale.subtotal,
        getLineDiscountTotal(existingSale.items),
        nextOrderDiscountAmount,
    );

    if (pricingTotals.error || !pricingTotals.totals) {
        return pricingTotals.error ?? {
            status: "error",
            message: "Failed to calculate sale totals",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    const grandTotal = pricingTotals.totals.grandTotal;

    if (totalPayment > grandTotal) {
        return {
            status: "error",
            message: "Collected payment cannot exceed the sale total",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    if (!customerId && totalPayment < grandTotal) {
        return {
            status: "error",
            message: "Unpaid or partially paid sales must be assigned to a customer",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const paymentStatus = totalPayment === 0
        ? "pending"
        : totalPayment === grandTotal
            ? "paid"
            : "partial";

    const committedAt = new Date();
    const nextNotes = commitData.notes === undefined
        ? existingSale.notes ?? null
        : normalizeOptionalText(commitData.notes);

    await pg.begin(async (tx) => {
        const saleNumber = await billingRepository.incrementStoreSaleCounter(organizationId, storeId, tx);

        const updatedSale = await billingRepository.updateSale(
            {
                id: saleId,
                organizationId,
                storeId,
                customerId,
                status: "completed",
                paymentStatus,
                updatedByDeviceId: actor.deviceId ?? null,
                subtotal: pricingTotals.totals.subtotal,
                discountTotal: pricingTotals.totals.discountTotal,
                grandTotal,
                notes: nextNotes,
                committedAt,
                saleNumber,
            },
            tx,
        );

        if (!updatedSale) {
            throw new Error("Failed to commit sale");
        }

        let customer = customerResult.customer;

        if (customer) {
            customer = await appendCustomerLedgerEntry(tx, {
                customer,
                organizationId,
                amount: grandTotal,
                entryType: "sale",
                saleId,
                notes: nextNotes,
            });
        }

        for (const paymentInput of payments) {
            const createdPayment = await billingRepository.createPayment(
                {
                    id: crypto.randomUUID(),
                    organizationId,
                    storeId,
                    saleId,
                    collectedBy: actor.userId ?? null,
                    amount: roundMoney(paymentInput.amount),
                    method: paymentInput.method,
                    referenceNumber: normalizeOptionalText(paymentInput.referenceNumber),
                    notes: normalizeOptionalText(paymentInput.notes),
                    collectedAt: committedAt,
                },
                tx,
            );

            if (!createdPayment) {
                throw new Error("Failed to create payment");
            }

            if (customer) {
                customer = await appendCustomerLedgerEntry(tx, {
                    customer,
                    organizationId,
                    amount: -roundMoney(paymentInput.amount),
                    entryType: "payment",
                    saleId,
                    paymentId: createdPayment.id,
                    notes: normalizeOptionalText(paymentInput.notes),
                });
            }
        }
    });

    const sale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!sale) {
        return {
            status: "error",
            message: "Failed to fetch committed sale",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { sale },
        message: "Sale committed successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

const collectPaymentInStore = async (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    saleId: string,
    paymentData: CreatePaymentSVC,
): Promise<ServiceResponse<PaymentResponse | null>> => {
    const existingSale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!existingSale) {
        return {
            status: "error",
            message: "Sale not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    if (existingSale.status !== "completed") {
        return {
            status: "error",
            message: "Payments can only be collected for completed sales",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    if (existingSale.paymentStatus === "paid") {
        return {
            status: "error",
            message: "This sale is already fully paid",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const dueTotal = moneyFrom(existingSale.dueTotal);
    const amount = roundMoney(paymentData.amount);
    if (amount > dueTotal) {
        return {
            status: "error",
            message: "Collected payment cannot exceed the remaining due amount",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    if (!existingSale.customerId) {
        return {
            status: "error",
            message: "Payments after commit require the sale to be attached to a customer",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const customer = await getCustomerForOrganization(organizationId, existingSale.customerId);
    if (!customer) {
        return {
            status: "error",
            message: "Customer not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    let createdPayment: Awaited<ReturnType<typeof billingRepository.createPayment>> = null;

    await pg.begin(async (tx) => {
        createdPayment = await billingRepository.createPayment(
            {
                id: crypto.randomUUID(),
                organizationId,
                storeId,
                saleId,
                collectedBy: actor.userId ?? null,
                amount,
                method: paymentData.method,
                referenceNumber: normalizeOptionalText(paymentData.referenceNumber),
                notes: normalizeOptionalText(paymentData.notes),
                collectedAt: new Date(),
            },
            tx,
        );

        if (!createdPayment) {
            throw new Error("Failed to create payment");
        }

        await appendCustomerLedgerEntry(tx, {
            customer,
            organizationId,
            amount: -amount,
            entryType: "payment",
            saleId,
            paymentId: createdPayment.id,
            notes: normalizeOptionalText(paymentData.notes),
        });

        const nextPaidTotal = roundMoney(moneyFrom(existingSale.paidTotal) + amount);
        const nextPaymentStatus = nextPaidTotal === moneyFrom(existingSale.grandTotal) ? "paid" : "partial";

        const updatedSale = await billingRepository.updateSale(
            {
                id: saleId,
                organizationId,
                storeId,
                customerId: existingSale.customerId,
                status: existingSale.status,
                paymentStatus: nextPaymentStatus,
                updatedByDeviceId: actor.deviceId ?? null,
                subtotal: moneyFrom(existingSale.subtotal),
                discountTotal: moneyFrom(existingSale.discountTotal),
                grandTotal: moneyFrom(existingSale.grandTotal),
                notes: existingSale.notes ?? null,
                committedAt: existingSale.committedAt ?? null,
                saleNumber: existingSale.saleNumber ?? null,
                voidedAt: existingSale.voidedAt ?? null,
                voidReason: existingSale.voidReason ?? null,
            },
            tx,
        );

        if (!updatedSale) {
            throw new Error("Failed to update sale payment status");
        }
    });

    const sale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!sale || !createdPayment) {
        return {
            status: "error",
            message: "Failed to fetch updated sale payment details",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { payment: createdPayment, sale },
        message: "Payment collected successfully",
        code: STATUS_CODES.CREATED,
    };
};

const voidSaleInStore = async (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    saleId: string,
    voidData: VoidSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const existingSale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!existingSale) {
        return {
            status: "error",
            message: "Sale not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    if (existingSale.status !== "completed") {
        return {
            status: "error",
            message: "Only completed unpaid sales can be voided",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    if (moneyFrom(existingSale.paidTotal) > 0 || existingSale.payments.length > 0) {
        return {
            status: "error",
            message: "Sales with collected payments cannot be voided",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    if (existingSale.paymentStatus !== "pending") {
        return {
            status: "error",
            message: "Only unpaid sales can be voided in billing v1",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const customer = existingSale.customerId
        ? await getCustomerForOrganization(organizationId, existingSale.customerId)
        : null;

    await pg.begin(async (tx) => {
        const updatedSale = await billingRepository.updateSale(
            {
                id: saleId,
                organizationId,
                storeId,
                customerId: existingSale.customerId ?? null,
                status: "voided",
                paymentStatus: "pending",
                updatedByDeviceId: actor.deviceId ?? null,
                subtotal: moneyFrom(existingSale.subtotal),
                discountTotal: moneyFrom(existingSale.discountTotal),
                grandTotal: moneyFrom(existingSale.grandTotal),
                notes: existingSale.notes ?? null,
                committedAt: existingSale.committedAt ?? null,
                saleNumber: existingSale.saleNumber ?? null,
                voidedAt: new Date(),
                voidReason: normalizeOptionalText(voidData.reason),
            },
            tx,
        );

        if (!updatedSale) {
            throw new Error("Failed to void sale");
        }

        if (customer) {
            await appendCustomerLedgerEntry(tx, {
                customer,
                organizationId,
                amount: -moneyFrom(existingSale.grandTotal),
                entryType: "void",
                saleId,
                notes: voidData.reason,
            });
        }
    });

    const sale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!sale) {
        return {
            status: "error",
            message: "Failed to fetch voided sale",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { sale },
        message: "Sale voided successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getCustomers = async (
    userId: string,
    organizationId: string,
    query: { search?: string; limit?: number },
): Promise<ServiceResponse<CustomersListResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId);
    if (scopeError) {
        return scopeError;
    }

    return getCustomersInOrganization(organizationId, query);
};

export const createCustomer = async (
    userId: string,
    organizationId: string,
    customerData: CreateCustomerSVC,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId);
    if (scopeError) {
        return scopeError;
    }

    return createCustomerInOrganization(organizationId, userId, customerData);
};

export const getCustomerDetails = async (
    userId: string,
    organizationId: string,
    customerId: string,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId);
    if (scopeError) {
        return scopeError;
    }

    const customer = await getCustomerForOrganization(organizationId, customerId);
    if (!customer) {
        return {
            status: "error",
            message: "Customer not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return {
        status: "success",
        data: { customer },
        message: "Customer fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const updateCustomer = async (
    userId: string,
    organizationId: string,
    customerId: string,
    customerData: UpdateCustomerSVC,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId);
    if (scopeError) {
        return scopeError;
    }

    const existingCustomer = await getCustomerForOrganization(organizationId, customerId);
    if (!existingCustomer) {
        return {
            status: "error",
            message: "Customer not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const phone = customerData.phone === undefined
        ? existingCustomer.phone ?? null
        : normalizeOptionalText(customerData.phone);

    if (phone) {
        const alreadyExists = await billingRepository.customerPhoneExistsInOrganization(
            organizationId,
            phone,
            customerId,
        );
        if (alreadyExists) {
            return {
                status: "error",
                message: "Customer with the same phone already exists in this organization",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
    }

    const customer = await billingRepository.updateCustomer({
        id: customerId,
        organizationId,
        name: customerData.name ?? existingCustomer.name,
        phone,
        isActive: customerData.isActive ?? existingCustomer.isActive,
        updatedBy: userId,
    });

    if (!customer) {
        return {
            status: "error",
            message: "Failed to update customer",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { customer },
        message: "Customer updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getCustomerLedger = async (
    userId: string,
    organizationId: string,
    customerId: string,
): Promise<ServiceResponse<CustomerLedgerResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId);
    if (scopeError) {
        return scopeError;
    }

    const customer = await getCustomerForOrganization(organizationId, customerId);
    if (!customer) {
        return {
            status: "error",
            message: "Customer not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const ledger = await billingRepository.getCustomerLedgerByCustomerId(organizationId, customerId);
    return {
        status: "success",
        data: { customer, ledger },
        message: "Customer ledger fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getSales = async (
    userId: string,
    organizationId: string,
    storeId: string,
    query: SalesListQuery,
): Promise<ServiceResponse<SalesListResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return getSalesInStore(organizationId, storeId, query);
};

export const createDraftSale = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleData: CreateDraftSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return createDraftSaleInStore({ userId }, organizationId, storeId, saleData);
};

export const getSaleDetails = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleId: string,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return getSaleDetailsInStore(organizationId, storeId, saleId);
};

export const updateDraftSale = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleId: string,
    saleData: UpdateDraftSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return updateDraftSaleInStore({ userId }, organizationId, storeId, saleId, saleData);
};

export const commitSale = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleId: string,
    commitData: CommitSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return commitSaleInStore({ userId }, organizationId, storeId, saleId, commitData);
};

export const collectPayment = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleId: string,
    paymentData: CreatePaymentSVC,
): Promise<ServiceResponse<PaymentResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return collectPaymentInStore({ userId }, organizationId, storeId, saleId, paymentData);
};

export const voidSale = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleId: string,
    voidData: VoidSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return voidSaleInStore({ userId }, organizationId, storeId, saleId, voidData);
};

export const getCustomersForDevice = async (
    session: DeviceSessionDTO,
    query: { search?: string; limit?: number },
): Promise<ServiceResponse<CustomersListResponse | null>> => {
    return getCustomersInOrganization(session.organization.id, query);
};

export const createCustomerForDevice = async (
    session: DeviceSessionDTO,
    customerData: CreateCustomerSVC,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    const organization = await getOrganizationById(session.organization.id);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return createCustomerInOrganization(session.organization.id, organization.createdBy, customerData);
};

export const getSalesForDevice = async (
    session: DeviceSessionDTO,
    query: SalesListQuery,
): Promise<ServiceResponse<SalesListResponse | null>> => {
    return getSalesInStore(session.organization.id, session.store.id, query);
};

export const getSaleDetailsForDevice = async (
    session: DeviceSessionDTO,
    saleId: string,
): Promise<ServiceResponse<SaleResponse | null>> => {
    return getSaleDetailsInStore(session.organization.id, session.store.id, saleId);
};

export const createDraftSaleForDevice = async (
    session: DeviceSessionDTO,
    saleData: CreateDraftSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    return createDraftSaleInStore(
        { deviceId: session.device.id },
        session.organization.id,
        session.store.id,
        saleData,
    );
};

export const updateDraftSaleForDevice = async (
    session: DeviceSessionDTO,
    saleId: string,
    saleData: UpdateDraftSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    return updateDraftSaleInStore(
        { deviceId: session.device.id },
        session.organization.id,
        session.store.id,
        saleId,
        saleData,
    );
};

export const commitSaleForDevice = async (
    session: DeviceSessionDTO,
    saleId: string,
    commitData: CommitSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    return commitSaleInStore(
        { deviceId: session.device.id },
        session.organization.id,
        session.store.id,
        saleId,
        commitData,
    );
};

export const collectPaymentForDevice = async (
    session: DeviceSessionDTO,
    saleId: string,
    paymentData: CreatePaymentSVC,
): Promise<ServiceResponse<PaymentResponse | null>> => {
    return collectPaymentInStore(
        { deviceId: session.device.id },
        session.organization.id,
        session.store.id,
        saleId,
        paymentData,
    );
};

export const voidSaleForDevice = async (
    session: DeviceSessionDTO,
    saleId: string,
    voidData: VoidSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    return voidSaleInStore(
        { deviceId: session.device.id },
        session.organization.id,
        session.store.id,
        saleId,
        voidData,
    );
};
