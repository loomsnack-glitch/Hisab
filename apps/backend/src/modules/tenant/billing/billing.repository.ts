import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    AddOnScopedSalesRollupDTO,
    CreateCustomerLedgerEntryREPO,
    CreateCustomerREPO,
    CreatePaymentREPO,
    CreateSaleItemAddOnREPO,
    CreateSaleItemREPO,
    CreateSaleREPO,
    CustomerDTO,
    CustomerLedgerEntryDTO,
    ParentScopedAddOnSalesRollupDTO,
    PaymentDTO,
    SaleItemAddOnDTO,
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
    created_by_device_name?: string | null;
    updated_by_device_name?: string | null;
};

const mapSaleSummaryRow = (row: SaleSummaryRow): SaleSummaryDTO => {
    const summary = mapRow<Record<string, unknown>>(row);
    const customerId = summary.customerId as string | null | undefined;
    const customerName = summary.customerName as string | null | undefined;
    const customerPhone = summary.customerPhone as string | null | undefined;
    const customerBalance = summary.customerBalance as number | null | undefined;
    const customerIsActive = summary.customerIsActive as boolean | null | undefined;
    const createdByDeviceId = summary.createdByDeviceId as string | null | undefined;
    const createdByDeviceName = summary.createdByDeviceName as string | null | undefined;
    const updatedByDeviceId = summary.updatedByDeviceId as string | null | undefined;
    const updatedByDeviceName = summary.updatedByDeviceName as string | null | undefined;

    const customer = customerId
        ? {
            id: customerId,
            name: customerName ?? "",
            phone: customerPhone ?? null,
            balance: Number(customerBalance ?? 0),
            isActive: Boolean(customerIsActive ?? true),
        }
        : null;
    const createdByDevice = createdByDeviceId
        ? {
            id: createdByDeviceId,
            name: createdByDeviceName ?? "",
        }
        : null;
    const updatedByDevice = updatedByDeviceId
        ? {
            id: updatedByDeviceId,
            name: updatedByDeviceName ?? "",
        }
        : null;

    delete summary.customerName;
    delete summary.customerPhone;
    delete summary.customerBalance;
    delete summary.customerIsActive;
    delete summary.createdByDeviceName;
    delete summary.updatedByDeviceName;

    return {
        ...(summary as Omit<SaleSummaryDTO, "customer">),
        paidTotal: Number(summary.paidTotal ?? 0),
        dueTotal: Number(summary.dueTotal ?? 0),
        subtotal: Number(summary.subtotal ?? 0),
        discountTotal: Number(summary.discountTotal ?? 0),
        grandTotal: Number(summary.grandTotal ?? 0),
        itemCount: Number(summary.itemCount ?? 0),
        itemsSummary: (summary.itemsSummary as string | undefined | null) ?? null,
        paymentMethods: (summary.paymentMethods as string | undefined | null) ?? null,
        customer,
        createdByDevice,
        updatedByDevice,
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
    const search = query.search?.trim() ?? "";
    const searchPattern = search ? `%${search}%` : "";
    const limit = query.limit ?? 50;

    const results = await pg`
        SELECT *
        FROM customers
        WHERE organization_id = ${organizationId}
          AND (
              ${search} = ''
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
            updated_by_device_id = ${saleData.updatedByDeviceId ?? null},
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
            COALESCE(item_stats.items_summary, '') AS items_summary,
            COALESCE(payment_stats.payment_methods, '') AS payment_methods,
            COALESCE(payment_stats.paid_total, 0) AS paid_total,
            GREATEST(s.grand_total - COALESCE(payment_stats.paid_total, 0), 0) AS due_total,
            c.name AS customer_name,
            c.phone AS customer_phone,
            c.balance AS customer_balance,
            c.is_active AS customer_is_active,
            created_device.name AS created_by_device_name,
            updated_device.name AS updated_by_device_name
        FROM sales s
        LEFT JOIN customers c
            ON c.id = s.customer_id
        LEFT JOIN store_devices created_device
            ON created_device.id = s.created_by_device_id
           AND created_device.organization_id = s.organization_id
           AND created_device.store_id = s.store_id
        LEFT JOIN store_devices updated_device
            ON updated_device.id = s.updated_by_device_id
           AND updated_device.organization_id = s.organization_id
           AND updated_device.store_id = s.store_id
        LEFT JOIN (
            SELECT 
                sale_id, 
                COUNT(*)::int AS item_count,
                STRING_AGG(product_name_snapshot, ', ') AS items_summary
            FROM sale_items
            GROUP BY sale_id
        ) item_stats
            ON item_stats.sale_id = s.id
        LEFT JOIN (
            SELECT 
                sale_id, 
                COALESCE(SUM(amount), 0) AS paid_total,
                STRING_AGG(DISTINCT method::text, ', ') AS payment_methods
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
            COALESCE(item_stats.items_summary, '') AS items_summary,
            COALESCE(payment_stats.payment_methods, '') AS payment_methods,
            COALESCE(payment_stats.paid_total, 0) AS paid_total,
            GREATEST(s.grand_total - COALESCE(payment_stats.paid_total, 0), 0) AS due_total,
            c.name AS customer_name,
            c.phone AS customer_phone,
            c.balance AS customer_balance,
            c.is_active AS customer_is_active,
            created_device.name AS created_by_device_name,
            updated_device.name AS updated_by_device_name
        FROM sales s
        LEFT JOIN customers c
            ON c.id = s.customer_id
        LEFT JOIN store_devices created_device
            ON created_device.id = s.created_by_device_id
           AND created_device.organization_id = s.organization_id
           AND created_device.store_id = s.store_id
        LEFT JOIN store_devices updated_device
            ON updated_device.id = s.updated_by_device_id
           AND updated_device.organization_id = s.organization_id
           AND updated_device.store_id = s.store_id
        LEFT JOIN (
            SELECT 
                sale_id, 
                COUNT(*)::int AS item_count,
                STRING_AGG(product_name_snapshot, ', ') AS items_summary
            FROM sale_items
            GROUP BY sale_id
        ) item_stats
            ON item_stats.sale_id = s.id
        LEFT JOIN (
            SELECT 
                sale_id, 
                COALESCE(SUM(amount), 0) AS paid_total,
                STRING_AGG(DISTINCT method::text, ', ') AS payment_methods
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

    return result
        ? {
            ...mapRow<Omit<SaleItemDTO, "addOns">>(result),
            addOns: [],
        }
        : null;
};

export const createSaleItemAddOn = async (
    saleItemAddOnData: CreateSaleItemAddOnREPO,
    tx?: Bun.TransactionSQL,
): Promise<SaleItemAddOnDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO sale_item_add_ons ${camelToSnakeSql(saleItemAddOnData)}
        RETURNING *
    `;

    return result ? mapRow<SaleItemAddOnDTO>(result) : null;
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

export const getSaleItemAddOnsBySaleId = async (
    saleId: string,
    tx?: Bun.TransactionSQL,
): Promise<SaleItemAddOnDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM sale_item_add_ons
        WHERE sale_id = ${saleId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<SaleItemAddOnDTO>(result));
};

export const getSaleItemsBySaleId = async (
    saleId: string,
    tx?: Bun.TransactionSQL,
): Promise<SaleItemDTO[]> => {
    const db = tx || pg;
    const [itemResults, addOnResults] = await Promise.all([
        db`
            SELECT *
            FROM sale_items
            WHERE sale_id = ${saleId}
            ORDER BY created_at ASC
        `,
        getSaleItemAddOnsBySaleId(saleId, tx),
    ]);

    const addOnsBySaleItemId = new Map<string, SaleItemAddOnDTO[]>();
    for (const addOn of addOnResults) {
        const existing = addOnsBySaleItemId.get(addOn.saleItemId) ?? [];
        existing.push(addOn);
        addOnsBySaleItemId.set(addOn.saleItemId, existing);
    }

    return itemResults.map((result: Record<string, unknown>) => {
        const item = mapRow<Omit<SaleItemDTO, "addOns">>(result);
        return {
            ...item,
            configurationSignature: String(item.configurationSignature ?? ""),
            addOns: addOnsBySaleItemId.get(item.id) ?? [],
        };
    });
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

export const getParentScopedAddOnSalesRollups = async (
    organizationId: string,
    storeId: string,
): Promise<ParentScopedAddOnSalesRollupDTO[]> => {
    const results = await pg`
        SELECT
            si.product_id,
            MAX(si.product_name_snapshot) AS product_name_snapshot,
            sia.add_on_id,
            MAX(sia.add_on_name_snapshot) AS add_on_name_snapshot,
            SUM(sia.total_quantity)::int AS total_quantity,
            COALESCE(SUM(sia.line_subtotal), 0) AS line_subtotal,
            COALESCE(SUM(sia.discount_amount), 0) AS discount_amount,
            COALESCE(SUM(sia.line_total), 0) AS line_total
        FROM sale_item_add_ons sia
        INNER JOIN sale_items si
            ON si.id = sia.sale_item_id
           AND si.organization_id = sia.organization_id
           AND si.store_id = sia.store_id
           AND si.sale_id = sia.sale_id
        INNER JOIN sales s
            ON s.id = sia.sale_id
           AND s.organization_id = sia.organization_id
           AND s.store_id = sia.store_id
        WHERE sia.organization_id = ${organizationId}
          AND sia.store_id = ${storeId}
          AND s.status = 'completed'
        GROUP BY si.product_id, sia.add_on_id
        ORDER BY
            MAX(si.product_name_snapshot) ASC,
            MAX(sia.add_on_name_snapshot) ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<ParentScopedAddOnSalesRollupDTO>(result));
};

export const getAddOnScopedSalesRollups = async (
    organizationId: string,
    storeId: string,
): Promise<AddOnScopedSalesRollupDTO[]> => {
    const results = await pg`
        SELECT
            sia.add_on_id,
            MAX(sia.add_on_name_snapshot) AS add_on_name_snapshot,
            SUM(sia.total_quantity)::int AS total_quantity,
            COALESCE(SUM(sia.line_subtotal), 0) AS line_subtotal,
            COALESCE(SUM(sia.discount_amount), 0) AS discount_amount,
            COALESCE(SUM(sia.line_total), 0) AS line_total,
            COUNT(DISTINCT si.product_id)::int AS parent_product_count
        FROM sale_item_add_ons sia
        INNER JOIN sale_items si
            ON si.id = sia.sale_item_id
           AND si.organization_id = sia.organization_id
           AND si.store_id = sia.store_id
           AND si.sale_id = sia.sale_id
        INNER JOIN sales s
            ON s.id = sia.sale_id
           AND s.organization_id = sia.organization_id
           AND s.store_id = sia.store_id
        WHERE sia.organization_id = ${organizationId}
          AND sia.store_id = ${storeId}
          AND s.status = 'completed'
        GROUP BY sia.add_on_id
        ORDER BY MAX(sia.add_on_name_snapshot) ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<AddOnScopedSalesRollupDTO>(result));
};
