/**
 * Money Account Tracking availability seam.
 *
 * Permits every Organization until subscription plans exist. A later Feature
 * Entitlement check can replace this implementation without changing Store
 * settings, Money Account data, or tracking behavior rules.
 */
export const isMoneyAccountTrackingAvailable = async (
    _organizationId: string,
): Promise<boolean> => true;
