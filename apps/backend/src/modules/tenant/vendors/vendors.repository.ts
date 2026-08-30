import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type { CreateVendorREPO, VendorDTO, UpdateVendorREPO } from "@repo/types";

const mapVendor = (row: Record<string, unknown>): VendorDTO =>
    snakeToCamel(row) as VendorDTO;

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
