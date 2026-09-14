import type { ServiceResponse, StoreCommercialStatusDTO, StoreCommercialStatusResponse } from "@repo/types";

const HOUR_MS = 60 * 60 * 1000;

export type CurrentCommercialAccess = {
    displayName: string;
    endsAt: string | Date;
    kind: "plan" | "grant";
};

export const getCommercialStatus = (
    response: ServiceResponse<StoreCommercialStatusResponse | null> | undefined,
) => response?.status === "success" ? response.data?.commercialStatus ?? null : null;

export const getCurrentCommercialAccess = (
    commercialStatus: StoreCommercialStatusDTO | null | undefined,
): CurrentCommercialAccess | null => {
    if (!commercialStatus) return null;

    const activePlanAccess = [
        ...(commercialStatus.baseAccess?.status === "active" ? [{
            displayName: commercialStatus.baseAccess.planDisplayName,
            endsAt: commercialStatus.baseAccess.endsAt,
            kind: "plan" as const,
        }] : []),
        ...commercialStatus.accessGrants
            .filter((grant) => grant.status === "active" && grant.selectionKind === "plan" && grant.planDisplayName)
            .map((grant) => ({
                displayName: grant.planDisplayName!,
                endsAt: grant.endsAt,
                kind: "plan" as const,
            })),
    ];
    const latestPlanAccess = activePlanAccess.reduce<CurrentCommercialAccess | null>(
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
        ? { displayName: activeGrant.selectionLabel, endsAt: activeGrant.endsAt, kind: "grant" }
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
