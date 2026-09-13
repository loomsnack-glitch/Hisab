import { parseAsArrayOf, parseAsString, parseAsStringLiteral } from "nuqs";

export const DEVICE_STATUSES = ["active", "inactive", "revoked"] as const;

export type DeviceStatusFilter = (typeof DEVICE_STATUSES)[number];

export const deviceFilterUrlOptions = {
    history: "replace" as const,
    clearOnDefault: true,
};

export const deviceListFilterParsers = {
    search: parseAsString.withDefault(""),
    statuses: parseAsArrayOf(parseAsStringLiteral(DEVICE_STATUSES)).withDefault(["active"]),
};

export const toggleDeviceStatusFilter = (
    current: readonly DeviceStatusFilter[],
    value: string,
): DeviceStatusFilter[] => {
    const next = value as DeviceStatusFilter;
    return current.includes(next) ? current.filter((item) => item !== next) : [...current, next];
};
