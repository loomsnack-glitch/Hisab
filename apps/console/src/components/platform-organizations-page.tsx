import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
    getPlatformOrganization as getPlatformOrganizationRequest,
    getPlatformOrganizations as getPlatformOrganizationsRequest,
} from "@repo/services";
import {
    PLATFORM_REPORTING_TIMEZONE,
    formatPhoneDisplay,
    type PlatformDashboardQueryJSON,
    type PlatformOrganizationActivityFilter,
    type PlatformOrganizationListQueryJSON,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";

import PlatformOrganizationDetailPage from "@/components/platform-organization-detail-page";
import {
    organizationDirectoryPath,
    organizationInspectionPath,
    parseOrganizationInspectionPath,
} from "@/lib/organization-inspection-url";

const organizationsQueryKey = ["platform-owner", "organizations"] as const;

type ActivityFilter = PlatformOrganizationActivityFilter;

type PlatformOrganizationsPageProps = {
    reportingQuery?: PlatformDashboardQueryJSON;
    getPlatformOrganizations?: typeof getPlatformOrganizationsRequest;
    getPlatformOrganization?: typeof getPlatformOrganizationRequest;
    initialSearch?: string;
    initialActivity?: ActivityFilter;
    onUnauthorized?: () => Promise<void>;
};

const activityOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
] as const;

const formatCompletedSalesValue = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value);

const formatLastCompletedSale = (value: string | Date | null) => {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: PLATFORM_REPORTING_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
};

const reportingPeriodLabel = (query: PlatformDashboardQueryJSON) => {
    const period = query.period ?? "all-time";
    if (period === "custom") {
        return `${query.startDate ?? ""} – ${query.endDate ?? ""}`;
    }
    if (period === "7d") return "7-day";
    if (period === "30d") return "30-day";
    if (period === "90d") return "90-day";
    return "All-time";
};

const toListQuery = (
    reportingQuery: PlatformDashboardQueryJSON,
    search: string,
    activity: ActivityFilter,
    page: number,
): PlatformOrganizationListQueryJSON => {
    const period = reportingQuery.period ?? "all-time";
    return {
        ...(period === "custom"
            ? { period: "custom", startDate: reportingQuery.startDate, endDate: reportingQuery.endDate }
            : { period }),
        ...(search ? { search } : {}),
        activity,
        page,
        limit: 20,
    };
};

const PlatformOrganizationsPage = ({
    reportingQuery = { period: "all-time" },
    getPlatformOrganizations = getPlatformOrganizationsRequest,
    getPlatformOrganization = getPlatformOrganizationRequest,
    initialSearch = "",
    initialActivity = "all",
    onUnauthorized,
}: PlatformOrganizationsPageProps) => {
    const [pathname, setPathname] = useState(() => window.location.pathname);
    const [searchInput, setSearchInput] = useState(initialSearch);
    const [appliedSearch, setAppliedSearch] = useState(initialSearch.trim());
    const [activity, setActivity] = useState<ActivityFilter>(initialActivity);
    const [page, setPage] = useState(1);
    const listQuery = toListQuery(reportingQuery, appliedSearch, activity, page);
    const inspection = parseOrganizationInspectionPath(pathname);

    const organizationsQuery = useQuery({
        queryKey: [...organizationsQueryKey, listQuery],
        queryFn: () => getPlatformOrganizations(listQuery),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: inspection == null || inspection.kind === "directory",
    });
    const list = organizationsQuery.data?.status === "success" ? organizationsQuery.data.data : undefined;
    const organizations = list?.organizations ?? [];
    const totalCount = list?.pagination.totalCount ?? 0;
    const limit = list?.pagination.limit ?? 20;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const hasFilter = Boolean(appliedSearch) || activity !== "all";
    const errorCode = (organizationsQuery.error as { code?: number } | null)?.code
        ?? (organizationsQuery.data?.status === "error" ? organizationsQuery.data.code : undefined);

    useEffect(() => {
        const syncPath = () => setPathname(window.location.pathname);
        window.addEventListener("popstate", syncPath);
        return () => window.removeEventListener("popstate", syncPath);
    }, []);

    useEffect(() => {
        if (errorCode === 401) void onUnauthorized?.();
    }, [errorCode, onUnauthorized]);

    const go = (path: string) => {
        if (window.location.pathname !== path) {
            window.history.pushState(null, "", path);
        }
        setPathname(path);
    };

    const followInspectionLink = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
        event.preventDefault();
        go(path);
    };

    const applySearch = (event: FormEvent) => {
        event.preventDefault();
        setAppliedSearch(searchInput.trim());
        setPage(1);
    };

    const selectActivity = (next: ActivityFilter) => {
        setActivity(next);
        setPage(1);
    };

    if (inspection?.kind === "invalid") {
        return (
            <section className="space-y-6">
                <div className="space-y-1">
                    <Button type="button" variant="ghost" className="-ml-3" onClick={() => go(organizationDirectoryPath)}>
                        Back to Organizations
                    </Button>
                    <h1 className="text-3xl font-semibold tracking-tight">Organization Inspection Workspace</h1>
                </div>
                <Alert role="alert">
                    <AlertTitle>Organization was not found</AlertTitle>
                    <AlertDescription>
                        This Inspection URL is not valid. Return to the Organizations list to continue.
                    </AlertDescription>
                </Alert>
            </section>
        );
    }

    if (inspection?.kind === "workspace") {
        return (
            <PlatformOrganizationDetailPage
                organizationId={inspection.organizationId}
                section={inspection.section}
                resourceId={inspection.resourceId}
                reportingQuery={reportingQuery}
                onNavigate={go}
                onBack={() => go(organizationDirectoryPath)}
                onUnauthorized={onUnauthorized}
                getPlatformOrganization={getPlatformOrganization}
            />
        );
    }

    const periodLabel = reportingPeriodLabel(reportingQuery);

    return (
        <section className="space-y-6">
            <Card className="overflow-hidden border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="relative p-6 sm:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.10),_transparent_30%)]" />
                    <div className="relative max-w-xl space-y-2">
                        <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                            Outreach
                        </Badge>
                        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Organizations</h1>
                        <p className="text-sm text-muted-foreground">
                            Read-only tenant directory for platform outreach and inspection.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader className="gap-1">
                    <CardTitle className="font-display text-2xl">
                        All organizations
                        {totalCount > 0 ? (
                            <span className="ml-2 text-lg font-normal text-muted-foreground">({totalCount})</span>
                        ) : null}
                    </CardTitle>
                    <CardDescription>
                        {periodLabel} metrics from Dashboard · Activity uses last 7 days in Asia/Kolkata
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <form className="relative w-full max-w-md" onSubmit={applySearch}>
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="organization-search"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search name or username"
                                className="h-10 rounded-xl pl-9"
                            />
                        </form>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Organization activity filter">
                            {activityOptions.map((option) => (
                                <Button
                                    key={option.value}
                                    type="button"
                                    size="sm"
                                    className="rounded-full"
                                    variant={activity === option.value ? "default" : "outline"}
                                    aria-pressed={activity === option.value}
                                    onClick={() => selectActivity(option.value)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {organizationsQuery.isLoading ? (
                        <div className="flex items-center justify-center py-16" aria-busy="true">
                            <Spinner className="size-6 text-primary" />
                        </div>
                    ) : organizationsQuery.isError || organizationsQuery.data?.status === "error" ? (
                        <Alert variant="destructive" role="alert">
                            <AlertTitle>Organizations could not be loaded</AlertTitle>
                            <AlertDescription>
                                {(organizationsQuery.error as { message?: string } | null)?.message
                                    ?? organizationsQuery.data?.message
                                    ?? "The organization list is unavailable."}
                            </AlertDescription>
                        </Alert>
                    ) : organizations.length === 0 ? (
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Building2 />
                                </EmptyMedia>
                                <EmptyTitle>{hasFilter ? "No matches" : "No organizations yet"}</EmptyTitle>
                                <EmptyDescription>
                                    {hasFilter
                                        ? "Try a different search or activity filter."
                                        : "Organizations will appear here as tenants join the platform."}
                                </EmptyDescription>
                            </EmptyHeader>
                            {hasFilter ? (
                                <EmptyContent>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-full"
                                        onClick={() => {
                                            setSearchInput("");
                                            setAppliedSearch("");
                                            setActivity("all");
                                            setPage(1);
                                        }}
                                    >
                                        Clear filters
                                    </Button>
                                </EmptyContent>
                            ) : null}
                        </Empty>
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto rounded-xl border border-border/60">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Organization</TableHead>
                                            <TableHead>Creator</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Stores</TableHead>
                                            <TableHead>Customers</TableHead>
                                            <TableHead>Sales</TableHead>
                                            <TableHead>Sales value</TableHead>
                                            <TableHead>Last sale</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {organizations.map((organization) => {
                                            const href = organizationInspectionPath(organization.id);
                                            return (
                                                <TableRow key={organization.id}>
                                                    <TableCell>
                                                        <a
                                                            href={href}
                                                            className="font-medium text-primary underline-offset-4 hover:underline"
                                                            onClick={(event) => followInspectionLink(event, href)}
                                                        >
                                                            {organization.name}
                                                        </a>
                                                        <div className="text-xs text-muted-foreground">{organization.username}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>{`${organization.creator.firstName} ${organization.creator.lastName}`}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {formatPhoneDisplay(organization.creator.phone)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={organization.isActive ? "secondary" : "outline"}
                                                            className="rounded-full"
                                                        >
                                                            {organization.isActive ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell
                                                        title={`${organization.activeStoreCount} active of ${organization.storeCount} stores`}
                                                    >
                                                        {organization.activeStoreCount}/{organization.storeCount}
                                                    </TableCell>
                                                    <TableCell>{organization.customerCount}</TableCell>
                                                    <TableCell>{organization.completedSaleCount}</TableCell>
                                                    <TableCell>{formatCompletedSalesValue(organization.completedSalesValue)}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-muted-foreground">
                                                        {formatLastCompletedSale(organization.lastCompletedSaleAt)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            {totalCount > limit ? (
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-sm text-muted-foreground">
                                        Page {page} of {totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={page <= 1}
                                            onClick={() => setPage((current) => current - 1)}
                                        >
                                            <ChevronLeft className="size-4" />
                                            Previous
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage((current) => current + 1)}
                                        >
                                            Next
                                            <ChevronRight className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                </CardContent>
            </Card>
        </section>
    );
};

export default PlatformOrganizationsPage;
export type { PlatformOrganizationsPageProps };
