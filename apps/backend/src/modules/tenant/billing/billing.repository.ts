import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    CreateCustomerLedgerEntryREPO,
    CreateCustomerREPO,
    CreatePaymentREPO,
    CreateSaleItemREPO,
    CreateSaleREPO,
    CustomerDTO,
    CustomerLedgerEntryDTO,
    PaymentDTO,
    SaleItemDTO,
    SaleSummaryDTO,
    SalesListQuery,
    UpdateCustomerREPO,
    UpdateSaleREPO,
} from "@repo/types";

const mapRow = <T>(row: Record<string, unknown>) => snakeToCamel(row) as T;

type SaleSummaryRow = Record<string, unknown> & {
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_balance?: number | string | null;
    customer_is_active?: boolean | null;
};

const mapSaleSummaryRow = (row: SaleSummaryRow): SaleSummaryDTO => {
    const summary = mapRow<Record<string, unknown>>(row);
    const customerId = summary.customerId as string | null | undefined;
    const customerName = summary.customerName as string | null | undefined;
    const customerPhone = summary.customerPhone as string | null | undefined;
    const customerBalance = summary.customerBalance as number | null | undefined;
    const customerIsActive = summary.customerIsActive as boolean | null | undefined;

    const customer = customerId
        ? {
            id: customerId,
            name: customerName ?? "",
            phone: customerPhone ?? null,
            balance: Number(customerBalance ?? 0),
            isActive: Boolean(customerIsActive ?? true),
        }
        : null;

    delete summary.customerName;
    delete summary.customerPhone;
    delete summary.customerBalance;
    delete summary.customerIsActive;

    return {
        ...(summary as Omit<SaleSummaryDTO, "customer">),
        paidTotal: Number(summary.paidTotal ?? 0),
        dueTotal: Number(summary.dueTotal ?? 0),
        subtotal: Number(summary.subtotal ?? 0),
        discountTotal: Number(summary.discountTotal ?? 0),
        grandTotal: Number(summary.grandTotal ?? 0),
        itemCount: Number(summary.itemCount ?? 0),
        customer,
    };
};

export const createCustomer = async (
    customerData: CreateCustomerREPO,
    tx?: Bun.TransactionSQL,
): Promise<CustomerDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO customers ${camelToSnakeSql(customerData)}
        RETURNING *
    `;

    return result ? mapRow<CustomerDTO>(result) : null;
};

export const updateCustomer = async (
    customerData: UpdateCustomerREPO,
): Promise<CustomerDTO | null> => {
    const [result] = await pg`
        UPDATE customers
        SET name = ${customerData.name},
            phone = ${customerData.phone ?? null},
            is_active = ${customerData.isActive},
            updated_by = ${customerData.updatedBy ?? null},
            updated_at = NOW()
        WHERE id = ${customerData.id}
          AND organization_id = ${customerData.organizationId}
        RETURNING *
    `;

    return result ? mapRow<CustomerDTO>(result) : null;
};

export const getCustomersByOrganizationId = async (
    organizationId: string,
    query: SalesListQuery | { search?: string; limit?: number },
): Promise<CustomerDTO[]> => {
    const search = query.search?.trim() || null;
    const searchPattern = search ? `%${search}%` : null;
    const limit = query.limit ?? 50;

    const results = await pg`
        SELECT *
        FROM customers
        WHERE organization_id = ${organizationId}
          AND (
              ${search} IS NULL
              OR name ILIKE ${searchPattern}
              OR COALESCE(phone, '') ILIKE ${searchPattern}
          )
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;

    return results.map((result: Record<string, unknown>) => mapRow<CustomerDTO>(result));
};

export const getCustomerById = async (
    organizationId: string,
    customerId: string,
): Promise<CustomerDTO | null> => {
    const [result] = await pg`
        SELECT *
        FROM customers
        WHERE id = ${customerId}
          AND organization_id = ${organizationId}
    `;

    return result ? mapRow<CustomerDTO>(result) : null;
};

export const customerPhoneExistsInOrganization = async (
    organizationId: string,
    phone: string,
    excludeId?: string,
): Promise<boolean> => {
    const [result] = excludeId
        ? await pg`
            SELECT 1
            FROM customers
            WHERE organization_id = ${organizationId}
              AND phone = ${phone}
              AND id <> ${excludeId}
            LIMIT 1
        `
        : await pg`
            SELECT 1
            FROM customers
            WHERE organization_id = ${organizationId}
              AND phone = ${phone}
            LIMIT 1
        `;

    return Boolean(result);
};

export const getCustomerLedgerByCustomerId = async (
    organizationId: string,
    customerId: string,
): Promise<CustomerLedgerEntryDTO[]> => {
    const results = await pg`
        SELECT *
        FROM customer_ledger
        WHERE organization_id = ${organizationId}
          AND customer_id = ${customerId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<CustomerLedgerEntryDTO>(result));
};

export const createSale = async (
    saleData: CreateSaleREPO,
    tx?: Bun.TransactionSQL,
): Promise<SaleSummaryDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO sales ${camelToSnakeSql(saleData)}
        RETURNING *
    `;

    return result ? mapSaleSummaryRow(result as SaleSummaryRow) : null;
};

export const updateSale = async (
    saleData: UpdateSaleREPO,
    tx?: Bun.TransactionSQL,
): Promise<SaleSummaryDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        UPDATE sales
        SET customer_id = ${saleData.customerId ?? null},
            status = ${saleData.status},
            payment_status = ${saleData.paymentStatus},
            subtotal = ${saleData.subtotal},
            discount_total = ${saleData.discountTotal},
            grand_total = ${saleData.grandTotal},
            notes = ${saleData.notes ?? null},
            committed_at = ${saleData.committedAt ?? null},
            sale_number = ${saleData.saleNumber ?? null},
            voided_at = ${saleData.voidedAt ?? null},
            void_reason = ${saleData.voidReason ?? null},
            updated_at = NOW()
        WHERE id = ${saleData.id}
          AND organization_id = ${saleData.organizationId}
          AND store_id = ${saleData.storeId}
        RETURNING *
    `;

    return result ? mapSaleSummaryRow(result as SaleSummaryRow) : null;
};

export const getSalesByStore = async (
    organizationId: string,
    storeId: string,
    query: SalesListQuery,
): Promise<SaleSummaryDTO[]> => {
    const search = query.search?.trim() ?? "";
    const searchPattern = search ? `%${search}%` : "";
    const status = query.status ?? "";
    const paymentStatus = query.paymentStatus ?? "";
    const customerId = query.customerId ?? "";
    const limit = query.limit ?? 50;

    const results = await pg`
        SELECT
            s.*,
            COALESCE(item_stats.item_count, 0) AS item_count,
            COALESCE(payment_stats.paid_total, 0) AS paid_total,
            GREATEST(s.grand_total - COALESCE(payment_stats.paid_total, 0), 0) AS due_total,
            c.name AS customer_name,
            c.phone AS customer_phone,
            c.balance AS customer_balance,
            c.is_active AS customer_is_active
        FROM sales s
        LEFT JOIN customers c
            ON c.id = s.customer_id
        LEFT JOIN (
            SELECT sale_id, COUNT(*)::int AS item_count
            FROM sale_items
            GROUP BY sale_id
        ) item_stats
            ON item_stats.sale_id = s.id
        LEFT JOIN (
            SELECT sale_id, COALESCE(SUM(amount), 0) AS paid_total
            FROM payments
            GROUP BY sale_id
        ) payment_stats
            ON payment_stats.sale_id = s.id
        WHERE s.organization_id = ${organizationId}
          AND s.store_id = ${storeId}
          AND (${status} = '' OR s.status::text = ${status})
          AND (${paymentStatus} = '' OR s.payment_status::text = ${paymentStatus})
          AND (${customerId} = '' OR s.customer_id::text = ${customerId})
          AND (
              ${search} = ''
              OR CAST(s.sale_number AS TEXT) ILIKE ${searchPattern}
              OR COALESCE(c.name, '') ILIKE ${searchPattern}
              OR COALESCE(c.phone, '') ILIKE ${searchPattern}
          )
        ORDER BY s.created_at DESC
        LIMIT ${limit}
    `;

    return results.map((result: Record<string, unknown>) => mapSaleSummaryRow(result as SaleSummaryRow));
};

export const getSaleById = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    tx?: Bun.TransactionSQL,
): Promise<SaleSummaryDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT
            s.*,
            COALESCE(item_stats.item_count, 0) AS item_count,
            COALESCE(payment_stats.paid_total, 0) AS paid_total,
            GREATEST(s.grand_total - COALESCE(payment_stats.paid_total, 0), 0) AS due_total,
            c.name AS customer_name,
            c.phone AS customer_phone,
            c.balance AS customer_balance,
            c.is_active AS customer_is_active
        FROM sales s
        LEFT JOIN customers c
            ON c.id = s.customer_id
        LEFT JOIN (
            SELECT sale_id, COUNT(*)::int AS item_count
            FROM sale_items
            GROUP BY sale_id
        ) item_stats
            ON item_stats.sale_id = s.id
        LEFT JOIN (
            SELECT sale_id, COALESCE(SUM(amount), 0) AS paid_total
            FROM payments
            GROUP BY sale_id
        ) payment_stats
            ON payment_stats.sale_id = s.id
        WHERE s.organization_id = ${organizationId}
          AND s.store_id = ${storeId}
          AND s.id = ${saleId}
    `;

    return result ? mapSaleSummaryRow(result as SaleSummaryRow) : null;
};

export const createSaleItem = async (
    saleItemData: CreateSaleItemREPO,
    tx?: Bun.TransactionSQL,
): Promise<SaleItemDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO sale_items ${camelToSnakeSql(saleItemData)}
        RETURNING *
    `;

    return result ? mapRow<SaleItemDTO>(result) : null;
};

export const deleteSaleItemsBySaleId = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    tx?: Bun.TransactionSQL,
): Promise<void> => {
    const db = tx || pg;
    await db`
        DELETE FROM sale_items
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND sale_id = ${saleId}
    `;
};

export const getSaleItemsBySaleId = async (
    saleId: string,
    tx?: Bun.TransactionSQL,
): Promise<SaleItemDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM sale_items
        WHERE sale_id = ${saleId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<SaleItemDTO>(result));
};

export const createPayment = async (
    paymentData: CreatePaymentREPO,
    tx?: Bun.TransactionSQL,
): Promise<PaymentDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO payments ${camelToSnakeSql(paymentData)}
        RETURNING *
    `;

    return result ? mapRow<PaymentDTO>(result) : null;
};

export const getPaymentsBySaleId = async (
    saleId: string,
    tx?: Bun.TransactionSQL,
): Promise<PaymentDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM payments
        WHERE sale_id = ${saleId}
        ORDER BY collected_at ASC, created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<PaymentDTO>(result));
};

export const getPaidTotalBySaleId = async (
    saleId: string,
    tx?: Bun.TransactionSQL,
): Promise<number> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE sale_id = ${saleId}
    `;

    return Number(result?.total ?? 0);
};

export const countPaymentsBySaleId = async (
    saleId: string,
    tx?: Bun.TransactionSQL,
): Promise<number> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT COUNT(*)::int AS total
        FROM payments
        WHERE sale_id = ${saleId}
    `;

    return Number(result?.total ?? 0);
};

export const createCustomerLedgerEntry = async (
    entryData: CreateCustomerLedgerEntryREPO,
    tx?: Bun.TransactionSQL,
): Promise<CustomerLedgerEntryDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO customer_ledger ${camelToSnakeSql(entryData)}
        RETURNING *
    `;

    return result ? mapRow<CustomerLedgerEntryDTO>(result) : null;
};

export const updateCustomerBalance = async (
    organizationId: string,
    customerId: string,
    balance: number,
    tx?: Bun.TransactionSQL,
): Promise<CustomerDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        UPDATE customers
        SET balance = ${balance},
            updated_at = NOW()
        WHERE id = ${customerId}
          AND organization_id = ${organizationId}
        RETURNING *
    `;

    return result ? mapRow<CustomerDTO>(result) : null;
};

export const incrementStoreSaleCounter = async (
    organizationId: string,
    storeId: string,
    tx?: Bun.TransactionSQL,
): Promise<number> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO store_sale_counters (
            store_id,
            organization_id,
            next_sale_number
        ) VALUES (
            ${storeId},
            ${organizationId},
            2
        )
        ON CONFLICT (store_id)
        DO UPDATE SET
            next_sale_number = store_sale_counters.next_sale_number + 1,
            updated_at = NOW()
        RETURNING next_sale_number - 1 AS sale_number
    `;

    return Number(result?.sale_number ?? 1);
};
