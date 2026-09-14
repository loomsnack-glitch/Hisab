import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStoreCommercialStatus } from "@repo/services";
import type { ServiceResponse, StoreCommercialStatusDTO, StoreCommercialStatusResponse } from "@repo/types";
import { useLocation, useParams } from "react-router-dom";

import { commercialLicenseKeys } from "@/lib/query-keys";
import { parseStoreWorkspacePath } from "@/lib/store-workspace-routes";

const HOUR_MS = 60 * 60 * 1000;

type CurrentCommercialAccess = {
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

type StoreCommercialSummaryProps = {
    commercialStatus: StoreCommercialStatusDTO | null | undefined;
    isLoading?: boolean;
    isUnavailable?: boolean;
    now?: Date;
    className?: string;
};

const useCurrentTime = (fixedNow?: Date) => {
    const [currentTime, setCurrentTime] = useState(() => fixedNow ?? new Date());

    useEffect(() => {
        if (fixedNow) {
            setCurrentTime(fixedNow);
            return;
        }

        const interval = window.setInterval(() => setCurrentTime(new Date()), 60_000);
        return () => window.clearInterval(interval);
    }, [fixedNow]);

    return fixedNow ?? currentTime;
};

export const StoreCommercialSummary = ({
    commercialStatus,
    isLoading = false,
    isUnavailable = false,
    now,
    className,
}: StoreCommercialSummaryProps) => {
    const currentTime = useCurrentTime(now);

    if (isLoading) {
        return <span className={className}>Checking plan…</span>;
    }

    if (isUnavailable) {
        return <span className={className}>Plan unavailable</span>;
    }

    const access = getCurrentCommercialAccess(commercialStatus);
    if (!access) {
        return <span className={className}>No active plan</span>;
    }

    const timeRemaining = formatPlanTimeRemaining(access.endsAt, currentTime);

    return (
        <span className={className} aria-label={`${access.displayName}, ${timeRemaining}`}>
            <span className="truncate">{access.displayName}</span>
            <span className="shrink-0 text-muted-foreground"> · {timeRemaining}</span>
        </span>
    );
};

type StoreWorkspacePlanNavbarSummaryProps = {
    now?: Date;
};

export const StoreWorkspacePlanNavbarSummary = ({ now }: StoreWorkspacePlanNavbarSummaryProps) => {
    const { organizationId = "" } = useParams();
    const location = useLocation();
    const workspace = parseStoreWorkspacePath(location.pathname);
    const storeId = workspace?.storeId ?? "";
    const statusQuery = useQuery({
        queryKey: commercialLicenseKeys.status(organizationId, storeId),
        queryFn: () => getStoreCommercialStatus(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });
    const commercialStatus = getCommercialStatus(statusQuery.data);
    const currentAccess = getCurrentCommercialAccess(commercialStatus);

    if (!workspace) {
        return null;
    }

    return (
        <div className="min-w-0" data-store-workspace-plan-summary>
            <p className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:block">
                {currentAccess?.kind === "grant" ? "Store access" : "Current plan"}
            </p>
            <StoreCommercialSummary
                commercialStatus={commercialStatus}
                isLoading={statusQuery.isPending}
                isUnavailable={statusQuery.isError || statusQuery.data?.status === "error"}
                now={now}
                className="flex min-w-0 items-center text-xs font-medium text-foreground sm:text-sm"
            />
        </div>
    );
};
