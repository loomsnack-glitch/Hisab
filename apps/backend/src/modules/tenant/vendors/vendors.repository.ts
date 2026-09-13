import { sql } from "bun";
import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import {
    DEFAULT_TABLE_PAGE_SIZE,
    type CreateStoreVendorAvailabilityREPO,
    CreateStoreVendorItemOfferingREPO,
    CreateVendorItemREPO,
    CreateVendorREPO,
    StoreVendorAvailabilityDTO,
    StoreVendorItemOfferingDTO,
    VendorDTO,
    VendorItemDTO,
    VendorItemListQuery,
    VendorListPageInfo,
    VendorListQuery,
    UpdateStoreVendorItemOfferingREPO,
    UpdateVendorItemREPO,
    UpdateVendorREPO,
    UpdateStoreVendorAvailabilityREPO,
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

const buildVendorSearchClause = (search: string) => {
    if (!search) {
        return sql``;
    }

    const searchPattern = `%${search}%`;
    return sql`AND (
        v.name ILIKE ${searchPattern}
        OR COALESCE(v.description, '') ILIKE ${searchPattern}
    )`;
};

const buildVendorStatusClause = (statuses: Array<"active" | "inactive">) => {
    if (statuses.length === 0 || statuses.length >= 2) {
        return sql``;
    }

    return sql`AND v.status = ${statuses[0]}`;
};

export const getVendorsPageByOrganizationId = async (
    organizationId: string,
    query: VendorListQuery,
): Promise<{
    vendors: VendorDTO[];
    pageInfo: VendorListPageInfo;
}> => {
    const search = query.search?.trim() ?? "";
    const statuses = query.statuses ?? [];
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_TABLE_PAGE_SIZE;
    const offset = (page - 1) * limit;
    const searchClause = buildVendorSearchClause(search);
    const statusClause = buildVendorStatusClause(statuses);

    const results = await pg`
        SELECT v.*, COUNT(*) OVER() AS total_count
        FROM vendors v
        WHERE v.organization_id = ${organizationId}
          ${searchClause}
          ${statusClause}
        ORDER BY lower(v.name) ASC
        LIMIT ${limit}
        OFFSET ${offset}
    `;

    const vendors = results.map((result: Record<string, unknown>) => {
        const { total_count: _totalCount, ...vendorRow } = result;
        return mapVendor(vendorRow);
    });
    const totalCount = Number(results[0]?.total_count ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return {
        vendors,
        pageInfo: {
            hasMore: offset + vendors.length < totalCount,
            nextCursor: null,
            totalCount,
            page,
            pageSize: limit,
            totalPages,
        },
    };
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

const buildVendorItemSearchClause = (search: string) => {
    if (!search) {
        return sql``;
    }

    const searchPattern = `%${search}%`;
    return sql`AND (
        vendor_items.name ILIKE ${searchPattern}
        OR vendors.name ILIKE ${searchPattern}
        OR COALESCE(units.name, '') ILIKE ${searchPattern}
        OR COALESCE(units.label, '') ILIKE ${searchPattern}
    )`;
};

const buildVendorItemStatusClause = (statuses: Array<"active" | "inactive">) => {
    if (statuses.length === 0 || statuses.length >= 2) {
        return sql``;
    }

    return sql`AND vendor_items.status = ${statuses[0]}`;
};

const buildVendorItemVendorIdsClause = (vendorIds: string[]) => {
    if (vendorIds.length === 0) {
        return sql``;
    }

    return sql`AND vendor_items.vendor_id IN ${sql(vendorIds)}`;
};

export const getVendorItemsPageByOrganizationId = async (
    organizationId: string,
    query: VendorItemListQuery,
): Promise<{
    vendorItems: VendorItemDTO[];
    pageInfo: VendorListPageInfo;
}> => {
    const search = query.search?.trim() ?? "";
    const statuses = query.statuses ?? [];
    const vendorIds = query.vendorIds ?? [];
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_TABLE_PAGE_SIZE;
    const offset = (page - 1) * limit;
    const searchClause = buildVendorItemSearchClause(search);
    const statusClause = buildVendorItemStatusClause(statuses);
    const vendorIdsClause = buildVendorItemVendorIdsClause(vendorIds);

    const results = await pg`
        SELECT vendor_items.*, COUNT(*) OVER() AS total_count
        FROM vendor_items
        INNER JOIN vendors
            ON vendors.id = vendor_items.vendor_id
           AND vendors.organization_id = vendor_items.organization_id
        LEFT JOIN units
            ON units.id = vendor_items.unit_id
           AND units.organization_id = vendor_items.organization_id
        WHERE vendor_items.organization_id = ${organizationId}
          ${searchClause}
          ${statusClause}
          ${vendorIdsClause}
        ORDER BY lower(vendors.name) ASC, lower(vendor_items.name) ASC
        LIMIT ${limit}
        OFFSET ${offset}
    `;

    const vendorItems = results.map((result: Record<string, unknown>) => {
        const { total_count: _totalCount, ...vendorItemRow } = result;
        return mapVendorItem(vendorItemRow);
    });
    const totalCount = Number(results[0]?.total_count ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return {
        vendorItems,
        pageInfo: {
            hasMore: offset + vendorItems.length < totalCount,
            nextCursor: null,
            totalCount,
            page,
            pageSize: limit,
            totalPages,
        },
    };
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

export const getVendorItemsByVendorId = async (
    organizationId: string,
    vendorId: string,
    tx?: Bun.TransactionSQL,
): Promise<VendorItemDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM vendor_items
        WHERE organization_id = ${organizationId}
          AND vendor_id = ${vendorId}
        ORDER BY lower(name) ASC
    `;

    return results.map((result: Record<string, unknown>) => mapVendorItem(result));
};

const STORE_VENDOR_AVAILABILITY_TOPOLOGY_LOCK_ID = 410042;

export const lockStoreVendorAvailabilityTopology = async (
    organizationId: string,
    tx: Bun.TransactionSQL,
) => {
    await tx`
        SELECT pg_advisory_xact_lock(
            ${STORE_VENDOR_AVAILABILITY_TOPOLOGY_LOCK_ID},
            hashtext(${organizationId})
        )
    `;
};

const mapStoreVendorAvailability = (row: Record<string, unknown>): StoreVendorAvailabilityDTO =>
    snakeToCamel(row) as StoreVendorAvailabilityDTO;

const mapStoreVendorItemOffering = (row: Record<string, unknown>): StoreVendorItemOfferingDTO => {
    const mapped = snakeToCamel(row) as StoreVendorItemOfferingDTO;
    return {
        ...mapped,
        defaultPurchasePrice: Number(mapped.defaultPurchasePrice),
    };
};

export const createStoreVendorAvailability = async (
    availabilityData: CreateStoreVendorAvailabilityREPO,
    tx?: Bun.TransactionSQL,
): Promise<StoreVendorAvailabilityDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO store_vendor_availabilities ${camelToSnakeSql(availabilityData)}
        RETURNING *
    `;

    return result ? mapStoreVendorAvailability(result) : null;
};

export const getStoreVendorAvailabilitiesByStoreId = async (
    organizationId: string,
    storeId: string,
    tx?: Bun.TransactionSQL,
): Promise<StoreVendorAvailabilityDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT a.*
        FROM store_vendor_availabilities a
        INNER JOIN vendors v
            ON v.id = a.vendor_id
           AND v.organization_id = a.organization_id
        WHERE a.organization_id = ${organizationId}
          AND a.store_id = ${storeId}
        ORDER BY lower(v.name) ASC
    `;

    return results.map((result: Record<string, unknown>) => mapStoreVendorAvailability(result));
};

export const getStoreVendorAvailabilitiesByVendorId = async (
    organizationId: string,
    vendorId: string,
    tx?: Bun.TransactionSQL,
): Promise<StoreVendorAvailabilityDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM store_vendor_availabilities
        WHERE organization_id = ${organizationId}
          AND vendor_id = ${vendorId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapStoreVendorAvailability(result));
};

export const getStoreVendorAvailabilityById = async (
    organizationId: string,
    storeId: string,
    availabilityId: string,
    tx?: Bun.TransactionSQL,
): Promise<StoreVendorAvailabilityDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM store_vendor_availabilities
        WHERE id = ${availabilityId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;

    return result ? mapStoreVendorAvailability(result) : null;
};

export const getStoreVendorAvailabilityByStoreAndVendor = async (
    organizationId: string,
    storeId: string,
    vendorId: string,
    tx?: Bun.TransactionSQL,
): Promise<StoreVendorAvailabilityDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM store_vendor_availabilities
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND vendor_id = ${vendorId}
    `;

    return result ? mapStoreVendorAvailability(result) : null;
};

export const updateStoreVendorAvailability = async (
    availabilityData: UpdateStoreVendorAvailabilityREPO,
    tx?: Bun.TransactionSQL,
): Promise<StoreVendorAvailabilityDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        UPDATE store_vendor_availabilities
        SET status = ${availabilityData.status},
            updated_by = ${availabilityData.updatedBy},
            updated_at = NOW()
        WHERE id = ${availabilityData.id}
          AND organization_id = ${availabilityData.organizationId}
          AND store_id = ${availabilityData.storeId}
        RETURNING *
    `;

    return result ? mapStoreVendorAvailability(result) : null;
};

export const createStoreVendorItemOffering = async (
    offeringData: CreateStoreVendorItemOfferingREPO,
    tx?: Bun.TransactionSQL,
): Promise<StoreVendorItemOfferingDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO store_vendor_item_offerings ${camelToSnakeSql(offeringData)}
        RETURNING *
    `;

    return result ? mapStoreVendorItemOffering(result) : null;
};

export const getStoreVendorItemOfferingsByStoreId = async (
    organizationId: string,
    storeId: string,
    tx?: Bun.TransactionSQL,
): Promise<StoreVendorItemOfferingDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT o.*
        FROM store_vendor_item_offerings o
        INNER JOIN vendor_items i
            ON i.id = o.vendor_item_id
           AND i.organization_id = o.organization_id
        INNER JOIN vendors v
            ON v.id = o.vendor_id
           AND v.organization_id = o.organization_id
        WHERE o.organization_id = ${organizationId}
          AND o.store_id = ${storeId}
        ORDER BY lower(v.name) ASC, lower(i.name) ASC
    `;

    return results.map((result: Record<string, unknown>) => mapStoreVendorItemOffering(result));
};

export const getStoreVendorItemOfferingById = async (
    organizationId: string,
    storeId: string,
    offeringId: string,
    tx?: Bun.TransactionSQL,
): Promise<StoreVendorItemOfferingDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM store_vendor_item_offerings
        WHERE id = ${offeringId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;

    return result ? mapStoreVendorItemOffering(result) : null;
};

export const getStoreVendorItemOfferingByStoreAndVendorItem = async (
    organizationId: string,
    storeId: string,
    vendorItemId: string,
    tx?: Bun.TransactionSQL,
): Promise<StoreVendorItemOfferingDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM store_vendor_item_offerings
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND vendor_item_id = ${vendorItemId}
    `;

    return result ? mapStoreVendorItemOffering(result) : null;
};

export const updateStoreVendorItemOffering = async (
    offeringData: UpdateStoreVendorItemOfferingREPO,
    tx?: Bun.TransactionSQL,
): Promise<StoreVendorItemOfferingDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        UPDATE store_vendor_item_offerings
        SET default_purchase_price = ${offeringData.defaultPurchasePrice},
            updated_by = ${offeringData.updatedBy},
            updated_at = NOW()
        WHERE id = ${offeringData.id}
          AND organization_id = ${offeringData.organizationId}
          AND store_id = ${offeringData.storeId}
        RETURNING *
    `;

    return result ? mapStoreVendorItemOffering(result) : null;
};
