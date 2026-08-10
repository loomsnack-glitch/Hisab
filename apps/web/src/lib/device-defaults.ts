import type { CreateStoreDeviceJSON } from "@repo/types";

const DEVICE_USERNAME_MAX_LENGTH = 64;

const toUsernameSegment = (value: string): string => {
    const segment = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    return segment || "store";
};

const generateDeviceSecret = (): string => crypto.randomUUID().replaceAll("-", "").slice(0, 8);

export const createDefaultDeviceValues = (
    storeName: string,
    deviceNumber: number,
): CreateStoreDeviceJSON => {
    const safeDeviceNumber = Math.max(1, Math.floor(deviceNumber));
    const deviceName = `${storeName.trim() || "Store"} Device ${safeDeviceNumber}`.slice(0, 255);
    const usernameSuffix = `_${safeDeviceNumber}`;
    const usernameBase = toUsernameSegment(storeName);
    const availableBaseLength = DEVICE_USERNAME_MAX_LENGTH - usernameSuffix.length;
    const loginUsername = `${usernameBase.slice(0, availableBaseLength).replace(/[_-]+$/g, "")}${usernameSuffix}`;

    return {
        name: deviceName,
        loginUsername,
        deviceSecret: generateDeviceSecret(),
    };
};
