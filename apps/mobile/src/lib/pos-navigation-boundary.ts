import type { DeviceSessionDTO } from "@repo/types";

export const POS_SHARED_DESTINATIONS = ["NewSale", "Bills", "Customers", "Reports", "Settings"] as const;
export const POS_RESTAURANT_DESTINATIONS = ["Tables"] as const;

export type PosSharedDestination = (typeof POS_SHARED_DESTINATIONS)[number];
export type PosRestaurantDestination = (typeof POS_RESTAURANT_DESTINATIONS)[number];
export type PosDestination = PosSharedDestination | PosRestaurantDestination;

type PosSessionCapabilities = {
    store: Pick<DeviceSessionDTO["store"], "tableManagementEnabled">;
};

export const getPosDestinations = (
    session: PosSessionCapabilities | null,
): readonly PosDestination[] => {
    if (!session) {
        return POS_SHARED_DESTINATIONS;
    }

    return session.store.tableManagementEnabled
        ? [...POS_SHARED_DESTINATIONS, ...POS_RESTAURANT_DESTINATIONS]
        : POS_SHARED_DESTINATIONS;
};
