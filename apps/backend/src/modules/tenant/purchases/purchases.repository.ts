import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    CreatePurchaseLineREPO,
    CreatePurchaseREPO,
    PurchaseDTO,
    PurchaseLineDTO,
    UpdatePurchaseREPO,
} from "@repo/types";

const toMoneyAmount = (value: unknown): number => {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) {
        return 0;
    }
    return Math.round((amount + Number.EPSILON) * 100) / 100;
};

const toQuantity = (value: unknown): number => {
    const quantity = Number(value ?? 0);
    if (!Number.isFinite(quantity)) {
        return 0;
    }
    return Math.round((quantity + Number.EPSILON) * 1000) / 1000;
};

const toDateOnly = (value: unknown): string => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    return String(value ?? "");
};

const mapPurchaseLine = (row: Record<string, unknown>): PurchaseLineDTO => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    const { position: _position, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = mapped;
    return {
        ...(rest as Omit<PurchaseLineDTO, "quantity" | "agreedUnitPrice" | "lineTotal">),
        quantity: toQuantity(mapped.quantity),
        agreedUnitPrice: toMoneyAmount(mapped.agreedUnitPrice),
        lineTotal: toMoneyAmount(mapped.lineTotal),
    };
};

const mapPurchaseHeader = (row: Record<string, unknown>): Omit<PurchaseDTO, "lines"> => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    return {
        ...(mapped as Omit<
            PurchaseDTO,
            | "lines"
            | "effectiveDate"
            | "adjustment"
            | "linesTotal"
            | "total"
            | "paidTotal"
            | "dueAmount"
        >),
        effectiveDate: toDateOnly(mapped.effectiveDate),
        adjustment: toMoneyAmount(mapped.adjustment),
        linesTotal: toMoneyAmount(mapped.linesTotal),
        total: toMoneyAmount(mapped.total),
        paidTotal: toMoneyAmount(mapped.paidTotal),
        dueAmount: mapped.dueAmount === null ? null : toMoneyAmount(mapped.dueAmount),
    };
};

const attachLines = (
    purchases: Array<Omit<PurchaseDTO, "lines">>,
    lines: PurchaseLineDTO[],
): PurchaseDTO[] => {
    const linesByPurchaseId = new Map<string, PurchaseLineDTO[]>();
    for (const line of lines) {
        const current = linesByPurchaseId.get(line.purchaseId) ?? [];
        current.push(line);
        linesByPurchaseId.set(line.purchaseId, current);
    }

    return purchases.map((purchase) => ({
        ...purchase,
        lines: linesByPurchaseId.get(purchase.id) ?? [],
    }));
};

const purchaseSelect = `
    purchases.id,
    purchases.organization_id,
    purchases.store_id,
    stores.name AS store_name,
    purchases.vendor_id,
    purchases.vendor_name,
    purchases.lifecycle,
    purchases.payable_status,
    to_char(purchases.effective_date, 'YYYY-MM-DD') AS effective_date,
    purchases.invoice_reference,
    purchases.notes,
    purchases.adjustment,
    purchases.lines_total,
    purchases.total,
    purchases.paid_total,
    purchases.due_amount,
    purchases.recorded_at,
    purchases.created_by,
    purchases.updated_by,
    purchases.created_at,
    purchases.updated_at
`;

export const getPurchaseLinesByPurchaseIds = async (
    organizationId: string,
    purchaseIds: string[],
    tx?: Bun.TransactionSQL,
): Promise<PurchaseLineDTO[]> => {
    if (purchaseIds.length === 0) {
        return [];
    }

    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM purchase_lines
        WHERE organization_id = ${organizationId}
          AND purchase_id IN ${db(purchaseIds)}
        ORDER BY position ASC
    `;

    return results.map((result: Record<string, unknown>) => mapPurchaseLine(result));
};

export const getPurchasesByOrganizationId = async (
    organizationId: string,
    tx?: Bun.TransactionSQL,
): Promise<PurchaseDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT ${db.unsafe(purchaseSelect)}
        FROM purchases
        INNER JOIN stores
            ON stores.id = purchases.store_id
           AND stores.organization_id = purchases.organization_id
        WHERE purchases.organization_id = ${organizationId}
        ORDER BY purchases.effective_date DESC, purchases.created_at DESC
    `;

    const headers: Array<Omit<PurchaseDTO, "lines">> = results.map(
        (result: Record<string, unknown>) => mapPurchaseHeader(result),
    );
    const lines = await getPurchaseLinesByPurchaseIds(
        organizationId,
        headers.map((purchase) => purchase.id),
        tx,
    );
    return attachLines(headers, lines);
};

export const getPurchaseById = async (
    organizationId: string,
    purchaseId: string,
    tx?: Bun.TransactionSQL,
): Promise<PurchaseDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT ${db.unsafe(purchaseSelect)}
        FROM purchases
        INNER JOIN stores
            ON stores.id = purchases.store_id
           AND stores.organization_id = purchases.organization_id
        WHERE purchases.id = ${purchaseId}
          AND purchases.organization_id = ${organizationId}
    `;

    if (!result) {
        return null;
    }

    const header = mapPurchaseHeader(result as Record<string, unknown>);
    const lines = await getPurchaseLinesByPurchaseIds(organizationId, [purchaseId], tx);
    return attachLines([header], lines)[0] ?? null;
};

export const createPurchase = async (
    purchaseData: CreatePurchaseREPO,
    tx?: Bun.TransactionSQL,
): Promise<PurchaseDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO purchases ${camelToSnakeSql(purchaseData)}
        RETURNING *
    `;

    if (!result) {
        return null;
    }

    return getPurchaseById(purchaseData.organizationId, purchaseData.id, tx);
};

export const updatePurchase = async (
    purchaseData: UpdatePurchaseREPO,
    tx?: Bun.TransactionSQL,
): Promise<PurchaseDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        UPDATE purchases
        SET store_id = ${purchaseData.storeId},
            vendor_id = ${purchaseData.vendorId},
            vendor_name = ${purchaseData.vendorName},
            lifecycle = ${purchaseData.lifecycle},
            payable_status = ${purchaseData.payableStatus},
            effective_date = ${purchaseData.effectiveDate},
            invoice_reference = ${purchaseData.invoiceReference},
            notes = ${purchaseData.notes},
            adjustment = ${purchaseData.adjustment},
            lines_total = ${purchaseData.linesTotal},
            total = ${purchaseData.total},
            paid_total = ${purchaseData.paidTotal},
            due_amount = ${purchaseData.dueAmount},
            recorded_at = ${purchaseData.recordedAt},
            updated_by = ${purchaseData.updatedBy},
            updated_at = NOW()
        WHERE id = ${purchaseData.id}
          AND organization_id = ${purchaseData.organizationId}
        RETURNING *
    `;

    if (!result) {
        return null;
    }

    return getPurchaseById(purchaseData.organizationId, purchaseData.id, tx);
};

export const replacePurchaseLines = async (
    organizationId: string,
    purchaseId: string,
    lines: CreatePurchaseLineREPO[],
    tx?: Bun.TransactionSQL,
): Promise<PurchaseLineDTO[]> => {
    const db = tx || pg;
    await db`
        DELETE FROM purchase_lines
        WHERE organization_id = ${organizationId}
          AND purchase_id = ${purchaseId}
    `;

    const created: PurchaseLineDTO[] = [];
    for (const [index, line] of lines.entries()) {
        const [result] = await db`
            INSERT INTO purchase_lines ${camelToSnakeSql({
                ...line,
                position: index + 1,
            })}
            RETURNING *
        `;
        if (!result) {
            throw new Error("Failed to save Purchase Line");
        }
        created.push(mapPurchaseLine(result as Record<string, unknown>));
    }

    return created;
};

export const deletePurchase = async (
    organizationId: string,
    purchaseId: string,
    tx?: Bun.TransactionSQL,
): Promise<boolean> => {
    const db = tx || pg;
    const result = await db`
        DELETE FROM purchases
        WHERE id = ${purchaseId}
          AND organization_id = ${organizationId}
        RETURNING id
    `;

    return Boolean(result[0]);
};
