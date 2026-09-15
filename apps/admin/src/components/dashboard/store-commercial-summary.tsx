import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStoreCommercialStatus } from "@repo/services";
import type { StoreCommercialStatusDTO } from "@repo/types";
import { Link, useLocation, useParams } from "react-router-dom";

import {
    formatPlanTimeRemaining,
    getCommercialStatus,
    getEffectiveCommercialAccess,
    isPlanExpiringWithinDays,
} from "@/lib/commercial-access-summary";
import { commercialLicenseKeys } from "@/lib/query-keys";
import { getStoreLicensePath, parseStoreWorkspacePath } from "@/lib/store-workspace-routes";
import { cn } from "@repo/ui/lib/utils";

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

    const access = getEffectiveCommercialAccess(commercialStatus);
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

type StorePlanNavbarBadgeProps = {
    commercialStatus: StoreCommercialStatusDTO | null | undefined;
    isLoading?: boolean;
    isUnavailable?: boolean;
    licenseHref: string;
    now?: Date;
    className?: string;
};

const StorePlanNavbarBadge = ({
    commercialStatus,
    isLoading = false,
    isUnavailable = false,
    licenseHref,
    now,
    className,
}: StorePlanNavbarBadgeProps) => {
    const currentTime = useCurrentTime(now);

    const badgeBaseClassName = "inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors";

    if (isLoading) {
        return (
            <span
                className={cn(
                    badgeBaseClassName,
                    "border-border/70 bg-muted/60 text-muted-foreground",
                    className,
                )}
            >
                Checking…
            </span>
        );
    }

    if (isUnavailable) {
        return (
            <span
                className={cn(
                    badgeBaseClassName,
                    "border-border/70 bg-muted/60 text-muted-foreground",
                    className,
                )}
            >
                Plan unavailable
            </span>
        );
    }

    const greyBadgeClassName = "border-border/70 bg-muted/60 text-muted-foreground hover:border-border hover:bg-muted/80";
    const redBadgeClassName = "border-red-500/35 bg-red-500/10 text-red-700 hover:border-red-500/50 hover:bg-red-500/15 dark:text-red-300";

    const access = getEffectiveCommercialAccess(commercialStatus);
    if (!access) {
        return (
            <Link
                to={licenseHref}
                className={cn(badgeBaseClassName, greyBadgeClassName, className)}
            >
                No active plan
            </Link>
        );
    }

    const timeRemaining = formatPlanTimeRemaining(access.endsAt, currentTime);
    const isExpiringSoon = isPlanExpiringWithinDays(access.endsAt, 7, currentTime);

    return (
        <Link
            to={licenseHref}
            aria-label={`${access.displayName}, ${timeRemaining}`}
            className={cn(
                badgeBaseClassName,
                "max-w-[min(100%,14rem)] gap-1.5 sm:max-w-none",
                isExpiringSoon ? redBadgeClassName : greyBadgeClassName,
                className,
            )}
        >
            <span className="truncate">{access.displayName}</span>
            <span className="opacity-60">·</span>
            <span className="shrink-0">{timeRemaining}</span>
        </Link>
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

    if (!workspace) {
        return null;
    }

    return (
        <div data-store-workspace-plan-summary>
            <StorePlanNavbarBadge
                commercialStatus={commercialStatus}
                isLoading={statusQuery.isPending}
                isUnavailable={statusQuery.isError || statusQuery.data?.status === "error"}
                licenseHref={getStoreLicensePath(organizationId, storeId)}
                now={now}
            />
        </div>
    );
};
