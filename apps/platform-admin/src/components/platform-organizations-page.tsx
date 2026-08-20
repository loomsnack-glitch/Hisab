import { useState, type FormEvent } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
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
import { Input } from "@repo/ui/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";

import PlatformOrganizationDetailPage from "@/components/platform-organization-detail-page";

const organizationsQueryKey = ["platform-owner", "organizations"] as const;

type ActivityFilter = PlatformOrganizationActivityFilter;

type PlatformOrganizationsPageProps = {
    onBack: () => void;
    reportingQuery?: PlatformDashboardQueryJSON;
    getPlatformOrganizations?: typeof getPlatformOrganizationsRequest;
    getPlatformOrganization?: typeof getPlatformOrganizationRequest;
    initialSearch?: string;
    initialActivity?: ActivityFilter;
};

const activityOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active Organization" },
    { value: "inactive", label: "Inactive" },
] as const;

const formatCompletedSalesValue = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value);

const formatLastCompletedSale = (value: string | Date | null) => {
    if (!value) return "No completed Sale";
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: PLATFORM_REPORTING_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
};

const reportingPeriodLabel = (query: PlatformDashboardQueryJSON) => {
    const period = query.period ?? "all-time";
    if (period === "all-time") return "All-time";
    if (period === "custom") {
        return `Custom ${query.startDate ?? ""} to ${query.endDate ?? ""} in Asia/Kolkata`;
    }
    if (period === "7d") return "7-day";
    if (period === "30d") return "30-day";
    return "90-day";
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
    onBack,
    reportingQuery = { period: "all-time" },
    getPlatformOrganizations = getPlatformOrganizationsRequest,
    getPlatformOrganization = getPlatformOrganizationRequest,
    initialSearch = "",
    initialActivity = "all",
}: PlatformOrganizationsPageProps) => {
    const [searchInput, setSearchInput] = useState(initialSearch);
    const [appliedSearch, setAppliedSearch] = useState(initialSearch.trim());
    const [activity, setActivity] = useState<ActivityFilter>(initialActivity);
    const [page, setPage] = useState(1);
    const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
    const listQuery = toListQuery(reportingQuery, appliedSearch, activity, page);

    const organizationsQuery = useQuery({
        queryKey: [...organizationsQueryKey, listQuery],
        queryFn: () => getPlatformOrganizations(listQuery),
        retry: false,
        placeholderData: keepPreviousData,
    });
    const list = organizationsQuery.data?.status === "success" ? organizationsQuery.data.data : undefined;
    const organizations = list?.organizations ?? [];
    const totalCount = list?.pagination.totalCount ?? 0;
    const limit = list?.pagination.limit ?? 20;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const hasFilter = Boolean(appliedSearch) || activity !== "all";

    const applySearch = (event: FormEvent) => {
        event.preventDefault();
        setAppliedSearch(searchInput.trim());
        setPage(1);
    };

    const selectActivity = (next: ActivityFilter) => {
        setActivity(next);
        setPage(1);
    };

    if (selectedOrganizationId) {
        return (
            <PlatformOrganizationDetailPage
                organizationId={selectedOrganizationId}
                reportingQuery={reportingQuery}
                onBack={() => setSelectedOrganizationId(null)}
                getPlatformOrganization={getPlatformOrganization}
            />
        );
    }

    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <Button type="button" variant="ghost" className="-ml-3" onClick={onBack}>
                    <ArrowLeft className="size-4" /> Back to console
                </Button>
                <h1 className="text-3xl font-semibold tracking-tight">Organizations</h1>
                <p className="text-slate-600">
                    Read-only outreach list. Active Organization uses the preceding seven calendar days in Asia/Kolkata
                    and does not follow the selected Platform Reporting Period.
                </p>
            </div>

            <p>
                Reporting metrics use the {reportingPeriodLabel(reportingQuery)} Platform Reporting Period. Change the
                period on the Dashboard.
            </p>

            <form className="flex flex-wrap items-end gap-3" onSubmit={applySearch}>
                <label className="space-y-1 text-sm font-medium" htmlFor="organization-search">
                    Search Organizations
                    <Input
                        id="organization-search"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Name or username"
                    />
                </label>
                <Button type="submit">Search</Button>
            </form>

            <div className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Outreach filter</h2>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Organization activity filter">
                    {activityOptions.map((option) => (
                        <Button
                            key={option.value}
                            type="button"
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
                <p aria-busy="true">Loading Organizations…</p>
            ) : organizationsQuery.isError || organizationsQuery.data?.status === "error" ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Organizations could not be loaded</AlertTitle>
                    <AlertDescription>
                        {(organizationsQuery.error as { message?: string } | null)?.message
                            ?? organizationsQuery.data?.message
                            ?? "The Organization list is unavailable."}
                    </AlertDescription>
                </Alert>
            ) : organizations.length === 0 ? (
                <p>
                    {hasFilter
                        ? "No Organizations match this search or filter."
                        : "No Organizations were found."}
                </p>
            ) : (
                <div className="space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organization</TableHead>
                                <TableHead>Creator</TableHead>
                                <TableHead>Activity</TableHead>
                                <TableHead>Stores</TableHead>
                                <TableHead>Customer Count</TableHead>
                                <TableHead>Completed Sales</TableHead>
                                <TableHead>Completed Sales Value</TableHead>
                                <TableHead>Last completed Sale</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {organizations.map((organization) => (
                                <TableRow key={organization.id}>
                                    <TableCell>
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="h-auto p-0 text-left font-medium"
                                            onClick={() => setSelectedOrganizationId(organization.id)}
                                        >
                                            {organization.name}
                                        </Button>
                                        <div className="text-slate-500">{organization.username}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div>{`${organization.creator.firstName} ${organization.creator.lastName}`}</div>
                                        <div className="text-slate-500">{formatPhoneDisplay(organization.creator.phone)}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={organization.isActive ? "secondary" : "outline"}>
                                            {organization.isActive ? "Active Organization" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{`${organization.activeStoreCount} Active Store / ${organization.storeCount}`}</TableCell>
                                    <TableCell>{organization.customerCount}</TableCell>
                                    <TableCell>{organization.completedSaleCount}</TableCell>
                                    <TableCell>{formatCompletedSalesValue(organization.completedSalesValue)}</TableCell>
                                    <TableCell>{formatLastCompletedSale(organization.lastCompletedSaleAt)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {totalCount > limit ? (
                        <div className="flex flex-wrap items-center gap-3">
                            <p>Page {page} of {totalPages}</p>
                            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                                Previous page
                            </Button>
                            <Button type="button" variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                                Next page
                            </Button>
                        </div>
                    ) : null}
                </div>
            )}
        </section>
    );
};

export default PlatformOrganizationsPage;
export type { PlatformOrganizationsPageProps };
