import { useDeferredValue, useEffect, useState, type MouseEvent } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
import {
    getPlatformOrganization as getPlatformOrganizationRequest,
    getPlatformOrganizationSales as getPlatformOrganizationSalesRequest,
    getPlatformOrganizationSale as getPlatformOrganizationSaleRequest,
    getPlatformOrganizationStores as getPlatformOrganizationStoresRequest,
    getPlatformOrganizationCatalog as getPlatformOrganizationCatalogRequest,
    getPlatformOrganizationCatalogProduct as getPlatformOrganizationCatalogProductRequest,
    getPlatformOrganizationCatalogCategory as getPlatformOrganizationCatalogCategoryRequest,
    getPlatformOrganizationCatalogAddOn as getPlatformOrganizationCatalogAddOnRequest,
    getPlatformOrganizationCustomers as getPlatformOrganizationCustomersRequest,
    getPlatformOrganizationCustomer as getPlatformOrganizationCustomerRequest,
    getPlatformOrganizationReports as getPlatformOrganizationReportsRequest,
    getPlatformOrganizationBillActivity as getPlatformOrganizationBillActivityRequest,
    getPlatformOrganizationTables as getPlatformOrganizationTablesRequest,
    getPlatformOrganizationTable as getPlatformOrganizationTableRequest,
    getPlatformOrganizationPurchases as getPlatformOrganizationPurchasesRequest,
    getPlatformOrganizationPurchase as getPlatformOrganizationPurchaseRequest,
    getPlatformOrganizations as getPlatformOrganizationsRequest,
    getPlatformStore as getPlatformStoreRequest,
} from "@repo/services";
import {
    PLATFORM_REPORTING_TIMEZONE,
    formatPhoneDisplay,
    type PlatformDashboardQueryJSON,
    type PlatformOrganizationActivityFilter,
    type PlatformOrganizationDirectorySort,
    type PlatformOrganizationListItemDTO,
    type PlatformOrganizationListQueryJSON,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { DataTableFacetedFilter } from "@repo/ui/components/data-table-faceted-filter";
import { DataTableSortFilter } from "@repo/ui/components/data-table-sort-filter";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import {
    organizationDirectoryPath,
    organizationInspectionPath,
    parseOrganizationInspectionPath,
} from "@/lib/organization-inspection-url";

import PlatformOrganizationDetailPage from "@/components/platform-organization-detail-page";

const organizationsQueryKey = ["platform-owner", "organizations"] as const;

type StatusSelection = "active" | "inactive";

type PlatformOrganizationsPageProps = {
    reportingQuery?: PlatformDashboardQueryJSON;
    getPlatformOrganizations?: typeof getPlatformOrganizationsRequest;
    getPlatformOrganization?: typeof getPlatformOrganizationRequest;
    getPlatformOrganizationStores?: typeof getPlatformOrganizationStoresRequest;
    getPlatformStore?: typeof getPlatformStoreRequest;
    getPlatformOrganizationSales?: typeof getPlatformOrganizationSalesRequest;
    getPlatformOrganizationSale?: typeof getPlatformOrganizationSaleRequest;
    getPlatformOrganizationCatalog?: typeof getPlatformOrganizationCatalogRequest;
    getPlatformOrganizationCatalogProduct?: typeof getPlatformOrganizationCatalogProductRequest;
    getPlatformOrganizationCatalogCategory?: typeof getPlatformOrganizationCatalogCategoryRequest;
    getPlatformOrganizationCatalogAddOn?: typeof getPlatformOrganizationCatalogAddOnRequest;
    getPlatformOrganizationCustomers?: typeof getPlatformOrganizationCustomersRequest;
    getPlatformOrganizationCustomer?: typeof getPlatformOrganizationCustomerRequest;
    getPlatformOrganizationReports?: typeof getPlatformOrganizationReportsRequest;
    getPlatformOrganizationBillActivity?: typeof getPlatformOrganizationBillActivityRequest;
    getPlatformOrganizationTables?: typeof getPlatformOrganizationTablesRequest;
    getPlatformOrganizationTable?: typeof getPlatformOrganizationTableRequest;
    getPlatformOrganizationPurchases?: typeof getPlatformOrganizationPurchasesRequest;
    getPlatformOrganizationPurchase?: typeof getPlatformOrganizationPurchaseRequest;
    initialSearch?: string;
    initialActivity?: ActivityFilter;
    initialSort?: DirectorySort;
    onUnauthorized?: () => Promise<void>;
};

type ActivityFilter = PlatformOrganizationActivityFilter;
type DirectorySort = PlatformOrganizationDirectorySort;

const statusFilterOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
] as const;

const sortOptions = [
    { value: "recent_activity", label: "Most recently active" },
    { value: "name_asc", label: "Name A–Z" },
    { value: "name_desc", label: "Name Z–A" },
    { value: "sales_value_desc", label: "Highest sales value" },
    { value: "sales_value_asc", label: "Lowest sales value" },
] as const;

const activityFromInitial = (activity: ActivityFilter): Set<StatusSelection> => {
    if (activity === "active") return new Set(["active"]);
    if (activity === "inactive") return new Set(["inactive"]);
    return new Set();
};

const activityFromStatusSelection = (selection: Set<StatusSelection>): ActivityFilter => {
    if (selection.size === 1 && selection.has("active")) return "active";
    if (selection.size === 1 && selection.has("inactive")) return "inactive";
    return "all";
};

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

const creatorName = (organization: PlatformOrganizationListItemDTO) =>
    `${organization.creator.firstName} ${organization.creator.lastName}`;

const toListQuery = (
    reportingQuery: PlatformDashboardQueryJSON,
    search: string,
    activity: ActivityFilter,
    sort: DirectorySort,
    page: number,
): PlatformOrganizationListQueryJSON => {
    const period = reportingQuery.period ?? "all-time";
    return {
        ...(period === "custom"
            ? { period: "custom", startDate: reportingQuery.startDate, endDate: reportingQuery.endDate }
            : { period }),
        ...(search ? { search } : {}),
        activity,
        sort,
        page,
        limit: 20,
    };
};

const PlatformOrganizationsPage = ({
    reportingQuery = { period: "all-time" },
    getPlatformOrganizations = getPlatformOrganizationsRequest,
    getPlatformOrganization = getPlatformOrganizationRequest,
    getPlatformOrganizationStores = getPlatformOrganizationStoresRequest,
    getPlatformStore = getPlatformStoreRequest,
    getPlatformOrganizationSales = getPlatformOrganizationSalesRequest,
    getPlatformOrganizationSale = getPlatformOrganizationSaleRequest,
    getPlatformOrganizationCatalog = getPlatformOrganizationCatalogRequest,
    getPlatformOrganizationCatalogProduct = getPlatformOrganizationCatalogProductRequest,
    getPlatformOrganizationCatalogCategory = getPlatformOrganizationCatalogCategoryRequest,
    getPlatformOrganizationCatalogAddOn = getPlatformOrganizationCatalogAddOnRequest,
    getPlatformOrganizationCustomers = getPlatformOrganizationCustomersRequest,
    getPlatformOrganizationCustomer = getPlatformOrganizationCustomerRequest,
    getPlatformOrganizationReports = getPlatformOrganizationReportsRequest,
    getPlatformOrganizationBillActivity = getPlatformOrganizationBillActivityRequest,
    getPlatformOrganizationTables = getPlatformOrganizationTablesRequest,
    getPlatformOrganizationTable = getPlatformOrganizationTableRequest,
    getPlatformOrganizationPurchases = getPlatformOrganizationPurchasesRequest,
    getPlatformOrganizationPurchase = getPlatformOrganizationPurchaseRequest,
    initialSearch = "",
    initialActivity = "all",
    initialSort = "recent_activity",
    onUnauthorized,
}: PlatformOrganizationsPageProps) => {
    const [pathname, setPathname] = useState(() => window.location.pathname);
    const [searchInput, setSearchInput] = useState(initialSearch);
    const deferredSearch = useDeferredValue(searchInput.trim());
    const [statusSelection, setStatusSelection] = useState<Set<StatusSelection>>(() => activityFromInitial(initialActivity));
    const [sort, setSort] = useState<DirectorySort>(initialSort);
    const [page, setPage] = useState(1);
    const activity = activityFromStatusSelection(statusSelection);
    const listQuery = toListQuery(reportingQuery, deferredSearch, activity, sort, page);
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
    const hasFilter = Boolean(deferredSearch) || activity !== "all";
    const hasDropdownFilters = statusSelection.size > 0 || sort !== "recent_activity";
    const errorCode = (organizationsQuery.error as { code?: number } | null)?.code
        ?? (organizationsQuery.data?.status === "error" ? organizationsQuery.data.code : undefined);

    useEffect(() => {
        const syncPath = () => setPathname(window.location.pathname);
        window.addEventListener("popstate", syncPath);
        return () => window.removeEventListener("popstate", syncPath);
    }, []);

    useEffect(() => {
        setPage(1);
    }, [deferredSearch, activity, sort]);

    useEffect(() => {
        if (errorCode === 401) void onUnauthorized?.();
    }, [errorCode, onUnauthorized]);

    const go = (path: string) => {
        const url = new URL(path, window.location.origin);
        const next = `${url.pathname}${url.search}`;
        if (`${window.location.pathname}${window.location.search}` !== next) {
            window.history.pushState(null, "", next);
        }
        setPathname(url.pathname);
    };

    const followInspectionLink = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
        event.preventDefault();
        go(path);
    };

    const selectSort = (next: DirectorySort) => {
        setSort(next);
    };

    const clearDropdownFilters = () => {
        setStatusSelection(new Set());
        setSort("recent_activity");
        setPage(1);
    };

    const resetFilters = () => {
        setSearchInput("");
        setStatusSelection(new Set());
        setSort("recent_activity");
        setPage(1);
    };

    const columnAriaSort = (column: "name" | "sales_value" | "last_sale"): "ascending" | "descending" | undefined => {
        if (column === "name" && (sort === "name_asc" || sort === "name_desc")) {
            return sort === "name_asc" ? "ascending" : "descending";
        }
        if (column === "sales_value" && (sort === "sales_value_asc" || sort === "sales_value_desc")) {
            return sort === "sales_value_asc" ? "ascending" : "descending";
        }
        if (column === "last_sale" && sort === "recent_activity") return "descending";
        return undefined;
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
                catalogResourceKind={inspection.catalogResourceKind}
                reportingQuery={reportingQuery}
                onNavigate={go}
                onBack={() => go(organizationDirectoryPath)}
                onUnauthorized={onUnauthorized}
                getPlatformOrganization={getPlatformOrganization}
                getPlatformOrganizationStores={getPlatformOrganizationStores}
                getPlatformStore={getPlatformStore}
                getPlatformOrganizationSales={getPlatformOrganizationSales}
                getPlatformOrganizationSale={getPlatformOrganizationSale}
                getPlatformOrganizationCatalog={getPlatformOrganizationCatalog}
                getPlatformOrganizationCatalogProduct={getPlatformOrganizationCatalogProduct}
                getPlatformOrganizationCatalogCategory={getPlatformOrganizationCatalogCategory}
                getPlatformOrganizationCatalogAddOn={getPlatformOrganizationCatalogAddOn}
                getPlatformOrganizationCustomers={getPlatformOrganizationCustomers}
                getPlatformOrganizationCustomer={getPlatformOrganizationCustomer}
                getPlatformOrganizationReports={getPlatformOrganizationReports}
                getPlatformOrganizationBillActivity={getPlatformOrganizationBillActivity}
                getPlatformOrganizationTables={getPlatformOrganizationTables}
                getPlatformOrganizationTable={getPlatformOrganizationTable}
                getPlatformOrganizationPurchases={getPlatformOrganizationPurchases}
                getPlatformOrganizationPurchase={getPlatformOrganizationPurchase}
            />
        );
    }

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative min-w-0 w-full sm:max-w-md group/search">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                    <Input
                        id="organization-search"
                        name="search"
                        type="search"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        aria-label="Search organization or creator"
                        placeholder="Search organization or creator"
                        className="h-10 w-full rounded-full border-border/60 bg-card/60 pl-10 text-sm shadow-2xs transition-all duration-200 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <DataTableFacetedFilter
                        title="Status"
                        options={statusFilterOptions}
                        selectedValues={statusSelection}
                        onSelectedValuesChange={(values) => setStatusSelection(new Set(Array.from(values) as StatusSelection[]))}
                    />
                    <DataTableSortFilter
                        title="Sort"
                        value={sort}
                        onValueChange={(value) => selectSort(value as DirectorySort)}
                        options={sortOptions}
                    />
                    {hasDropdownFilters ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-full px-2.5 text-muted-foreground"
                            onClick={clearDropdownFilters}
                        >
                            <RotateCcw className="size-3.5" />
                            Clear
                        </Button>
                    ) : null}
                </div>
            </div>

            {organizationsQuery.isLoading ? (
                        <div
                            className="flex items-center justify-center py-16"
                            role="status"
                            aria-busy="true"
                            aria-label="Loading organizations"
                        >
                            <Spinner className="size-6 text-primary" />
                        </div>
                    ) : errorCode === 401 ? (
                        <Alert role="alert">
                            <AlertTitle>Owner session is no longer valid</AlertTitle>
                            <AlertDescription>
                                Sign in again to continue inspecting Organizations.
                            </AlertDescription>
                        </Alert>
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
                                        onClick={resetFilters}
                                    >
                                        Clear filters
                                    </Button>
                                </EmptyContent>
                            ) : null}
                        </Empty>
            ) : (
                <div className="space-y-4">
                    <div className="hidden overflow-x-auto md:block">
                        <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead aria-sort={columnAriaSort("name")}>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="-ml-2 h-8 px-2"
                                                    onClick={() => selectSort(sort === "name_asc" ? "name_desc" : "name_asc")}
                                                >
                                                    Organization
                                                </Button>
                                            </TableHead>
                                            <TableHead>Creator</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Stores</TableHead>
                                            <TableHead>Customers</TableHead>
                                            <TableHead>Sales</TableHead>
                                            <TableHead aria-sort={columnAriaSort("sales_value")}>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="-ml-2 h-8 px-2"
                                                    onClick={() => selectSort(sort === "sales_value_desc" ? "sales_value_asc" : "sales_value_desc")}
                                                >
                                                    Sales value
                                                </Button>
                                            </TableHead>
                                            <TableHead aria-sort={columnAriaSort("last_sale")}>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="-ml-2 h-8 px-2"
                                                    onClick={() => selectSort("recent_activity")}
                                                >
                                                    Last sale
                                                </Button>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {organizations.map((organization) => {
                                            const href = organizationInspectionPath(organization.id);
                                            return (
                                                <TableRow
                                                    key={organization.id}
                                                    className="cursor-pointer"
                                                    onClick={() => go(href)}
                                                >
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
                                                        <div>{creatorName(organization)}</div>
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
                    <div className="grid gap-3 md:hidden">
                                {organizations.map((organization) => {
                                    const href = organizationInspectionPath(organization.id);
                                    return (
                                        <a
                                            key={organization.id}
                                            href={href}
                                            aria-label={`Inspect ${organization.name}`}
                                            className="rounded-xl border border-border/60 bg-background/70 p-4 no-underline"
                                            onClick={(event) => followInspectionLink(event, href)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-foreground">{organization.name}</p>
                                                    <p className="text-xs text-muted-foreground">{organization.username}</p>
                                                </div>
                                                <Badge
                                                    variant={organization.isActive ? "secondary" : "outline"}
                                                    className="rounded-full"
                                                >
                                                    {organization.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                            <p className="mt-2 text-sm">
                                                {creatorName(organization)}
                                                <span className="text-muted-foreground">
                                                    {" · "}
                                                    {formatPhoneDisplay(organization.creator.phone)}
                                                </span>
                                            </p>
                                            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                <div>
                                                    <dt className="text-xs text-muted-foreground">Stores</dt>
                                                    <dd>{organization.activeStoreCount}/{organization.storeCount}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs text-muted-foreground">Customers</dt>
                                                    <dd>{organization.customerCount}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs text-muted-foreground">Sales</dt>
                                                    <dd>{organization.completedSaleCount}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs text-muted-foreground">Sales value</dt>
                                                    <dd>{formatCompletedSalesValue(organization.completedSalesValue)}</dd>
                                                </div>
                                                <div className="col-span-2">
                                                    <dt className="text-xs text-muted-foreground">Last sale</dt>
                                                    <dd>{formatLastCompletedSale(organization.lastCompletedSaleAt)}</dd>
                                                </div>
                                            </dl>
                                        </a>
                                    );
                                })}
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
        </section>
    );
};

export default PlatformOrganizationsPage;
export type { PlatformOrganizationsPageProps };
