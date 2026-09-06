import type { DeviceSessionDTO } from "@repo/types";

export const POS_SHARED_DESTINATIONS = ["NewSale", "Bills", "Customers", "Reports", "Settings"] as const;
export const POS_RESTAURANT_DESTINATIONS = ["Tables", "Kitchen"] as const;
export const POS_SALE_SHELL_DESTINATIONS = ["NewSale", "Cart"] as const;

export type PosSharedDestination = (typeof POS_SHARED_DESTINATIONS)[number];
export type PosRestaurantDestination = (typeof POS_RESTAURANT_DESTINATIONS)[number];
export type PosDestination = PosSharedDestination | PosRestaurantDestination;

type PosSessionCapabilities = {
    store: Pick<DeviceSessionDTO["store"], "tableManagementEnabled" | "kotSystemEnabled">;
};

export const getPosDestinations = (
    session: PosSessionCapabilities | null,
): readonly PosDestination[] => {
    if (!session) {
        return POS_SHARED_DESTINATIONS;
    }

    const destinations = session.store.tableManagementEnabled
        ? [...POS_SHARED_DESTINATIONS, "Tables" as const]
        : [...POS_SHARED_DESTINATIONS];
    return session.store.kotSystemEnabled
        ? [...destinations, "Kitchen" as const]
        : destinations;
};
