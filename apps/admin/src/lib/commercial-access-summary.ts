import type { ServiceResponse, StoreCommercialStatusDTO, StoreCommercialStatusResponse } from "@repo/types";

const HOUR_MS = 60 * 60 * 1000;

export type EffectiveCommercialAccess = {
    displayName: string;
    endsAt: string | Date;
    sourceKind: "store_license" | "store_access_grant";
    sourceLabel: string;
};

export const getCommercialStatus = (
    response: ServiceResponse<StoreCommercialStatusResponse | null> | undefined,
) => response?.status === "success" ? response.data?.commercialStatus ?? null : null;

export const getEffectiveCommercialAccess = (
    commercialStatus: StoreCommercialStatusDTO | null | undefined,
): EffectiveCommercialAccess | null => {
    if (!commercialStatus) return null;

    const activePlanAccess = [
        ...(commercialStatus.baseAccess?.status === "active" ? [{
            displayName: commercialStatus.baseAccess.planDisplayName,
            endsAt: commercialStatus.baseAccess.endsAt,
            sourceKind: "store_license" as const,
            sourceLabel: "Store License",
        }] : []),
        ...commercialStatus.accessGrants
            .filter((grant) => grant.status === "active" && grant.selectionKind === "plan" && grant.planDisplayName)
            .map((grant) => ({
                displayName: grant.planDisplayName!,
                endsAt: grant.endsAt,
                sourceKind: "store_access_grant" as const,
                sourceLabel: grant.label,
            })),
    ];
    const latestPlanAccess = activePlanAccess.reduce<EffectiveCommercialAccess | null>(
        (latest, access) => !latest || new Date(access.endsAt).getTime() > new Date(latest.endsAt).getTime()
            ? access
            : latest,
        null,
    );
    if (latestPlanAccess) return latestPlanAccess;

    const activeGrant = commercialStatus.accessGrants
        .filter((grant) => grant.status === "active")
        .reduce<StoreCommercialStatusDTO["accessGrants"][number] | null>(
            (latest, grant) => !latest || new Date(grant.endsAt).getTime() > new Date(latest.endsAt).getTime()
                ? grant
                : latest,
            null,
        );

    return activeGrant
        ? {
            displayName: activeGrant.selectionLabel,
            endsAt: activeGrant.endsAt,
            sourceKind: "store_access_grant",
            sourceLabel: activeGrant.label,
        }
        : null;
};

export const formatPlanTimeRemaining = (endsAt: string | Date, now = new Date()) => {
    const remainingHours = Math.ceil((new Date(endsAt).getTime() - now.getTime()) / HOUR_MS);

    if (remainingHours <= 0) return "Expired";

    const days = Math.floor(remainingHours / 24);
    const hours = remainingHours % 24;

    if (days > 0 && hours > 0) return `${days}d ${hours}h left`;
    if (days > 0) return `${days}d left`;
    return `${hours}h left`;
};
