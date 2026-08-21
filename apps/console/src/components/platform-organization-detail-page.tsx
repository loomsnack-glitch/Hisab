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
    getPlatformOrganizationCatalog as getPlatformOrganizationCatalogRequest,
    getPlatformOrganizationCatalogProduct as getPlatformOrganizationCatalogProductRequest,
    getPlatformOrganizationCatalogCategory as getPlatformOrganizationCatalogCategoryRequest,
    getPlatformOrganizationCatalogAddOn as getPlatformOrganizationCatalogAddOnRequest,
    getPlatformOrganizationCustomers as getPlatformOrganizationCustomersRequest,
    getPlatformOrganizationCustomer as getPlatformOrganizationCustomerRequest,
    getPlatformOrganizationReports as getPlatformOrganizationReportsRequest,
    getPlatformOrganizationTables as getPlatformOrganizationTablesRequest,
    getPlatformOrganizationTable as getPlatformOrganizationTableRequest,
    getPlatformOrganizationPurchases as getPlatformOrganizationPurchasesRequest,
    getPlatformOrganizationPurchase as getPlatformOrganizationPurchaseRequest,
    getPlatformStore as getPlatformStoreRequest,
} from "@repo/services";
import {
    PLATFORM_REPORTING_TIMEZONE,
    formatPhoneDisplay,
    type PlatformBillingInspectionQueryJSON,
    type PlatformCatalogAddOnDetailResponse,
    type PlatformCatalogCategoryDetailResponse,
    type PlatformCatalogProductDetailResponse,
    type PlatformCustomerInspectionDetailDTO,
    type PlatformCustomerInspectionQueryJSON,
    type PlatformDashboardQueryJSON,
    type PlatformOrganizationDetailQueryJSON,
    type PlatformPurchaseInspectionDetailDTO,
    type PlatformPurchaseInspectionQueryJSON,
    type PlatformRecentSaleDTO,
    type PlatformSaleInspectionDetailDTO,
    type PlatformSaleInspectionSummaryDTO,
    type PlatformStoreActivityDTO,
    type PlatformStoreDetailDTO,
    type PlatformStoreDeviceInspectionDTO,
    type PlatformTableInspectionDetailDTO,
    type PlatformTableInspectionQueryJSON,
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
    catalogInspectionPath,
    organizationInspectionPath,
    organizationInspectionSections,
    parseBillingInspectionSearch,
    parseCatalogInspectionSearch,
    parseCustomerInspectionSearch,
    parseReportInspectionSearch,
    parseTableInspectionSearch,
    parsePurchaseInspectionSearch,
    type BillingInspectionFilters,
    type CatalogInspectionFilters,
    type CustomerInspectionFilters,
    type ReportInspectionFilters,
    type TableInspectionFilters,
    type PurchaseInspectionFilters,
    type CatalogResourceKind,
    type OrganizationInspectionSection,
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
const organizationTablesQueryKey = ["platform-owner", "organization-tables"] as const;
const organizationTableQueryKey = ["platform-owner", "organization-table"] as const;
const organizationPurchasesQueryKey = ["platform-owner", "organization-purchases"] as const;
const organizationPurchaseQueryKey = ["platform-owner", "organization-purchase"] as const;

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
    getPlatformOrganizationTables?: typeof getPlatformOrganizationTablesRequest;
    getPlatformOrganizationTable?: typeof getPlatformOrganizationTableRequest;
    getPlatformOrganizationPurchases?: typeof getPlatformOrganizationPurchasesRequest;
    getPlatformOrganizationPurchase?: typeof getPlatformOrganizationPurchaseRequest;
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
    getPlatformOrganizationTables = getPlatformOrganizationTablesRequest,
    getPlatformOrganizationTable = getPlatformOrganizationTableRequest,
    getPlatformOrganizationPurchases = getPlatformOrganizationPurchasesRequest,
    getPlatformOrganizationPurchase = getPlatformOrganizationPurchaseRequest,
    onNavigate,
    onUnauthorized,
}: PlatformOrganizationDetailPageProps) => {
    const [billingFilters, setBillingFilters] = useState<BillingInspectionFilters>(() =>
        parseBillingInspectionSearch(typeof window === "undefined" ? "" : window.location.search),
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
    const [tableFilters, setTableFilters] = useState<TableInspectionFilters>(() =>
        parseTableInspectionSearch(typeof window === "undefined" ? "" : window.location.search),
    );
    const [tableSearchInput, setTableSearchInput] = useState(tableFilters.search ?? "");
    const [purchaseFilters, setPurchaseFilters] = useState<PurchaseInspectionFilters>(() =>
        parsePurchaseInspectionSearch(typeof window === "undefined" ? "" : window.location.search),
    );
    const [purchaseSearchInput, setPurchaseSearchInput] = useState(purchaseFilters.search ?? "");
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
    const tablesResponse = tablesQuery.data;
    const tablesList = tablesResponse?.status === "success" ? tablesResponse.data : undefined;
    const tableResponse = tableQuery.data;
    const tableDetail = tableResponse?.status === "success" ? tableResponse.data?.table : undefined;
    const purchasesResponse = purchasesQuery.data;
    const purchasesList = purchasesResponse?.status === "success" ? purchasesResponse.data : undefined;
    const purchaseResponse = purchaseQuery.data;
    const purchaseDetail = purchaseResponse?.status === "success" ? purchaseResponse.data?.purchase : undefined;
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
                                    : errorMessage;

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
            const nextFilters = parseBillingInspectionSearch(window.location.search);
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
        const path = organizationInspectionPath(organizationId, "billing", nextResourceId, nextFilters);
        setBillingFilters(nextFilters);
        go(path);
    };

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
                    onValueChange={(value) => updateBillingFilters({ storeId: value === "all" ? undefined : value || undefined })}
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
                                        storeId: value === "all" ? undefined : value,
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
                                        storeId: value === "all" ? undefined : value,
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

            {detailQuery.isLoading && section !== "stores" && section !== "billing" && section !== "catalog" && section !== "customers" && section !== "reports" && section !== "tables" && section !== "purchases" ? (
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
            ) : section !== "stores" && section !== "billing" && section !== "catalog" && section !== "customers" && section !== "reports" && section !== "tables" && section !== "purchases" && (activeSectionErrorCode === 404 || activeSectionErrorMessage === "Organization not found") ? (
                <Alert role="alert">
                    <AlertTitle>Organization was not found</AlertTitle>
                    <AlertDescription>
                        This organization is not available. Return to the organizations list to continue.
                    </AlertDescription>
                </Alert>
            ) : section !== "stores" && section !== "billing" && section !== "catalog" && section !== "customers" && section !== "reports" && section !== "tables" && section !== "purchases" && (detailQuery.isError || response?.status === "error") ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Organization could not be loaded</AlertTitle>
                    <AlertDescription>{errorMessage ?? "The organization detail is unavailable."}</AlertDescription>
                </Alert>
            ) : section === "stores" || section === "billing" || section === "catalog" || section === "customers" || section === "reports" || section === "tables" || section === "purchases" || organization ? (
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
                                    : organization
                                        ? renderLaterSection()
                                        : null
            ) : null}
        </section>
    );
};

export default PlatformOrganizationDetailPage;
export type { PlatformOrganizationDetailPageProps };
