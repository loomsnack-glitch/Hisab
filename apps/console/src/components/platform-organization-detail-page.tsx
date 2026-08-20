import { useEffect, type MouseEvent } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
    ArrowLeft,
    BarChart3,
    Building2,
    LayoutDashboard,
    LayoutGrid,
    MessageCircle,
    Package2,
    Phone,
    Receipt,
    ShoppingCart,
    Store,
    Users,
    type LucideIcon,
} from "lucide-react";
import { getPlatformOrganization as getPlatformOrganizationRequest } from "@repo/services";
import {
    PLATFORM_REPORTING_TIMEZONE,
    formatPhoneDisplay,
    type PlatformDashboardQueryJSON,
    type PlatformOrganizationDetailQueryJSON,
    type PlatformRecentSaleDTO,
    type PlatformStoreActivityDTO,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
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
    type OrganizationInspectionSection,
} from "@/lib/organization-inspection-url";

const organizationDetailQueryKey = ["platform-owner", "organization"] as const;

type PlatformOrganizationDetailPageProps = {
    organizationId: string;
    onBack: () => void;
    section?: OrganizationInspectionSection;
    resourceId?: string;
    reportingQuery?: PlatformDashboardQueryJSON;
    getPlatformOrganization?: typeof getPlatformOrganizationRequest;
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
    onNavigate,
    onUnauthorized,
}: PlatformOrganizationDetailPageProps) => {
    const detailQueryInput = toDetailQuery(reportingQuery);
    const periodLabel = reportingPeriodLabel(reportingQuery);
    const detailQuery = useQuery({
        queryKey: [...organizationDetailQueryKey, organizationId, detailQueryInput],
        queryFn: () => getPlatformOrganization(organizationId, detailQueryInput),
        retry: false,
        placeholderData: keepPreviousData,
    });
    const response = detailQuery.data;
    const organization = response?.status === "success" ? response.data?.organization : undefined;
    const errorCode = (detailQuery.error as { code?: number } | null)?.code ?? (response?.status === "error" ? response.code : undefined);
    const errorMessage =
        (detailQuery.error as { message?: string } | null)?.message
        ?? (response?.status === "error" ? response.message : undefined);

    useEffect(() => {
        if (errorCode === 401) void onUnauthorized?.();
    }, [errorCode, onUnauthorized]);

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
                    const href = organizationInspectionPath(organizationId, item);
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

    const renderStorePerformance = (stores: PlatformStoreActivityDTO[]) => (
        <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
            <CardHeader className="gap-1">
                <h2 className="font-display text-xl font-semibold tracking-tight">Store performance</h2>
                <CardDescription>{`${periodLabel} sales metrics · store status from last 7 days`}</CardDescription>
            </CardHeader>
            <CardContent>
                {stores.length === 0 ? (
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
                                {stores.map((store) => {
                                    const href = organizationInspectionPath(organizationId, "stores", store.id);
                                    return (
                                        <TableRow key={store.id}>
                                            <TableCell className="font-medium">
                                                <a
                                                    href={href}
                                                    className="text-primary underline-offset-4 hover:underline"
                                                    onClick={(event) => followInspectionLink(event, href)}
                                                >
                                                    {store.name}
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={store.isActive ? "secondary" : "outline"}
                                                    className="rounded-full"
                                                >
                                                    {store.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{store.customerCount}</TableCell>
                                            <TableCell>{store.completedSaleCount}</TableCell>
                                            <TableCell>{formatCompletedSalesValue(store.completedSalesValue)}</TableCell>
                                            <TableCell className="whitespace-nowrap text-muted-foreground">
                                                {formatLastCompletedSale(store.lastCompletedSaleAt)}
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

            {detailQuery.isLoading ? (
                <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading organization">
                    <Spinner className="size-6 text-primary" />
                </div>
            ) : errorCode === 401 ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Owner session is no longer valid</AlertTitle>
                    <AlertDescription>
                        {errorMessage ?? "Sign in again to continue using Ganatri Console."}
                    </AlertDescription>
                </Alert>
            ) : errorCode === 404 || errorMessage === "Organization not found" ? (
                <Alert role="alert">
                    <AlertTitle>Organization was not found</AlertTitle>
                    <AlertDescription>
                        This organization is not available. Return to the organizations list to continue.
                    </AlertDescription>
                </Alert>
            ) : detailQuery.isError || response?.status === "error" ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Organization could not be loaded</AlertTitle>
                    <AlertDescription>{errorMessage ?? "The organization detail is unavailable."}</AlertDescription>
                </Alert>
            ) : organization ? (
                section === "overview" ? renderOverview() : renderLaterSection()
            ) : null}
        </section>
    );
};

export default PlatformOrganizationDetailPage;
export type { PlatformOrganizationDetailPageProps };
