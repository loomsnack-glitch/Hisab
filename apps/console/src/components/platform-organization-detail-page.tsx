import { useDeferredValue, useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
    ArrowLeft,
    BarChart3,
    Building2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    IndianRupee,
    LayoutDashboard,
    LayoutGrid,
    MessageCircle,
    MonitorSmartphone,
    Package2,
    Receipt,
    RotateCcw,
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
    getPlatformOrganizationWhatsApp as getPlatformOrganizationWhatsAppRequest,
    getPlatformStore as getPlatformStoreRequest,
} from "@repo/services";
import {
    PLATFORM_REPORTING_TIMEZONE,
    formatPhoneDisplay,
    type PlatformCatalogAddOnDetailResponse,
    type PlatformCatalogCategoryDetailResponse,
    type PlatformCatalogProductDetailResponse,
    type PlatformCustomerInspectionDetailDTO,
    type PlatformCustomerInspectionQueryJSON,
    type PlatformDashboardQueryJSON,
    type PlatformOrganizationDetailQueryJSON,
    type PlatformPurchaseInspectionDetailDTO,
    type PlatformRecentSaleDTO,
    type PlatformSaleInspectionSummaryDTO,
    type PlatformStoreActivityDTO,
    type PlatformStoreDetailDTO,
    type PlatformStoreDeviceInspectionDTO,
    type PlatformTableInspectionDetailDTO,
    type PlatformWhatsAppAccountInspectionDTO,
    type PlatformWhatsAppStoreConfigInspectionDTO,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Input } from "@repo/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader } from "@repo/ui/components/card";
import { DataTableFacetedFilter } from "@repo/ui/components/data-table-faceted-filter";
import { DataTableSortFilter } from "@repo/ui/components/data-table-sort-filter";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";

import ConsoleBillingInspection from "@/components/console-billing-inspection";
import ConsoleBillActivityChart from "@/components/console-bill-activity-chart";
import {
    billingInspectionSearchString,
    catalogInspectionPath,
    organizationInspectionPath,
    organizationInspectionSections,
    parseBillingInspectionSearch,
    parseCatalogInspectionSearch,
    parseCustomerInspectionSearch,
    parseOverviewBillActivitySearch,
    parsePurchaseInspectionSearch,
    parseReportInspectionSearch,
    parseTableInspectionSearch,
    resolveBillingInspectionFilters,
    resolveOverviewBillActivityFilters,
    toBillingInspectionApiQuery,
    type BillingInspectionFilters,
    type CatalogInspectionFilters,
    type CatalogResourceKind,
    type CustomerInspectionFilters,
    type OrganizationInspectionSection,
    type OverviewBillActivityFilters,
    type PurchaseInspectionFilters,
    type ReportInspectionFilters,
    type TableInspectionFilters,
} from "@/lib/organization-inspection-url";

const organizationDetailQueryKey = ["platform-owner", "organization"] as const;
const organizationStoresQueryKey = ["platform-owner", "organization-stores"] as const;
const platformStoreQueryKey = ["platform-owner", "store"] as const;
const organizationSalesQueryKey = ["platform-owner", "organization-sales"] as const;
const organizationSaleQueryKey = ["platform-owner", "organization-sale"] as const;
const organizationCatalogQueryKey = ["platform-owner", "organization-catalog"] as const;
const organizationCatalogProductQueryKey = ["platform-owner", "organization-catalog-product"] as const;
const organizationCatalogCategoryQueryKey = ["platform-owner", "organization-catalog-category"] as const;
const organizationCatalogAddOnQueryKey = ["platform-owner", "organization-catalog-add-on"] as const;
const organizationCustomersQueryKey = ["platform-owner", "organization-customers"] as const;
const organizationCustomerQueryKey = ["platform-owner", "organization-customer"] as const;
const organizationReportsQueryKey = ["platform-owner", "organization-reports"] as const;
const organizationBillActivityQueryKey = ["platform-owner", "organization-bill-activity"] as const;
const organizationTablesQueryKey = ["platform-owner", "organization-tables"] as const;
const organizationTableQueryKey = ["platform-owner", "organization-table"] as const;
const organizationPurchasesQueryKey = ["platform-owner", "organization-purchases"] as const;
const organizationPurchaseQueryKey = ["platform-owner", "organization-purchase"] as const;
const organizationWhatsAppQueryKey = ["platform-owner", "organization-whatsapp"] as const;

type PlatformOrganizationDetailPageProps = {
    organizationId: string;
    onBack: () => void;
    section?: OrganizationInspectionSection;
    resourceId?: string;
    catalogResourceKind?: CatalogResourceKind;
    reportingQuery?: PlatformDashboardQueryJSON;
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
    getPlatformOrganizationWhatsApp?: typeof getPlatformOrganizationWhatsAppRequest;
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

const serviceTableStateLabel = (state: PlatformTableInspectionDetailDTO["state"]) => {
    if (state === "free") return "Free";
    if (state === "allocated") return "Allocated";
    if (state === "engaged") return "Engaged";
    if (state === "ready_to_bill") return "Ready to bill";
    if (state === "payment_due") return "Payment due";
    return "Paid";
};

const purchaseStatusLabel = (status: PlatformPurchaseInspectionDetailDTO["status"]) =>
    status === "voided" ? "Voided" : "Recorded";

const whatsappAccountStatusLabel = (status: PlatformWhatsAppAccountInspectionDTO["status"]) => {
    if (status === "pending_qr") return "Pending QR";
    if (status === "connecting") return "Connecting";
    if (status === "connected") return "Connected";
    if (status === "disconnected") return "Disconnected";
    if (status === "failed") return "Failed";
    return "Revoked";
};

const whatsappTemplateKindLabel = (
    kind: PlatformWhatsAppStoreConfigInspectionDTO["templates"][number]["kind"],
) => {
    if (kind === "bill") return "Bill";
    if (kind === "due_reminder") return "Due reminder";
    return "Promotion";
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

type StoreStatusSelection = "active" | "inactive";
type StoreDirectorySort = "recent_activity" | "name_asc" | "name_desc" | "sales_value_desc" | "sales_value_asc";

const storeStatusFilterOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
] as const;

const storeSortOptions = [
    { value: "recent_activity", label: "Most recently active" },
    { value: "name_asc", label: "Name A–Z" },
    { value: "name_desc", label: "Name Z–A" },
    { value: "sales_value_desc", label: "Highest sales value" },
    { value: "sales_value_asc", label: "Lowest sales value" },
] as const;

const filterStores = (
    stores: PlatformStoreActivityDTO[],
    search: string,
    statusSelection: Set<StoreStatusSelection>,
    sort: StoreDirectorySort,
): PlatformStoreActivityDTO[] => {
    let result = stores;
    if (search) {
        const query = search.toLowerCase();
        result = result.filter((store) => store.name.toLowerCase().includes(query));
    }
    if (statusSelection.size === 1) {
        const active = statusSelection.has("active");
        result = result.filter((store) => store.isActive === active);
    }
    const sorted = [...result];
    sorted.sort((left, right) => {
        if (sort === "name_asc") return left.name.localeCompare(right.name);
        if (sort === "name_desc") return right.name.localeCompare(left.name);
        if (sort === "sales_value_desc") return right.completedSalesValue - left.completedSalesValue;
        if (sort === "sales_value_asc") return left.completedSalesValue - right.completedSalesValue;
        const leftTime = left.lastCompletedSaleAt ? new Date(left.lastCompletedSaleAt).getTime() : 0;
        const rightTime = right.lastCompletedSaleAt ? new Date(right.lastCompletedSaleAt).getTime() : 0;
        return rightTime - leftTime;
    });
    return sorted;
};

const deviceStatusLabel = (status: PlatformStoreDeviceInspectionDTO["status"]) => {
    if (status === "revoked") return "Revoked";
    if (status === "inactive") return "Inactive";
    return "Active";
};

const catalogStatusLabel = (status: "active" | "inactive") => (status === "active" ? "Active" : "Inactive");

const productTypeLabel = (productType: PlatformCatalogProductDetailResponse["product"]["productType"]) => {
    if (productType === "bundle") return "Bundle";
    if (productType === "combo") return "Combo";
    return "Single";
};

const catalogTabOptions = [
    { value: "products", label: "Products" },
    { value: "categories", label: "Categories" },
    { value: "add-ons", label: "Add-ons" },
] as const;

const customerStatusOptions = [
    { value: "all", label: "All customers" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "due", label: "Has due" },
    { value: "no_due", label: "No due" },
] as const;

const customerSortOptions = [
    { value: "newest", label: "Recently added" },
    { value: "oldest", label: "Oldest first" },
    { value: "name_asc", label: "Name A–Z" },
    { value: "name_desc", label: "Name Z–A" },
    { value: "highest_due", label: "Highest due" },
    { value: "lowest_due", label: "Lowest due" },
] as const;

const ledgerEntryTypeLabel = (entryType: PlatformCustomerInspectionDetailDTO["ledger"][number]["entryType"]) => {
    if (entryType === "payment") return "Payment";
    if (entryType === "void") return "Void";
    if (entryType === "adjustment") return "Adjustment";
    return "Sale";
};

type MetricCardTone = "blue" | "emerald" | "violet" | "amber" | "sky" | "slate";

type MetricCardProps = {
    label: string;
    value: string;
    icon?: LucideIcon;
    tone?: MetricCardTone;
    valueClassName?: string;
    compact?: boolean;
};

const metricCardToneStyles: Record<MetricCardTone, { card: string; icon: string }> = {
    blue: {
        card: "border-blue-500/15 bg-gradient-to-br from-blue-500/[0.08] via-background/80 to-background/90",
        icon: "bg-blue-500/12 text-blue-600 dark:text-blue-400",
    },
    emerald: {
        card: "border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.08] via-background/80 to-background/90",
        icon: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    },
    violet: {
        card: "border-violet-500/15 bg-gradient-to-br from-violet-500/[0.08] via-background/80 to-background/90",
        icon: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    },
    amber: {
        card: "border-amber-500/15 bg-gradient-to-br from-amber-500/[0.08] via-background/80 to-background/90",
        icon: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    },
    sky: {
        card: "border-sky-500/15 bg-gradient-to-br from-sky-500/[0.08] via-background/80 to-background/90",
        icon: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
    },
    slate: {
        card: "border-border/60 bg-gradient-to-br from-muted/50 via-background/80 to-background/90",
        icon: "bg-muted text-muted-foreground",
    },
};

const MetricCard = ({ label, value, icon: Icon, tone, valueClassName, compact = false }: MetricCardProps) => {
    const toneStyles = tone ? metricCardToneStyles[tone] : null;

    if (compact) {
        return (
            <div
                className={cn(
                    "flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2",
                    toneStyles?.card ?? "border-border/60 bg-background/80",
                )}
            >
                {Icon ? (
                    <div
                        className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                            toneStyles?.icon ?? "bg-muted/70 text-muted-foreground",
                        )}
                    >
                        <Icon className="size-3.5" />
                    </div>
                ) : null}
                <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p
                        className={cn(
                            "font-display text-sm font-semibold leading-tight text-foreground",
                            valueClassName,
                        )}
                    >
                        {value}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border p-4 shadow-sm shadow-black/[0.03] transition-colors",
                toneStyles?.card ?? "border-border/60 bg-background/80",
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                    <p
                        className={cn(
                            "mt-2 font-display text-2xl font-semibold tracking-tight text-foreground",
                            valueClassName,
                        )}
                    >
                        {value}
                    </p>
                </div>
                {Icon ? (
                    <div
                        className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            toneStyles?.icon ?? "bg-muted/70 text-muted-foreground",
                        )}
                    >
                        <Icon className="size-4.5" />
                    </div>
                ) : null}
            </div>
        </div>
    );
};

const PlatformOrganizationDetailPage = ({
    organizationId,
    onBack,
    section = "overview",
    resourceId,
    catalogResourceKind,
    reportingQuery = { period: "all-time" },
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
    getPlatformOrganizationWhatsApp = getPlatformOrganizationWhatsAppRequest,
    onNavigate,
    onUnauthorized,
}: PlatformOrganizationDetailPageProps) => {
    const [billingFilters, setBillingFilters] = useState<BillingInspectionFilters>(() =>
        resolveBillingInspectionFilters(
            parseBillingInspectionSearch(typeof window === "undefined" ? "" : window.location.search),
        ),
    );
    const [billingSearchInput, setBillingSearchInput] = useState(billingFilters.search ?? "");
    const [catalogFilters, setCatalogFilters] = useState<CatalogInspectionFilters>(() =>
        parseCatalogInspectionSearch(typeof window === "undefined" ? "" : window.location.search),
    );
    const [catalogSearchInput, setCatalogSearchInput] = useState(catalogFilters.search ?? "");
    const [customerFilters, setCustomerFilters] = useState<CustomerInspectionFilters>(() =>
        parseCustomerInspectionSearch(typeof window === "undefined" ? "" : window.location.search),
    );
    const [customerSearchInput, setCustomerSearchInput] = useState(customerFilters.search ?? "");
    const [reportFilters, setReportFilters] = useState<ReportInspectionFilters>(() =>
        parseReportInspectionSearch(typeof window === "undefined" ? "" : window.location.search),
    );
    const [overviewFilters, setOverviewFilters] = useState<OverviewBillActivityFilters>(() =>
        resolveOverviewBillActivityFilters(
            parseOverviewBillActivitySearch(typeof window === "undefined" ? "" : window.location.search),
        ),
    );
    const [tableFilters, setTableFilters] = useState<TableInspectionFilters>(() =>
        parseTableInspectionSearch(typeof window === "undefined" ? "" : window.location.search),
    );
    const [tableSearchInput, setTableSearchInput] = useState(tableFilters.search ?? "");
    const [purchaseFilters, setPurchaseFilters] = useState<PurchaseInspectionFilters>(() =>
        parsePurchaseInspectionSearch(typeof window === "undefined" ? "" : window.location.search),
    );
    const [purchaseSearchInput, setPurchaseSearchInput] = useState(purchaseFilters.search ?? "");
    const [storeSearchInput, setStoreSearchInput] = useState("");
    const deferredStoreSearch = useDeferredValue(storeSearchInput.trim());
    const [storeStatusSelection, setStoreStatusSelection] = useState<Set<StoreStatusSelection>>(new Set());
    const [storeSort, setStoreSort] = useState<StoreDirectorySort>("recent_activity");
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
        queryKey: [...organizationSalesQueryKey, organizationId, toBillingInspectionApiQuery(billingFilters)],
        queryFn: () => getPlatformOrganizationSales(organizationId, toBillingInspectionApiQuery(billingFilters)),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "billing",
    });
    const saleQuery = useQuery({
        queryKey: [...organizationSaleQueryKey, organizationId, resourceId],
        queryFn: () => getPlatformOrganizationSale(organizationId, resourceId!),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "billing" && Boolean(resourceId),
    });
    const catalogQuery = useQuery({
        queryKey: [...organizationCatalogQueryKey, organizationId, catalogFilters],
        queryFn: () => getPlatformOrganizationCatalog(organizationId, catalogFilters),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "catalog" && !resourceId,
    });
    const catalogProductQuery = useQuery({
        queryKey: [...organizationCatalogProductQueryKey, organizationId, resourceId],
        queryFn: () => getPlatformOrganizationCatalogProduct(organizationId, resourceId!),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "catalog" && catalogResourceKind === "products" && Boolean(resourceId),
    });
    const catalogCategoryQuery = useQuery({
        queryKey: [...organizationCatalogCategoryQueryKey, organizationId, resourceId],
        queryFn: () => getPlatformOrganizationCatalogCategory(organizationId, resourceId!),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "catalog" && catalogResourceKind === "categories" && Boolean(resourceId),
    });
    const catalogAddOnQuery = useQuery({
        queryKey: [...organizationCatalogAddOnQueryKey, organizationId, resourceId],
        queryFn: () => getPlatformOrganizationCatalogAddOn(organizationId, resourceId!),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "catalog" && catalogResourceKind === "add-ons" && Boolean(resourceId),
    });
    const customersQuery = useQuery({
        queryKey: [...organizationCustomersQueryKey, organizationId, customerFilters],
        queryFn: () => getPlatformOrganizationCustomers(organizationId, customerFilters),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "customers" && !resourceId,
    });
    const customerQuery = useQuery({
        queryKey: [...organizationCustomerQueryKey, organizationId, resourceId],
        queryFn: () => getPlatformOrganizationCustomer(organizationId, resourceId!),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "customers" && Boolean(resourceId),
    });
    const reportsQuery = useQuery({
        queryKey: [...organizationReportsQueryKey, organizationId, reportFilters],
        queryFn: () => getPlatformOrganizationReports(organizationId, reportFilters),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "reports",
    });
    const billActivityQuery = useQuery({
        queryKey: [...organizationBillActivityQueryKey, organizationId, overviewFilters],
        queryFn: () => getPlatformOrganizationBillActivity(organizationId, overviewFilters),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "overview",
    });
    const tablesQuery = useQuery({
        queryKey: [...organizationTablesQueryKey, organizationId, tableFilters],
        queryFn: () => getPlatformOrganizationTables(organizationId, tableFilters),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "tables" && !resourceId,
    });
    const tableQuery = useQuery({
        queryKey: [...organizationTableQueryKey, organizationId, resourceId],
        queryFn: () => getPlatformOrganizationTable(organizationId, resourceId!),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "tables" && Boolean(resourceId),
    });
    const purchasesQuery = useQuery({
        queryKey: [...organizationPurchasesQueryKey, organizationId, purchaseFilters],
        queryFn: () => getPlatformOrganizationPurchases(organizationId, purchaseFilters),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "purchases" && !resourceId,
    });
    const purchaseQuery = useQuery({
        queryKey: [...organizationPurchaseQueryKey, organizationId, resourceId],
        queryFn: () => getPlatformOrganizationPurchase(organizationId, resourceId!),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "purchases" && Boolean(resourceId),
    });
    const whatsappQuery = useQuery({
        queryKey: [...organizationWhatsAppQueryKey, organizationId],
        queryFn: () => getPlatformOrganizationWhatsApp(organizationId),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: section === "whatsapp",
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
    const catalogResponse = catalogQuery.data;
    const catalogList = catalogResponse?.status === "success" ? catalogResponse.data : undefined;
    const catalogProductResponse = catalogProductQuery.data;
    const catalogProduct = catalogProductResponse?.status === "success" ? catalogProductResponse.data?.product : undefined;
    const catalogCategoryResponse = catalogCategoryQuery.data;
    const catalogCategory = catalogCategoryResponse?.status === "success" ? catalogCategoryResponse.data?.category : undefined;
    const catalogAddOnResponse = catalogAddOnQuery.data;
    const catalogAddOn = catalogAddOnResponse?.status === "success" ? catalogAddOnResponse.data?.addOn : undefined;
    const customersResponse = customersQuery.data;
    const customersList = customersResponse?.status === "success" ? customersResponse.data : undefined;
    const customerResponse = customerQuery.data;
    const customerDetail = customerResponse?.status === "success" ? customerResponse.data?.customer : undefined;
    const reportsResponse = reportsQuery.data;
    const reportsData = reportsResponse?.status === "success" ? reportsResponse.data : undefined;
    const billActivityResponse = billActivityQuery.data;
    const billActivity = billActivityResponse?.status === "success" ? billActivityResponse.data : undefined;
    const tablesResponse = tablesQuery.data;
    const tablesList = tablesResponse?.status === "success" ? tablesResponse.data : undefined;
    const tableResponse = tableQuery.data;
    const tableDetail = tableResponse?.status === "success" ? tableResponse.data?.table : undefined;
    const purchasesResponse = purchasesQuery.data;
    const purchasesList = purchasesResponse?.status === "success" ? purchasesResponse.data : undefined;
    const purchaseResponse = purchaseQuery.data;
    const purchaseDetail = purchaseResponse?.status === "success" ? purchaseResponse.data?.purchase : undefined;
    const whatsappResponse = whatsappQuery.data;
    const whatsappData = whatsappResponse?.status === "success" ? whatsappResponse.data : undefined;
    const errorCode = (detailQuery.error as { code?: number } | null)?.code ?? (response?.status === "error" ? response.code : undefined);
    const storesErrorCode = (storesQuery.error as { code?: number } | null)?.code
        ?? (storesResponse?.status === "error" ? storesResponse.code : undefined);
    const storeErrorCode = (storeQuery.error as { code?: number } | null)?.code
        ?? (storeResponse?.status === "error" ? storeResponse.code : undefined);
    const salesErrorCode = (salesQuery.error as { code?: number } | null)?.code
        ?? (salesResponse?.status === "error" ? salesResponse.code : undefined);
    const saleErrorCode = (saleQuery.error as { code?: number } | null)?.code
        ?? (saleResponse?.status === "error" ? saleResponse.code : undefined);
    const catalogErrorCode = (catalogQuery.error as { code?: number } | null)?.code
        ?? (catalogResponse?.status === "error" ? catalogResponse.code : undefined);
    const catalogProductErrorCode = (catalogProductQuery.error as { code?: number } | null)?.code
        ?? (catalogProductResponse?.status === "error" ? catalogProductResponse.code : undefined);
    const catalogCategoryErrorCode = (catalogCategoryQuery.error as { code?: number } | null)?.code
        ?? (catalogCategoryResponse?.status === "error" ? catalogCategoryResponse.code : undefined);
    const catalogAddOnErrorCode = (catalogAddOnQuery.error as { code?: number } | null)?.code
        ?? (catalogAddOnResponse?.status === "error" ? catalogAddOnResponse.code : undefined);
    const customersErrorCode = (customersQuery.error as { code?: number } | null)?.code
        ?? (customersResponse?.status === "error" ? customersResponse.code : undefined);
    const customerErrorCode = (customerQuery.error as { code?: number } | null)?.code
        ?? (customerResponse?.status === "error" ? customerResponse.code : undefined);
    const reportsErrorCode = (reportsQuery.error as { code?: number } | null)?.code
        ?? (reportsResponse?.status === "error" ? reportsResponse.code : undefined);
    const tablesErrorCode = (tablesQuery.error as { code?: number } | null)?.code
        ?? (tablesResponse?.status === "error" ? tablesResponse.code : undefined);
    const tableErrorCode = (tableQuery.error as { code?: number } | null)?.code
        ?? (tableResponse?.status === "error" ? tableResponse.code : undefined);
    const purchasesErrorCode = (purchasesQuery.error as { code?: number } | null)?.code
        ?? (purchasesResponse?.status === "error" ? purchasesResponse.code : undefined);
    const purchaseErrorCode = (purchaseQuery.error as { code?: number } | null)?.code
        ?? (purchaseResponse?.status === "error" ? purchaseResponse.code : undefined);
    const whatsappErrorCode = (whatsappQuery.error as { code?: number } | null)?.code
        ?? (whatsappResponse?.status === "error" ? whatsappResponse.code : undefined);
    const catalogDetailErrorCode = catalogResourceKind === "products"
        ? catalogProductErrorCode
        : catalogResourceKind === "categories"
            ? catalogCategoryErrorCode
            : catalogResourceKind === "add-ons"
                ? catalogAddOnErrorCode
                : undefined;
    const activeSectionErrorCode = section === "billing" && resourceId
        ? saleErrorCode ?? errorCode
        : section === "billing"
            ? salesErrorCode ?? errorCode
            : section === "stores" && resourceId
                ? storeErrorCode ?? errorCode
                : section === "stores"
                    ? storesErrorCode ?? errorCode
                    : section === "catalog" && resourceId
                        ? catalogDetailErrorCode ?? errorCode
                        : section === "catalog"
                            ? catalogErrorCode ?? errorCode
                            : section === "customers" && resourceId
                                ? customerErrorCode ?? errorCode
                                : section === "customers"
                                    ? customersErrorCode ?? errorCode
                                    : section === "reports"
                                        ? reportsErrorCode ?? errorCode
                                        : section === "tables" && resourceId
                                            ? tableErrorCode ?? errorCode
                                            : section === "tables"
                                                ? tablesErrorCode ?? errorCode
                                                : section === "purchases" && resourceId
                                                    ? purchaseErrorCode ?? errorCode
                                                    : section === "purchases"
                                                        ? purchasesErrorCode ?? errorCode
                                                        : section === "whatsapp"
                                                            ? whatsappErrorCode ?? errorCode
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
    const catalogErrorMessage =
        (catalogQuery.error as { message?: string } | null)?.message
        ?? (catalogResponse?.status === "error" ? catalogResponse.message : undefined);
    const catalogProductErrorMessage =
        (catalogProductQuery.error as { message?: string } | null)?.message
        ?? (catalogProductResponse?.status === "error" ? catalogProductResponse.message : undefined);
    const catalogCategoryErrorMessage =
        (catalogCategoryQuery.error as { message?: string } | null)?.message
        ?? (catalogCategoryResponse?.status === "error" ? catalogCategoryResponse.message : undefined);
    const catalogAddOnErrorMessage =
        (catalogAddOnQuery.error as { message?: string } | null)?.message
        ?? (catalogAddOnResponse?.status === "error" ? catalogAddOnResponse.message : undefined);
    const customersErrorMessage =
        (customersQuery.error as { message?: string } | null)?.message
        ?? (customersResponse?.status === "error" ? customersResponse.message : undefined);
    const customerErrorMessage =
        (customerQuery.error as { message?: string } | null)?.message
        ?? (customerResponse?.status === "error" ? customerResponse.message : undefined);
    const tablesErrorMessage =
        (tablesQuery.error as { message?: string } | null)?.message
        ?? (tablesResponse?.status === "error" ? tablesResponse.message : undefined);
    const tableErrorMessage =
        (tableQuery.error as { message?: string } | null)?.message
        ?? (tableResponse?.status === "error" ? tableResponse.message : undefined);
    const purchasesErrorMessage =
        (purchasesQuery.error as { message?: string } | null)?.message
        ?? (purchasesResponse?.status === "error" ? purchasesResponse.message : undefined);
    const purchaseErrorMessage =
        (purchaseQuery.error as { message?: string } | null)?.message
        ?? (purchaseResponse?.status === "error" ? purchaseResponse.message : undefined);
    const whatsappErrorMessage =
        (whatsappQuery.error as { message?: string } | null)?.message
        ?? (whatsappResponse?.status === "error" ? whatsappResponse.message : undefined);
    const catalogDetailErrorMessage = catalogResourceKind === "products"
        ? catalogProductErrorMessage
        : catalogResourceKind === "categories"
            ? catalogCategoryErrorMessage
            : catalogResourceKind === "add-ons"
                ? catalogAddOnErrorMessage
                : undefined;
    const activeSectionErrorMessage = section === "billing" && resourceId
        ? saleErrorMessage ?? errorMessage
        : section === "billing"
            ? salesErrorMessage ?? errorMessage
            : section === "stores" && resourceId
                ? storeErrorMessage ?? errorMessage
                : section === "stores"
                    ? storesErrorMessage ?? errorMessage
                    : section === "catalog" && resourceId
                        ? catalogDetailErrorMessage ?? errorMessage
                        : section === "catalog"
                            ? catalogErrorMessage ?? errorMessage
                            : section === "customers" && resourceId
                                ? customerErrorMessage ?? errorMessage
                                : section === "customers"
                                    ? customersErrorMessage ?? errorMessage
                                    : section === "reports"
                                        ? (reportsQuery.error as { message?: string } | null)?.message
                                            ?? (reportsResponse?.status === "error" ? reportsResponse.message : undefined)
                                            ?? errorMessage
                                        : section === "tables" && resourceId
                                            ? tableErrorMessage ?? errorMessage
                                            : section === "tables"
                                                ? tablesErrorMessage ?? errorMessage
                                                : section === "purchases" && resourceId
                                                    ? purchaseErrorMessage ?? errorMessage
                                                    : section === "purchases"
                                                        ? purchasesErrorMessage ?? errorMessage
                                                        : section === "whatsapp"
                                                            ? whatsappErrorMessage ?? errorMessage
                                    : errorMessage;

    useEffect(() => {
        if (section !== "overview") return;
        const syncOverviewFilters = () => {
            setOverviewFilters(resolveOverviewBillActivityFilters(parseOverviewBillActivitySearch(window.location.search)));
        };
        syncOverviewFilters();
        window.addEventListener("popstate", syncOverviewFilters);
        return () => window.removeEventListener("popstate", syncOverviewFilters);
    }, [section]);

    useEffect(() => {
        if (section !== "reports") return;
        const syncReportFilters = () => {
            setReportFilters(parseReportInspectionSearch(window.location.search));
        };
        syncReportFilters();
        window.addEventListener("popstate", syncReportFilters);
        return () => window.removeEventListener("popstate", syncReportFilters);
    }, [section]);

    useEffect(() => {
        if (section !== "customers") return;
        const syncCustomerFilters = () => {
            const nextFilters = parseCustomerInspectionSearch(window.location.search);
            setCustomerFilters(nextFilters);
            setCustomerSearchInput(nextFilters.search ?? "");
        };
        syncCustomerFilters();
        window.addEventListener("popstate", syncCustomerFilters);
        return () => window.removeEventListener("popstate", syncCustomerFilters);
    }, [section, resourceId]);

    useEffect(() => {
        if (section !== "billing") return;
        const syncBillingFilters = () => {
            const nextFilters = resolveBillingInspectionFilters(parseBillingInspectionSearch(window.location.search));
            setBillingFilters(nextFilters);
            setBillingSearchInput(nextFilters.search ?? "");
        };
        syncBillingFilters();
        window.addEventListener("popstate", syncBillingFilters);
        return () => window.removeEventListener("popstate", syncBillingFilters);
    }, [section, resourceId]);

    useEffect(() => {
        if (section !== "catalog") return;
        const syncCatalogFilters = () => {
            const nextFilters = parseCatalogInspectionSearch(window.location.search);
            setCatalogFilters(nextFilters);
            setCatalogSearchInput(nextFilters.search ?? "");
        };
        syncCatalogFilters();
        window.addEventListener("popstate", syncCatalogFilters);
        return () => window.removeEventListener("popstate", syncCatalogFilters);
    }, [section, resourceId, catalogResourceKind]);

    useEffect(() => {
        if (section !== "tables") return;
        const syncTableFilters = () => {
            const nextFilters = parseTableInspectionSearch(window.location.search);
            setTableFilters(nextFilters);
            setTableSearchInput(nextFilters.search ?? "");
        };
        syncTableFilters();
        window.addEventListener("popstate", syncTableFilters);
        return () => window.removeEventListener("popstate", syncTableFilters);
    }, [section, resourceId]);

    useEffect(() => {
        if (section !== "purchases") return;
        const syncPurchaseFilters = () => {
            const nextFilters = parsePurchaseInspectionSearch(window.location.search);
            setPurchaseFilters(nextFilters);
            setPurchaseSearchInput(nextFilters.search ?? "");
        };
        syncPurchaseFilters();
        window.addEventListener("popstate", syncPurchaseFilters);
        return () => window.removeEventListener("popstate", syncPurchaseFilters);
    }, [section, resourceId]);

    const navigateBilling = (nextFilters: BillingInspectionFilters, nextResourceId?: string) => {
        const resolvedFilters = resolveBillingInspectionFilters(nextFilters);
        const path = organizationInspectionPath(organizationId, "billing", nextResourceId, resolvedFilters);
        setBillingFilters(resolvedFilters);
        go(path);
    };

    useEffect(() => {
        if (section !== "billing") return;
        const parsed = parseBillingInspectionSearch(window.location.search);
        const resolved = resolveBillingInspectionFilters(parsed);
        const expectedSearch = billingInspectionSearchString(resolved);
        if (window.location.search !== expectedSearch) {
            const path = organizationInspectionPath(organizationId, "billing", resourceId, resolved);
            setBillingFilters(resolved);
            go(path);
        }
    }, [section, organizationId, resourceId]);

    const updateBillingFilters = (patch: Partial<BillingInspectionFilters>, nextResourceId?: string) => {
        navigateBilling({ ...billingFilters, ...patch, page: patch.page ?? 1 }, nextResourceId);
    };

    const navigateCatalog = (
        nextFilters: CatalogInspectionFilters,
        target?: { kind: CatalogResourceKind; id: string },
    ) => {
        const path = target
            ? catalogInspectionPath(organizationId, { view: "detail", kind: target.kind, id: target.id, filters: nextFilters })
            : catalogInspectionPath(organizationId, { view: "list", filters: nextFilters });
        setCatalogFilters(nextFilters);
        go(path);
    };

    const updateCatalogFilters = (
        patch: Partial<CatalogInspectionFilters>,
        target?: { kind: CatalogResourceKind; id: string },
    ) => {
        navigateCatalog({ ...catalogFilters, ...patch, page: patch.page ?? 1 }, target);
    };

    const navigateCustomers = (nextFilters: CustomerInspectionFilters, nextResourceId?: string) => {
        const path = organizationInspectionPath(organizationId, "customers", nextResourceId, nextFilters);
        setCustomerFilters(nextFilters);
        go(path);
    };

    const updateCustomerFilters = (patch: Partial<CustomerInspectionFilters>, nextResourceId?: string) => {
        navigateCustomers({ ...customerFilters, ...patch, page: patch.page ?? 1 }, nextResourceId);
    };

    const navigateReports = (nextFilters: ReportInspectionFilters) => {
        const path = organizationInspectionPath(organizationId, "reports", undefined, nextFilters);
        setReportFilters(nextFilters);
        go(path);
    };

    const updateReportFilters = (patch: Partial<ReportInspectionFilters>) => {
        navigateReports({ ...reportFilters, ...patch });
    };

    const navigateTables = (nextFilters: TableInspectionFilters, nextResourceId?: string) => {
        const path = organizationInspectionPath(organizationId, "tables", nextResourceId, nextFilters);
        setTableFilters(nextFilters);
        go(path);
    };

    const updateTableFilters = (patch: Partial<TableInspectionFilters>, nextResourceId?: string) => {
        navigateTables({ ...tableFilters, ...patch, page: patch.page ?? 1 }, nextResourceId);
    };

    const navigatePurchases = (nextFilters: PurchaseInspectionFilters, nextResourceId?: string) => {
        const path = organizationInspectionPath(organizationId, "purchases", nextResourceId, nextFilters);
        setPurchaseFilters(nextFilters);
        go(path);
    };

    const updatePurchaseFilters = (patch: Partial<PurchaseInspectionFilters>, nextResourceId?: string) => {
        navigatePurchases({ ...purchaseFilters, ...patch, page: patch.page ?? 1 }, nextResourceId);
    };

    useEffect(() => {
        if (activeSectionErrorCode === 401) void onUnauthorized?.();
    }, [activeSectionErrorCode, onUnauthorized]);

    const go = (path: string) => {
        onNavigate?.(path);
    };

    const navigateOverview = (nextFilters: OverviewBillActivityFilters) => {
        const resolved = resolveOverviewBillActivityFilters(nextFilters);
        const path = organizationInspectionPath(organizationId, "overview", undefined, resolved);
        setOverviewFilters(resolved);
        go(path);
    };

    const followInspectionLink = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
        event.preventDefault();
        go(path);
    };

    const renderSectionNav = () => (
        <nav aria-label="Organization inspection sections" className="border-b border-border/60">
            <div className="flex gap-1 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {organizationInspectionSections.map((item) => {
                    const href = item === "overview"
                        ? organizationInspectionPath(organizationId, item, undefined, overviewFilters)
                        : item === "billing"
                        ? organizationInspectionPath(organizationId, item, undefined, resolveBillingInspectionFilters(billingFilters))
                        : item === "catalog"
                            ? catalogInspectionPath(organizationId, { view: "list", filters: catalogFilters })
                            : item === "customers"
                                ? organizationInspectionPath(organizationId, item, undefined, customerFilters)
                                : item === "reports"
                                    ? organizationInspectionPath(organizationId, item, undefined, reportFilters)
                                    : item === "tables"
                                        ? organizationInspectionPath(organizationId, item, undefined, tableFilters)
                                        : item === "purchases"
                                            ? organizationInspectionPath(organizationId, item, undefined, purchaseFilters)
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

    const renderStoreTable = (storeRows: PlatformStoreActivityDTO[]) => {
        const storeColumnAriaSort = (column: "name" | "sales_value" | "last_sale"): "ascending" | "descending" | undefined => {
            if (column === "name" && (storeSort === "name_asc" || storeSort === "name_desc")) {
                return storeSort === "name_asc" ? "ascending" : "descending";
            }
            if (column === "sales_value" && (storeSort === "sales_value_asc" || storeSort === "sales_value_desc")) {
                return storeSort === "sales_value_asc" ? "ascending" : "descending";
            }
            if (column === "last_sale" && storeSort === "recent_activity") return "descending";
            return undefined;
        };

        return (
            <div className="space-y-4">
                <div className="hidden overflow-x-auto md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead aria-sort={storeColumnAriaSort("name")}>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-2 h-8 px-2"
                                        onClick={() => setStoreSort(storeSort === "name_asc" ? "name_desc" : "name_asc")}
                                    >
                                        Store
                                    </Button>
                                </TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Customers</TableHead>
                                <TableHead>Sales</TableHead>
                                <TableHead aria-sort={storeColumnAriaSort("sales_value")}>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-2 h-8 px-2"
                                        onClick={() => setStoreSort(storeSort === "sales_value_desc" ? "sales_value_asc" : "sales_value_desc")}
                                    >
                                        Sales value
                                    </Button>
                                </TableHead>
                                <TableHead aria-sort={storeColumnAriaSort("last_sale")}>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-2 h-8 px-2"
                                        onClick={() => setStoreSort("recent_activity")}
                                    >
                                        Last sale
                                    </Button>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {storeRows.map((storeRow) => {
                                const href = organizationInspectionPath(organizationId, "stores", storeRow.id);
                                return (
                                    <TableRow
                                        key={storeRow.id}
                                        className="cursor-pointer"
                                        onClick={() => go(href)}
                                    >
                                        <TableCell>
                                            <a
                                                href={href}
                                                className="font-medium text-primary underline-offset-4 hover:underline"
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
                <div className="grid gap-3 md:hidden">
                    {storeRows.map((storeRow) => {
                        const href = organizationInspectionPath(organizationId, "stores", storeRow.id);
                        return (
                            <a
                                key={storeRow.id}
                                href={href}
                                aria-label={`Inspect ${storeRow.name}`}
                                className="rounded-xl border border-border/60 bg-background/70 p-4 no-underline"
                                onClick={(event) => followInspectionLink(event, href)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="font-medium text-foreground">{storeRow.name}</p>
                                    <Badge
                                        variant={storeRow.isActive ? "secondary" : "outline"}
                                        className="rounded-full"
                                    >
                                        {storeRow.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Customers</dt>
                                        <dd>{storeRow.customerCount}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Sales</dt>
                                        <dd>{storeRow.completedSaleCount}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Sales value</dt>
                                        <dd>{formatCompletedSalesValue(storeRow.completedSalesValue)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Last sale</dt>
                                        <dd>{formatLastCompletedSale(storeRow.lastCompletedSaleAt)}</dd>
                                    </div>
                                </dl>
                            </a>
                        );
                    })}
                </div>
            </div>
        );
    };

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

        const hasStoreDropdownFilters = storeStatusSelection.size > 0 || storeSort !== "recent_activity";
        const filteredStores = filterStores(stores, deferredStoreSearch, storeStatusSelection, storeSort);

        const clearStoreDropdownFilters = () => {
            setStoreStatusSelection(new Set());
            setStoreSort("recent_activity");
        };

        const resetStoreFilters = () => {
            setStoreSearchInput("");
            setStoreStatusSelection(new Set());
            setStoreSort("recent_activity");
        };

        return (
            <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="relative min-w-0 w-full sm:max-w-md group/search">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                        <Input
                            id="store-search"
                            name="search"
                            type="search"
                            value={storeSearchInput}
                            onChange={(event) => setStoreSearchInput(event.target.value)}
                            aria-label="Search store"
                            placeholder="Search store"
                            className="h-10 w-full rounded-full border-border/60 bg-card/60 pl-10 text-sm shadow-2xs transition-all duration-200 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <DataTableFacetedFilter
                            title="Status"
                            options={storeStatusFilterOptions}
                            selectedValues={storeStatusSelection}
                            onSelectedValuesChange={(values) => setStoreStatusSelection(new Set(Array.from(values) as StoreStatusSelection[]))}
                        />
                        <DataTableSortFilter
                            title="Sort"
                            value={storeSort}
                            onValueChange={(value) => setStoreSort(value as StoreDirectorySort)}
                            options={storeSortOptions}
                        />
                        {hasStoreDropdownFilters ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-full px-2.5 text-muted-foreground"
                                onClick={clearStoreDropdownFilters}
                            >
                                <RotateCcw className="size-3.5" />
                                Clear
                            </Button>
                        ) : null}
                    </div>
                </div>

                {stores.length === 0 ? (
                    <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Store />
                            </EmptyMedia>
                            <EmptyTitle>No stores yet</EmptyTitle>
                            <EmptyDescription>This organization has not opened any stores.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : filteredStores.length === 0 ? (
                    <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Store />
                            </EmptyMedia>
                            <EmptyTitle>No matches</EmptyTitle>
                            <EmptyDescription>Try a different search or status filter.</EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-full"
                                onClick={resetStoreFilters}
                            >
                                Clear filters
                            </Button>
                        </EmptyContent>
                    </Empty>
                ) : (
                    renderStoreTable(filteredStores)
                )}
            </section>
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

    const renderOverview = () => {
        if (!organization) return null;
        return (
            <div className="space-y-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <h2 className="text-sm font-semibold text-foreground">At a glance</h2>
                    <p className="text-xs text-muted-foreground">
                        {`${periodLabel} metrics · ${organization.activeStoreCount}/${organization.storeCount} active stores · activity last 7 days`}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    <MetricCard compact label="Stores" value={String(organization.storeCount)} icon={Store} tone="blue" />
                    <MetricCard compact label="Active stores" value={String(organization.activeStoreCount)} icon={Building2} tone="emerald" />
                    <MetricCard compact label="Customers" value={String(organization.customerCount)} icon={Users} tone="violet" />
                    <MetricCard compact label="Sales" value={String(organization.completedSaleCount)} icon={Receipt} tone="sky" />
                    <MetricCard
                        compact
                        label="Sales value"
                        value={formatCompletedSalesValue(organization.completedSalesValue)}
                        icon={IndianRupee}
                        tone="amber"
                    />
                    <MetricCard
                        compact
                        label="Last sale"
                        value={formatLastCompletedSale(organization.lastCompletedSaleAt)}
                        icon={Clock3}
                        tone="slate"
                        valueClassName="text-xs leading-snug"
                    />
                </div>
                <ConsoleBillActivityChart
                    filters={overviewFilters}
                    onUpdateFilters={navigateOverview}
                    isLoading={billActivityQuery.isLoading}
                    isError={billActivityQuery.isError || billActivityResponse?.status === "error"}
                    errorMessage={
                        (billActivityQuery.error as { message?: string } | null)?.message
                            ?? (billActivityResponse?.status === "error" ? billActivityResponse.message : undefined)
                    }
                    activity={billActivity}
                />
            </div>
        );
    };

    const renderBillingInspection = () => (
        <ConsoleBillingInspection
            organizationId={organizationId}
            resourceId={resourceId}
            filters={billingFilters}
            searchInput={billingSearchInput}
            onSearchInputChange={setBillingSearchInput}
            onUpdateFilters={updateBillingFilters}
            onOpenSale={(saleId) => navigateBilling(billingFilters, saleId)}
            onCloseSale={() => navigateBilling(billingFilters)}
            onFollowLink={followInspectionLink}
            isSalesLoading={salesQuery.isLoading}
            isSalesError={salesQuery.isError || salesResponse?.status === "error"}
            salesErrorCode={salesErrorCode}
            salesErrorMessage={salesErrorMessage}
            salesList={salesList ?? undefined}
            isSaleLoading={saleQuery.isLoading}
            isSaleError={saleQuery.isError || saleResponse?.status === "error"}
            saleErrorCode={saleErrorCode}
            saleErrorMessage={saleErrorMessage}
            sale={sale}
        />
    );

    const renderCatalogFilters = () => (
        <div className="space-y-3">
            <form
                className="flex flex-col gap-3 lg:flex-row lg:items-end"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    updateCatalogFilters({ search: catalogSearchInput.trim() || undefined });
                }}
                role="search"
            >
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={catalogSearchInput}
                        onChange={(event) => setCatalogSearchInput(event.target.value)}
                        aria-label="Search catalog"
                        placeholder="Search catalog"
                        className="h-10 rounded-xl pl-9"
                    />
                </div>
                <Button type="submit" size="sm" className="rounded-full">Search</Button>
            </form>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Catalog tabs">
                {catalogTabOptions.map((option) => (
                    <Button
                        key={option.value}
                        type="button"
                        size="sm"
                        className="rounded-full"
                        variant={(catalogFilters.tab ?? "products") === option.value ? "default" : "outline"}
                        aria-pressed={(catalogFilters.tab ?? "products") === option.value}
                        onClick={() => updateCatalogFilters({ tab: option.value, page: 1 })}
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
            <Select
                value={catalogFilters.status ?? "all"}
                onValueChange={(value) =>
                    updateCatalogFilters({
                        status: value as CatalogInspectionFilters["status"],
                        page: 1,
                    })}
            >
                <SelectTrigger aria-label="Catalog status filter">
                    <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
                Catalog inspection shows the full Organization catalog and is not limited by the Dashboard reporting period.
            </p>
        </div>
    );

    const renderCatalogList = () => {
        if (catalogQuery.isLoading) {
            return (
                <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading catalog">
                    <Spinner className="size-6 text-primary" />
                </div>
            );
        }
        if (catalogErrorCode === 404 || catalogErrorMessage === "Organization not found") {
            return (
                <Alert role="alert">
                    <AlertTitle>Organization was not found</AlertTitle>
                    <AlertDescription>
                        This organization is not available. Return to the organizations list to continue.
                    </AlertDescription>
                </Alert>
            );
        }
        if (catalogQuery.isError || catalogResponse?.status === "error") {
            return (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Catalog could not be loaded</AlertTitle>
                    <AlertDescription>{catalogErrorMessage ?? "The catalog list is unavailable."}</AlertDescription>
                </Alert>
            );
        }
        if (!catalogList) return null;

        const activeTab = catalogList.tab;
        const page = catalogList.pagination.page;
        const limit = catalogList.pagination.limit;
        const totalPages = Math.max(1, Math.ceil(catalogList.pagination.totalCount / limit));
        const emptyLabel = activeTab === "categories"
            ? "No categories match these filters"
            : activeTab === "add-ons"
                ? "No add-ons match these filters"
                : "No products match these filters";

        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader className="gap-1">
                    <h2 className="font-display text-xl font-semibold tracking-tight">Catalog</h2>
                    <CardDescription>
                        {`Read-only Products, Categories, and Add-ons · ${catalogList.counts.products} products · ${catalogList.counts.categories} categories · ${catalogList.counts.addOns} add-ons`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {renderCatalogFilters()}
                    {activeTab === "products" && catalogList.products.length === 0 ? (
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon"><Package2 /></EmptyMedia>
                                <EmptyTitle>{emptyLabel}</EmptyTitle>
                                <EmptyDescription>Try a different search term or status filter.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : activeTab === "categories" && catalogList.categories.length === 0 ? (
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon"><Package2 /></EmptyMedia>
                                <EmptyTitle>{emptyLabel}</EmptyTitle>
                                <EmptyDescription>Try a different search term or status filter.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : activeTab === "add-ons" && catalogList.addOns.length === 0 ? (
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon"><Package2 /></EmptyMedia>
                                <EmptyTitle>{emptyLabel}</EmptyTitle>
                                <EmptyDescription>Try a different search term or status filter.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-border/60">
                            <Table>
                                <TableHeader>
                                    {activeTab === "products" ? (
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Attachments</TableHead>
                                        </TableRow>
                                    ) : activeTab === "categories" ? (
                                        <TableRow>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Products</TableHead>
                                            <TableHead>Updated</TableHead>
                                        </TableRow>
                                    ) : (
                                        <TableRow>
                                            <TableHead>Add-on</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Attachments</TableHead>
                                        </TableRow>
                                    )}
                                </TableHeader>
                                <TableBody>
                                    {activeTab === "products"
                                        ? catalogList.products.map((product) => {
                                            const href = catalogInspectionPath(organizationId, {
                                                view: "detail",
                                                kind: "products",
                                                id: product.id,
                                                filters: catalogFilters,
                                            });
                                            const categoryHref = catalogInspectionPath(organizationId, {
                                                view: "detail",
                                                kind: "categories",
                                                id: product.category.id,
                                                filters: catalogFilters,
                                            });
                                            return (
                                                <TableRow key={product.id}>
                                                    <TableCell className="font-medium">
                                                        <a href={href} className="text-primary underline-offset-4 hover:underline" onClick={(event) => followInspectionLink(event, href)}>
                                                            {product.name}
                                                        </a>
                                                        {product.productCode ? (
                                                            <p className="mt-1 font-mono text-xs text-muted-foreground">{product.productCode}</p>
                                                        ) : null}
                                                    </TableCell>
                                                    <TableCell>
                                                        <a href={categoryHref} className="text-primary underline-offset-4 hover:underline" onClick={(event) => followInspectionLink(event, categoryHref)}>
                                                            {product.category.name}
                                                        </a>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="rounded-full">{catalogStatusLabel(product.status)}</Badge>
                                                    </TableCell>
                                                    <TableCell>{productTypeLabel(product.productType)}</TableCell>
                                                    <TableCell>{formatCompletedSalesValue(product.price)}</TableCell>
                                                    <TableCell>{product.attachmentCount}</TableCell>
                                                </TableRow>
                                            );
                                        })
                                        : activeTab === "categories"
                                            ? catalogList.categories.map((category) => {
                                                const href = catalogInspectionPath(organizationId, {
                                                    view: "detail",
                                                    kind: "categories",
                                                    id: category.id,
                                                    filters: catalogFilters,
                                                });
                                                return (
                                                    <TableRow key={category.id}>
                                                        <TableCell className="font-medium">
                                                            <a href={href} className="text-primary underline-offset-4 hover:underline" onClick={(event) => followInspectionLink(event, href)}>
                                                                {category.name}
                                                            </a>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="rounded-full">{catalogStatusLabel(category.status)}</Badge>
                                                        </TableCell>
                                                        <TableCell>{category.productCount}</TableCell>
                                                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatLastCompletedSale(category.updatedAt)}</TableCell>
                                                    </TableRow>
                                                );
                                            })
                                            : catalogList.addOns.map((addOn) => {
                                                const href = catalogInspectionPath(organizationId, {
                                                    view: "detail",
                                                    kind: "add-ons",
                                                    id: addOn.id,
                                                    filters: catalogFilters,
                                                });
                                                return (
                                                    <TableRow key={addOn.id}>
                                                        <TableCell className="font-medium">
                                                            <a href={href} className="text-primary underline-offset-4 hover:underline" onClick={(event) => followInspectionLink(event, href)}>
                                                                {addOn.name}
                                                            </a>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="rounded-full">{catalogStatusLabel(addOn.status)}</Badge>
                                                        </TableCell>
                                                        <TableCell>{formatCompletedSalesValue(addOn.price)}</TableCell>
                                                        <TableCell>{addOn.attachmentCount}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    {catalogList.pagination.totalCount > limit ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => updateCatalogFilters({ page: page - 1 })}>
                                    <ChevronLeft className="size-4" />
                                    Previous
                                </Button>
                                <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateCatalogFilters({ page: page + 1 })}>
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

    const renderCatalogProductDetail = (product: PlatformCatalogProductDetailResponse["product"]) => (
        <div className="space-y-6">
            <Button type="button" variant="ghost" className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground" onClick={() => navigateCatalog(catalogFilters)}>
                <ArrowLeft className="size-4" />
                Back to catalog
            </Button>
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader className="gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">Read-only inspection</Badge>
                        <Badge variant="outline" className="rounded-full">{catalogStatusLabel(product.status)}</Badge>
                        <Badge variant="outline" className="rounded-full">{productTypeLabel(product.productType)}</Badge>
                    </div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight">{product.name}</h2>
                    <CardDescription>
                        {`${product.category.name} · Updated ${formatLastCompletedSale(product.updatedAt)}`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard label="Price" value={formatCompletedSalesValue(product.price)} />
                        <MetricCard label="Discount" value={formatCompletedSalesValue(product.discount)} />
                        <MetricCard label="Attachments" value={String(product.attachmentCount)} />
                        <MetricCard label="Image" value={product.hasImage ? "Present" : "None"} />
                    </div>
                    {product.productCode ? (
                        <p className="text-sm text-muted-foreground">{`Product code: ${product.productCode}${product.productCodeKind ? ` (${product.productCodeKind})` : ""}`}</p>
                    ) : null}
                    <Card className="border-border/60 bg-background/70">
                        <CardHeader className="gap-1">
                            <h3 className="font-medium">Product add-on attachments</h3>
                            <CardDescription>Attachment eligibility and selection caps for this product.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {product.attachments.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No add-ons are attached to this product.</p>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-border/60">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Add-on</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Cap</TableHead>
                                                <TableHead>Price</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {product.attachments.map((attachment) => {
                                                const href = catalogInspectionPath(organizationId, {
                                                    view: "detail",
                                                    kind: "add-ons",
                                                    id: attachment.addOnId,
                                                    filters: catalogFilters,
                                                });
                                                return (
                                                    <TableRow key={attachment.id}>
                                                        <TableCell className="font-medium">
                                                            <a href={href} className="text-primary underline-offset-4 hover:underline" onClick={(event) => followInspectionLink(event, href)}>
                                                                {attachment.addOnName}
                                                            </a>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="rounded-full">{catalogStatusLabel(attachment.status)}</Badge>
                                                        </TableCell>
                                                        <TableCell>{attachment.selectionCap}</TableCell>
                                                        <TableCell>{formatCompletedSalesValue(attachment.addOnPrice)}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );

    const renderCatalogCategoryDetail = (category: PlatformCatalogCategoryDetailResponse["category"]) => (
        <div className="space-y-6">
            <Button type="button" variant="ghost" className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground" onClick={() => navigateCatalog(catalogFilters)}>
                <ArrowLeft className="size-4" />
                Back to catalog
            </Button>
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader className="gap-1">
                    <Badge variant="outline" className="w-fit rounded-full">{catalogStatusLabel(category.status)}</Badge>
                    <h2 className="font-display text-2xl font-semibold tracking-tight">{category.name}</h2>
                    <CardDescription>{`${category.productCount} products · Updated ${formatLastCompletedSale(category.updatedAt)}`}</CardDescription>
                </CardHeader>
                <CardContent>
                    {category.products.length === 0 ? (
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon"><Package2 /></EmptyMedia>
                                <EmptyTitle>No products in this category</EmptyTitle>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-border/60">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {category.products.map((product) => {
                                        const href = catalogInspectionPath(organizationId, {
                                            view: "detail",
                                            kind: "products",
                                            id: product.id,
                                            filters: catalogFilters,
                                        });
                                        return (
                                            <TableRow key={product.id}>
                                                <TableCell className="font-medium">
                                                    <a href={href} className="text-primary underline-offset-4 hover:underline" onClick={(event) => followInspectionLink(event, href)}>
                                                        {product.name}
                                                    </a>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="rounded-full">{catalogStatusLabel(product.status)}</Badge>
                                                </TableCell>
                                                <TableCell>{formatCompletedSalesValue(product.price)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );

    const renderCatalogAddOnDetail = (addOn: PlatformCatalogAddOnDetailResponse["addOn"]) => (
        <div className="space-y-6">
            <Button type="button" variant="ghost" className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground" onClick={() => navigateCatalog(catalogFilters)}>
                <ArrowLeft className="size-4" />
                Back to catalog
            </Button>
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader className="gap-1">
                    <Badge variant="outline" className="w-fit rounded-full">{catalogStatusLabel(addOn.status)}</Badge>
                    <h2 className="font-display text-2xl font-semibold tracking-tight">{addOn.name}</h2>
                    <CardDescription>{`${addOn.attachmentCount} product attachments · Updated ${formatLastCompletedSale(addOn.updatedAt)}`}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <MetricCard label="Price" value={formatCompletedSalesValue(addOn.price)} />
                        <MetricCard label="Discount" value={formatCompletedSalesValue(addOn.discount)} />
                        <MetricCard label="Attachments" value={String(addOn.attachmentCount)} />
                    </div>
                    <Card className="border-border/60 bg-background/70">
                        <CardHeader className="gap-1">
                            <h3 className="font-medium">Product attachments</h3>
                            <CardDescription>Products that can select this add-on during billing.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {addOn.attachments.length === 0 ? (
                                <p className="text-sm text-muted-foreground">This add-on is not attached to any products.</p>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-border/60">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Cap</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {addOn.attachments.map((attachment) => {
                                                const href = catalogInspectionPath(organizationId, {
                                                    view: "detail",
                                                    kind: "products",
                                                    id: attachment.productId,
                                                    filters: catalogFilters,
                                                });
                                                return (
                                                    <TableRow key={attachment.id}>
                                                        <TableCell className="font-medium">
                                                            <a href={href} className="text-primary underline-offset-4 hover:underline" onClick={(event) => followInspectionLink(event, href)}>
                                                                {attachment.productName}
                                                            </a>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="rounded-full">{catalogStatusLabel(attachment.status)}</Badge>
                                                        </TableCell>
                                                        <TableCell>{attachment.selectionCap}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );

    const renderCatalogInspection = () => {
        if (resourceId && catalogResourceKind) {
            const detailQueryState = catalogResourceKind === "products"
                ? catalogProductQuery
                : catalogResourceKind === "categories"
                    ? catalogCategoryQuery
                    : catalogAddOnQuery;
            const detailErrorCode = catalogDetailErrorCode;
            const detailErrorMessage = catalogDetailErrorMessage;
            const notFoundMessage = catalogResourceKind === "products"
                ? "Product not found"
                : catalogResourceKind === "categories"
                    ? "Category not found"
                    : "Add-on not found";

            if (detailQueryState.isLoading) {
                return (
                    <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading catalog item">
                        <Spinner className="size-6 text-primary" />
                    </div>
                );
            }
            if (detailErrorCode === 404 || detailErrorMessage === notFoundMessage) {
                return (
                    <Alert role="alert">
                        <AlertTitle>{notFoundMessage.replace(" not found", " was not found")}</AlertTitle>
                        <AlertDescription>
                            This catalog item is not available in this organization. Return to the catalog list to continue.
                        </AlertDescription>
                    </Alert>
                );
            }
            if (detailQueryState.isError || detailQueryState.data?.status === "error") {
                return (
                    <Alert variant="destructive" role="alert">
                        <AlertTitle>Catalog item could not be loaded</AlertTitle>
                        <AlertDescription>{detailErrorMessage ?? "The catalog detail is unavailable."}</AlertDescription>
                    </Alert>
                );
            }
            if (catalogResourceKind === "products" && catalogProduct) return renderCatalogProductDetail(catalogProduct);
            if (catalogResourceKind === "categories" && catalogCategory) return renderCatalogCategoryDetail(catalogCategory);
            if (catalogResourceKind === "add-ons" && catalogAddOn) return renderCatalogAddOnDetail(catalogAddOn);
            return null;
        }

        return renderCatalogList();
    };

    const renderCustomerFilters = () => (
        <div className="space-y-3">
            <form
                className="flex flex-col gap-3 lg:flex-row lg:items-end"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    updateCustomerFilters({ search: customerSearchInput.trim() || undefined });
                }}
                role="search"
            >
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={customerSearchInput}
                        onChange={(event) => setCustomerSearchInput(event.target.value)}
                        aria-label="Search customers"
                        placeholder="Search by name or phone"
                        className="h-10 rounded-xl pl-9"
                    />
                </div>
                <Button type="submit" size="sm" className="rounded-full">Search</Button>
            </form>
            <div className="flex flex-wrap gap-2">
                <Select
                    value={customerFilters.status ?? "all"}
                    onValueChange={(value) =>
                        updateCustomerFilters({
                            status: value as CustomerInspectionFilters["status"],
                            page: 1,
                        })}
                >
                    <SelectTrigger aria-label="Customer status filter" className="w-[180px]">
                        <SelectValue placeholder="All customers" />
                    </SelectTrigger>
                    <SelectContent>
                        {customerStatusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={customerFilters.sort ?? "newest"}
                    onValueChange={(value) =>
                        updateCustomerFilters({
                            sort: value as NonNullable<PlatformCustomerInspectionQueryJSON["sort"]>,
                            page: 1,
                        })}
                >
                    <SelectTrigger aria-label="Customer sort" className="w-[180px]">
                        <SelectValue placeholder="Sort customers" />
                    </SelectTrigger>
                    <SelectContent>
                        {customerSortOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <p className="text-xs text-muted-foreground">
                Customer inspection shows the full Organization customer directory and is not limited by the Dashboard reporting period.
            </p>
        </div>
    );

    const renderCustomerList = () => {
        if (customersQuery.isLoading) {
            return (
                <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading customers">
                    <Spinner className="size-6 text-primary" />
                </div>
            );
        }
        if (customersErrorCode === 404 || customersErrorMessage === "Organization not found") {
            return (
                <Alert role="alert">
                    <AlertTitle>Organization was not found</AlertTitle>
                    <AlertDescription>
                        This organization is not available. Return to the organizations list to continue.
                    </AlertDescription>
                </Alert>
            );
        }
        if (customersQuery.isError || customersResponse?.status === "error") {
            return (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Customers could not be loaded</AlertTitle>
                    <AlertDescription>{customersErrorMessage ?? "The customer list is unavailable."}</AlertDescription>
                </Alert>
            );
        }
        if (!customersList) return null;

        const page = customersList.pagination.page;
        const limit = customersList.pagination.limit;
        const totalPages = Math.max(1, Math.ceil(customersList.pagination.totalCount / limit));

        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader className="gap-1">
                    <h2 className="font-display text-xl font-semibold tracking-tight">Customers</h2>
                    <CardDescription>
                        {`Read-only customer directory · ${customersList.pagination.totalCount} customers`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {renderCustomerFilters()}
                    {customersList.customers.length === 0 ? (
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Users />
                                </EmptyMedia>
                                <EmptyTitle>No customers match these filters</EmptyTitle>
                                <EmptyDescription>Try a different search term, status, or sort order.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-border/60">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Balance</TableHead>
                                        <TableHead>Added</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customersList.customers.map((customerRow) => {
                                        const href = organizationInspectionPath(organizationId, "customers", customerRow.id, customerFilters);
                                        return (
                                            <TableRow key={customerRow.id}>
                                                <TableCell className="font-medium">
                                                    <a
                                                        href={href}
                                                        className="text-primary underline-offset-4 hover:underline"
                                                        onClick={(event) => followInspectionLink(event, href)}
                                                    >
                                                        {customerRow.name}
                                                    </a>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="rounded-full">
                                                        {customerRow.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {customerRow.phone ? formatPhoneDisplay(customerRow.phone) : "—"}
                                                </TableCell>
                                                <TableCell>{formatCompletedSalesValue(customerRow.balance)}</TableCell>
                                                <TableCell className="whitespace-nowrap text-muted-foreground">
                                                    {formatLastCompletedSale(customerRow.createdAt)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    {customersList.pagination.totalCount > limit ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => updateCustomerFilters({ page: page - 1 })}
                                >
                                    <ChevronLeft className="size-4" />
                                    Previous
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => updateCustomerFilters({ page: page + 1 })}
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

    const renderCustomerDetail = (customer: PlatformCustomerInspectionDetailDTO) => (
        <div className="space-y-6">
            <Button
                type="button"
                variant="ghost"
                className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => navigateCustomers(customerFilters)}
            >
                <ArrowLeft className="size-4" />
                Back to customers
            </Button>
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader className="gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                            Read-only inspection
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                            {customer.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {customer.balance > 0 ? (
                            <Badge variant="outline" className="rounded-full">Receivable</Badge>
                        ) : null}
                    </div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight">{customer.name}</h2>
                    <CardDescription>
                        {customer.phone ? formatPhoneDisplay(customer.phone) : "No phone on file"}
                        {` · Updated ${formatLastCompletedSale(customer.updatedAt)}`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard label="Balance" value={formatCompletedSalesValue(customer.balance)} />
                        <MetricCard label="Bills" value={String(customer.sales.length)} />
                        <MetricCard label="Ledger entries" value={String(customer.ledger.length)} />
                        <MetricCard label="Marketing opt-out" value={customer.marketingOptedOut ? "Yes" : "No"} />
                    </div>
                    <Card className="border-border/60 bg-background/70">
                        <CardHeader className="gap-1">
                            <h3 className="font-medium">Billing history</h3>
                            <CardDescription>Sales linked to this customer across all stores.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {customer.sales.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No bills are linked to this customer yet.</p>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-border/60">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Bill</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Payment</TableHead>
                                                <TableHead>Store</TableHead>
                                                <TableHead>Value</TableHead>
                                                <TableHead>Due</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {customer.sales.map((saleRow) => {
                                                const href = organizationInspectionPath(organizationId, "billing", saleRow.id);
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
                                                        <TableCell>{saleRow.store.name}</TableCell>
                                                        <TableCell>{formatCompletedSalesValue(saleRow.grandTotal)}</TableCell>
                                                        <TableCell>{formatCompletedSalesValue(saleRow.dueTotal)}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="border-border/60 bg-background/70">
                        <CardHeader className="gap-1">
                            <h3 className="font-medium">Customer ledger</h3>
                            <CardDescription>Balance-changing history for this customer.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {customer.ledger.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-border/60">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>When</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Balance after</TableHead>
                                                <TableHead>Notes</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {customer.ledger.map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell className="whitespace-nowrap text-muted-foreground">
                                                        {formatLastCompletedSale(entry.createdAt)}
                                                    </TableCell>
                                                    <TableCell>{ledgerEntryTypeLabel(entry.entryType)}</TableCell>
                                                    <TableCell>{formatCompletedSalesValue(entry.amount)}</TableCell>
                                                    <TableCell>{formatCompletedSalesValue(entry.balanceAfter)}</TableCell>
                                                    <TableCell>{entry.notes ?? "—"}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );

    const renderCustomerInspection = () => {
        if (resourceId) {
            if (customerQuery.isLoading) {
                return (
                    <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading customer">
                        <Spinner className="size-6 text-primary" />
                    </div>
                );
            }
            if (customerErrorCode === 404 || customerErrorMessage === "Customer not found") {
                return (
                    <Alert role="alert">
                        <AlertTitle>Customer was not found</AlertTitle>
                        <AlertDescription>
                            This customer is not available in this organization. Return to the customer list to continue.
                        </AlertDescription>
                    </Alert>
                );
            }
            if (customerQuery.isError || customerResponse?.status === "error") {
                return (
                    <Alert variant="destructive" role="alert">
                        <AlertTitle>Customer could not be loaded</AlertTitle>
                        <AlertDescription>{customerErrorMessage ?? "The customer detail is unavailable."}</AlertDescription>
                    </Alert>
                );
            }
            if (!customerDetail) return null;
            return renderCustomerDetail(customerDetail);
        }

        return renderCustomerList();
    };

    const renderReportInspection = () => {
        if (reportsQuery.isLoading) {
            return (
                <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading reports">
                    <Spinner className="size-6 text-primary" />
                </div>
            );
        }
        if (reportsErrorCode === 404) {
            return (
                <Alert role="alert">
                    <AlertTitle>Report data was not found</AlertTitle>
                    <AlertDescription>
                        This organization or store is not available. Adjust the report filters to continue.
                    </AlertDescription>
                </Alert>
            );
        }
        if (reportsQuery.isError || reportsResponse?.status === "error") {
            return (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Reports could not be loaded</AlertTitle>
                    <AlertDescription>
                        {(reportsQuery.error as { message?: string } | null)?.message
                            ?? reportsResponse?.message
                            ?? "The report data is unavailable."}
                    </AlertDescription>
                </Alert>
            );
        }
        if (!reportsData) return null;

        const selectedStoreName = reportFilters.storeId
            ? reportsData.stores.find((storeOption) => storeOption.id === reportFilters.storeId)?.name ?? "Selected store"
            : "All stores";
        const products = reportsData.productSales.products;

        return (
            <div className="space-y-6">
                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardHeader className="gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                                Read-only inspection
                            </Badge>
                        </div>
                        <h2 className="font-display text-xl font-semibold tracking-tight">Reports</h2>
                        <CardDescription>
                            Organization-scoped product sales for the selected report range.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <section className="space-y-2" aria-label="Selected report range">
                            <p className="text-sm font-medium text-foreground">
                                {reportsData.dateRange.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {reportsData.dateRange.startDate && reportsData.dateRange.endDate
                                    ? `Calendar dates ${reportsData.dateRange.startDate} to ${reportsData.dateRange.endDate} in ${reportsData.dateRange.timezone}.`
                                    : `All completed sales in ${reportsData.dateRange.timezone}.`}
                            </p>
                        </section>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <Select
                                value={reportFilters.storeId ?? "all"}
                                onValueChange={(value) =>
                                    updateReportFilters({ storeId: value === "all" ? undefined : value || undefined })}
                            >
                                <SelectTrigger aria-label="Report store filter">
                                    <SelectValue placeholder="All stores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All stores</SelectItem>
                                    {reportsData.stores.map((storeOption) => (
                                        <SelectItem key={storeOption.id} value={storeOption.id}>{storeOption.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                aria-label="Report start date"
                                value={reportFilters.startDate ?? ""}
                                onChange={(event) => updateReportFilters({ startDate: event.target.value || undefined })}
                            />
                            <Input
                                type="date"
                                aria-label="Report end date"
                                value={reportFilters.endDate ?? ""}
                                onChange={(event) => updateReportFilters({ endDate: event.target.value || undefined })}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => updateReportFilters({ startDate: undefined, endDate: undefined, storeId: reportFilters.storeId })}
                            >
                                All dates
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Report filters use this page&apos;s own date and store controls, not the Dashboard reporting period.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardHeader className="gap-1">
                        <h3 className="font-display text-lg font-semibold tracking-tight">Product sales</h3>
                        <CardDescription>
                            {`Units sold for ${selectedStoreName}, sorted highest first.`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <MetricCard label="Products sold" value={String(reportsData.productSales.productCount)} />
                            <MetricCard label="Total units sold" value={String(reportsData.productSales.totalQuantitySold)} />
                        </div>
                        {products.length === 0 ? (
                            <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Package2 />
                                    </EmptyMedia>
                                    <EmptyTitle>No product sales found</EmptyTitle>
                                    <EmptyDescription>Try another report date range or store.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-border/60">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Quantity sold</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {products.map((product) => (
                                            <TableRow key={product.productId}>
                                                <TableCell className="font-medium">{product.productName}</TableCell>
                                                <TableCell>{product.categoryName ?? "Uncategorized"}</TableCell>
                                                <TableCell className="text-right font-semibold">{product.quantitySold}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderTableInspection = () => {
        if (resourceId) {
            if (tableQuery.isLoading) {
                return (
                    <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading table">
                        <Spinner className="size-6 text-primary" />
                    </div>
                );
            }
            if (tableErrorCode === 404 || tableErrorMessage === "Table not found") {
                return (
                    <Alert role="alert">
                        <AlertTitle>Table was not found</AlertTitle>
                        <AlertDescription>
                            This table is not available in this organization. Return to the table list to continue.
                        </AlertDescription>
                    </Alert>
                );
            }
            if (tableQuery.isError || tableResponse?.status === "error") {
                return (
                    <Alert variant="destructive" role="alert">
                        <AlertTitle>Table could not be loaded</AlertTitle>
                        <AlertDescription>{tableErrorMessage ?? "The table detail is unavailable."}</AlertDescription>
                    </Alert>
                );
            }
            if (!tableDetail) return null;

            return (
                <div className="space-y-4">
                    <Button
                        type="button"
                        variant="ghost"
                        className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                        onClick={() => navigateTables(tableFilters)}
                    >
                        <ArrowLeft className="size-4" />
                        Back to tables
                    </Button>
                    <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                        <CardHeader>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="font-display text-2xl font-semibold tracking-tight">
                                    {`Table ${tableDetail.tableLabel}`}
                                </h2>
                                <Badge variant="outline" className="rounded-full">{serviceTableStateLabel(tableDetail.state)}</Badge>
                            </div>
                            <CardDescription>
                                {`${tableDetail.store.name} · Read-only service table inspection`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <MetricCard label="Store" value={tableDetail.store.name} />
                                <MetricCard label="Capacity" value={tableDetail.capacity ? String(tableDetail.capacity) : "Unknown"} />
                                <MetricCard label="Service area" value={tableDetail.serviceArea?.title ?? "Unassigned"} />
                                <MetricCard
                                    label="Current order total"
                                    value={tableDetail.currentSaleTotal == null ? "—" : formatCompletedSalesValue(tableDetail.currentSaleTotal)}
                                />
                            </div>
                            {tableDetail.currentSale ? (
                                <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                                    <p className="text-sm font-medium">Active table order</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {tableDetail.currentSale.saleNumber
                                            ? `Bill ${tableDetail.currentSale.saleNumber} · ${saleStatusLabel(tableDetail.currentSale.status)} · ${paymentStatusLabel(tableDetail.currentSale.paymentStatus)}`
                                            : `${saleStatusLabel(tableDetail.currentSale.status)} · ${paymentStatusLabel(tableDetail.currentSale.paymentStatus)}`}
                                    </p>
                                    <a
                                        href={organizationInspectionPath(organizationId, "billing", tableDetail.currentSale.id)}
                                        className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                                        onClick={(event) => followInspectionLink(event, organizationInspectionPath(organizationId, "billing", tableDetail.currentSale!.id))}
                                    >
                                        Open bill in Billing
                                    </a>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </div>
            );
        }

        if (tablesQuery.isLoading) {
            return (
                <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading tables">
                    <Spinner className="size-6 text-primary" />
                </div>
            );
        }
        if (tablesErrorCode === 404 || tablesErrorMessage === "Organization not found" || tablesErrorMessage === "Store not found") {
            return (
                <Alert role="alert">
                    <AlertTitle>Table data was not found</AlertTitle>
                    <AlertDescription>
                        This organization or store is not available. Adjust the table filters to continue.
                    </AlertDescription>
                </Alert>
            );
        }
        if (tablesQuery.isError || tablesResponse?.status === "error") {
            return (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Tables could not be loaded</AlertTitle>
                    <AlertDescription>{tablesErrorMessage ?? "The table list is unavailable."}</AlertDescription>
                </Alert>
            );
        }
        if (!tablesList) return null;

        const page = tablesList.pagination.page;
        const limit = tablesList.pagination.limit;
        const totalPages = Math.max(1, Math.ceil(tablesList.pagination.totalCount / limit));

        return (
            <div className="space-y-4">
                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardHeader className="gap-3">
                        <div>
                            <h2 className="font-display text-xl font-semibold tracking-tight">Tables</h2>
                            <CardDescription>
                                Read-only service table configuration and operational state. Filters are independent of the Dashboard reporting period.
                            </CardDescription>
                        </div>
                        <form
                            className="flex flex-col gap-3 lg:flex-row lg:items-end"
                            onSubmit={(event: FormEvent<HTMLFormElement>) => {
                                event.preventDefault();
                                updateTableFilters({ search: tableSearchInput.trim() || undefined });
                            }}
                            role="search"
                        >
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={tableSearchInput}
                                    onChange={(event) => setTableSearchInput(event.target.value)}
                                    aria-label="Search tables"
                                    placeholder="Search table no or area"
                                    className="h-10 rounded-xl pl-9"
                                />
                            </div>
                            <Button type="submit" size="sm" className="rounded-full">Search</Button>
                        </form>
                        <div className="flex flex-wrap gap-2">
                            <Select
                                value={tableFilters.storeId ?? "all"}
                                onValueChange={(value) =>
                                    updateTableFilters({
                                        storeId: value === "all" || !value ? undefined : value,
                                        page: 1,
                                    })}
                            >
                                <SelectTrigger className="h-10 w-44 rounded-xl" aria-label="Filter tables by store">
                                    <SelectValue placeholder="All stores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All stores</SelectItem>
                                    {tablesList.stores.map((storeOption) => (
                                        <SelectItem key={storeOption.id} value={storeOption.id}>{storeOption.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={tableFilters.state ?? "all"}
                                onValueChange={(value) =>
                                    updateTableFilters({
                                        state: value as TableInspectionFilters["state"],
                                        page: 1,
                                    })}
                            >
                                <SelectTrigger className="h-10 w-44 rounded-xl" aria-label="Filter tables by state">
                                    <SelectValue placeholder="All states" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All states</SelectItem>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="allocated">Allocated</SelectItem>
                                    <SelectItem value="engaged">Engaged</SelectItem>
                                    <SelectItem value="ready_to_bill">Ready to bill</SelectItem>
                                    <SelectItem value="payment_due">Payment due</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-sm text-muted-foreground">
                            {`Read-only table directory · ${tablesList.pagination.totalCount} tables`}
                        </p>
                        {tablesList.tables.length === 0 ? (
                            <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <LayoutGrid />
                                    </EmptyMedia>
                                    <EmptyTitle>No tables match these filters</EmptyTitle>
                                    <EmptyDescription>Try another store, state, or search term.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-border/60">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Table no</TableHead>
                                            <TableHead>Store</TableHead>
                                            <TableHead>Area</TableHead>
                                            <TableHead>State</TableHead>
                                            <TableHead className="text-right">Current total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tablesList.tables.map((tableRow) => {
                                            const href = organizationInspectionPath(organizationId, "tables", tableRow.id, tableFilters);
                                            return (
                                                <TableRow key={tableRow.id}>
                                                    <TableCell>
                                                        <a
                                                            href={href}
                                                            className="font-medium text-primary hover:underline"
                                                            onClick={(event) => followInspectionLink(event, href)}
                                                        >
                                                            {tableRow.tableLabel}
                                                        </a>
                                                    </TableCell>
                                                    <TableCell>{tableRow.store.name}</TableCell>
                                                    <TableCell>{tableRow.serviceArea?.title ?? "Unassigned"}</TableCell>
                                                    <TableCell>{serviceTableStateLabel(tableRow.state)}</TableCell>
                                                    <TableCell className="text-right">
                                                        {tableRow.currentSaleTotal == null ? "—" : formatCompletedSalesValue(tableRow.currentSaleTotal)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        {tablesList.pagination.totalCount > limit ? (
                            <div className="mt-4 flex items-center justify-between gap-3">
                                <p className="text-sm text-muted-foreground">{`Page ${page} of ${totalPages}`}</p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full"
                                        disabled={page <= 1}
                                        onClick={() => updateTableFilters({ page: page - 1 })}
                                    >
                                        <ChevronLeft className="size-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full"
                                        disabled={page >= totalPages}
                                        onClick={() => updateTableFilters({ page: page + 1 })}
                                    >
                                        Next
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderPurchaseInspection = () => {
        if (resourceId) {
            if (purchaseQuery.isLoading) {
                return (
                    <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading purchase">
                        <Spinner className="size-6 text-primary" />
                    </div>
                );
            }
            if (purchaseErrorCode === 404 || purchaseErrorMessage === "Purchase not found") {
                return (
                    <Alert role="alert">
                        <AlertTitle>Purchase was not found</AlertTitle>
                        <AlertDescription>
                            This purchase is not available in this organization. Return to the purchase list to continue.
                        </AlertDescription>
                    </Alert>
                );
            }
            if (purchaseQuery.isError || purchaseResponse?.status === "error") {
                return (
                    <Alert variant="destructive" role="alert">
                        <AlertTitle>Purchase could not be loaded</AlertTitle>
                        <AlertDescription>{purchaseErrorMessage ?? "The purchase detail is unavailable."}</AlertDescription>
                    </Alert>
                );
            }
            if (!purchaseDetail) return null;

            return (
                <div className="space-y-4">
                    <Button
                        type="button"
                        variant="ghost"
                        className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                        onClick={() => navigatePurchases(purchaseFilters)}
                    >
                        <ArrowLeft className="size-4" />
                        Back to purchases
                    </Button>
                    <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                        <CardHeader>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="font-display text-2xl font-semibold tracking-tight">{purchaseDetail.supplierName}</h2>
                                <Badge variant="outline" className="rounded-full">{purchaseStatusLabel(purchaseDetail.status)}</Badge>
                            </div>
                            <CardDescription>
                                {`${purchaseDetail.store.name} · ${purchaseDetail.purchaseDate} · Read-only purchase inspection`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <MetricCard label="Store" value={purchaseDetail.store.name} />
                                <MetricCard label="Invoice" value={purchaseDetail.invoiceNumber ?? "—"} />
                                <MetricCard label="Total" value={formatCompletedSalesValue(purchaseDetail.totalAmount)} />
                                <MetricCard label="Items" value={String(purchaseDetail.itemCount)} />
                            </div>
                            {purchaseDetail.notes ? (
                                <p className="text-sm text-muted-foreground">{purchaseDetail.notes}</p>
                            ) : null}
                            {purchaseDetail.status === "voided" ? (
                                <Alert role="alert">
                                    <AlertTitle>Purchase voided</AlertTitle>
                                    <AlertDescription>{purchaseDetail.voidReason ?? "No void reason recorded."}</AlertDescription>
                                </Alert>
                            ) : null}
                            <div className="overflow-x-auto rounded-xl border border-border/60">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Rate</TableHead>
                                            <TableHead className="text-right">Line total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {purchaseDetail.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.itemName}</TableCell>
                                                <TableCell>{item.description ?? "—"}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">{formatCompletedSalesValue(item.rate)}</TableCell>
                                                <TableCell className="text-right">{formatCompletedSalesValue(item.lineTotal)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        if (purchasesQuery.isLoading) {
            return (
                <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading purchases">
                    <Spinner className="size-6 text-primary" />
                </div>
            );
        }
        if (purchasesErrorCode === 404 || purchasesErrorMessage === "Organization not found" || purchasesErrorMessage === "Store not found") {
            return (
                <Alert role="alert">
                    <AlertTitle>Purchase data was not found</AlertTitle>
                    <AlertDescription>
                        This organization or store is not available. Adjust the purchase filters to continue.
                    </AlertDescription>
                </Alert>
            );
        }
        if (purchasesQuery.isError || purchasesResponse?.status === "error") {
            return (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Purchases could not be loaded</AlertTitle>
                    <AlertDescription>{purchasesErrorMessage ?? "The purchase list is unavailable."}</AlertDescription>
                </Alert>
            );
        }
        if (!purchasesList) return null;

        const page = purchasesList.pagination.page;
        const limit = purchasesList.pagination.limit;
        const totalPages = Math.max(1, Math.ceil(purchasesList.pagination.totalCount / limit));

        return (
            <div className="space-y-4">
                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardHeader className="gap-3">
                        <div>
                            <h2 className="font-display text-xl font-semibold tracking-tight">Purchases</h2>
                            <CardDescription>
                                Read-only supplier purchase records by Store. Filters are independent of the Dashboard reporting period.
                            </CardDescription>
                        </div>
                        <form
                            className="flex flex-col gap-3 lg:flex-row lg:items-end"
                            onSubmit={(event: FormEvent<HTMLFormElement>) => {
                                event.preventDefault();
                                updatePurchaseFilters({ search: purchaseSearchInput.trim() || undefined });
                            }}
                            role="search"
                        >
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={purchaseSearchInput}
                                    onChange={(event) => setPurchaseSearchInput(event.target.value)}
                                    aria-label="Search purchases"
                                    placeholder="Search supplier, invoice, or item"
                                    className="h-10 rounded-xl pl-9"
                                />
                            </div>
                            <Button type="submit" size="sm" className="rounded-full">Search</Button>
                        </form>
                        <div className="flex flex-wrap gap-2">
                            <Select
                                value={purchaseFilters.storeId ?? "all"}
                                onValueChange={(value) =>
                                    updatePurchaseFilters({
                                        storeId: value === "all" || !value ? undefined : value,
                                        page: 1,
                                    })}
                            >
                                <SelectTrigger className="h-10 w-44 rounded-xl" aria-label="Filter purchases by store">
                                    <SelectValue placeholder="All stores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All stores</SelectItem>
                                    {purchasesList.stores.map((storeOption) => (
                                        <SelectItem key={storeOption.id} value={storeOption.id}>{storeOption.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={purchaseFilters.status ?? "all"}
                                onValueChange={(value) =>
                                    updatePurchaseFilters({
                                        status: value as PurchaseInspectionFilters["status"],
                                        page: 1,
                                    })}
                            >
                                <SelectTrigger className="h-10 w-40 rounded-xl" aria-label="Filter purchases by status">
                                    <SelectValue placeholder="All status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All status</SelectItem>
                                    <SelectItem value="recorded">Recorded</SelectItem>
                                    <SelectItem value="voided">Voided</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                aria-label="Purchase start date"
                                value={purchaseFilters.startDate ?? ""}
                                onChange={(event) => updatePurchaseFilters({ startDate: event.target.value || undefined, page: 1 })}
                                className="h-10 w-40 rounded-xl"
                            />
                            <Input
                                type="date"
                                aria-label="Purchase end date"
                                value={purchaseFilters.endDate ?? ""}
                                onChange={(event) => updatePurchaseFilters({ endDate: event.target.value || undefined, page: 1 })}
                                className="h-10 w-40 rounded-xl"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-sm text-muted-foreground">
                            {`Read-only purchase directory · ${purchasesList.pagination.totalCount} purchases`}
                        </p>
                        {purchasesList.purchases.length === 0 ? (
                            <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <ShoppingCart />
                                    </EmptyMedia>
                                    <EmptyTitle>No purchases match these filters</EmptyTitle>
                                    <EmptyDescription>Try another store, date range, or search term.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-border/60">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Supplier</TableHead>
                                            <TableHead>Store</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {purchasesList.purchases.map((purchaseRow) => {
                                            const href = organizationInspectionPath(organizationId, "purchases", purchaseRow.id, purchaseFilters);
                                            return (
                                                <TableRow key={purchaseRow.id}>
                                                    <TableCell>{purchaseRow.purchaseDate}</TableCell>
                                                    <TableCell>
                                                        <a
                                                            href={href}
                                                            className="font-medium text-primary hover:underline"
                                                            onClick={(event) => followInspectionLink(event, href)}
                                                        >
                                                            {purchaseRow.supplierName}
                                                        </a>
                                                    </TableCell>
                                                    <TableCell>{purchaseRow.store.name}</TableCell>
                                                    <TableCell>{purchaseStatusLabel(purchaseRow.status)}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatCompletedSalesValue(purchaseRow.totalAmount)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        {purchasesList.pagination.totalCount > limit ? (
                            <div className="mt-4 flex items-center justify-between gap-3">
                                <p className="text-sm text-muted-foreground">{`Page ${page} of ${totalPages}`}</p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full"
                                        disabled={page <= 1}
                                        onClick={() => updatePurchaseFilters({ page: page - 1 })}
                                    >
                                        <ChevronLeft className="size-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full"
                                        disabled={page >= totalPages}
                                        onClick={() => updatePurchaseFilters({ page: page + 1 })}
                                    >
                                        Next
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderWhatsAppInspection = () => {
        if (whatsappQuery.isLoading) {
            return (
                <div className="flex min-h-[24vh] items-center justify-center" aria-busy="true" aria-label="Loading WhatsApp">
                    <Spinner className="size-6 text-primary" />
                </div>
            );
        }
        if (whatsappErrorCode === 404 || whatsappErrorMessage === "Organization not found") {
            return (
                <Alert role="alert">
                    <AlertTitle>WhatsApp data was not found</AlertTitle>
                    <AlertDescription>
                        This organization is not available. Return to the organizations list to continue.
                    </AlertDescription>
                </Alert>
            );
        }
        if (whatsappQuery.isError || whatsappResponse?.status === "error") {
            return (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>WhatsApp could not be loaded</AlertTitle>
                    <AlertDescription>{whatsappErrorMessage ?? "The WhatsApp inspection data is unavailable."}</AlertDescription>
                </Alert>
            );
        }
        if (!whatsappData) return null;

        return (
            <div className="space-y-4">
                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardHeader className="gap-1">
                        <h2 className="font-display text-xl font-semibold tracking-tight">WhatsApp</h2>
                        <CardDescription>
                            Read-only connection and configuration status. Credentials, session secrets, and messaging controls are never shown in Console.
                        </CardDescription>
                    </CardHeader>
                </Card>

                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardHeader className="gap-1">
                        <h3 className="font-display text-lg font-semibold tracking-tight">Organization accounts</h3>
                        <CardDescription>Connection state for each organization WhatsApp account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {whatsappData.accounts.length === 0 ? (
                            <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <MessageCircle />
                                    </EmptyMedia>
                                    <EmptyTitle>No WhatsApp accounts</EmptyTitle>
                                    <EmptyDescription>This organization has not configured WhatsApp yet.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-border/60">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Provider</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Default store</TableHead>
                                            <TableHead>Assigned stores</TableHead>
                                            <TableHead>Last connected</TableHead>
                                            <TableHead>Last seen</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {whatsappData.accounts.map((account) => (
                                            <TableRow key={account.id}>
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    {formatPhoneDisplay(account.phoneNumber)}
                                                </TableCell>
                                                <TableCell>{account.provider === "cloud_api" ? "Cloud API" : "Baileys"}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="rounded-full">
                                                        {whatsappAccountStatusLabel(account.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{account.defaultStore?.name ?? "—"}</TableCell>
                                                <TableCell>
                                                    {account.assignedStores.length > 0
                                                        ? account.assignedStores.map((store) => store.name).join(", ")
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-muted-foreground">
                                                    {formatLastCompletedSale(account.lastConnectedAt)}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-muted-foreground">
                                                    {formatLastCompletedSale(account.lastSeenAt)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardHeader className="gap-1">
                        <h3 className="font-display text-lg font-semibold tracking-tight">Store configuration</h3>
                        <CardDescription>Safe template and message-link metadata per store.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {whatsappData.storeConfigs.length === 0 ? (
                            <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Store />
                                    </EmptyMedia>
                                    <EmptyTitle>No stores yet</EmptyTitle>
                                    <EmptyDescription>Store WhatsApp configuration appears once stores exist.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            whatsappData.storeConfigs.map((config) => (
                                <Card key={config.store.id} className="border-border/60 bg-background/60">
                                    <CardHeader className="gap-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-medium">{config.store.name}</h4>
                                            {config.accountStatus ? (
                                                <Badge variant="outline" className="rounded-full">
                                                    {whatsappAccountStatusLabel(config.accountStatus)}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="rounded-full">No account linked</Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <p className="mb-2 text-sm font-medium">Templates</p>
                                            {config.templates.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No templates configured.</p>
                                            ) : (
                                                <div className="overflow-x-auto rounded-xl border border-border/60">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Kind</TableHead>
                                                                <TableHead>Name</TableHead>
                                                                <TableHead>Default</TableHead>
                                                                <TableHead>Status</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {config.templates.map((template) => (
                                                                <TableRow key={`${config.store.id}-${template.kind}-${template.name}`}>
                                                                    <TableCell>{whatsappTemplateKindLabel(template.kind)}</TableCell>
                                                                    <TableCell className="font-medium">{template.name}</TableCell>
                                                                    <TableCell>{template.isDefault ? "Yes" : "No"}</TableCell>
                                                                    <TableCell>{template.isActive ? "Active" : "Inactive"}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="mb-2 text-sm font-medium">Message links</p>
                                            {config.messageLinks.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No message links configured.</p>
                                            ) : (
                                                <div className="overflow-x-auto rounded-xl border border-border/60">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Label</TableHead>
                                                                <TableHead>Key</TableHead>
                                                                <TableHead>Type</TableHead>
                                                                <TableHead>Status</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {config.messageLinks.map((link) => (
                                                                <TableRow key={`${config.store.id}-${link.key}`}>
                                                                    <TableCell className="font-medium">{link.label}</TableCell>
                                                                    <TableCell>{link.key}</TableCell>
                                                                    <TableCell>{link.type.replaceAll("_", " ")}</TableCell>
                                                                    <TableCell>{link.isActive ? "Active" : "Inactive"}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </CardContent>
                </Card>
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
        <section className="space-y-4">
            <div className="space-y-0">
                <div className="flex items-center justify-between gap-3 pb-1">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="h-9 w-9 shrink-0 rounded-lg"
                            onClick={onBack}
                            aria-label="Back to organizations"
                        >
                            <ArrowLeft className="size-4" />
                        </Button>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building2 className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                                <h1 className="truncate font-display text-lg font-semibold tracking-tight sm:text-xl">
                                    {organization?.name ?? "Organization"}
                                </h1>
                                {organization ? (
                                    <Badge
                                        variant={organization.isActive ? "secondary" : "outline"}
                                        className="hidden shrink-0 rounded-full text-[10px] sm:inline-flex"
                                    >
                                        {organization.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                ) : null}
                            </div>
                            {organization ? (
                                <p className="truncate text-xs text-muted-foreground">@{organization.username}</p>
                            ) : null}
                        </div>
                    </div>
                    {organization ? (
                        <div className="flex max-w-[42%] shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground sm:max-w-none sm:gap-2 sm:px-3">
                            <span className="truncate font-medium text-foreground">
                                {`${organization.creator.firstName} ${organization.creator.lastName}`}
                            </span>
                            <span className="hidden text-muted-foreground/60 sm:inline">·</span>
                            <span className="hidden truncate sm:inline">{formatPhoneDisplay(organization.creator.phone)}</span>
                        </div>
                    ) : null}
                </div>

                {renderSectionNav()}
            </div>

            {detailQuery.isLoading && section !== "stores" && section !== "billing" && section !== "catalog" && section !== "customers" && section !== "reports" && section !== "tables" && section !== "purchases" && section !== "whatsapp" ? (
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
            ) : section !== "stores" && section !== "billing" && section !== "catalog" && section !== "customers" && section !== "reports" && section !== "tables" && section !== "purchases" && section !== "whatsapp" && (activeSectionErrorCode === 404 || activeSectionErrorMessage === "Organization not found") ? (
                <Alert role="alert">
                    <AlertTitle>Organization was not found</AlertTitle>
                    <AlertDescription>
                        This organization is not available. Return to the organizations list to continue.
                    </AlertDescription>
                </Alert>
            ) : section !== "stores" && section !== "billing" && section !== "catalog" && section !== "customers" && section !== "reports" && section !== "tables" && section !== "purchases" && section !== "whatsapp" && (detailQuery.isError || response?.status === "error") ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Organization could not be loaded</AlertTitle>
                    <AlertDescription>{errorMessage ?? "The organization detail is unavailable."}</AlertDescription>
                </Alert>
            ) : section === "stores" || section === "billing" || section === "catalog" || section === "customers" || section === "reports" || section === "tables" || section === "purchases" || section === "whatsapp" || organization ? (
                section === "overview" && organization
                    ? renderOverview()
                    : section === "stores"
                        ? renderStoreInspection()
                        : section === "billing"
                            ? renderBillingInspection()
                            : section === "catalog"
                                ? renderCatalogInspection()
                                : section === "customers"
                                    ? renderCustomerInspection()
                                    : section === "reports"
                                        ? renderReportInspection()
                                        : section === "tables"
                                            ? renderTableInspection()
                                            : section === "purchases"
                                                ? renderPurchaseInspection()
                                                : section === "whatsapp"
                                                    ? renderWhatsAppInspection()
                                    : organization
                                        ? renderLaterSection()
                                        : null
            ) : null}
        </section>
    );
};

export default PlatformOrganizationDetailPage;
export type { PlatformOrganizationDetailPageProps };
