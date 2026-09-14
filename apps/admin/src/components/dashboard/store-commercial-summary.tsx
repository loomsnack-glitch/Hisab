import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStoreCommercialStatus } from "@repo/services";
import type { StoreCommercialStatusDTO } from "@repo/types";
import { useLocation, useParams } from "react-router-dom";

import {
    formatPlanTimeRemaining,
    getCommercialStatus,
    getCurrentCommercialAccess,
} from "@/lib/commercial-access-summary";
import { commercialLicenseKeys } from "@/lib/query-keys";
import { parseStoreWorkspacePath } from "@/lib/store-workspace-routes";

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
