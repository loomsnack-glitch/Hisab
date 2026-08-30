import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    CreateVendorItemREPO,
    CreateVendorREPO,
    VendorDTO,
    VendorItemDTO,
    UpdateVendorItemREPO,
    UpdateVendorREPO,
} from "@repo/types";

const mapVendor = (row: Record<string, unknown>): VendorDTO =>
    snakeToCamel(row) as VendorDTO;

const mapVendorItem = (row: Record<string, unknown>): VendorItemDTO => {
    const mapped = snakeToCamel(row) as VendorItemDTO;
    return {
        ...mapped,
        defaultPurchasePrice: Number(mapped.defaultPurchasePrice),
    };
};

export const getVendorsByOrganizationId = async (
    organizationId: string,
    tx?: Bun.TransactionSQL,
): Promise<VendorDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM vendors
        WHERE organization_id = ${organizationId}
        ORDER BY lower(name) ASC
    `;

    return results.map((result: Record<string, unknown>) => mapVendor(result));
};

export const getVendorById = async (
    organizationId: string,
    vendorId: string,
    tx?: Bun.TransactionSQL,
): Promise<VendorDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM vendors
        WHERE id = ${vendorId}
          AND organization_id = ${organizationId}
    `;

    return result ? mapVendor(result) : null;
};

export const createVendor = async (
    vendorData: CreateVendorREPO,
    tx?: Bun.TransactionSQL,
): Promise<VendorDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO vendors ${camelToSnakeSql(vendorData)}
        RETURNING *
    `;

    return result ? mapVendor(result) : null;
};

export const updateVendor = async (vendorData: UpdateVendorREPO): Promise<VendorDTO | null> => {
    const [result] = await pg`
        UPDATE vendors
        SET name = ${vendorData.name},
            description = ${vendorData.description},
            status = ${vendorData.status},
            updated_by = ${vendorData.updatedBy},
            updated_at = NOW()
        WHERE id = ${vendorData.id}
          AND organization_id = ${vendorData.organizationId}
        RETURNING *
    `;

    return result ? mapVendor(result) : null;
};

export const getVendorItemsByOrganizationId = async (
    organizationId: string,
    tx?: Bun.TransactionSQL,
): Promise<VendorItemDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT vendor_items.*
        FROM vendor_items
        INNER JOIN vendors
            ON vendors.id = vendor_items.vendor_id
           AND vendors.organization_id = vendor_items.organization_id
        WHERE vendor_items.organization_id = ${organizationId}
        ORDER BY lower(vendors.name) ASC, lower(vendor_items.name) ASC
    `;

    return results.map((result: Record<string, unknown>) => mapVendorItem(result));
};

export const getVendorItemById = async (
    organizationId: string,
    vendorItemId: string,
    tx?: Bun.TransactionSQL,
): Promise<VendorItemDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM vendor_items
        WHERE id = ${vendorItemId}
          AND organization_id = ${organizationId}
    `;

    return result ? mapVendorItem(result) : null;
};

export const createVendorItem = async (
    vendorItemData: CreateVendorItemREPO,
    tx?: Bun.TransactionSQL,
): Promise<VendorItemDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO vendor_items ${camelToSnakeSql(vendorItemData)}
        RETURNING *
    `;

    return result ? mapVendorItem(result) : null;
};

export const updateVendorItem = async (
    vendorItemData: UpdateVendorItemREPO,
): Promise<VendorItemDTO | null> => {
    const [result] = await pg`
        UPDATE vendor_items
        SET name = ${vendorItemData.name},
            unit_id = ${vendorItemData.unitId},
            default_purchase_price = ${vendorItemData.defaultPurchasePrice},
            status = ${vendorItemData.status},
            updated_by = ${vendorItemData.updatedBy},
            updated_at = NOW()
        WHERE id = ${vendorItemData.id}
          AND organization_id = ${vendorItemData.organizationId}
        RETURNING *
    `;

    return result ? mapVendorItem(result) : null;
};
