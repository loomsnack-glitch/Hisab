import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
  CreateOrganizationREPO,
  CreateStoreDeviceREPO,
  CreateStoreREPO,
  OrganizationCatalogSettingsDTO,
  OrganizationDTO,
  StoreDevicePosSettingsDTO,
  StoreDeviceDTO,
  StoreDTO,
  UpdateOrganizationREPO,
  UpdateStoreDeviceREPO,
  UpdateStoreREPO,
} from "@repo/types";

const mapRow = <T>(row: Record<string, unknown>) => snakeToCamel(row) as T;
type StoreDeviceSecretRow = { deviceSecretEncrypted: string };

export const createOrganizationCatalogSettings = async (
  organizationId: string,
  tx?: Bun.TransactionSQL,
): Promise<OrganizationCatalogSettingsDTO | null> => {
  const db = tx || pg;
  const [result] = await db`
        INSERT INTO organization_catalog_settings (organization_id)
        VALUES (${organizationId})
        RETURNING *
    `;

  return result ? mapRow<OrganizationCatalogSettingsDTO>(result) : null;
};

export const getOrganizationCatalogSettingsByOrganizationId = async (
  organizationId: string,
): Promise<OrganizationCatalogSettingsDTO | null> => {
  const [result] = await pg`
        SELECT *
        FROM organization_catalog_settings
        WHERE organization_id = ${organizationId}
    `;

  return result ? mapRow<OrganizationCatalogSettingsDTO>(result) : null;
};

export const updateOrganizationCatalogSettings = async (
  organizationId: string,
  barcodeScanningEnabled: boolean,
): Promise<OrganizationCatalogSettingsDTO | null> => {
  const [result] = await pg`
        INSERT INTO organization_catalog_settings (organization_id, barcode_scanning_enabled)
        VALUES (${organizationId}, ${barcodeScanningEnabled})
        ON CONFLICT (organization_id) DO UPDATE
        SET barcode_scanning_enabled = EXCLUDED.barcode_scanning_enabled,
            updated_at = NOW()
        RETURNING *
    `;

  return result ? mapRow<OrganizationCatalogSettingsDTO>(result) : null;
};

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

export const getOrganizationsByUserId = async (
  userId: string,
): Promise<OrganizationDTO[]> => {
  const results = await pg`
        SELECT *
        FROM organizations
        WHERE created_by = ${userId}
        ORDER BY created_at ASC
    `;

  return results.map((result: Record<string, unknown>) =>
    mapRow<OrganizationDTO>(result),
  );
};

export const getOrganizationById = async (
  organizationId: string,
): Promise<OrganizationDTO | null> => {
  const [result] = await pg`
        SELECT *
        FROM organizations
        WHERE id = ${organizationId}
    `;

  return result ? snakeToCamel(result) : null;
};

export const getOrganizationByUsername = async (
  username: string,
): Promise<OrganizationDTO | null> => {
  const [result] = await pg`
        SELECT *
        FROM organizations
        WHERE username = ${username}
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

export const organizationUsernameExists = async (
  username: string,
  excludeId?: string,
): Promise<boolean> => {
  const results = excludeId
    ? await pg`
            SELECT 1
            FROM organizations
            WHERE username = ${username}
              AND id <> ${excludeId}
            LIMIT 1
        `
    : await pg`
            SELECT 1
            FROM organizations
            WHERE username = ${username}
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
            username = ${organizationData.username},
            tagline = ${organizationData.tagline},
            updated_by = ${organizationData.updatedBy},
            updated_at = NOW()
        WHERE id = ${organizationData.id}
        RETURNING *
    `;

  return result ? snakeToCamel(result) : null;
};

export const createStore = async (
  storeData: CreateStoreREPO,
  tx?: Bun.TransactionSQL,
): Promise<StoreDTO | null> => {
  const db = tx || pg;
  const [result] = await db`
        INSERT INTO stores ${camelToSnakeSql(storeData)}
        RETURNING *
    `;

  return result ? snakeToCamel(result) : null;
};

export const getStoresByOrganizationId = async (
  organizationId: string,
): Promise<StoreDTO[]> => {
  const results = await pg`
        SELECT *
        FROM stores
        WHERE organization_id = ${organizationId}
        ORDER BY created_at ASC
    `;

  return results.map((result: Record<string, unknown>) =>
    mapRow<StoreDTO>(result),
  );
};

export const getStoreById = async (
  organizationId: string,
  storeId: string,
): Promise<StoreDTO | null> => {
  const [result] = await pg`
        SELECT *
        FROM stores
        WHERE id = ${storeId}
          AND organization_id = ${organizationId}
    `;

  return result ? snakeToCamel(result) : null;
};

export const storeNameExistsInOrganization = async (
  organizationId: string,
  name: string,
  excludeId?: string,
): Promise<boolean> => {
  const results = excludeId
    ? await pg`
            SELECT 1
            FROM stores
            WHERE organization_id = ${organizationId}
              AND LOWER(name) = LOWER(${name})
              AND id <> ${excludeId}
            LIMIT 1
        `
    : await pg`
            SELECT 1
            FROM stores
            WHERE organization_id = ${organizationId}
              AND LOWER(name) = LOWER(${name})
            LIMIT 1
        `;

  return Boolean(results[0]);
};

export const updateStore = async (
  storeData: UpdateStoreREPO,
): Promise<StoreDTO | null> => {
  const [result] = await pg`
        UPDATE stores
        SET name = ${storeData.name},
            address = ${storeData.address},
            updated_by = ${storeData.updatedBy},
            updated_at = NOW()
        WHERE id = ${storeData.id}
        RETURNING *
    `;

  return result ? snakeToCamel(result) : null;
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

export const createStoreDevicePosSettings = async (
  deviceId: string,
  organizationId: string,
  storeId: string,
  tx?: Bun.TransactionSQL,
): Promise<StoreDevicePosSettingsDTO | null> => {
  const db = tx || pg;
  const [result] = await db`
        INSERT INTO store_device_pos_settings (device_id, organization_id, store_id)
        VALUES (${deviceId}, ${organizationId}, ${storeId})
        RETURNING *
    `;

  return result ? mapRow<StoreDevicePosSettingsDTO>(result) : null;
};

export const getStoreDevicePosSettingsByDeviceId = async (
  organizationId: string,
  storeId: string,
  deviceId: string,
): Promise<StoreDevicePosSettingsDTO | null> => {
  const [result] = await pg`
        SELECT *
        FROM store_device_pos_settings
        WHERE device_id = ${deviceId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;

  return result ? mapRow<StoreDevicePosSettingsDTO>(result) : null;
};

export const updateStoreDevicePosSettings = async (
  deviceId: string,
  organizationId: string,
  storeId: string,
  directBarcodeScanEnabled: boolean,
): Promise<StoreDevicePosSettingsDTO | null> => {
  const [result] = await pg`
        UPDATE store_device_pos_settings
        SET direct_barcode_scan_enabled = ${directBarcodeScanEnabled},
            updated_at = NOW()
        WHERE device_id = ${deviceId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
        RETURNING *
    `;

  return result ? mapRow<StoreDevicePosSettingsDTO>(result) : null;
};

export const getStoreDevicesByOrganizationId = async (
  organizationId: string,
): Promise<StoreDeviceDTO[]> => {
  const results = await pg`
        SELECT *
        FROM store_devices
        WHERE organization_id = ${organizationId}
        ORDER BY created_at ASC
    `;

  return results.map((result: Record<string, unknown>) =>
    mapRow<StoreDeviceDTO>(result),
  );
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

  return results.map((result: Record<string, unknown>) =>
    mapRow<StoreDeviceDTO>(result),
  );
};

export const deviceNameExistsInStore = async (
  storeId: string,
  name: string,
  excludeId?: string,
): Promise<boolean> => {
  const results = excludeId
    ? await pg`
            SELECT 1
            FROM store_devices
            WHERE store_id = ${storeId}
              AND LOWER(name) = LOWER(${name})
              AND id <> ${excludeId}
            LIMIT 1
        `
    : await pg`
            SELECT 1
            FROM store_devices
            WHERE store_id = ${storeId}
              AND LOWER(name) = LOWER(${name})
            LIMIT 1
        `;

  return Boolean(results[0]);
};

export const loginUsernameExistsInOrg = async (
  organizationId: string,
  loginUsername: string,
  excludeId?: string,
): Promise<boolean> => {
  const results = excludeId
    ? await pg`
            SELECT 1
            FROM store_devices
            WHERE organization_id = ${organizationId}
              AND login_username = ${loginUsername}
              AND id <> ${excludeId}
            LIMIT 1
        `
    : await pg`
            SELECT 1
            FROM store_devices
            WHERE organization_id = ${organizationId}
              AND login_username = ${loginUsername}
            LIMIT 1
        `;

  return Boolean(results[0]);
};

export const updateStoreDevice = async (
  deviceData: UpdateStoreDeviceREPO,
): Promise<StoreDeviceDTO | null> => {
  if (deviceData.deviceSecretEncrypted && deviceData.loginUsername) {
    const [result] = await pg`
            UPDATE store_devices
            SET name = ${deviceData.name},
                login_username = ${deviceData.loginUsername},
                status = ${deviceData.status},
                device_secret_encrypted = ${deviceData.deviceSecretEncrypted},
                updated_by = ${deviceData.updatedBy},
                updated_at = NOW()
            WHERE id = ${deviceData.id}
            RETURNING *
        `;

    return result ? snakeToCamel(result) : null;
  }

  if (deviceData.deviceSecretEncrypted) {
    const [result] = await pg`
            UPDATE store_devices
            SET name = ${deviceData.name},
                status = ${deviceData.status},
                device_secret_encrypted = ${deviceData.deviceSecretEncrypted},
                updated_by = ${deviceData.updatedBy},
                updated_at = NOW()
            WHERE id = ${deviceData.id}
            RETURNING *
        `;

    return result ? snakeToCamel(result) : null;
  }

  if (deviceData.loginUsername) {
    const [result] = await pg`
            UPDATE store_devices
            SET name = ${deviceData.name},
                login_username = ${deviceData.loginUsername},
                status = ${deviceData.status},
                updated_by = ${deviceData.updatedBy},
                updated_at = NOW()
            WHERE id = ${deviceData.id}
            RETURNING *
        `;

    return result ? snakeToCamel(result) : null;
  }

  const [result] = await pg`
        UPDATE store_devices
        SET name = ${deviceData.name},
            status = ${deviceData.status},
            updated_by = ${deviceData.updatedBy},
            updated_at = NOW()
        WHERE id = ${deviceData.id}
        RETURNING *
    `;

  return result ? snakeToCamel(result) : null;
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

export const getStoreDeviceByLoginUsername = async (
  organizationId: string,
  loginUsername: string,
): Promise<StoreDeviceDTO | null> => {
  const [result] = await pg`
        SELECT *
        FROM store_devices
        WHERE organization_id = ${organizationId}
          AND login_username = ${loginUsername}
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
