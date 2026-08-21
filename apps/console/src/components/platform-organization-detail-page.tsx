import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
    ArrowLeft,
    BarChart3,
    Building2,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    LayoutGrid,
    MessageCircle,
    MonitorSmartphone,
    Package2,
    Phone,
    Receipt,
    Search,
    ShoppingCart,
    Store,
    Users,
    type LucideIcon,
} from "lucide-react";
import {
    getPlatformOrganization as getPlatformOrganizationRequest,
    getPlatformOrganizationSales as getPlatformOrganizationSalesRequest,
    getPlatformOrganizationSale as getPlatformOrganizationSaleRequest,
    getPlatformOrganizationStores as getPlatformOrganizationStoresRequest,
    getPlatformStore as getPlatformStoreRequest,
} from "@repo/services";
import {
    PLATFORM_REPORTING_TIMEZONE,
    formatPhoneDisplay,
    type PlatformBillingInspectionQueryJSON,
    type PlatformDashboardQueryJSON,
    type PlatformOrganizationDetailQueryJSON,
    type PlatformRecentSaleDTO,
    type PlatformSaleInspectionDetailDTO,
    type PlatformSaleInspectionSummaryDTO,
    type PlatformStoreActivityDTO,
    type PlatformStoreDetailDTO,
    type PlatformStoreDeviceInspectionDTO,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Input } from "@repo/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader } from "@repo/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";

import {
    organizationInspectionPath,
    organizationInspectionSections,
    parseBillingInspectionSearch,
    type BillingInspectionFilters,
    type OrganizationInspectionSection,
} from "@/lib/organization-inspection-url";

const organizationDetailQueryKey = ["platform-owner", "organization"] as const;
const organizationStoresQueryKey = ["platform-owner", "organization-stores"] as const;
const platformStoreQueryKey = ["platform-owner", "store"] as const;
const organizationSalesQueryKey = ["platform-owner", "organization-sales"] as const;
const organizationSaleQueryKey = ["platform-owner", "organization-sale"] as const;

type PlatformOrganizationDetailPageProps = {
    organizationId: string;
    onBack: () => void;
    section?: OrganizationInspectionSection;
    resourceId?: string;
    reportingQuery?: PlatformDashboardQueryJSON;
    getPlatformOrganization?: typeof getPlatformOrganizationRequest;
    getPlatformOrganizationStores?: typeof getPlatformOrganizationStoresRequest;
    getPlatformStore?: typeof getPlatformStoreRequest;
    getPlatformOrganizationSales?: typeof getPlatformOrganizationSalesRequest;
    getPlatformOrganizationSale?: typeof getPlatformOrganizationSaleRequest;
    onNavigate?: (path: string) => void;
    onUnauthorized?: () => Promise<void>;
};

const sectionConfig: Record<OrganizationInspectionSection, { label: string; icon: LucideIcon }> = {
    overview: { label: "Overview", icon: LayoutDashboard },
    stores: { label: "Stores", icon: Store },
    catalog: { label: "Catalog", icon: Package2 },
    billing: { label: "Billing", icon: Receipt },
    customers: { label: "Customers", icon: Users },
    reports: { label: "Reports", icon: BarChart3 },
    tables: { label: "Tables", icon: LayoutGrid },
    purchases: { label: "Purchases", icon: ShoppingCart },
    whatsapp: { label: "WhatsApp", icon: MessageCircle },
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

const toDetailQuery = (reportingQuery: PlatformDashboardQueryJSON): PlatformOrganizationDetailQueryJSON => {
    const period = reportingQuery.period ?? "all-time";
    return period === "custom"
        ? { period: "custom", startDate: reportingQuery.startDate, endDate: reportingQuery.endDate }
        : { period };
};

const saleStatusLabel = (status: PlatformRecentSaleDTO["status"]) => {
    if (status === "draft") return "Draft";
    if (status === "voided") return "Voided";
    return "Completed";
};

const billingSaleStatusLabel = saleStatusLabel;

const paymentStatusLabel = (status: PlatformSaleInspectionSummaryDTO["paymentStatus"]) => {
    if (status === "partial") return "Partial";
    if (status === "paid") return "Paid";
    return "Pending";
};

const billingSortOptions = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "highest", label: "Highest value" },
    { value: "lowest", label: "Lowest value" },
] as const;

const deviceStatusLabel = (status: PlatformStoreDeviceInspectionDTO["status"]) => {
    if (status === "revoked") return "Revoked";
    if (status === "inactive") return "Inactive";
    return "Active";
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-xl border border-border/60 bg-background/80 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
    </div>
);

const PlatformOrganizationDetailPage = ({
    organizationId,
    onBack,
    section = "overview",
    resourceId,
    reportingQuery = { period: "all-time" },
    getPlatformOrganization = getPlatformOrganizationRequest,
    getPlatformOrganizationStores = getPlatformOrganizationStoresRequest,
    getPlatformStore = getPlatformStoreRequest,
    getPlatformOrganizationSales = getPlatformOrganizationSalesRequest,
    getPlatformOrganizationSale = getPlatformOrganizationSaleRequest,
    onNavigate,
    onUnauthorized,
}: PlatformOrganizationDetailPageProps) => {
    const [billingFilters, setBillingFilters] = useState<BillingInspectionFilters>(() =>
        parseBillingInspectionSearch(typeof window === "undefined" ? "" : window.location.search),
    );
    const [billingSearchInput, setBillingSearchInput] = useState(billingFilters.search ?? "");
    const detailQueryInput = toDetailQuery(reportingQuery);
    const periodLabel = reportingPeriodLabel(reportingQuery);
    const detailQuery = useQuery({
        queryKey: [...organizationDetailQueryKey, organizationId, detailQueryInput],
        queryFn: () => getPlatformOrganization(organizationId, detailQueryInput),
        retry: false,
        placeholderData: keepPreviousData,
    });
    const storesQuery = useQuery({
        queryKey: [...organizationStoresQueryKey, organizationId, detailQueryInput],
        queryFn: () => getPlatformOrganizationStores(organizationId, detailQueryInput),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "stores" && !resourceId,
    });
    const storeQuery = useQuery({
        queryKey: [...platformStoreQueryKey, organizationId, resourceId, detailQueryInput],
        queryFn: () => getPlatformStore(organizationId, resourceId!, detailQueryInput),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "stores" && Boolean(resourceId),
    });
    const salesQuery = useQuery({
        queryKey: [...organizationSalesQueryKey, organizationId, billingFilters],
        queryFn: () => getPlatformOrganizationSales(organizationId, billingFilters),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "billing" && !resourceId,
    });
    const saleQuery = useQuery({
        queryKey: [...organizationSaleQueryKey, organizationId, resourceId],
        queryFn: () => getPlatformOrganizationSale(organizationId, resourceId!),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "billing" && Boolean(resourceId),
    });
    const response = detailQuery.data;
    const organization = response?.status === "success" ? response.data?.organization : undefined;
    const storesResponse = storesQuery.data;
    const stores = storesResponse?.status === "success" ? storesResponse.data?.stores : undefined;
    const storeResponse = storeQuery.data;
    const store = storeResponse?.status === "success" ? storeResponse.data?.store : undefined;
    const salesResponse = salesQuery.data;
    const salesList = salesResponse?.status === "success" ? salesResponse.data : undefined;
    const saleResponse = saleQuery.data;
    const sale = saleResponse?.status === "success" ? saleResponse.data?.sale : undefined;
    const errorCode = (detailQuery.error as { code?: number } | null)?.code ?? (response?.status === "error" ? response.code : undefined);
    const storesErrorCode = (storesQuery.error as { code?: number } | null)?.code
        ?? (storesResponse?.status === "error" ? storesResponse.code : undefined);
    const storeErrorCode = (storeQuery.error as { code?: number } | null)?.code
        ?? (storeResponse?.status === "error" ? storeResponse.code : undefined);
    const salesErrorCode = (salesQuery.error as { code?: number } | null)?.code
        ?? (salesResponse?.status === "error" ? salesResponse.code : undefined);
    const saleErrorCode = (saleQuery.error as { code?: number } | null)?.code
        ?? (saleResponse?.status === "error" ? saleResponse.code : undefined);
    const activeSectionErrorCode = section === "billing" && resourceId
        ? saleErrorCode ?? errorCode
        : section === "billing"
            ? salesErrorCode ?? errorCode
            : section === "stores" && resourceId
                ? storeErrorCode ?? errorCode
                : section === "stores"
                    ? storesErrorCode ?? errorCode
                    : errorCode;
    const errorMessage =
        (detailQuery.error as { message?: string } | null)?.message
        ?? (response?.status === "error" ? response.message : undefined);
    const storesErrorMessage =
        (storesQuery.error as { message?: string } | null)?.message
        ?? (storesResponse?.status === "error" ? storesResponse.message : undefined);
    const storeErrorMessage =
        (storeQuery.error as { message?: string } | null)?.message
        ?? (storeResponse?.status === "error" ? storeResponse.message : undefined);
    const salesErrorMessage =
        (salesQuery.error as { message?: string } | null)?.message
        ?? (salesResponse?.status === "error" ? salesResponse.message : undefined);
    const saleErrorMessage =
        (saleQuery.error as { message?: string } | null)?.message
        ?? (saleResponse?.status === "error" ? saleResponse.message : undefined);
    const activeSectionErrorMessage = section === "billing" && resourceId
        ? saleErrorMessage ?? errorMessage
        : section === "billing"
            ? salesErrorMessage ?? errorMessage
            : section === "stores" && resourceId
                ? storeErrorMessage ?? errorMessage
                : section === "stores"
                    ? storesErrorMessage ?? errorMessage
                    : errorMessage;

    useEffect(() => {
        if (section !== "billing") return;
        const syncBillingFilters = () => {
            const nextFilters = parseBillingInspectionSearch(window.location.search);
            setBillingFilters(nextFilters);
            setBillingSearchInput(nextFilters.search ?? "");
        };
        syncBillingFilters();
        window.addEventListener("popstate", syncBillingFilters);
        return () => window.removeEventListener("popstate", syncBillingFilters);
    }, [section, resourceId]);

    const navigateBilling = (nextFilters: BillingInspectionFilters, nextResourceId?: string) => {
        const path = organizationInspectionPath(organizationId, "billing", nextResourceId, nextFilters);
        setBillingFilters(nextFilters);
        go(path);
    };

    const updateBillingFilters = (patch: Partial<BillingInspectionFilters>, nextResourceId?: string) => {
        navigateBilling({ ...billingFilters, ...patch, page: patch.page ?? 1 }, nextResourceId);
    };

    useEffect(() => {
        if (activeSectionErrorCode === 401) void onUnauthorized?.();
    }, [activeSectionErrorCode, onUnauthorized]);

    const go = (path: string) => {
        onNavigate?.(path);
    };

    const followInspectionLink = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
        event.preventDefault();
        go(path);
    };

    const renderSectionNav = () => (
        <nav aria-label="Organization inspection sections" className="border-b border-border/60">
            <div className="flex gap-1 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {organizationInspectionSections.map((item) => {
                    const href = item === "billing"
                        ? organizationInspectionPath(organizationId, item, undefined, billingFilters)
                        : organizationInspectionPath(organizationId, item);
                    const active = item === section;
                    const Icon = sectionConfig[item].icon;
                    return (
                        <a
                            key={item}
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2.5 text-xs font-medium transition-colors duration-200 sm:gap-2 sm:px-4 sm:text-sm",
                                active
                                    ? "font-semibold text-primary"
                                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                            )}
                            onClick={(event) => followInspectionLink(event, href)}
                        >
                            <Icon className="size-3.5 sm:size-4" />
                            <span>{sectionConfig[item].label}</span>
                            {active ? <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" /> : null}
                        </a>
                    );
                })}
            </div>
        </nav>
    );

    const renderStoreTable = (storeRows: PlatformStoreActivityDTO[], heading: string, description: string) => (
        <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
            <CardHeader className="gap-1">
                <h2 className="font-display text-xl font-semibold tracking-tight">{heading}</h2>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {storeRows.length === 0 ? (
                    <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Store />
                            </EmptyMedia>
                            <EmptyTitle>No stores yet</EmptyTitle>
                            <EmptyDescription>This organization has not opened any stores.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/60">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Store</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Customers</TableHead>
                                    <TableHead>Sales</TableHead>
                                    <TableHead>Sales value</TableHead>
                                    <TableHead>Last sale</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {storeRows.map((storeRow) => {
                                    const href = organizationInspectionPath(organizationId, "stores", storeRow.id);
                                    return (
                                        <TableRow key={storeRow.id}>
                                            <TableCell className="font-medium">
                                                <a
                                                    href={href}
                                                    className="text-primary underline-offset-4 hover:underline"
                                                    onClick={(event) => followInspectionLink(event, href)}
                                                >
                                                    {storeRow.name}
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={storeRow.isActive ? "secondary" : "outline"}
                                                    className="rounded-full"
                                                >
                                                    {storeRow.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{storeRow.customerCount}</TableCell>
                                            <TableCell>{storeRow.completedSaleCount}</TableCell>
                                            <TableCell>{formatCompletedSalesValue(storeRow.completedSalesValue)}</TableCell>
                                            <TableCell className="whitespace-nowrap text-muted-foreground">
                                                {formatLastCompletedSale(storeRow.lastCompletedSaleAt)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const renderStoreRecentSales = (recentSales: PlatformRecentSaleDTO[], storeName: string) => (
        <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
            <CardHeader className="gap-1">
                <h2 className="font-display text-xl font-semibold tracking-tight">Recent sales</h2>
                <CardDescription>{`Latest sales for ${storeName}, not limited by reporting period`}</CardDescription>
            </CardHeader>
            <CardContent>
                {recentSales.length === 0 ? (
                    <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Receipt />
                            </EmptyMedia>
                            <EmptyTitle>No recent sales</EmptyTitle>
                            <EmptyDescription>Sales will appear here once this store starts billing.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/60">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sale</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead>When</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentSales.map((sale) => {
                                    const href = organizationInspectionPath(organizationId, "billing", sale.id);
                                    return (
                                        <TableRow key={sale.id}>
                                            <TableCell className="font-medium">
                                                <a
                                                    href={href}
                                                    className="text-primary underline-offset-4 hover:underline"
                                                    onClick={(event) => followInspectionLink(event, href)}
                                                >
                                                    {sale.saleNumber ?? "Draft"}
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="rounded-full">
                                                    {saleStatusLabel(sale.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{formatCompletedSalesValue(sale.grandTotal)}</TableCell>
                                            <TableCell className="whitespace-nowrap text-muted-foreground">
                                                {formatLastCompletedSale(sale.occurredAt)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const renderStoreDevices = (devices: PlatformStoreDeviceInspectionDTO[]) => (
        <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
            <CardHeader className="gap-1">
                <h2 className="font-display text-xl font-semibold tracking-tight">Store devices</h2>
                <CardDescription>Console-safe operational metadata only. Device secrets are never shown.</CardDescription>
            </CardHeader>
            <CardContent>
                {devices.length === 0 ? (
                    <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <MonitorSmartphone />
                            </EmptyMedia>
                            <EmptyTitle>No devices registered</EmptyTitle>
                            <EmptyDescription>This store has no POS terminals yet.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/60">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Device</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last seen</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {devices.map((device) => (
                                    <TableRow key={device.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{device.name}</p>
                                                <p className="mt-1 font-mono text-xs text-muted-foreground">{device.loginUsername}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="rounded-full">
                                                {deviceStatusLabel(device.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">
                                            {formatLastCompletedSale(device.lastSeenAt)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">
                                            {formatLastCompletedSale(device.createdAt)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const renderStoresList = () => {
        if (storesQuery.isLoading) {
            return (
                <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading stores">
                    <Spinner className="size-6 text-primary" />
                </div>
            );
        }
        if (storesErrorCode === 404 || storesErrorMessage === "Organization not found") {
            return (
                <Alert role="alert">
                    <AlertTitle>Organization was not found</AlertTitle>
                    <AlertDescription>
                        This organization is not available. Return to the organizations list to continue.
                    </AlertDescription>
                </Alert>
            );
        }
        if (storesQuery.isError || storesResponse?.status === "error") {
            return (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Stores could not be loaded</AlertTitle>
                    <AlertDescription>{storesErrorMessage ?? "The store list is unavailable."}</AlertDescription>
                </Alert>
            );
        }
        if (!stores) return null;

        return renderStoreTable(
            stores,
            "Stores",
            `${periodLabel} sales metrics · store status from last 7 days`,
        );
    };

    const renderStoreDetail = (storeDetail: PlatformStoreDetailDTO) => (
        <div className="space-y-6">
            <Button
                type="button"
                variant="ghost"
                className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => go(organizationInspectionPath(organizationId, "stores"))}
            >
                <ArrowLeft className="size-4" />
                Back to stores
            </Button>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader className="gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant={storeDetail.isActive ? "secondary" : "outline"}
                            className="rounded-full"
                        >
                            {storeDetail.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {storeDetail.kotSystemEnabled ? (
                            <Badge variant="outline" className="rounded-full">KOT enabled</Badge>
                        ) : null}
                        {storeDetail.tableManagementEnabled ? (
                            <Badge variant="outline" className="rounded-full">Table service enabled</Badge>
                        ) : null}
                    </div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight">{storeDetail.name}</h2>
                    <CardDescription>
                        {storeDetail.address ?? "Address not added yet"}
                        {` · Created ${formatLastCompletedSale(storeDetail.createdAt)}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard label="Customers" value={String(storeDetail.customerCount)} />
                        <MetricCard label="Sales" value={String(storeDetail.completedSaleCount)} />
                        <MetricCard label="Sales value" value={formatCompletedSalesValue(storeDetail.completedSalesValue)} />
                        <MetricCard label="Last sale" value={formatLastCompletedSale(storeDetail.lastCompletedSaleAt)} />
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                        {`${periodLabel} sales metrics · activity status uses last 7 days`}
                    </p>
                </CardContent>
            </Card>

            {renderStoreDevices(storeDetail.devices)}
            {renderStoreRecentSales(storeDetail.recentSales, storeDetail.name)}
        </div>
    );

    const renderStoreInspection = () => {
        if (resourceId) {
            if (storeQuery.isLoading) {
                return (
                    <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading store">
                        <Spinner className="size-6 text-primary" />
                    </div>
                );
            }
            if (storeErrorCode === 404 || storeErrorMessage === "Store not found") {
                return (
                    <Alert role="alert">
                        <AlertTitle>Store was not found</AlertTitle>
                        <AlertDescription>
                            This store is not available in this organization. Return to the store list to continue.
                        </AlertDescription>
                    </Alert>
                );
            }
            if (storeQuery.isError || storeResponse?.status === "error") {
                return (
                    <Alert variant="destructive" role="alert">
                        <AlertTitle>Store could not be loaded</AlertTitle>
                        <AlertDescription>{storeErrorMessage ?? "The store detail is unavailable."}</AlertDescription>
                    </Alert>
                );
            }
            if (!store) return null;
            return renderStoreDetail(store);
        }

        return renderStoresList();
    };

    const renderStorePerformance = (stores: PlatformStoreActivityDTO[]) => (
        renderStoreTable(
            stores,
            "Store performance",
            `${periodLabel} sales metrics · store status from last 7 days`,
        )
    );

    const renderRecentSales = (recentSales: PlatformRecentSaleDTO[]) => (
        <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
            <CardHeader className="gap-1">
                <h2 className="font-display text-xl font-semibold tracking-tight">Recent sales</h2>
                <CardDescription>Latest sales across all stores, not limited by reporting period</CardDescription>
            </CardHeader>
            <CardContent>
                {recentSales.length === 0 ? (
                    <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Receipt />
                            </EmptyMedia>
                            <EmptyTitle>No recent sales</EmptyTitle>
                            <EmptyDescription>Sales will appear here once this organization starts billing.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/60">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sale</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Store</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead>When</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentSales.map((sale) => {
                                    const href = organizationInspectionPath(organizationId, "billing", sale.id);
                                    const storeHref = organizationInspectionPath(organizationId, "stores", sale.store.id);
                                    return (
                                        <TableRow key={sale.id}>
                                            <TableCell className="font-medium">
                                                <a
                                                    href={href}
                                                    className="text-primary underline-offset-4 hover:underline"
                                                    onClick={(event) => followInspectionLink(event, href)}
                                                >
                                                    {sale.saleNumber ?? "Draft"}
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="rounded-full">
                                                    {saleStatusLabel(sale.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <a
                                                    href={storeHref}
                                                    className="text-primary underline-offset-4 hover:underline"
                                                    onClick={(event) => followInspectionLink(event, storeHref)}
                                                >
                                                    {sale.store.name}
                                                </a>
                                            </TableCell>
                                            <TableCell>{formatCompletedSalesValue(sale.grandTotal)}</TableCell>
                                            <TableCell className="whitespace-nowrap text-muted-foreground">
                                                {formatLastCompletedSale(sale.occurredAt)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const renderOverview = () => {
        if (!organization) return null;
        return (
            <div className="space-y-6">
                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardHeader className="gap-1">
                        <h2 className="font-display text-xl font-semibold tracking-tight">At a glance</h2>
                        <CardDescription>
                            {`${periodLabel} metrics · ${organization.activeStoreCount}/${organization.storeCount} active stores`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <MetricCard label="Stores" value={String(organization.storeCount)} />
                            <MetricCard label="Active stores" value={String(organization.activeStoreCount)} />
                            <MetricCard label="Customers" value={String(organization.customerCount)} />
                            <MetricCard label="Sales" value={String(organization.completedSaleCount)} />
                            <MetricCard label="Sales value" value={formatCompletedSalesValue(organization.completedSalesValue)} />
                            <MetricCard label="Last sale" value={formatLastCompletedSale(organization.lastCompletedSaleAt)} />
                        </div>
                    </CardContent>
                </Card>

                {renderStorePerformance(organization.stores)}
                {renderRecentSales(organization.recentSales)}
            </div>
        );
    };

    const renderBillingFilters = () => (
        <div className="space-y-3">
            <form
                className="flex flex-col gap-3 lg:flex-row lg:items-end"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    updateBillingFilters({ search: billingSearchInput.trim() || undefined });
                }}
                role="search"
            >
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={billingSearchInput}
                        onChange={(event) => setBillingSearchInput(event.target.value)}
                        aria-label="Search bills"
                        placeholder="Search bill number or customer"
                        className="h-10 rounded-xl pl-9"
                    />
                </div>
                <Button type="submit" size="sm" className="rounded-full">Search</Button>
            </form>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Select
                    value={billingFilters.storeId ?? "all"}
                    onValueChange={(value) => updateBillingFilters({ storeId: value === "all" ? undefined : value })}
                >
                    <SelectTrigger aria-label="Store filter">
                        <SelectValue placeholder="All stores" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All stores</SelectItem>
                        {(salesList?.stores ?? organization?.stores ?? []).map((storeOption) => (
                            <SelectItem key={storeOption.id} value={storeOption.id}>{storeOption.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={billingFilters.status ?? "all"}
                    onValueChange={(value) =>
                        updateBillingFilters({
                            status: value === "all" ? undefined : value as PlatformBillingInspectionQueryJSON["status"],
                        })}
                >
                    <SelectTrigger aria-label="Sale status filter">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="voided">Voided</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={billingFilters.paymentStatus ?? "all"}
                    onValueChange={(value) =>
                        updateBillingFilters({
                            paymentStatus: value === "all"
                                ? undefined
                                : value as PlatformBillingInspectionQueryJSON["paymentStatus"],
                        })}
                >
                    <SelectTrigger aria-label="Payment status filter">
                        <SelectValue placeholder="All payment states" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All payment states</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={billingFilters.paymentMethod ?? "all"}
                    onValueChange={(value) =>
                        updateBillingFilters({
                            paymentMethod: value === "all"
                                ? undefined
                                : value as PlatformBillingInspectionQueryJSON["paymentMethod"],
                        })}
                >
                    <SelectTrigger aria-label="Payment method filter">
                        <SelectValue placeholder="All payment methods" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All payment methods</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={billingFilters.sort ?? "newest"}
                    onValueChange={(value) =>
                        updateBillingFilters({ sort: value as PlatformBillingInspectionQueryJSON["sort"] })}
                >
                    <SelectTrigger aria-label="Sort bills">
                        <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                        {billingSortOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                <Input
                    type="date"
                    aria-label="Billing start date"
                    value={billingFilters.startDate ?? ""}
                    onChange={(event) => updateBillingFilters({ startDate: event.target.value || undefined })}
                />
                <Input
                    type="date"
                    aria-label="Billing end date"
                    value={billingFilters.endDate ?? ""}
                    onChange={(event) => updateBillingFilters({ endDate: event.target.value || undefined })}
                />
            </div>
            <p className="text-xs text-muted-foreground">
                Billing filters use this page&apos;s own date and store controls, not the Dashboard reporting period.
            </p>
        </div>
    );

    const renderBillingList = () => {
        if (salesQuery.isLoading) {
            return (
                <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading bills">
                    <Spinner className="size-6 text-primary" />
                </div>
            );
        }
        if (salesErrorCode === 404 || salesErrorMessage === "Organization not found") {
            return (
                <Alert role="alert">
                    <AlertTitle>Organization was not found</AlertTitle>
                    <AlertDescription>
                        This organization is not available. Return to the organizations list to continue.
                    </AlertDescription>
                </Alert>
            );
        }
        if (salesQuery.isError || salesResponse?.status === "error") {
            return (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Billing could not be loaded</AlertTitle>
                    <AlertDescription>{salesErrorMessage ?? "The bill list is unavailable."}</AlertDescription>
                </Alert>
            );
        }
        if (!salesList) return null;

        const page = salesList.pagination.page;
        const limit = salesList.pagination.limit;
        const totalPages = Math.max(1, Math.ceil(salesList.pagination.totalCount / limit));

        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader className="gap-1">
                    <h2 className="font-display text-xl font-semibold tracking-tight">Billing</h2>
                    <CardDescription>Read-only bills across all stores by default, with Store attribution on every row.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {renderBillingFilters()}
                    {salesList.sales.length === 0 ? (
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Receipt />
                                </EmptyMedia>
                                <EmptyTitle>No bills match these filters</EmptyTitle>
                                <EmptyDescription>Try a different store, status, or search term.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-border/60">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bill</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Store</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>When</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {salesList.sales.map((saleRow) => {
                                        const href = organizationInspectionPath(organizationId, "billing", saleRow.id, billingFilters);
                                        const storeHref = organizationInspectionPath(organizationId, "stores", saleRow.store.id);
                                        return (
                                            <TableRow key={saleRow.id}>
                                                <TableCell className="font-medium">
                                                    <a
                                                        href={href}
                                                        className="text-primary underline-offset-4 hover:underline"
                                                        onClick={(event) => followInspectionLink(event, href)}
                                                    >
                                                        {saleRow.saleNumber ?? "Draft"}
                                                    </a>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="rounded-full">
                                                        {billingSaleStatusLabel(saleRow.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="rounded-full">
                                                        {paymentStatusLabel(saleRow.paymentStatus)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <a
                                                        href={storeHref}
                                                        className="text-primary underline-offset-4 hover:underline"
                                                        onClick={(event) => followInspectionLink(event, storeHref)}
                                                    >
                                                        {saleRow.store.name}
                                                    </a>
                                                </TableCell>
                                                <TableCell>{saleRow.customerName ?? "Walk-in"}</TableCell>
                                                <TableCell>{formatCompletedSalesValue(saleRow.grandTotal)}</TableCell>
                                                <TableCell className="whitespace-nowrap text-muted-foreground">
                                                    {formatLastCompletedSale(saleRow.committedAt ?? saleRow.createdAt)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    {salesList.pagination.totalCount > limit ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => updateBillingFilters({ page: page - 1 })}
                                >
                                    <ChevronLeft className="size-4" />
                                    Previous
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => updateBillingFilters({ page: page + 1 })}
                                >
                                    Next
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        );
    };

    const renderSaleDetail = (saleDetail: PlatformSaleInspectionDetailDTO) => (
        <div className="space-y-6">
            <Button
                type="button"
                variant="ghost"
                className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => navigateBilling(billingFilters)}
            >
                <ArrowLeft className="size-4" />
                Back to billing
            </Button>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader className="gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                            Read-only inspection
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                            {billingSaleStatusLabel(saleDetail.status)}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                            {paymentStatusLabel(saleDetail.paymentStatus)}
                        </Badge>
                    </div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight">
                        {saleDetail.saleNumber ?? "Draft bill"}
                    </h2>
                    <CardDescription>
                        {`${saleDetail.store.name} · ${saleDetail.customer?.name ?? saleDetail.customerName ?? "Walk-in"}`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard label="Grand total" value={formatCompletedSalesValue(saleDetail.grandTotal)} />
                        <MetricCard label="Paid" value={formatCompletedSalesValue(saleDetail.paidTotal)} />
                        <MetricCard label="Due" value={formatCompletedSalesValue(saleDetail.dueTotal)} />
                        <MetricCard label="Order discount" value={formatCompletedSalesValue(saleDetail.orderDiscountAmount)} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="border-border/60 bg-background/70">
                            <CardHeader className="gap-1">
                                <h3 className="font-medium">Line items</h3>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {saleDetail.items.map((item) => (
                                    <div key={item.id} className="rounded-lg border border-border/60 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-medium">{item.productNameSnapshot}</p>
                                                <p className="text-xs text-muted-foreground">{`Qty ${item.quantity}`}</p>
                                            </div>
                                            <p className="font-medium">{formatCompletedSalesValue(item.lineTotal)}</p>
                                        </div>
                                        {(item.addOns ?? []).map((addOn) => (
                                            <p key={addOn.id} className="mt-2 text-sm text-muted-foreground">
                                                {`+ ${addOn.addOnNameSnapshot} x${addOn.totalQuantity}`}
                                            </p>
                                        ))}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <Card className="border-border/60 bg-background/70">
                                <CardHeader className="gap-1">
                                    <h3 className="font-medium">Payments</h3>
                                </CardHeader>
                                <CardContent>
                                    {saleDetail.payments.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No payments recorded.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {saleDetail.payments.map((payment) => (
                                                <div key={payment.id} className="flex items-center justify-between text-sm">
                                                    <span>{`${payment.method} · ${formatLastCompletedSale(payment.collectedAt)}`}</span>
                                                    <span>{formatCompletedSalesValue(payment.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-border/60 bg-background/70">
                                <CardHeader className="gap-1">
                                    <h3 className="font-medium">Device attribution</h3>
                                    <CardDescription>Console-safe operational metadata only.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <p>{`Created by ${saleDetail.createdByDevice?.name ?? "Unknown device"}`}</p>
                                    <p>{`Last updated by ${saleDetail.updatedByDevice?.name ?? "Unknown device"}`}</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <Card className="border-border/60 bg-background/70">
                        <CardHeader className="gap-1">
                            <h3 className="font-medium">Receipt preview</h3>
                            <CardDescription>Historical receipt data for inspection only. Printing and messaging are not available in Console.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="overflow-x-auto rounded-xl border border-border/60 bg-muted/20 p-4 font-mono text-xs whitespace-pre-wrap">
                                {saleDetail.receipt.previewText}
                            </pre>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );

    const renderBillingInspection = () => {
        if (resourceId) {
            if (saleQuery.isLoading) {
                return (
                    <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading bill">
                        <Spinner className="size-6 text-primary" />
                    </div>
                );
            }
            if (saleErrorCode === 404 || saleErrorMessage === "Sale not found") {
                return (
                    <Alert role="alert">
                        <AlertTitle>Bill was not found</AlertTitle>
                        <AlertDescription>
                            This bill is not available in this organization. Return to the billing list to continue.
                        </AlertDescription>
                    </Alert>
                );
            }
            if (saleQuery.isError || saleResponse?.status === "error") {
                return (
                    <Alert variant="destructive" role="alert">
                        <AlertTitle>Bill could not be loaded</AlertTitle>
                        <AlertDescription>{saleErrorMessage ?? "The bill detail is unavailable."}</AlertDescription>
                    </Alert>
                );
            }
            if (!sale) return null;
            return renderSaleDetail(sale);
        }

        return renderBillingList();
    };

    const renderLaterSection = () => {
        const config = sectionConfig[section];
        const Icon = config.icon;
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Icon className="size-5" />
                        </div>
                        <div>
                            <h2 className="font-display text-xl font-semibold tracking-tight">{config.label}</h2>
                            <CardDescription>
                                Read-only inspection
                                {resourceId ? ` · ${resourceId}` : ""}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-12">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Icon />
                            </EmptyMedia>
                            <EmptyTitle>{config.label} inspection coming soon</EmptyTitle>
                            <EmptyDescription>
                                Detailed {config.label.toLowerCase()} data will appear here in a future release.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </CardContent>
            </Card>
        );
    };

    return (
        <section className="space-y-6">
            <Button
                type="button"
                variant="ghost"
                className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={onBack}
            >
                <ArrowLeft className="size-4" />
                Back to organizations
            </Button>

            <Card className="overflow-hidden border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="relative p-6 sm:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.10),_transparent_30%)]" />
                    <div className="relative space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                                Inspection
                            </Badge>
                            {organization ? (
                                <Badge
                                    variant={organization.isActive ? "secondary" : "outline"}
                                    className="rounded-full"
                                >
                                    {organization.isActive ? "Active" : "Inactive"}
                                </Badge>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                                {organization?.name ?? "Organization"}
                            </h1>
                            {organization ? (
                                <p className="text-sm text-muted-foreground">
                                    {`@${organization.username} · ${periodLabel} metrics from Dashboard · Activity uses last 7 days`}
                                </p>
                            ) : null}
                        </div>
                        {organization ? (
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Building2 className="size-4 text-primary" />
                                    <span>{`${organization.creator.firstName} ${organization.creator.lastName}`}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="size-4 text-primary" />
                                    <span>{formatPhoneDisplay(organization.creator.phone)}</span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </CardContent>
            </Card>

            {renderSectionNav()}

            {detailQuery.isLoading && section !== "stores" && section !== "billing" ? (
                <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading organization">
                    <Spinner className="size-6 text-primary" />
                </div>
            ) : activeSectionErrorCode === 401 ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Owner session is no longer valid</AlertTitle>
                    <AlertDescription>
                        {activeSectionErrorMessage ?? "Sign in again to continue using Ganatri Console."}
                    </AlertDescription>
                </Alert>
            ) : section !== "stores" && section !== "billing" && (activeSectionErrorCode === 404 || activeSectionErrorMessage === "Organization not found") ? (
                <Alert role="alert">
                    <AlertTitle>Organization was not found</AlertTitle>
                    <AlertDescription>
                        This organization is not available. Return to the organizations list to continue.
                    </AlertDescription>
                </Alert>
            ) : section !== "stores" && section !== "billing" && (detailQuery.isError || response?.status === "error") ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Organization could not be loaded</AlertTitle>
                    <AlertDescription>{errorMessage ?? "The organization detail is unavailable."}</AlertDescription>
                </Alert>
            ) : section === "stores" || section === "billing" || organization ? (
                section === "overview" && organization
                    ? renderOverview()
                    : section === "stores"
                        ? renderStoreInspection()
                        : section === "billing"
                            ? renderBillingInspection()
                            : organization
                                ? renderLaterSection()
                                : null
            ) : null}
        </section>
    );
};

export default PlatformOrganizationDetailPage;
export type { PlatformOrganizationDetailPageProps };
