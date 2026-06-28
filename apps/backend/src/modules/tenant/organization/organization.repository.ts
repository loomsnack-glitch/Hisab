import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    CreateOrganizationREPO,
    CreateStoreDeviceREPO,
    CreateStoreREPO,
    OrganizationDTO,
    StoreDeviceDTO,
    StoreDTO,
    UpdateOrganizationREPO,
} from "@repo/types";

const mapRow = <T>(row: Record<string, unknown>) => snakeToCamel(row) as T;
type StoreDeviceSecretRow = { deviceSecretEncrypted: string };

export const createOrganization = async (
    organizationData: CreateOrganizationREPO,
    tx?: Bun.TransactionSQL,
): Promise<OrganizationDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO organizations ${camelToSnakeSql(organizationData)}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const getOrganizationsByUserId = async (userId: string): Promise<OrganizationDTO[]> => {
    const results = await pg`
        SELECT *
        FROM organizations
        WHERE created_by = ${userId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<OrganizationDTO>(result));
};

export const getOrganizationById = async (organizationId: string): Promise<OrganizationDTO | null> => {
    const [result] = await pg`
        SELECT *
        FROM organizations
        WHERE id = ${organizationId}
    `;

    return result ? snakeToCamel(result) : null;
};

export const getOrganizationByIdForUser = async (
    organizationId: string,
    userId: string,
): Promise<OrganizationDTO | null> => {
    const [result] = await pg`
        SELECT *
        FROM organizations
        WHERE id = ${organizationId}
          AND created_by = ${userId}
    `;

    return result ? snakeToCamel(result) : null;
};

export const organizationNameExistsForUser = async (
    userId: string,
    name: string,
    excludeId?: string,
): Promise<boolean> => {
    const results = excludeId
        ? await pg`
            SELECT 1
            FROM organizations
            WHERE created_by = ${userId}
              AND LOWER(name) = LOWER(${name})
              AND id <> ${excludeId}
            LIMIT 1
        `
        : await pg`
            SELECT 1
            FROM organizations
            WHERE created_by = ${userId}
              AND LOWER(name) = LOWER(${name})
            LIMIT 1
        `;

    return Boolean(results[0]);
};

export const updateOrganization = async (
    organizationData: UpdateOrganizationREPO,
): Promise<OrganizationDTO | null> => {
    const [result] = await pg`
        UPDATE organizations
        SET name = ${organizationData.name},
            updated_by = ${organizationData.updatedBy},
            updated_at = NOW()
        WHERE id = ${organizationData.id}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const createStore = async (storeData: CreateStoreREPO, tx?: Bun.TransactionSQL): Promise<StoreDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO stores ${camelToSnakeSql(storeData)}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const getStoresByOrganizationId = async (organizationId: string): Promise<StoreDTO[]> => {
    const results = await pg`
        SELECT *
        FROM stores
        WHERE organization_id = ${organizationId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<StoreDTO>(result));
};

export const getStoreById = async (organizationId: string, storeId: string): Promise<StoreDTO | null> => {
    const [result] = await pg`
        SELECT *
        FROM stores
        WHERE id = ${storeId}
          AND organization_id = ${organizationId}
    `;

    return result ? snakeToCamel(result) : null;
};

export const storeNameExistsInOrganization = async (organizationId: string, name: string): Promise<boolean> => {
    const [result] = await pg`
        SELECT 1
        FROM stores
        WHERE organization_id = ${organizationId}
          AND LOWER(name) = LOWER(${name})
        LIMIT 1
    `;

    return Boolean(result);
};

export const createStoreDevice = async (
    deviceData: CreateStoreDeviceREPO,
    tx?: Bun.TransactionSQL,
): Promise<StoreDeviceDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO store_devices ${camelToSnakeSql(deviceData)}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const getStoreDevicesByOrganizationId = async (organizationId: string): Promise<StoreDeviceDTO[]> => {
    const results = await pg`
        SELECT *
        FROM store_devices
        WHERE organization_id = ${organizationId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<StoreDeviceDTO>(result));
};

export const getStoreDevicesByStoreId = async (
    organizationId: string,
    storeId: string,
): Promise<StoreDeviceDTO[]> => {
    const results = await pg`
        SELECT *
        FROM store_devices
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<StoreDeviceDTO>(result));
};

export const deviceNameExistsInStore = async (storeId: string, name: string): Promise<boolean> => {
    const [result] = await pg`
        SELECT 1
        FROM store_devices
        WHERE store_id = ${storeId}
          AND LOWER(name) = LOWER(${name})
        LIMIT 1
    `;

    return Boolean(result);
};

export const getStoreDeviceById = async (
    organizationId: string,
    storeId: string,
    deviceId: string,
): Promise<StoreDeviceDTO | null> => {
    const [result] = await pg`
        SELECT *
        FROM store_devices
        WHERE id = ${deviceId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;

    return result ? snakeToCamel(result) : null;
};

export const getStoreDeviceSecretById = async (
    organizationId: string,
    storeId: string,
    deviceId: string,
): Promise<string | null> => {
    const [result] = await pg`
        SELECT device_secret_encrypted
        FROM store_devices
        WHERE id = ${deviceId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;

    if (!result) {
        return null;
    }

    return mapRow<StoreDeviceSecretRow>(result).deviceSecretEncrypted;
};
