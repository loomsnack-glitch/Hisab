import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import { isMoneyAccountTrackingAvailable } from "./money-account-tracking-availability";

export const isMoneyAccountTrackingActive = async (
    organizationId: string,
    storeId: string,
): Promise<boolean> => {
    const available = await isMoneyAccountTrackingAvailable(organizationId);
    if (!available) {
        return false;
    }

    const store = await organizationRepository.getStoreById(organizationId, storeId);
    return Boolean(store?.moneyAccountTrackingEnabled);
};
