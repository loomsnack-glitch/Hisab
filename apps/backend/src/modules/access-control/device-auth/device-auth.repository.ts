import type { DeviceSessionDTO } from "@repo/types";
import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";

type DeviceSessionRow = Record<string, unknown>;

const mapDeviceSession = (row: DeviceSessionRow): DeviceSessionDTO => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;

    return {
        device: {
            id: String(mapped.id),
            organizationId: String(mapped.organizationId),
            storeId: String(mapped.storeId),
            name: String(mapped.name),
            status: mapped.status as DeviceSessionDTO["device"]["status"],
            lastSeenAt: (mapped.lastSeenAt as string | null | undefined) ?? null,
        },
        store: {
            id: String(mapped.storeId),
            organizationId: String(mapped.organizationId),
            name: String(mapped.storeName),
            address: (mapped.storeAddress as string | null | undefined) ?? null,
        },
        organization: {
            id: String(mapped.organizationId),
            name: String(mapped.organizationName),
        },
    };
};

export const getDeviceSessionById = async (deviceId: string): Promise<DeviceSessionDTO | null> => {
    const [result] = await pg`
        SELECT
            d.*,
            s.name AS store_name,
            s.address AS store_address,
            o.name AS organization_name
        FROM store_devices d
        INNER JOIN stores s
            ON s.id = d.store_id
           AND s.organization_id = d.organization_id
        INNER JOIN organizations o
            ON o.id = d.organization_id
        WHERE d.id = ${deviceId}
    `;

    return result ? mapDeviceSession(result) : null;
};

export const getDeviceSecretEncryptedById = async (deviceId: string): Promise<string | null> => {
    const [result] = await pg`
        SELECT device_secret_encrypted
        FROM store_devices
        WHERE id = ${deviceId}
    `;

    if (!result?.device_secret_encrypted || typeof result.device_secret_encrypted !== "string") {
        return null;
    }

    return result.device_secret_encrypted;
};

export const updateDeviceLastSeenAt = async (deviceId: string): Promise<void> => {
    await pg`
        UPDATE store_devices
        SET last_seen_at = NOW()
        WHERE id = ${deviceId}
    `;
};
