import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSwipeable } from "react-swipeable";
import {
    commitSale,
    commitPosSale,
    completePosSale,
    createDraftSale,
    createPosDraftSale,
    createCustomer,
    createPosCustomer,
    getCustomers,
    replacePosSale,
    getCategories,
    getOrganizationDetails,
    getPosCategories,
    getPosCustomers,
    getPosProductAddOnAttachments,
    getPosComboProducts,
    getPosSettings,
    getComboProducts,
    deletePosDraftSale,
    getProductAddOnAttachments,
    getPosProducts,
    getPosSale,
    getPosSales,
    getProducts,
    getSale,
    getSales,
    getStoreProductOfferings,
    updatePosSettings,
    updatePosDraftSale,
    updateDraftSale,
    queuePosWhatsAppInvoice,
    queueWhatsAppInvoice,
} from "@repo/services";
import type {
    CommitSaleJSON,
    ReplaceSaleJSON,
    CompleteSaleJSON,
    CreateCustomerJSON,
    CreateDraftSaleJSON,
    DeviceSessionDTO,
    PaymentMethod,
    ProductResponseDTO,
    ComboProductResponse,
    CustomerDTO,
    SalesListQuery,
    InactiveProductCode,
    SaleDetailDTO,
    SaleServiceMode,
    UpdateDraftSaleJSON,
} from "@repo/types";
import { normalizePhoneNumber, overlayActiveStoreProductOfferings, inactiveProductCodesWithoutActiveOffering } from "@repo/types";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import {
    BillingWorkspaceLayout,
    clampSalesDateToLatest,
    getLatestSelectableSalesDate,
    resolveSingleDayDatePreset,
    type BillsDateMode,
    type BillsDatePreset,
} from "@repo/ui/components/billing";
import { Button } from "@repo/ui/components/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Spinner } from "@repo/ui/components/spinner";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import CustomerDirectory from "@/components/customers/customer-directory";
import { BillingBillsPanel } from "@/components/billing/billing-bills-panel";
import { BillingCartAside } from "@/components/billing/billing-cart-aside";
import { BillingPlaceOrderDialog } from "@/components/billing/billing-place-order-dialog";
import { BillingProductsPanel } from "@/components/billing/billing-products-panel";
import { BillingScanPanel, type BillingScanFeedback } from "@/components/billing/billing-scan-panel";
import CustomizeProductDialog, { type CustomizeAddOnSelection } from "@/components/billing/customize-product-dialog";
import ConfigureComboDialog, { type ComboDialogSelection } from "@/components/billing/configure-combo-dialog";
import SaleDetailDialog from "@/components/billing/sale-detail-dialog";
import ProductSalesSummary from "@/components/reports/product-sales-summary";
import type { BillingWorkspaceMode, PosComposerHandoff, PosPanelTab } from "@/lib/billing-mode";
import {
    isSameComposerConfiguration,
    type BillPaymentMethod,
    type ComposerItem,
    type InvoiceAction,
    type SaleSort,
    type SettlementMode,
} from "@/lib/billing/composer";
import { getSalesDateBounds, startOfLocalDay } from "@/lib/billing/sales-date";
import { billingKeys, catalogKeys, organizationKeys, whatsappKeys } from "@/lib/query-keys";
import { formatCurrency, formatDiscountPercentage } from "@/lib/format";
import {
    findCustomerByExactPhone,
    getCheckoutPhoneDigits,
    getCheckoutPhoneLookupValue,
    resolveCheckoutCustomer,
    toCheckoutPhoneInput,
} from "@/lib/checkout-customer";
import {
    readCheckoutBillingAdjustmentsOpen,
    writeCheckoutBillingAdjustmentsOpen,
} from "@/lib/checkout-billing-adjustments-preferences";
import { getComposerItemPricing } from "@/lib/combo-pricing";
import { buildReceiptText } from "@/lib/receipt-text";
import { printReceiptText } from "@/lib/print-receipt-text";
import type { ProductCardAction } from "@/lib/product-card-interaction";
import { shouldReturnToPosTablesAfterSale } from "@/lib/pos-service-table";
import {
    appendScanDiagnostic,
    incrementPlainProductQuantity,
    resolveScanToCartIntent,
    type ScanDiagnostic,
} from "@/lib/barcode-scanning";
import { catalogDefaultSellingPortion } from "@repo/types";
import { safeRandomUUID } from "@/lib/uuid";
import { useOptionalPosPrinter } from "@/providers/pos-printer-provider";
import { useDirectBarcodeScanCapture } from "@/hooks/use-direct-barcode-scan-capture";
import { enqueueUnknownProductCode } from "@/lib/barcode-link-queue";

type BillingPanelTab = "products" | "bills" | "reports" | "customers";

const getStoredScanDiagnostics = (storageKey: string | null): ScanDiagnostic[] => {
    if (!storageKey || typeof window === "undefined") {
        return [];
    }

    try {
        const stored = window.sessionStorage.getItem(storageKey);
        const parsed = stored ? (JSON.parse(stored) as ScanDiagnostic[]) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const discountPresetPercentages = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 100] as const;

type BillingPageProps = {
    mode?: BillingWorkspaceMode;
    session?: DeviceSessionDTO | null;
    initialPanelTab?: "products" | "bills" | "reports" | "customers";
    productSearch?: string;
    salesSearch?: string;
    customerSearch?: string;
    fixedStoreId?: string;
    hideStoreSwitcher?: boolean;
    onPanelTabChange?: (
        tab: PosPanelTab,
        composerHandoff?: PosComposerHandoff,
    ) => void;
    onProductSearchChange?: (value: string) => void;
    onCustomerSearchChange?: (value: string) => void;
    pendingComposerHandoff?: PosComposerHandoff | null;
    onComposerHandoffConsumed?: () => void;
};

const BillingPage = ({
    mode = "admin",
    session = null,
    initialPanelTab = "products",
    productSearch: productSearchProp,
    salesSearch: salesSearchProp,
    customerSearch: customerSearchProp,
    fixedStoreId,
    hideStoreSwitcher = false,
    onPanelTabChange,
    onProductSearchChange,
    onCustomerSearchChange,
    pendingComposerHandoff = null,
    onComposerHandoffConsumed,
}: BillingPageProps) => {
    const queryClient = useQueryClient();
    const { organizationId: organizationIdParam = "" } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const isDeviceMode = mode === "device";
    const canMutate = isDeviceMode;
    const posPrinter = useOptionalPosPrinter();
    const organizationId = isDeviceMode ? (session?.organization.id ?? "") : organizationIdParam;
    const scanDiagnosticStorageKey = session?.device.id
        ? `hisab:barcode-scan-diagnostics:${session.device.id}`
        : null;

    const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [selectedCustomerFallback, setSelectedCustomerFallback] = useState<CustomerDTO | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<ComposerItem[]>([]);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [saleDialogOpen, setSaleDialogOpen] = useState(false);
    const [draftToDeleteId, setDraftToDeleteId] = useState<string | null>(null);
    const [resumingDraftId, setResumingDraftId] = useState<string | null>(null);
    const consumedComposerHandoffRef = useRef<string | null>(null);
    const [receiptToPrint, setReceiptToPrint] = useState<SaleDetailDTO | null>(null);
    const salesScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const salesLoadMoreRef = useRef<HTMLDivElement | null>(null);
    const consumedDeepLinkSaleIdRef = useRef<string | null>(null);
    const completionRequestRef = useRef<{
        requestId: string;
        fingerprint: string;
    } | null>(null);
    const [settlementMode, setSettlementMode] = useState<SettlementMode>("full");
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("cash");
    const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
    const [discountInput, setDiscountInput] = useState("");
    const [discountMode, setDiscountMode] = useState<"amount" | "percent">("percent");
    const [invoiceActions, setInvoiceActions] = useState<InvoiceAction[]>(
        isDeviceMode && posPrinter?.connected ? ["print"] : [],
    );
    const [serviceMode, setServiceMode] = useState<SaleServiceMode>("dine_in");
    const [billingAdjustmentsOpen, setBillingAdjustmentsOpenState] = useState(false);
    const [placeOrderDialogOpen, setPlaceOrderDialogOpen] = useState(false);
    const [replacingSaleId, setReplacingSaleId] = useState<string | null>(null);
    const [replaceConfirmationOpen, setReplaceConfirmationOpen] = useState(false);
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const [customerCreateOpen, setCustomerCreateOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");
    const [checkoutPhone, setCheckoutPhone] = useState("");
    const [checkoutName, setCheckoutName] = useState("");
    const [historyFilter] = useState<"all" | "draft" | "open" | "paid" | "voided">("all");
    const [leftPanelTab, setLeftPanelTab] = useState<BillingPanelTab>(
        isDeviceMode ? initialPanelTab : "bills",
    );

    const [sortBy, setSortBy] = useState<SaleSort>("newest");
    const [paymentMethodSelection, setPaymentMethodSelection] = useState<Set<BillPaymentMethod>>(new Set());
    const [dateFilter, setDateFilter] = useState<BillsDateMode>("date");
    const [datePreset, setDatePreset] = useState<BillsDatePreset>("today");
    const [specificDate, setSpecificDate] = useState(new Date());
    const [customFromDate, setCustomFromDate] = useState<Date | null>(null);
    const [customToDate, setCustomToDate] = useState<Date | null>(null);
    const [salesDatePopoverOpen, setSalesDatePopoverOpen] = useState(false);
    const [appliedDateFilter, setAppliedDateFilter] = useState<BillsDateMode>("date");
    const [appliedDatePreset, setAppliedDatePreset] = useState<BillsDatePreset>("today");
    const [appliedSpecificDate, setAppliedSpecificDate] = useState(new Date());
    const [appliedCustomFromDate, setAppliedCustomFromDate] = useState<Date | null>(null);
    const [appliedCustomToDate, setAppliedCustomToDate] = useState<Date | null>(null);
    const [customizeProductId, setCustomizeProductId] = useState<string | null>(null);
    const [configureComboProductId, setConfigureComboProductId] = useState<string | null>(null);
    const [mobileCartOpen, setMobileCartOpen] = useState(false);
    const [mobileBillsFiltersOpen, setMobileBillsFiltersOpen] = useState(false);
    const [draftSelectedStoreId, setDraftSelectedStoreId] = useState("");
    const [draftPaymentMethodSelection, setDraftPaymentMethodSelection] = useState<Set<BillPaymentMethod>>(new Set());
    const [draftSortBy, setDraftSortBy] = useState<SaleSort>("newest");
    const [scanValue, setScanValue] = useState("");
    const [directScanPaused, setDirectScanPaused] = useState(false);
    const [directScanActivationOpen, setDirectScanActivationOpen] = useState(false);
    const [scanFeedback, setScanFeedback] = useState<BillingScanFeedback | null>(null);
    const [scanDiagnostics, setScanDiagnostics] = useState<ScanDiagnostic[]>(() =>
        getStoredScanDiagnostics(scanDiagnosticStorageKey),
    );
    const scanInputRef = useRef<HTMLInputElement | null>(null);

    const productSearch = productSearchProp ?? "";
    const salesSearch = salesSearchProp ?? "";
    const deferredProductSearch = useDeferredValue(productSearch.trim().toLowerCase());
    const deferredCustomerSearch = useDeferredValue(customerSearch.trim().toLowerCase());
    const deferredSalesSearch = useDeferredValue(salesSearch.trim().toLowerCase());

    const setBillingAdjustmentsOpen = useCallback(
        (
            open: boolean | ((prev: boolean) => boolean),
            options?: { persist?: boolean },
        ) => {
            setBillingAdjustmentsOpenState((prev) => {
                const next = typeof open === "function" ? open(prev) : open;
                if (options?.persist !== false && organizationId) {
                    writeCheckoutBillingAdjustmentsOpen(organizationId, next);
                }
                return next;
            });
        },
        [organizationId],
    );

    const applySalesDatePreset = (preset: BillsDatePreset) => {
        const today = startOfLocalDay(new Date());
        setDatePreset(preset);

        if (preset === "today") {
            setDateFilter("date");
            setSpecificDate(today);
            return;
        }

        if (preset === "yesterday") {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            setDateFilter("date");
            setSpecificDate(yesterday);
            return;
        }

        if (preset === "this-week") {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
            setDateFilter("range");
            setCustomFromDate(weekStart);
            setCustomToDate(today);
            return;
        }

        if (preset === "this-month") {
            setDateFilter("range");
            setCustomFromDate(new Date(today.getFullYear(), today.getMonth(), 1));
            setCustomToDate(today);
            return;
        }

        if (preset === "all") {
            setDateFilter("range");
            setCustomFromDate(null);
            setCustomToDate(null);
            return;
        }
    };

    const shiftSalesDate = (days: number) => {
        const next = new Date(salesDatePopoverOpen ? specificDate : appliedSpecificDate);
        next.setDate(next.getDate() + days);
        const nextDate = startOfLocalDay(next);
        const latestSelectableDate = getLatestSelectableSalesDate();

        if (days > 0 && nextDate.getTime() > latestSelectableDate.getTime()) {
            return;
        }

        const nextPreset = resolveSingleDayDatePreset(nextDate);

        setDateFilter("date");
        setDatePreset(nextPreset);
        setSpecificDate(nextDate);
        setAppliedDateFilter("date");
        setAppliedDatePreset(nextPreset);
        setAppliedSpecificDate(nextDate);
        setAppliedCustomFromDate(null);
        setAppliedCustomToDate(null);
        setSalesDatePopoverOpen(false);
    };

    const setSalesDateMode = (mode: BillsDateMode) => {
        setDateFilter(mode);
        setDatePreset("custom");

        if (mode === "range" && !customFromDate && !customToDate) {
            setCustomFromDate(specificDate);
            setCustomToDate(specificDate);
        }
    };

    const confirmSalesDateFilter = () => {
        if (dateFilter === "range" && datePreset === "custom" && (!customFromDate || !customToDate)) {
            return;
        }

        const clampedSpecificDate = clampSalesDateToLatest(specificDate);
        const clampedFromDate = customFromDate ? clampSalesDateToLatest(customFromDate) : null;
        const clampedToDate = customToDate ? clampSalesDateToLatest(customToDate) : null;
        const resolvedDatePreset =
            dateFilter === "date"
                ? resolveSingleDayDatePreset(clampedSpecificDate)
                : datePreset;

        setAppliedDateFilter(dateFilter);
        setAppliedDatePreset(resolvedDatePreset);
        setAppliedSpecificDate(clampedSpecificDate);
        setAppliedCustomFromDate(clampedFromDate);
        setAppliedCustomToDate(clampedToDate);
        setSpecificDate(clampedSpecificDate);
        setCustomFromDate(clampedFromDate);
        setCustomToDate(clampedToDate);
        setDatePreset(resolvedDatePreset);
        setSalesDatePopoverOpen(false);
    };

    const handleSalesDatePopoverOpenChange = (open: boolean) => {
        if (open) {
            setDateFilter(appliedDateFilter);
            setDatePreset(appliedDatePreset);
            setSpecificDate(appliedSpecificDate);
            setCustomFromDate(appliedCustomFromDate);
            setCustomToDate(appliedCustomToDate);
        } else {
            setDateFilter(appliedDateFilter);
            setDatePreset(appliedDatePreset);
            setSpecificDate(appliedSpecificDate);
            setCustomFromDate(appliedCustomFromDate);
            setCustomToDate(appliedCustomToDate);
        }
        setSalesDatePopoverOpen(open);
    };

    const hasBillsToolbarFilters =
        paymentMethodSelection.size > 0 ||
        sortBy !== "newest" ||
        appliedDatePreset !== "today" ||
        appliedDateFilter !== "date";

    const billsSheetFilterCount =
        paymentMethodSelection.size + (sortBy !== "newest" ? 1 : 0);

    const draftBillsFilterCount =
        draftPaymentMethodSelection.size + (draftSortBy !== "newest" ? 1 : 0);

    const handleMobileBillsFiltersOpenChange = (open: boolean) => {
        if (open) {
            setDraftSelectedStoreId(selectedStoreId);
            setDraftPaymentMethodSelection(new Set(paymentMethodSelection));
            setDraftSortBy(sortBy);
        }
        setMobileBillsFiltersOpen(open);
    };

    const clearDraftBillsFilters = () => {
        if (!hideStoreSwitcher) {
            setDraftSelectedStoreId(organizationStores[0]?.id ?? "");
        }
        setDraftPaymentMethodSelection(new Set());
        setDraftSortBy("newest");
    };

    const applyMobileBillsFilters = () => {
        if (!hideStoreSwitcher && draftSelectedStoreId && draftSelectedStoreId !== selectedStoreId) {
            setStore(draftSelectedStoreId);
        }
        setPaymentMethodSelection(new Set(draftPaymentMethodSelection));
        setSortBy(draftSortBy);
        setMobileBillsFiltersOpen(false);
    };

    const clearBillsToolbarFilters = () => {
        setPaymentMethodSelection(new Set());
        setSortBy("newest");
        applySalesDatePreset("today");
        setAppliedDateFilter("date");
        setAppliedDatePreset("today");
        setAppliedSpecificDate(startOfLocalDay(new Date()));
        setAppliedCustomFromDate(null);
        setAppliedCustomToDate(null);
    };

    const selectedStoreId = isDeviceMode
        ? (session?.store.id ?? "")
        : (fixedStoreId || searchParams.get("storeId") || "");

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: !isDeviceMode && Boolean(organizationId),
    });

    const categoriesQuery = useQuery({
        queryKey: catalogKeys.categories(organizationId),
        queryFn: () => (isDeviceMode ? getPosCategories() : getCategories(organizationId)),
        enabled: Boolean(organizationId),
    });

    const productsQuery = useQuery({
        queryKey: catalogKeys.products(organizationId),
        queryFn: () => (isDeviceMode ? getPosProducts() : getProducts(organizationId)),
        enabled: Boolean(organizationId),
    });
    const storeOfferingsQuery = useQuery({
        queryKey: catalogKeys.storeProductOfferings(organizationId, selectedStoreId),
        queryFn: () => getStoreProductOfferings(organizationId, selectedStoreId),
        enabled: !isDeviceMode && Boolean(organizationId && selectedStoreId),
    });

    const posSettingsQuery = useQuery({
        queryKey: ["pos", "settings", session?.device.id],
        queryFn: () => getPosSettings(),
        enabled: isDeviceMode && Boolean(session?.device.id),
    });

    const selectableAttachmentsQuery = useQuery({
        queryKey: catalogKeys.selectableProductAttachments(organizationId),
        queryFn: () => getPosProductAddOnAttachments(),
        enabled: isDeviceMode && Boolean(organizationId),
    });

    const salesDateBounds = useMemo(
        () =>
            getSalesDateBounds(
                appliedDateFilter,
                appliedSpecificDate,
                appliedCustomFromDate,
                appliedCustomToDate,
                appliedDatePreset,
            ),
        [appliedDateFilter, appliedDatePreset, appliedSpecificDate, appliedCustomFromDate, appliedCustomToDate],
    );
    const dateRangeNeedsInput =
        appliedDateFilter === "range" && appliedDatePreset === "custom" && (!appliedCustomFromDate || !appliedCustomToDate);
    const salesStatusFilter = historyFilter === "draft" || historyFilter === "voided" ? historyFilter : historyFilter === "open" || historyFilter === "paid" ? "completed" : undefined;
    const salesPaymentStatusFilter = historyFilter === "paid" ? "paid" : undefined;
    const salesQueryParams = useMemo<SalesListQuery>(() => {
        return {
            limit: 40,
            sort: sortBy,
            status: salesStatusFilter,
            paymentStatus: salesPaymentStatusFilter,
            search: deferredSalesSearch || undefined,
            paymentMethods:
                paymentMethodSelection.size > 0
                    ? Array.from(paymentMethodSelection)
                    : undefined,
            createdFrom: salesDateBounds.from?.toISOString(),
            createdTo: salesDateBounds.to?.toISOString(),
        };
    }, [
        deferredSalesSearch,
        paymentMethodSelection,
        salesDateBounds.from,
        salesDateBounds.to,
        salesPaymentStatusFilter,
        salesStatusFilter,
        sortBy,
    ]);

    const customersQuery = useQuery({
        queryKey: billingKeys.customers(organizationId, { mode: "device", search: deferredCustomerSearch }),
        queryFn: () =>
            getPosCustomers({
                search: deferredCustomerSearch || undefined,
                status: "all",
                limit: 40,
            }),
        enabled: isDeviceMode && Boolean(organizationId),
    });

    const checkoutPhoneLookup = getCheckoutPhoneLookupValue(checkoutPhone);
    const checkoutCustomerLookupQuery = useQuery({
        queryKey: billingKeys.customers(organizationId, {
            lookup: "checkout-phone",
            search: checkoutPhoneLookup,
        }),
        queryFn: () =>
            isDeviceMode
                ? getPosCustomers({
                      search: checkoutPhoneLookup || undefined,
                      status: "all",
                      limit: 20,
                  })
                : getCustomers(organizationId, {
                      search: checkoutPhoneLookup || undefined,
                      status: "all",
                      limit: 20,
                  }),
        enabled: Boolean(organizationId) && Boolean(checkoutPhoneLookup) && placeOrderDialogOpen,
    });

    const salesQuery = useInfiniteQuery({
        queryKey: billingKeys.sales(organizationId, selectedStoreId, salesQueryParams),
        initialPageParam: null as string | null,
        queryFn: async ({ pageParam }) => {
            const query = pageParam ? { ...salesQueryParams, cursor: pageParam } : salesQueryParams;
            const response = isDeviceMode ? await getPosSales(query) : await getSales(organizationId, selectedStoreId, query);
            if (response.status === "error") {
                throw new Error(response.message || "Bills failed to load");
            }
            return response;
        },
        getNextPageParam: (lastPage) =>
            lastPage.status === "success" && lastPage.data?.pageInfo.hasMore
                ? lastPage.data.pageInfo.nextCursor ?? undefined
                : undefined,
        enabled: Boolean(organizationId && selectedStoreId) && !dateRangeNeedsInput,
    });

    const organization = isDeviceMode
        ? null
        : organizationQuery.data?.status === "success"
          ? (organizationQuery.data.data?.organization ?? null)
          : null;
    const receiptContext = useMemo(() => {
        const store = isDeviceMode
            ? session?.store
            : organization?.stores.find((candidate) => candidate.id === selectedStoreId);

        return {
            organizationName: isDeviceMode ? session?.organization.name : organization?.name,
            organizationTagline: isDeviceMode ? session?.organization.tagline : organization?.tagline,
            storeName: store?.name,
            storeAddress: store?.address,
        };
    }, [isDeviceMode, organization, selectedStoreId, session]);
    const categories = useMemo(
        () => (categoriesQuery.data?.status === "success" ? (categoriesQuery.data.data?.categories ?? []) : []),
        [categoriesQuery.data],
    );
    const catalogProducts = useMemo(
        () => (productsQuery.data?.status === "success" ? (productsQuery.data.data?.products ?? []) : []),
        [productsQuery.data],
    );
    const storeOfferings = useMemo(
        () =>
            storeOfferingsQuery.data?.status === "success"
                ? (storeOfferingsQuery.data.data?.offerings ?? [])
                : [],
        [storeOfferingsQuery.data],
    );
    const products = useMemo(() => {
        if (isDeviceMode) {
            return catalogProducts;
        }
        if (!selectedStoreId) {
            return catalogProducts;
        }
        return overlayActiveStoreProductOfferings(catalogProducts, storeOfferings);
    }, [catalogProducts, isDeviceMode, selectedStoreId, storeOfferings]);
    const inactiveProductCodes = useMemo(() => {
        if (isDeviceMode) {
            return productsQuery.data?.status === "success"
                ? ((productsQuery.data.data?.inactiveProductCodes ?? []) as InactiveProductCode[])
                : [];
        }
        if (!selectedStoreId) {
            return [];
        }
        return inactiveProductCodesWithoutActiveOffering(catalogProducts, storeOfferings);
    }, [catalogProducts, isDeviceMode, productsQuery.data, selectedStoreId, storeOfferings]);
    const barcodeScanningEnabled =
        posSettingsQuery.data?.status === "success" &&
        posSettingsQuery.data.data?.organizationCatalogSettings.barcodeScanningEnabled === true;
    const directBarcodeScanEnabled =
        barcodeScanningEnabled &&
        posSettingsQuery.data?.status === "success" &&
        posSettingsQuery.data.data?.storeDevicePosSettings.directBarcodeScanEnabled === true;
    const activeProductCodesCount = products.filter((product) => Boolean(product.productCode)).length;
    const canEnableDirectBarcodeScan =
        productsQuery.data?.status === "success" && activeProductCodesCount > 0;
    const updateDirectScanMutation = useMutation({
        mutationFn: (directBarcodeScanEnabled: boolean) => updatePosSettings({ directBarcodeScanEnabled }),
        onSuccess: (response) => {
            if (response.status === "success") {
                queryClient.setQueryData(["pos", "settings", session?.device.id], response);
                setDirectScanPaused(false);
                toast.success(response.message);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to update direct barcode scanning");
        },
    });

    const recordScanDiagnostic = useCallback(
        (diagnostic: Omit<ScanDiagnostic, "occurredAt">) => {
            const nextDiagnostic = { ...diagnostic, occurredAt: new Date().toISOString() };
            setScanDiagnostics((current) => {
                const next = appendScanDiagnostic(current, nextDiagnostic);
                if (scanDiagnosticStorageKey) {
                    try {
                        window.sessionStorage.setItem(scanDiagnosticStorageKey, JSON.stringify(next));
                    } catch {
                        // Diagnostics remain visible for this render even when browser storage is unavailable.
                    }
                }
                return next;
            });
        },
        [scanDiagnosticStorageKey],
    );
    const getComposerUnitDiscountFromSaleItem = useCallback((item: SaleDetailDTO["items"][number]) => {
        const quantity = Number(item.quantity);
        if (quantity <= 0) return 0;

        // Combo child add-on discounts are included in the parent sale-item
        // discount snapshot. Subtract them once to recover the parent discount.
        const comboAddOnDiscountPerParent = (item.bundleComponents ?? []).reduce(
            (total, component) =>
                total +
                (component.addOns ?? []).reduce(
                    (componentTotal, addOn) =>
                        componentTotal +
                        Number(addOn.unitDiscountSnapshot) *
                            Number(addOn.quantityPerComponent) *
                            Number(component.quantityPerBundle),
                    0,
                ),
            0,
        );

        return Math.max(Number(item.discountAmount) / quantity - comboAddOnDiscountPerParent, 0);
    }, []);
    const comboProductsQuery = useQuery({
        queryKey: catalogKeys.combos(organizationId),
        queryFn: () => (isDeviceMode ? getPosComboProducts() : getComboProducts(organizationId)),
        enabled: Boolean(organizationId),
        staleTime: 5 * 60 * 1000,
    });
    const comboProductsData = comboProductsQuery.data;
    const comboProductsIsError = comboProductsQuery.isError;
    const refetchComboProducts = comboProductsQuery.refetch;
    const preloadedCombos = useMemo(
        () => (comboProductsQuery.data?.status === "success" ? (comboProductsQuery.data.data?.combos ?? []) : []),
        [comboProductsQuery.data],
    );
    const configureCombo = configureComboProductId
        ? (preloadedCombos.find((combo) => combo.product.id === configureComboProductId) ?? null)
        : null;
    const adminAttachmentProductIds = useMemo(() => {
        const productIds = new Set<string>();

        if (customizeProductId) {
            productIds.add(customizeProductId);
        }

        for (const combo of [...preloadedCombos, ...(configureCombo ? [configureCombo] : [])]) {
            for (const group of combo.choiceGroups) {
                for (const option of group.options) {
                    productIds.add(option.optionProductId);
                }
            }
        }

        return [...productIds];
    }, [configureCombo, customizeProductId, preloadedCombos]);
    const adminAttachmentQueries = useQueries({
        queries: isDeviceMode
            ? []
            : adminAttachmentProductIds.map((productId) => ({
                  queryKey: catalogKeys.productAttachments(organizationId, productId),
                  queryFn: () => getProductAddOnAttachments(organizationId, productId),
                  enabled: Boolean(organizationId),
              })),
    });
    const selectableAttachments = useMemo(
        () =>
            isDeviceMode
                ? selectableAttachmentsQuery.data?.status === "success"
                    ? (selectableAttachmentsQuery.data.data?.attachments ?? [])
                    : []
                : adminAttachmentQueries.flatMap((query) =>
                      query.data?.status === "success"
                          ? (query.data.data?.attachments ?? []).filter(
                                (attachment) => attachment.status === "active" && attachment.addOn.status === "active",
                            )
                          : [],
                  ),
        [adminAttachmentQueries, isDeviceMode, selectableAttachmentsQuery.data],
    );
    const customers = customersQuery.data?.status === "success" ? (customersQuery.data.data?.customers ?? []) : [];
    const salesPages = useMemo(() => salesQuery.data?.pages ?? [], [salesQuery.data]);
    const sales = useMemo(
        () =>
            salesPages.flatMap((page) =>
                page.status === "success" ? page.data?.sales ?? [] : [],
            ),
        [salesPages],
    );

    const firstSalesPage = salesPages[0];
    const salesServiceError =
        salesPages.length === 0 && salesQuery.error instanceof Error ? salesQuery.error.message : null;
    const salesSummary =
        !dateRangeNeedsInput && firstSalesPage?.status === "success" ? firstSalesPage.data?.summary ?? null : null;
    const selectedCustomer =
        customers.find((customer) => customer.id === selectedCustomerId) ?? selectedCustomerFallback;
    const checkoutLookupCustomers =
        checkoutCustomerLookupQuery.data?.status === "success"
            ? (checkoutCustomerLookupQuery.data.data?.customers ?? [])
            : undefined;
    const checkoutResolution = resolveCheckoutCustomer({
        phone: checkoutPhone,
        name: checkoutName,
        selectedCustomer: selectedCustomer ?? null,
        lookupCustomers: checkoutPhoneLookup
            ? checkoutCustomerLookupQuery.isFetched
                ? (checkoutLookupCustomers ?? [])
                : undefined
            : [],
        isLookupLoading:
            Boolean(checkoutPhoneLookup) &&
            checkoutCustomerLookupQuery.isFetching &&
            !(selectedCustomer && toCheckoutPhoneInput(selectedCustomer.phone) === checkoutPhone),
    });
    const hasInvalidCheckoutCustomer =
        checkoutResolution.status === "blocked" || checkoutResolution.status === "looking_up";
    const customerSearchLooksLikePhone = /^[+\d\s()-]+$/.test(customerSearch);

    const categoryOptions = [{ id: "all", name: "All" }, ...categories];
    const activeCategoryFilter =
        categoryFilter !== "all" && !categories.some((category) => category.id === categoryFilter)
            ? "all"
            : categoryFilter;
    const filteredCustomers = customers.slice(0, customerPickerOpen ? 40 : 8);

    const selectAdjacentCategory = (direction: -1 | 1) => {
        const currentIndex = Math.max(
            0,
            categoryOptions.findIndex((category) => category.id === activeCategoryFilter),
        );
        const nextIndex = Math.min(Math.max(currentIndex + direction, 0), categoryOptions.length - 1);
        const nextCategory = categoryOptions[nextIndex];

        if (nextCategory && nextCategory.id !== activeCategoryFilter) {
            setCategoryFilter(nextCategory.id);
        }
    };

    const bodyOverflowRef = useRef("");
    useEffect(() => {
        if (mobileCartOpen) {
            bodyOverflowRef.current = document.body.style.overflow;
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = bodyOverflowRef.current;
            bodyOverflowRef.current = "";
        }
        return () => {
            document.body.style.overflow = bodyOverflowRef.current;
        };
    }, [mobileCartOpen]);

    useEffect(() => {
        if (!isDeviceMode || !onPanelTabChange) {
            return;
        }

        if (
            leftPanelTab === "products" ||
            leftPanelTab === "bills" ||
            leftPanelTab === "reports" ||
            leftPanelTab === "customers"
        ) {
            onPanelTabChange(leftPanelTab);
        }
    }, [isDeviceMode, leftPanelTab, onPanelTabChange]);

    const categorySwipeHandlers = useSwipeable({
        onSwipedLeft: () => selectAdjacentCategory(1),
        onSwipedRight: () => selectAdjacentCategory(-1),
        delta: 30,
        preventScrollOnSwipe: false,
        trackMouse: false,
        trackTouch: true,
    });

    const attachmentsByProductId = useMemo(() => {
        const grouped = new Map<string, typeof selectableAttachments>();
        for (const attachment of selectableAttachments) {
            const existing = grouped.get(attachment.productId) ?? [];
            existing.push(attachment);
            grouped.set(attachment.productId, existing);
        }
        return grouped;
    }, [selectableAttachments]);

    const customizeProduct = products.find((product) => product.id === customizeProductId) ?? null;
    const customizeAttachments = customizeProduct ? (attachmentsByProductId.get(customizeProduct.id) ?? []) : [];
    const comboUnavailable = Boolean(
        configureComboProductId && comboProductsQuery.data?.status === "success" && !configureCombo,
    );

    useEffect(() => {
        if (comboUnavailable) {
            toast.error("This Combo is no longer available");
        }
    }, [comboUnavailable]);

    const organizationStores = isDeviceMode && session ? [session.store] : (organization?.stores ?? []);
    const selectedStore = isDeviceMode
        ? (session?.store ?? null)
        : (organizationStores.find((store) => store.id === selectedStoreId) ?? null);

    useEffect(() => {
        if (isDeviceMode || fixedStoreId) {
            return;
        }

        if (!organization?.stores?.length) {
            return;
        }

        const hasSelectedStore = organization.stores.some((store) => store.id === selectedStoreId);
        if (hasSelectedStore) {
            return;
        }

        const nextStoreId = organization.stores[0]?.id;
        if (!nextStoreId) {
            return;
        }

        startTransition(() => {
            setSearchParams({ storeId: nextStoreId });
        });
    }, [fixedStoreId, isDeviceMode, organization, selectedStoreId, setSearchParams]);

    const deepLinkSaleId = searchParams.get("saleId");

    useEffect(() => {
        if (isDeviceMode || !deepLinkSaleId || !selectedStoreId) {
            return;
        }

        if (consumedDeepLinkSaleIdRef.current === deepLinkSaleId) {
            return;
        }

        consumedDeepLinkSaleIdRef.current = deepLinkSaleId;
        setSelectedSaleId(deepLinkSaleId);
        setSaleDialogOpen(true);
    }, [deepLinkSaleId, isDeviceMode, selectedStoreId]);

    const activeProducts = products.filter((product) => product.status === "active");
    const filteredProducts = activeProducts.filter((product) => {
        const matchesCategory = activeCategoryFilter === "all" || product.categoryId === activeCategoryFilter;
        const matchesSearch = !deferredProductSearch || product.name.toLowerCase().includes(deferredProductSearch);
        return matchesCategory && matchesSearch;
    });
    const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

    const filteredSales = sales.filter((sale) => {
        switch (historyFilter) {
            case "draft":
                return sale.status === "draft";
            case "open":
                return sale.status === "completed" && sale.paymentStatus !== "paid";
            case "paid":
                return sale.paymentStatus === "paid";
            case "voided":
                return sale.status === "voided";
            default:
                return true;
        }
    });

    useEffect(() => {
        const target = salesLoadMoreRef.current;
        const scrollContainer = salesScrollContainerRef.current;
        if (!target || !scrollContainer || !salesQuery.hasNextPage) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting && !salesQuery.isFetchingNextPage) {
                    void salesQuery.fetchNextPage();
                }
            },
            { root: scrollContainer, rootMargin: "240px" },
        );
        observer.observe(target);

        return () => observer.disconnect();
    }, [salesQuery]);

    const salesLoadMoreFooter = salesQuery.isFetchNextPageError ? (
        <div className="flex justify-center py-4">
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => void salesQuery.fetchNextPage()}
            >
                Retry loading bills
            </Button>
        </div>
    ) : salesQuery.hasNextPage ? (
        <div ref={salesLoadMoreRef} className="flex min-h-20 items-center justify-center py-6" aria-live="polite">
            {salesQuery.isFetchingNextPage ? <Spinner className="size-8 text-primary" /> : null}
        </div>
    ) : salesPages.length > 1 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">All bills loaded</p>
    ) : null;

    const subtotal = items.reduce((total, item) => {
        return total + getComposerItemPricing(item).subtotal;
    }, 0);
    const lineDiscountTotal = items.reduce((total, item) => {
        return total + getComposerItemPricing(item).lineDiscountTotal;
    }, 0);
    const discountBase = Math.max(subtotal - lineDiscountTotal, 0);
    const parsedDiscountValue = discountInput.trim() === "" ? 0 : Number(discountInput);
    const normalizedDiscountValue =
        Number.isFinite(parsedDiscountValue) && parsedDiscountValue >= 0 ? parsedDiscountValue : 0;
    const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
    const orderDiscountAmount =
        discountMode === "percent"
            ? roundCurrency((discountBase * normalizedDiscountValue) / 100)
            : roundCurrency(normalizedDiscountValue);
    const discountExceedsBase = orderDiscountAmount > discountBase + 0.005;
    const discountValidationMessage =
        discountInput.trim() !== "" && !Number.isFinite(parsedDiscountValue)
            ? "Enter a valid discount"
            : parsedDiscountValue < 0
              ? "Discount cannot be negative"
              : discountMode === "percent" && parsedDiscountValue > 100
                ? "Percentage must be between 0 and 100"
                : discountExceedsBase
                  ? `Discount cannot exceed ${formatCurrency(discountBase)}`
                  : null;
    const hasInvalidDiscount = Boolean(discountValidationMessage);
    const totalDiscount = lineDiscountTotal + orderDiscountAmount;
    const itemDiscountPercentage = formatDiscountPercentage(lineDiscountTotal, subtotal);
    const orderDiscountPercentage = formatDiscountPercentage(orderDiscountAmount, discountBase);
    const discountPresetOptions = discountPresetPercentages
        .map((percentage) => ({
            percentage,
            amount: roundCurrency((discountBase * percentage) / 100),
        }))
        .filter((preset) => preset.amount > 0 && preset.amount <= discountBase + 0.005);
    const grandTotal = Math.max(subtotal - totalDiscount, 0);
    const rawPartialPaymentAmount = Math.max(Number(partialPaymentAmount || 0), 0);
    const collectedTotal =
        settlementMode === "due" ? 0 : settlementMode === "full" ? grandTotal : rawPartialPaymentAmount;
    const dueTotal = Math.max(grandTotal - collectedTotal, 0);
    const isReplacingSale = Boolean(replacingSaleId);
    const displayedDueTotal = dueTotal;
    const isOverpaid = settlementMode === "partial" && rawPartialPaymentAmount > grandTotal;
    const isPartialAmountMissing = settlementMode === "partial" && rawPartialPaymentAmount <= 0;
    const matchesFullPayment = settlementMode === "partial" && grandTotal > 0 && rawPartialPaymentAmount === grandTotal;
    const hasInvalidPartialPayment = isOverpaid || isPartialAmountMissing || matchesFullPayment;
    const changeDiscountMode = (nextMode: "amount" | "percent") => {
        if (nextMode === discountMode) {
            return;
        }

        if (discountInput.trim() !== "" && Number.isFinite(parsedDiscountValue) && parsedDiscountValue >= 0) {
            const convertedValue =
                nextMode === "percent"
                    ? discountBase > 0
                        ? roundCurrency((parsedDiscountValue / discountBase) * 100)
                        : 0
                    : roundCurrency((parsedDiscountValue * discountBase) / 100);
            setDiscountInput(String(convertedValue));
        }

        setDiscountMode(nextMode);
    };

    const applyDiscountPreset = (percentage: number, amount: number) => {
        const presetValue = discountMode === "percent" ? percentage : amount;
        const isSelected = Number(discountInput) === presetValue;

        if (isSelected) {
            setDiscountInput("");
            setBillingAdjustmentsOpen(true);
            return;
        }

        setDiscountInput(String(presetValue));
        setBillingAdjustmentsOpen(true);
    };

    const removeOrderDiscount = () => {
        setDiscountInput("");
        setDiscountMode("percent");
        setBillingAdjustmentsOpen(false, { persist: false });
    };

    const toggleInvoiceAction = (action: InvoiceAction) => {
        setInvoiceActions((current) =>
            current.includes(action) ? current.filter((item) => item !== action) : [...current, action],
        );
    };

    const selectCustomer = (customer: CustomerDTO | null) => {
        setSelectedCustomerId(customer?.id ?? "");
        setSelectedCustomerFallback(customer);
        setCheckoutPhone(toCheckoutPhoneInput(customer?.phone));
        setCheckoutName(customer?.name ?? "");
        setCustomerSearch("");
        setCustomerPickerOpen(false);
        setCustomerCreateOpen(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
    };

    const handleCheckoutPhoneChange = (value: string) => {
        const digits = getCheckoutPhoneDigits(value);
        setCheckoutPhone(digits);
        if (!selectedCustomer) {
            return;
        }
        if (toCheckoutPhoneInput(selectedCustomer.phone) === digits) {
            return;
        }
        setSelectedCustomerId("");
        setSelectedCustomerFallback(null);
        setCheckoutName("");
    };

    const existingCheckoutCustomer =
        checkoutResolution.status === "existing" ? checkoutResolution.customer : null;

    useEffect(() => {
        if (!existingCheckoutCustomer) {
            return;
        }

        setCheckoutName((current) =>
            current === existingCheckoutCustomer.name ? current : existingCheckoutCustomer.name,
        );
        setCheckoutPhone((current) => {
            const next = toCheckoutPhoneInput(existingCheckoutCustomer.phone);
            return current || next === current ? current : next;
        });
        setSelectedCustomerId((current) =>
            current === existingCheckoutCustomer.id ? current : existingCheckoutCustomer.id,
        );
        const match = findCustomerByExactPhone(
            checkoutLookupCustomers ?? customers,
            existingCheckoutCustomer.phone ?? checkoutPhone,
        );
        if (match) {
            setSelectedCustomerFallback(match);
        }
    }, [existingCheckoutCustomer, checkoutLookupCustomers, customers, checkoutPhone]);

    const openCustomerPicker = () => {
        setCustomerSearch("");
        setCustomerCreateOpen(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
        setCustomerPickerOpen(true);
    };

    const openCustomerCreate = () => {
        setCustomerCreateOpen(true);
        if (customerSearchLooksLikePhone) {
            setNewCustomerPhone(normalizePhoneNumber(customerSearch.trim()) ?? "");
            setNewCustomerName("");
        } else {
            setNewCustomerName(customerSearch.trim());
            setNewCustomerPhone("");
        }
    };

    const closeCustomerPicker = () => {
        setCustomerPickerOpen(false);
        setCustomerCreateOpen(false);
        setCustomerSearch("");
        setNewCustomerName("");
        setNewCustomerPhone("");
    };

    const invalidateBillingQueries = () => {
        queryClient.invalidateQueries({
            queryKey: billingKeys.organization(organizationId),
        });
    };

    const resetComposer = () => {
        setActiveDraftId(null);
        setReplacingSaleId(null);
        setReplaceConfirmationOpen(false);
        setSelectedCustomerId("");
        setSelectedCustomerFallback(null);
        setCustomerSearch("");
        setCheckoutPhone("");
        setCheckoutName("");
        setNotes("");
        setItems([]);
        setSettlementMode("full");
        setBillingAdjustmentsOpen(false, { persist: false });
        setSelectedPaymentMethod("cash");
        setPartialPaymentAmount("");
        setDiscountInput("");
        setDiscountMode("percent");
        setInvoiceActions(isDeviceMode && posPrinter?.connected ? ["print"] : []);
        setServiceMode("dine_in");
        setPlaceOrderDialogOpen(false);
        setCustomerPickerOpen(false);
        setCustomerCreateOpen(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
        setMobileCartOpen(false);
    };

    useEffect(() => {
        if (!receiptToPrint) {
            return;
        }

        const printTimer = window.setTimeout(() => {
            printReceiptText({
                text: buildReceiptText(receiptToPrint, receiptContext),
                title: receiptToPrint.saleNumber ? `Receipt_${receiptToPrint.saleNumber}` : "Receipt",
            });
            setReceiptToPrint(null);
        }, 100);

        return () => {
            window.clearTimeout(printTimer);
        };
    }, [receiptContext, receiptToPrint]);

    const addPlainProductToBill = useCallback((product: ProductResponseDTO, onAdded?: (quantity: number) => void) => {
        setItems((current) => {
            const portion = catalogDefaultSellingPortion(product);
            const existingPlainItem = current.find((item) =>
                isSameComposerConfiguration(item, {
                    productId: product.id,
                    addOns: [],
                    soldQuantity: portion.soldQuantity,
                }),
            );
            if (existingPlainItem) {
                const nextQuantity = existingPlainItem.quantity + 1;
                onAdded?.(nextQuantity);
                return incrementPlainProductQuantity(current, existingPlainItem.key) ?? current;
            }

            onAdded?.(1);
            return [
                ...current,
                {
                    key: safeRandomUUID(),
                    productId: product.id,
                    name: portion.soldProductName,
                    categoryId: product.categoryId,
                    unitPrice: portion.unitPrice,
                    unitDiscount: portion.unitDiscount,
                    quantity: 1,
                    soldQuantity: portion.soldQuantity,
                    unitLabel: portion.unitLabel,
                    addOns: [],
                    bundleComponents: [],
                    comboSelections: [],
                },
            ];
        });
    }, []);

    const addProductToBill = useCallback(
        (product: ProductResponseDTO, onAdded?: (quantity: number) => void) => {
            if (product.productType !== "combo") {
                addPlainProductToBill(product, onAdded);
                return;
            }

            const combo = preloadedCombos.find((item) => item.product.id === product.id);
            if (comboProductsIsError || comboProductsData?.status === "error") {
                toast.error("Unable to load Combo options. Retrying now.");
                void refetchComboProducts();
                return;
            }

            if (!combo) {
                toast.error("This Combo is no longer available");
                return;
            }

            if (combo.choiceGroups.length) {
                setConfigureComboProductId(product.id);
                return;
            }

            addPlainProductToBill(product, onAdded);
        },
        [
            addPlainProductToBill,
            comboProductsData?.status,
            comboProductsIsError,
            preloadedCombos,
            refetchComboProducts,
            setConfigureComboProductId,
        ],
    );

    const handleProductCardClick = useCallback(
        (product: ProductResponseDTO, action: ProductCardAction) => {
            if (action === "customize") {
                setCustomizeProductId(product.id);
                return;
            }

            if (action === "configure") {
                setConfigureComboProductId(product.id);
                return;
            }

            if (action === "add") {
                addProductToBill(product);
            }
        },
        [addProductToBill, setConfigureComboProductId, setCustomizeProductId],
    );

    const focusScanField = useCallback(() => {
        window.setTimeout(() => scanInputRef.current?.focus(), 0);
    }, []);

    const handleProductCodeScan = useCallback(
        (productCode: string) => {
            const intent = resolveScanToCartIntent(productCode, products, inactiveProductCodes, (product) => {
                const productAttachments = attachmentsByProductId.get(product.id) ?? [];
                const combo = preloadedCombos.find((item) => item.product.id === product.id);
                return {
                    hasAddOns: productAttachments.length > 0,
                    comboAvailable: Boolean(combo),
                    comboHasSettings: Boolean(combo?.choiceGroups.length),
                    comboLoading: product.productType === "combo" && comboProductsQuery.isPending,
                    comboHasError: comboProductsQuery.isError || comboProductsQuery.data?.status === "error",
                };
            });
            if (intent.kind === "empty") {
                return;
            }

            setScanValue("");
            if (intent.kind === "unknown") {
                setScanFeedback({ kind: "unknown", productCode: intent.productCode });
                recordScanDiagnostic({
                    kind: "unknown",
                    productCode: intent.productCode,
                    message: "No Product is linked to this code.",
                });
                focusScanField();
                return;
            }

            if (intent.kind === "inactive") {
                setScanFeedback({
                    kind: "inactive",
                    productCode: intent.productCode,
                    productName: intent.productName,
                });
                recordScanDiagnostic({
                    kind: "scan-to-cart-failure",
                    productCode: intent.productCode,
                    message: `${intent.productName} is inactive and was not added to the bill.`,
                });
                focusScanField();
                return;
            }

            if (intent.kind === "ambiguous") {
                setScanFeedback({ kind: "ambiguous", productCode: intent.productCode });
                recordScanDiagnostic({
                    kind: "duplicate-assignment",
                    productCode: intent.productCode,
                    message: "Conflicting catalog assignments prevented the scan from resolving.",
                });
                focusScanField();
                return;
            }

            if (intent.kind === "unavailable") {
                setScanFeedback({ kind: "unavailable", message: `${intent.product.name} cannot be added right now.` });
                recordScanDiagnostic({
                    kind: "scan-to-cart-failure",
                    productCode: intent.productCode,
                    message: `${intent.product.name} cannot be added right now.`,
                });
                focusScanField();
                return;
            }

            if (intent.kind === "add") {
                if (intent.retry) {
                    recordScanDiagnostic({
                        kind: "scan-to-cart-failure",
                        productCode: intent.productCode,
                        message: `${intent.product.name} options could not be loaded; the catalog is being retried.`,
                    });
                }
                addProductToBill(intent.product, (quantity) => {
                    window.setTimeout(() => {
                        setScanFeedback({
                            kind: "success",
                            message: `${intent.product.name} added. Quantity ${quantity}.`,
                        });
                        focusScanField();
                    }, 0);
                });
                return;
            }

            handleProductCardClick(intent.product, intent.kind);
            setScanFeedback({ kind: "success", message: `Choose options for ${intent.product.name}.` });
        },
        [
            addProductToBill,
            attachmentsByProductId,
            comboProductsQuery.data?.status,
            comboProductsQuery.isError,
            comboProductsQuery.isPending,
            focusScanField,
            handleProductCardClick,
            inactiveProductCodes,
            preloadedCombos,
            products,
            recordScanDiagnostic,
        ],
    );

    useDirectBarcodeScanCapture({
        enabled:
            isDeviceMode &&
            leftPanelTab === "products" &&
            directBarcodeScanEnabled &&
            !directScanPaused,
        scanFieldRef: scanInputRef,
        onScan: handleProductCodeScan,
    });

    const addConfiguredProductToBill = (product: ProductResponseDTO, addOns: CustomizeAddOnSelection[]) => {
        if (addOns.length === 0) {
            addProductToBill(product);
            return;
        }

        setItems((current) => {
            const portion = catalogDefaultSellingPortion(product);
            const existingConfiguredItem = current.find((item) =>
                isSameComposerConfiguration(item, {
                    productId: product.id,
                    addOns,
                    soldQuantity: portion.soldQuantity,
                }),
            );

            if (existingConfiguredItem) {
                return current.map((item) =>
                    item.key === existingConfiguredItem.key ? { ...item, quantity: item.quantity + 1 } : item,
                );
            }

            return [
                ...current,
                {
                    key: safeRandomUUID(),
                    productId: product.id,
                    name: portion.soldProductName,
                    categoryId: product.categoryId,
                    unitPrice: portion.unitPrice,
                    unitDiscount: portion.unitDiscount,
                    quantity: 1,
                    soldQuantity: portion.soldQuantity,
                    unitLabel: portion.unitLabel,
                    addOns,
                    bundleComponents: [],
                    comboSelections: [],
                },
            ];
        });
    };

    const addConfiguredComboToBill = (combo: ComboProductResponse, selections: ComboDialogSelection[]) => {
        setItems((current) => {
            const portion = catalogDefaultSellingPortion(combo.product);
            const existing = current.find((item) =>
                isSameComposerConfiguration(item, {
                    productId: combo.product.id,
                    addOns: [],
                    comboSelections: selections,
                    soldQuantity: portion.soldQuantity,
                }),
            );
            if (existing) {
                return current.map((item) =>
                    item.key === existing.key ? { ...item, quantity: item.quantity + 1 } : item,
                );
            }
            return [
                ...current,
                {
                    key: safeRandomUUID(),
                    productId: combo.product.id,
                    name: portion.soldProductName,
                    categoryId: combo.product.categoryId,
                    unitPrice: portion.unitPrice,
                    unitDiscount: portion.unitDiscount,
                    quantity: 1,
                    soldQuantity: portion.soldQuantity,
                    unitLabel: portion.unitLabel,
                    addOns: [],
                    bundleComponents: [],
                    comboSelections: selections,
                },
            ];
        });
        setConfigureComboProductId(null);
    };

    const updateItemQuantity = (itemKey: string, nextQuantity: number) => {
        setItems((current) =>
            current.flatMap((item) => {
                if (item.key !== itemKey) {
                    return item;
                }

                if (nextQuantity <= 0) {
                    return [];
                }

                return [{ ...item, quantity: nextQuantity }];
            }),
        );
    };

    const buildDraftPayload = (
        customerId: string | null = selectedCustomerId || null,
    ): CreateDraftSaleJSON => ({
        customerId,
        orderDiscountAmount,
        notes: notes.trim() || null,
        serviceMode,
        generateKot: false,
        items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            soldQuantity: item.soldQuantity,
            addOns: item.addOns.map((addOn) => ({
                addOnId: addOn.addOnId,
                quantity: addOn.quantity,
            })),
            comboSelections: item.comboSelections.map((selection) => ({
                groupId: selection.groupId,
                optionProductId: selection.optionProductId,
                quantity: selection.quantity,
                addOns: selection.addOns.map((addOn) => ({
                    addOnId: addOn.addOnId,
                    quantity: addOn.quantity,
                })),
            })),
        })),
    });

    const buildCommitPayload = (
        customerId: string | null = selectedCustomerId || null,
    ): CommitSaleJSON => ({
        customerId,
        orderDiscountAmount,
        notes: notes.trim() || null,
        serviceMode,
        generateKot: false,
        items: buildDraftPayload(customerId).items,
        payments:
            settlementMode === "due"
                ? []
                : [
                      {
                          amount: settlementMode === "full" ? grandTotal : rawPartialPaymentAmount,
                          method: selectedPaymentMethod,
                          referenceNumber: null,
                          notes: null,
                      },
                  ],
    });

    const resolveCheckoutCustomerId = async (): Promise<string | null> => {
        const resolution = resolveCheckoutCustomer({
            phone: checkoutPhone,
            name: checkoutName,
            selectedCustomer: selectedCustomer ?? null,
            lookupCustomers: checkoutPhoneLookup
                ? checkoutCustomerLookupQuery.isFetched
                    ? (checkoutLookupCustomers ?? [])
                    : undefined
                : [],
            isLookupLoading:
                Boolean(checkoutPhoneLookup) &&
                checkoutCustomerLookupQuery.isFetching &&
                !(selectedCustomer && toCheckoutPhoneInput(selectedCustomer.phone) === checkoutPhone),
        });

        if (resolution.status === "blocked") {
            throw new Error(resolution.reason);
        }
        if (resolution.status === "looking_up") {
            throw new Error("Finding customer…");
        }
        if (resolution.status === "walk_in") {
            return null;
        }
        if (resolution.status === "existing") {
            return resolution.customer.id;
        }

        const response = isDeviceMode
            ? await createPosCustomer({
                  name: resolution.name,
                  phone: resolution.phone,
                  isActive: true,
              })
            : await createCustomer(organizationId, {
                  name: resolution.name,
                  phone: resolution.phone,
                  isActive: true,
              });

        if (response.status !== "success" || !response.data?.customer) {
            throw new Error(response.message || "Failed to create customer");
        }

        const customer = response.data.customer;
        setSelectedCustomerId(customer.id);
        setSelectedCustomerFallback(customer);
        setCheckoutName(customer.name);
        setCheckoutPhone(toCheckoutPhoneInput(customer.phone));
        queryClient.invalidateQueries({ queryKey: billingKeys.organization(organizationId) });
        return customer.id;
    };

    const createCustomerMutation = useMutation({
        mutationFn: (payload: CreateCustomerJSON) =>
            isDeviceMode ? createPosCustomer(payload) : createCustomer(organizationId, payload),
        onSuccess: (response) => {
            if (response.status !== "success" || !response.data?.customer) {
                toast.error(response.message || "Failed to create customer");
                return;
            }

            queryClient.invalidateQueries({ queryKey: billingKeys.organization(organizationId) });
            selectCustomer(response.data.customer);
            toast.success("Customer created");
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to create customer");
        },
    });

    const saveDraftMutation = useMutation({
        mutationFn: async () => {
            if (!selectedStoreId) {
                throw new Error(isDeviceMode ? "Store session is missing" : "Select a store first");
            }

            if (items.length === 0) {
                throw new Error("Add at least one product before saving a draft");
            }

            if (hasInvalidDiscount) {
                throw new Error(discountValidationMessage || "Enter a valid discount");
            }

            const customerId = await resolveCheckoutCustomerId();
            const payload = buildDraftPayload(customerId);
            const response = activeDraftId
                ? isDeviceMode
                    ? await updatePosDraftSale(activeDraftId, payload as UpdateDraftSaleJSON)
                    : await updateDraftSale(
                          organizationId,
                          selectedStoreId,
                          activeDraftId,
                          payload as UpdateDraftSaleJSON,
                      )
                : isDeviceMode
                  ? await createPosDraftSale(payload)
                  : await createDraftSale(organizationId, selectedStoreId, payload);

            if (response.status !== "success" || !response.data?.sale) {
                throw new Error(response.message || "Failed to save draft");
            }

            return response.data.sale;
        },
        onSuccess: (sale) => {
            invalidateBillingQueries();
            resetComposer();
            toast.success(sale.status === "draft" ? "Draft saved" : "Bill updated");
            if (isDeviceMode && shouldReturnToPosTablesAfterSale(sale)) {
                onPanelTabChange?.("tables");
            }
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to save draft");
        },
    });

    const completeSaleMutation = useMutation({
        mutationFn: async ({ requestId }: { requestId: string; shouldPrint: boolean; shouldSendWhatsApp: boolean }) => {
            if (!selectedStoreId) {
                throw new Error(isDeviceMode ? "Store session is missing" : "Select a store first");
            }

            const customerId = await resolveCheckoutCustomerId();

            if (items.length === 0) {
                throw new Error("Add at least one product before completing the bill");
            }

            if (hasInvalidDiscount) {
                throw new Error(discountValidationMessage || "Enter a valid discount");
            }

            if (isOverpaid) {
                throw new Error("Collected amount cannot exceed the bill total");
            }

            if (settlementMode === "partial" && isPartialAmountMissing) {
                throw new Error("Enter the amount the customer is paying now");
            }

            if (matchesFullPayment) {
                throw new Error("Select 'Paid' when the customer is paying the full bill amount");
            }

            if (replacingSaleId) {
                const response = await replacePosSale(replacingSaleId, {
                    requestId,
                    ...buildDraftPayload(customerId),
                    ...buildCommitPayload(customerId),
                    replacementReason: "Edited after bill change",
                } satisfies ReplaceSaleJSON);

                if (response.status !== "success" || !response.data?.sale) {
                    throw new Error(response.message || "Failed to edit bill");
                }

                return response.data.sale;
            }

            if (activeDraftId) {
                const response = isDeviceMode
                    ? await commitPosSale(activeDraftId, buildCommitPayload(customerId))
                    : await commitSale(organizationId, selectedStoreId, activeDraftId, buildCommitPayload(customerId));

                if (response.status !== "success" || !response.data?.sale) {
                    throw new Error(response.message || "Failed to complete bill");
                }

                return response.data.sale;
            }

            if (isDeviceMode) {
                const payload: CompleteSaleJSON = {
                    requestId,
                    ...buildDraftPayload(customerId),
                    payments: buildCommitPayload(customerId).payments,
                };
                const response = await completePosSale(payload);

                if (response.status !== "success" || !response.data?.sale) {
                    throw new Error(response.message || "Failed to complete bill");
                }

                return response.data.sale;
            }

            const draftPayload = buildDraftPayload(customerId);
            const draftResponse = await createDraftSale(organizationId, selectedStoreId, draftPayload);

            if (draftResponse.status !== "success" || !draftResponse.data?.sale) {
                throw new Error(draftResponse.message || "Failed to prepare bill");
            }

            const commitResponse = isDeviceMode
                ? await commitPosSale(draftResponse.data.sale.id, buildCommitPayload(customerId))
                : await commitSale(organizationId, selectedStoreId, draftResponse.data.sale.id, buildCommitPayload(customerId));

            if (commitResponse.status !== "success" || !commitResponse.data?.sale) {
                throw new Error(commitResponse.message || "Failed to complete bill");
            }

            return commitResponse.data.sale;
        },
        onSuccess: (sale, variables) => {
            const wasReplacing = Boolean(replacingSaleId);
            completionRequestRef.current = null;
            invalidateBillingQueries();
            setPlaceOrderDialogOpen(false);
            setMobileCartOpen(false);
            resetComposer();
            if (variables.shouldPrint) {
                if (isDeviceMode) {
                    if (!posPrinter?.supported) {
                        toast.error("WebUSB is unavailable; use Chrome or Edge on localhost or HTTPS");
                    } else if (!posPrinter.connected) {
                        toast.error("Connect the USB receipt printer before printing");
                    } else {
                        void posPrinter.printSale(sale, receiptContext)
                            .then(() => toast.success("Receipt sent to printer"))
                            .catch((error: { message?: string }) => {
                                toast.error(error?.message || "Receipt printing failed");
                            });
                    }
                } else {
                    setReceiptToPrint(sale);
                }
            }
            if (variables.shouldSendWhatsApp && !wasReplacing) {
                const queueRequest = isDeviceMode
                    ? queuePosWhatsAppInvoice(sale.id)
                    : queueWhatsAppInvoice(organizationId, selectedStoreId, sale.id);
                void queueRequest.then(response => {
                    queryClient.invalidateQueries({
                        queryKey: isDeviceMode
                            ? whatsappKeys.posInvoice(sale.id)
                            : whatsappKeys.invoice(organizationId, selectedStoreId, sale.id),
                    });
                    if (response.status === "success") {
                        toast.success("Invoice queued for WhatsApp");
                    } else {
                        toast.error(response.message || "Invoice could not be queued for WhatsApp");
                    }
                }).catch((error: { message?: string }) => {
                    toast.error(error?.message || "Invoice could not be queued for WhatsApp");
                });
            }
            toast.success(
                wasReplacing
                    ? `Bill ${sale.saleNumber ?? ""} edited`
                    : `Bill ${sale.saleNumber ?? ""} completed`,
            );
            if (!wasReplacing && isDeviceMode && shouldReturnToPosTablesAfterSale(sale)) {
                onPanelTabChange?.("tables");
            }
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to complete bill");
        },
    });

    const submitCompleteSale = () => {
        const shouldPrint = invoiceActions.includes("print");
        const shouldSendWhatsApp = invoiceActions.includes("whatsapp");
        const fingerprint = JSON.stringify({
            ...buildDraftPayload(),
            payments: buildCommitPayload().payments,
        });
        const existingRequest = completionRequestRef.current;
        const requestId = existingRequest?.fingerprint === fingerprint ? existingRequest.requestId : safeRandomUUID();
        completionRequestRef.current = { requestId, fingerprint };
        completeSaleMutation.mutate({ requestId, shouldPrint, shouldSendWhatsApp });
    };

    const handleCompleteSale = () => {
        if (replacingSaleId) {
            setReplaceConfirmationOpen(true);
            return;
        }

        submitCompleteSale();
    };

    const loadSaleIntoComposer = useCallback((sale: SaleDetailDTO, editSaleId: string | null) => {
        setReplacingSaleId(editSaleId);
        setActiveDraftId(editSaleId ? null : sale.id);
        setSelectedCustomerId(sale.customerId ?? "");
        setSelectedCustomerFallback(null);
        setCheckoutPhone(toCheckoutPhoneInput(sale.customer?.phone));
        setCheckoutName(sale.customer?.name ?? "");
        setCustomerSearch(sale.customer?.phone || sale.customer?.name || "");
        setNotes(sale.notes ?? "");
        setServiceMode(sale.serviceMode ?? "dine_in");
        setItems(
            sale.items.map((item) => ({
                key: item.id,
                productId: item.productId,
                name: item.productNameSnapshot,
                categoryId: "",
                unitPrice: Number(item.unitPriceSnapshot),
                unitDiscount: getComposerUnitDiscountFromSaleItem(item),
                quantity: Number(item.quantity),
                soldQuantity: Number(item.soldQuantity ?? 1),
                unitLabel: item.unitLabelSnapshot ?? "pc",
                addOns: (item.addOns ?? []).map((addOn) => ({
                    addOnId: addOn.addOnId,
                    name: addOn.addOnNameSnapshot,
                    unitPrice: Number(addOn.unitPriceSnapshot),
                    unitDiscount: Number(addOn.unitDiscountSnapshot),
                    quantity: Number(addOn.quantityPerParent),
                })),
                bundleComponents: (item.bundleComponents ?? []).map((component) => ({
                    id: component.id,
                    componentProductId: component.componentProductId,
                    name: component.productNameSnapshot,
                    quantityPerBundle: Number(component.quantityPerBundle),
                    priceAdjustment: Number(component.priceAdjustmentSnapshot ?? 0),
                    addOns: (component.addOns ?? []).map((addOn) => ({
                        addOnId: addOn.addOnId,
                        name: addOn.addOnNameSnapshot,
                        quantity: Number(addOn.quantityPerComponent),
                        unitPrice: Number(addOn.unitPriceSnapshot),
                        unitDiscount: Number(addOn.unitDiscountSnapshot),
                    })),
                })),
                comboSelections: (item.bundleComponents ?? [])
                    .filter((component) => Boolean(component.choiceGroupId))
                    .map((component) => ({
                        groupId: component.choiceGroupId!,
                        optionProductId: component.componentProductId,
                        optionName: component.productNameSnapshot,
                        quantity: Number(component.quantityPerBundle),
                        priceAdjustment: Number(component.priceAdjustmentSnapshot ?? 0),
                        addOns: (component.addOns ?? []).map((addOn) => ({
                            addOnId: addOn.addOnId,
                            name: addOn.addOnNameSnapshot,
                            unitPrice: Number(addOn.unitPriceSnapshot),
                            unitDiscount: Number(addOn.unitDiscountSnapshot),
                            quantity: Number(addOn.quantityPerComponent),
                        })),
                    })),
            })),
        );
        setSettlementMode("full");
        setBillingAdjustmentsOpen(
            Number(sale.orderDiscountAmount) > 0 ? true : false,
            { persist: false },
        );
        setSelectedPaymentMethod("cash");
        setPartialPaymentAmount("");
        setDiscountInput(Number(sale.orderDiscountAmount) > 0 ? String(sale.orderDiscountAmount) : "");
        setDiscountMode("amount");
        setLeftPanelTab("products");
    }, [getComposerUnitDiscountFromSaleItem]);

    useEffect(() => {
        if (!placeOrderDialogOpen || !organizationId) {
            return;
        }

        if (orderDiscountAmount > 0) {
            setBillingAdjustmentsOpenState(true);
            return;
        }

        const stored = readCheckoutBillingAdjustmentsOpen(organizationId);
        if (stored !== null) {
            setBillingAdjustmentsOpenState(stored);
        }
    }, [organizationId, orderDiscountAmount, placeOrderDialogOpen]);

    useEffect(() => {
        if (!pendingComposerHandoff) {
            consumedComposerHandoffRef.current = null;
            return;
        }

        const handoffKey = `${pendingComposerHandoff.sale.id}:${pendingComposerHandoff.editSaleId ?? "resume"}`;
        if (consumedComposerHandoffRef.current === handoffKey) {
            return;
        }

        consumedComposerHandoffRef.current = handoffKey;
        loadSaleIntoComposer(pendingComposerHandoff.sale, pendingComposerHandoff.editSaleId);
        setMobileCartOpen(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        onComposerHandoffConsumed?.();
        toast.success(
            pendingComposerHandoff.editSaleId
                ? "Bill loaded for editing"
                : "Draft loaded into the composer",
        );
    }, [loadSaleIntoComposer, onComposerHandoffConsumed, pendingComposerHandoff]);

    const handleEditSale = (sale: SaleDetailDTO) => {
        if (isDeviceMode && onPanelTabChange) {
            onPanelTabChange("products", { sale, editSaleId: sale.id });
        } else {
            loadSaleIntoComposer(sale, sale.id);
            setMobileCartOpen(true);
        }
        setSaleDialogOpen(false);
        setSelectedSaleId(null);
        if (!isDeviceMode || !onPanelTabChange) {
            toast.success("Bill loaded for editing");
        }
    };

    const resumeDraftMutation = useMutation({
        mutationFn: async (saleId: string) => {
            if (!selectedStoreId) {
                throw new Error(isDeviceMode ? "Store session is missing" : "Select a store first");
            }

            const response = isDeviceMode
                ? await getPosSale(saleId)
                : await getSale(organizationId, selectedStoreId, saleId);
            if (response.status !== "success" || !response.data?.sale) {
                throw new Error(response.message || "Failed to load draft");
            }

            return response.data.sale;
        },
        onSuccess: (sale) => {
            if (isDeviceMode && onPanelTabChange) {
                onPanelTabChange("products", { sale, editSaleId: null });
                return;
            }

            loadSaleIntoComposer(sale, null);
            setMobileCartOpen(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
            toast.success("Draft loaded into the composer");
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to load draft");
        },
        onSettled: () => {
            setResumingDraftId(null);
        },
    });

    const deleteDraftMutation = useMutation({
        mutationFn: async (saleId: string) => {
            if (!isDeviceMode) {
                throw new Error("Draft deletion is available only in POS mode");
            }

            const response = await deletePosDraftSale(saleId);
            if (response.status !== "success") {
                throw new Error(response.message || "Failed to delete draft");
            }

            return saleId;
        },
        onSuccess: (saleId) => {
            invalidateBillingQueries();
            if (activeDraftId === saleId) {
                resetComposer();
            }
            setDraftToDeleteId(null);
            toast.success("Draft deleted");
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to delete draft");
        },
    });

    const cartQuantities = useMemo(() => {
        const quantities = new Map<string, number>();
        for (const item of items) {
            quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
        }
        return quantities;
    }, [items]);

    const setStore = (storeId: string | null) => {
        if (isDeviceMode || hideStoreSwitcher || fixedStoreId || !storeId) {
            return;
        }

        startTransition(() => {
            setSearchParams({ storeId });
        });
        resetComposer();
    };

    if (!isDeviceMode && organizationQuery.isPending) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (!isDeviceMode && (organizationQuery.isError || organizationQuery.data?.status === "error" || !organization)) {
        return (
            <div className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-xl shadow-black/5">
                <p className="font-display text-2xl font-semibold text-foreground">Billing workspace unavailable</p>
                <p className="mt-2 text-sm text-muted-foreground">
                    {organizationQuery.data?.message ||
                        (organizationQuery.error as { message?: string })?.message ||
                        "This organization could not be loaded."}
                </p>
                <Button variant="outline" className="mt-4 rounded-full" render={<Link to="/organizations" />}>
                    Back to organizations
                </Button>
            </div>
        );
    }

    if (!selectedStore && organizationStores.length === 0) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                    render={<Link to={getOrganizationWorkspacePath(organizationId)} />}
                >
                    <ArrowLeft className="size-4" />
                    Back to organization
                </Button>

                <div className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-xl shadow-black/5">
                    <h1 className="font-display text-3xl font-semibold text-foreground">
                        Add a store before starting billing.
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Billing is store-scoped. Once a store exists, this screen becomes the POS billing surface.
                    </p>
                    <Button
                        className="mt-4 rounded-full"
                        render={<Link to={getOrganizationWorkspacePath(organizationId)} />}
                    >
                        Go to store setup
                    </Button>
                </div>
            </div>
        );
    }

    const panelMaxHeight = isDeviceMode
        ? "calc(100dvh - var(--pos-header-height, 3.5rem) - env(safe-area-inset-top, 0px) - var(--pos-mobile-nav-height, 0px))"
        : "calc(100dvh - 3.5rem)";

    return (
        <BillingWorkspaceLayout
            leftRef={salesScrollContainerRef}
            leftMaxHeight={panelMaxHeight}
            leftClassName={
                canMutate && leftPanelTab === "products"
                    ? "flex flex-col overflow-hidden pl-4 pt-2 pr-0 max-lg:pb-2 lg:pb-4"
                    : "overflow-y-auto p-4 max-lg:pb-2 lg:pb-4"
            }
            left={
                canMutate && leftPanelTab === "reports" ? (
                    <div className="min-h-full p-4 max-lg:pb-2 lg:p-6 lg:pb-6">
                        {session ? <ProductSalesSummary mode="pos" storeName={session.store.name} /> : null}
                    </div>
                ) : canMutate && leftPanelTab === "products" ? (
                    <BillingProductsPanel
                        categories={categoryOptions}
                        categoryFilter={activeCategoryFilter}
                        onCategoryChange={setCategoryFilter}
                        swipeHandlers={categorySwipeHandlers}
                        isPending={productsQuery.isPending}
                        products={filteredProducts}
                        cartQuantities={cartQuantities}
                        attachmentsByProductId={attachmentsByProductId}
                        combos={preloadedCombos}
                        combosPending={comboProductsQuery.isPending}
                        combosFailed={comboProductsQuery.isError || comboProductsQuery.data?.status === "error"}
                        onProductClick={(product, action) => {
                            if (action === "retry") {
                                addProductToBill(product);
                                return;
                            }
                            handleProductCardClick(product, action);
                        }}
                        scanSlot={
                            barcodeScanningEnabled ? (
                                <BillingScanPanel
                                    scanInputRef={scanInputRef}
                                    scanValue={scanValue}
                                    onScanValueChange={setScanValue}
                                    onSubmitScan={handleProductCodeScan}
                                    directScanEnabled={directBarcodeScanEnabled}
                                    directScanPaused={directScanPaused}
                                    onToggleDirectScanPaused={() => setDirectScanPaused((paused) => !paused)}
                                    canEnableDirectScan={canEnableDirectBarcodeScan}
                                    onRequestEnableDirectScan={() => setDirectScanActivationOpen(true)}
                                    onDisableDirectScan={() => updateDirectScanMutation.mutate(false)}
                                    directScanPending={updateDirectScanMutation.isPending}
                                    activeProductCodesCount={activeProductCodesCount}
                                    scanFeedback={scanFeedback}
                                    onClearScanFeedback={() => setScanFeedback(null)}
                                    onUseTopSearch={() => {
                                        onProductSearchChange?.("");
                                        document
                                            .querySelector<HTMLInputElement>('input[aria-label="Search products..."]')
                                            ?.focus();
                                    }}
                                    onSendToAdministrator={(productCode) => {
                                        enqueueUnknownProductCode({
                                            productCode,
                                            organizationId,
                                            storeId: selectedStoreId,
                                            deviceId: session?.device.id ?? null,
                                        });
                                        setScanFeedback(null);
                                        toast.success("Queued for an administrator. The catalog was not changed.");
                                    }}
                                    scanDiagnostics={scanDiagnostics}
                                    onClearDiagnostics={() => {
                                        setScanDiagnostics([]);
                                        if (scanDiagnosticStorageKey) {
                                            try {
                                                window.sessionStorage.removeItem(scanDiagnosticStorageKey);
                                            } catch {
                                                // Clearing the visible session state is sufficient when storage is unavailable.
                                            }
                                        }
                                    }}
                                />
                            ) : null
                        }
                    />
                ) : canMutate && leftPanelTab === "customers" ? (
                    <CustomerDirectory
                        mode="device"
                        organizationId={organizationId}
                        storeId={selectedStoreId}
                        selectedCustomerId={selectedCustomerId}
                        searchValue={customerSearchProp}
                        onSearchChange={onCustomerSearchChange}
                        onUseForOrder={(customer) => {
                            setSelectedCustomerId(customer.id);
                            setSelectedCustomerFallback(customer);
                            setCustomerSearch(customer.phone || customer.name);
                            onPanelTabChange?.("products");
                        }}
                    />
                ) : (
                    <BillingBillsPanel
                        store={{
                            showStoreSwitcher: !isDeviceMode && !hideStoreSwitcher,
                            stores: organizationStores,
                            selectedStoreId,
                            onStoreChange: setStore,
                        }}
                        toolbar={{
                            paymentMethodSelection,
                            onPaymentMethodSelectionChange: setPaymentMethodSelection,
                            sortBy,
                            onSortChange: setSortBy,
                            hasToolbarFilters: hasBillsToolbarFilters,
                            onClearToolbarFilters: clearBillsToolbarFilters,
                            toolbarFilterCount: billsSheetFilterCount,
                        }}
                        date={{
                            applied: {
                                mode: appliedDateFilter,
                                preset: appliedDatePreset,
                                specificDate: appliedSpecificDate,
                                fromDate: appliedCustomFromDate,
                                toDate: appliedCustomToDate,
                            },
                            popoverOpen: salesDatePopoverOpen,
                            onPopoverOpenChange: handleSalesDatePopoverOpenChange,
                            onShiftDate: shiftSalesDate,
                            filter: dateFilter,
                            onFilterChange: setSalesDateMode,
                            preset: datePreset,
                            onPresetSelect: applySalesDatePreset,
                            specificDate,
                            onSpecificDateChange: (nextDate) => {
                                setSpecificDate(nextDate);
                                setDatePreset("custom");
                            },
                            customFromDate,
                            customToDate,
                            onCustomRangeChange: (from, to) => {
                                setDatePreset("custom");
                                setCustomFromDate(from);
                                setCustomToDate(to);
                            },
                            onConfirm: confirmSalesDateFilter,
                        }}
                        mobileFilters={{
                            open: mobileBillsFiltersOpen,
                            onOpenChange: handleMobileBillsFiltersOpenChange,
                            draftStoreId: draftSelectedStoreId,
                            onDraftStoreChange: setDraftSelectedStoreId,
                            draftPaymentMethodSelection,
                            onDraftPaymentToggle: (value) => {
                                setDraftPaymentMethodSelection((prev) => {
                                    const next = new Set(prev);
                                    const method = value as BillPaymentMethod;
                                    if (next.has(method)) {
                                        next.delete(method);
                                    } else {
                                        next.add(method);
                                    }
                                    return next;
                                });
                            },
                            onDraftPaymentClear: () => setDraftPaymentMethodSelection(new Set()),
                            draftSortBy,
                            onDraftSortChange: setDraftSortBy,
                            draftFilterCount: draftBillsFilterCount,
                            onClearDraftFilters: clearDraftBillsFilters,
                            onApply: applyMobileBillsFilters,
                        }}
                        list={{
                            summary: salesSummary,
                            sales: filteredSales,
                            needsDateRange: dateRangeNeedsInput,
                            isPending: salesQuery.isPending,
                            isError: salesPages.length === 0 && (salesQuery.isError || Boolean(salesServiceError)),
                            errorMessage: salesServiceError || "Please refresh the page.",
                            footer: salesLoadMoreFooter,
                            canMutate,
                            resumingDraftId,
                            resumePending: resumeDraftMutation.isPending,
                            deletePending: deleteDraftMutation.isPending,
                            onResumeDraft: (saleId) => {
                                setResumingDraftId(saleId);
                                resumeDraftMutation.mutate(saleId);
                            },
                            onDeleteDraft: setDraftToDeleteId,
                            onOpenSale: (saleId) => {
                                setSelectedSaleId(saleId);
                                setSaleDialogOpen(true);
                            },
                        }}
                    />
                )
            }
            right={
                canMutate && leftPanelTab === "products" ? (
                    <BillingCartAside
                        cart={{
                            items,
                            itemCount: cartItemCount,
                            onClear: resetComposer,
                            onUpdateQuantity: updateItemQuantity,
                        }}
                        totals={{
                            grandTotal,
                            subtotal,
                            lineDiscountTotal,
                            lineDiscountPercentage: itemDiscountPercentage,
                            orderDiscountAmount,
                            orderDiscountPercentage,
                            dueTotal: displayedDueTotal,
                        }}
                        actions={{
                            mobileOpen: mobileCartOpen,
                            onMobileOpenChange: setMobileCartOpen,
                            maxHeight: panelMaxHeight,
                            isReplacingSale,
                            saveLabel: activeDraftId ? "Update draft" : "Save draft",
                            saveDisabled: hasInvalidDiscount || hasInvalidCheckoutCustomer,
                            savePending: saveDraftMutation.isPending,
                            completePending: completeSaleMutation.isPending,
                            onSaveDraft: () => saveDraftMutation.mutate(),
                            onPlaceOrder: () => setPlaceOrderDialogOpen(true),
                            onCancelEdit: resetComposer,
                        }}
                    />
                ) : null
            }
        >
            {receiptToPrint ? (
                <span className="sr-only" aria-live="polite">
                    Preparing receipt for printing
                </span>
            ) : null}

            <BillingPlaceOrderDialog
                open={placeOrderDialogOpen}
                onOpenChange={(open) => {
                    setPlaceOrderDialogOpen(open);
                    if (!open) {
                        setCustomerPickerOpen(false);
                        setCustomerCreateOpen(false);
                        setCustomerSearch("");
                        setNewCustomerName("");
                        setNewCustomerPhone("");
                        setBillingAdjustmentsOpen(false, { persist: false });
                    }
                }}
                cartItemCount={cartItemCount}
                customer={{
                    pickerOpen: customerPickerOpen,
                    createOpen: customerCreateOpen,
                    onBack: () => {
                        if (customerCreateOpen) {
                            setCustomerCreateOpen(false);
                            setNewCustomerName("");
                            setNewCustomerPhone("");
                        } else {
                            closeCustomerPicker();
                        }
                    },
                    checkoutPhone,
                    checkoutName,
                    resolution: checkoutResolution,
                    onCheckoutPhoneChange: handleCheckoutPhoneChange,
                    onCheckoutNameChange: setCheckoutName,
                    onOpenPicker: openCustomerPicker,
                    search: customerSearch,
                    onSearchChange: setCustomerSearch,
                    selectedCustomer: selectedCustomer ?? null,
                    customers: filteredCustomers,
                    onSelectCustomer: selectCustomer,
                    onOpenCreate: openCustomerCreate,
                    newCustomerPhone,
                    onNewCustomerPhoneChange: setNewCustomerPhone,
                    newCustomerName,
                    onNewCustomerNameChange: setNewCustomerName,
                    createPending: createCustomerMutation.isPending,
                    onCreateCustomer: (payload) => createCustomerMutation.mutate(payload),
                    onClosePicker: closeCustomerPicker,
                }}
                discount={{
                    adjustmentsOpen: billingAdjustmentsOpen,
                    onToggleAdjustments: () => setBillingAdjustmentsOpen((open) => !open),
                    orderDiscountAmount,
                    orderDiscountPercentage,
                    discountInput,
                    onDiscountInputChange: setDiscountInput,
                    discountMode,
                    onDiscountModeChange: changeDiscountMode,
                    presetOptions: discountPresetOptions,
                    onApplyPreset: applyDiscountPreset,
                    onRemove: removeOrderDiscount,
                    validationMessage: discountValidationMessage,
                }}
                settlement={{
                    mode: settlementMode,
                    onModeChange: setSettlementMode,
                    paymentMethod: selectedPaymentMethod,
                    onPaymentMethodChange: setSelectedPaymentMethod,
                    partialPaymentAmount,
                    onPartialPaymentAmountChange: setPartialPaymentAmount,
                    isOverpaid,
                    isPartialAmountMissing,
                    matchesFullPayment,
                }}
                serviceMode={serviceMode}
                onServiceModeChange={setServiceMode}
                invoiceActions={invoiceActions}
                onToggleInvoiceAction={toggleInvoiceAction}
                completePending={completeSaleMutation.isPending}
                totals={{
                    itemCount: cartItemCount,
                    subtotal,
                    lineDiscountTotal,
                    lineDiscountPercentage: itemDiscountPercentage,
                    grandTotal,
                    dueTotal: displayedDueTotal,
                }}
                onCancel={() => setPlaceOrderDialogOpen(false)}
                onPlaceOrder={handleCompleteSale}
                placeOrderDisabled={hasInvalidDiscount || hasInvalidCheckoutCustomer || hasInvalidPartialPayment}
            />

            <AlertDialog open={replaceConfirmationOpen} onOpenChange={setReplaceConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Edit this bill?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will save your changes as a new bill and mark the old bill as voided. Existing
                            payments on the old bill will remain attached to it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={completeSaleMutation.isPending}
                            className="rounded-xl"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            isLoading={completeSaleMutation.isPending}
                            loadingText="Editing..."
                            className="rounded-xl"
                            onClick={() => {
                                setReplaceConfirmationOpen(false);
                                submitCompleteSale();
                            }}
                        >
                            Edit bill
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={directScanActivationOpen} onOpenChange={setDirectScanActivationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Enable direct barcode scan on this device?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This changes only {session?.device.name ?? "this POS device"}. It does not enable scanner capture on other counters.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Confirm before enabling:</p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>At least one active Product Code is assigned and resolves from this POS catalog.</li>
                            <li>The USB or Bluetooth HID scanner is configured to send an Enter suffix.</li>
                            <li>A printed internal label has been test-scanned using this counter&apos;s scanner, printer, and label stock when internal labels are used.</li>
                            <li>The cashier knows to pause direct scan before ordinary typing, and to use manual search after an unknown code.</li>
                        </ul>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={updateDirectScanMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={!canEnableDirectBarcodeScan || updateDirectScanMutation.isPending}
                            isLoading={updateDirectScanMutation.isPending}
                            loadingText="Enabling..."
                            onClick={() => {
                                setDirectScanActivationOpen(false);
                                updateDirectScanMutation.mutate(true);
                            }}
                        >
                            Enable on this device
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <CustomizeProductDialog
                key={`${customizeProductId ?? "customize-dialog"}-${customizeProductId ? "open" : "closed"}`}
                open={Boolean(customizeProductId)}
                onOpenChange={(open) => {
                    if (!open) {
                        setCustomizeProductId(null);
                        focusScanField();
                    }
                }}
                product={customizeProduct}
                attachments={customizeAttachments}
                onConfirm={addConfiguredProductToBill}
            />

            <ConfigureComboDialog
                key={`${configureComboProductId ?? "combo-dialog"}-${configureCombo ? "loaded" : "loading"}`}
                open={Boolean(configureComboProductId && !comboUnavailable)}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfigureComboProductId(null);
                        focusScanField();
                    }
                }}
                combo={configureCombo}
                attachmentsByProductId={attachmentsByProductId}
                onConfirm={addConfiguredComboToBill}
            />

            <AlertDialog
                open={Boolean(draftToDeleteId)}
                onOpenChange={(open) => {
                    if (!open && !deleteDraftMutation.isPending) {
                        setDraftToDeleteId(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This draft and its saved items will be permanently removed. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteDraftMutation.isPending} className="rounded-xl">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            isLoading={deleteDraftMutation.isPending}
                            loadingText="Deleting..."
                            className="rounded-xl"
                            onClick={() => {
                                if (draftToDeleteId) {
                                    deleteDraftMutation.mutate(draftToDeleteId);
                                }
                            }}
                        >
                            Delete draft
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <SaleDetailDialog
                key={selectedSaleId ?? "sale-detail-dialog"}
                open={saleDialogOpen}
                onOpenChange={setSaleDialogOpen}
                mode={mode}
                organizationId={organizationId}
                storeId={selectedStoreId}
                saleId={selectedSaleId}
                receiptContext={receiptContext}
                onEdit={handleEditSale}
            />
        </BillingWorkspaceLayout>
    );
};

export default BillingPage;
