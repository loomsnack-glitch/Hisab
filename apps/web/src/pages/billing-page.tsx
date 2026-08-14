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
    SalesListSummary,
    SaleDetailDTO,
    SaleSummaryDTO,
    UpdateDraftSaleJSON,
} from "@repo/types";
import { normalizePhoneNumber } from "@repo/types";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@repo/ui/components/dialog";
import { Calendar as DateCalendar } from "@repo/ui/components/calendar";
import { Input } from "@repo/ui/components/input";
import { PhoneInput } from "@repo/ui/components/phone-input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import {
    ArrowLeft,
    ArrowUpDown,
    Barcode,
    BarChart3,
    Calendar,
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    Filter,
    LayoutGrid,
    MoreHorizontal,
    Minus,
    Pause,
    Plus,
    Play,
    Printer,
    ReceiptText,
    Search,
    ShoppingBag,
    ShoppingCart,
    Store,
    Trash2,
    User,
    Users,
    X,
    Link2,
} from "lucide-react";
import { toast } from "sonner";

import CustomerDirectory from "@/components/customers/customer-directory";
import AppVersionBadge from "@/components/app-version-badge";
import CustomizeProductDialog, { type CustomizeAddOnSelection } from "@/components/billing/customize-product-dialog";
import ConfigureComboDialog, { type ComboDialogSelection } from "@/components/billing/configure-combo-dialog";
import SaleDetailDialog from "@/components/billing/sale-detail-dialog";
import WhatsAppIcon from "@/components/icons/whatsapp-icon";
import ProductPriceDisplay from "@/components/catalog/product-price-display";
import PosPurchasesPanel from "@/components/purchases/pos-purchases-panel";
import ProductSalesSummary from "@/components/reports/product-sales-summary";
import type { BillingWorkspaceMode } from "@/lib/billing-mode";
import type { PosComposerHandoff } from "@/pages/pos-route-context";
import { billingKeys, catalogKeys, organizationKeys, whatsappKeys } from "@/lib/query-keys";
import { formatCurrency, formatDateTime, formatDiscountPercentage, formatLongDate } from "@/lib/format";
import { getComposerItemPricing } from "@/lib/combo-pricing";
import { buildReceiptText } from "@/lib/receipt-text";
import { printReceiptText } from "@/lib/print-receipt-text";
import {
    getProductCardAction,
    getProductCardActionLabel,
    type ProductCardAction,
} from "@/lib/product-card-interaction";
import {
    appendScanDiagnostic,
    consumeDirectBarcodeScanKey,
    formatScanDiagnostics,
    incrementPlainProductQuantity,
    resolveProductCodeScan,
    shouldCaptureDirectBarcodeScan,
    type InactiveProductCode,
    type ScanDiagnostic,
} from "@/lib/barcode-scanning";
import { safeRandomUUID } from "@/lib/uuid";
import { useOptionalPosPrinter } from "@/providers/pos-printer-provider";

type ComposerAddOn = CustomizeAddOnSelection;

type ComposerBundleComponentAddOn = {
    addOnId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    unitDiscount: number;
};

type ComposerBundleComponent = {
    id: string;
    componentProductId: string;
    name: string;
    quantityPerBundle: number;
    priceAdjustment: number;
    addOns: ComposerBundleComponentAddOn[];
};

type ComposerComboSelection = ComboDialogSelection;

type ComposerItem = {
    key: string;
    productId: string;
    name: string;
    categoryId: string;
    unitPrice: number;
    unitDiscount: number;
    quantity: number;
    addOns: ComposerAddOn[];
    bundleComponents: ComposerBundleComponent[];
    comboSelections: ComposerComboSelection[];
};

type ScanFeedback =
    | { kind: "success"; message: string }
    | { kind: "unknown"; productCode: string }
    | { kind: "inactive"; productCode: string; productName: string }
    | { kind: "ambiguous"; productCode: string }
    | { kind: "unavailable"; message: string };

type ProductLookupMode = "scan" | "search";

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

const isEditableFocusTarget = (element: Element | null) =>
    Boolean(
        element?.closest(
            'input, textarea, select, [contenteditable="true"], [role="combobox"], [role="textbox"]',
        ),
    );

const buildComposerConfigurationSignature = (addOns: ComposerAddOn[]) => {
    const selected = addOns.filter((addOn) => addOn.quantity > 0);
    if (selected.length === 0) {
        return "";
    }

    return [...selected]
        .sort((left, right) => left.addOnId.localeCompare(right.addOnId))
        .map((addOn) => `${addOn.addOnId}:${addOn.quantity}`)
        .join("|");
};

const buildComboConfigurationSignature = (selections: ComposerComboSelection[]) =>
    [...selections]
        .sort((left, right) =>
            `${left.groupId}:${left.optionProductId}`.localeCompare(`${right.groupId}:${right.optionProductId}`),
        )
        .map(
            (selection) =>
                `${selection.groupId}:${selection.optionProductId}:${selection.quantity}:${buildComposerConfigurationSignature(selection.addOns)}`,
        )
        .join("|");

const isSameComposerConfiguration = (
    left: ComposerItem,
    right: {
        productId: string;
        addOns: ComposerAddOn[];
        comboSelections?: ComposerComboSelection[];
    },
) =>
    left.productId === right.productId &&
    buildComposerConfigurationSignature(left.addOns) === buildComposerConfigurationSignature(right.addOns) &&
    buildComboConfigurationSignature(left.comboSelections ?? []) ===
        buildComboConfigurationSignature(right.comboSelections ?? []);

type SettlementMode = "full" | "partial" | "due";
type SaleSort = "newest" | "oldest" | "highest" | "lowest";
type SalesPaymentMethodFilter = "all" | "cash" | "upi" | "card";
type SalesDateMode = "date" | "range";
type SalesDatePreset = "today" | "yesterday" | "this-week" | "this-month" | "custom" | "all";
type BillingPanelTab = "products" | "bills" | "reports" | "purchases" | "customers";
type InvoiceAction = "print" | "whatsapp";

const salesSortOptions: Array<{ value: SaleSort; label: string }> = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "highest", label: "Highest \u20B9" },
    { value: "lowest", label: "Lowest \u20B9" },
];

const salesPaymentMethodOptions: Array<{
    value: SalesPaymentMethodFilter;
    label: string;
}> = [
    { value: "all", label: "All" },
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
];

const salesDatePresetOptions: Array<{ value: SalesDatePreset; label: string }> = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this-week", label: "This week" },
    { value: "this-month", label: "This month" },
    { value: "custom", label: "Custom" },
    { value: "all", label: "All dates" },
];

const getSalesDatePresetOptions = (mode: SalesDateMode) =>
    salesDatePresetOptions.filter((preset) =>
        mode === "date"
            ? preset.value === "today" || preset.value === "yesterday" || preset.value === "custom"
            : preset.value === "this-week" ||
              preset.value === "this-month" ||
              preset.value === "custom" ||
              preset.value === "all",
    );

const formatSalesDate = (value: Date) =>
    value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const startOfLocalDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate());

const nextLocalDay = (value: Date) => {
    const next = startOfLocalDay(value);
    next.setDate(next.getDate() + 1);
    return next;
};

const getSalesDateBounds = (
    mode: SalesDateMode,
    selectedDate: Date,
    customFromDate: Date | null,
    customToDate: Date | null,
    preset: SalesDatePreset,
) => {
    if (preset === "all") {
        return { from: null, to: null };
    }

    const today = startOfLocalDay(new Date());

    if (preset === "today") {
        return { from: today, to: nextLocalDay(today) };
    }

    if (preset === "yesterday") {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: yesterday, to: today };
    }

    if (preset === "this-week") {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        return { from: weekStart, to: nextLocalDay(today) };
    }

    if (preset === "this-month") {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: monthStart, to: nextLocalDay(today) };
    }

    if (mode === "date") {
        const from = startOfLocalDay(selectedDate);
        return { from, to: nextLocalDay(from) };
    }

    return {
        from: customFromDate ? startOfLocalDay(customFromDate) : null,
        to: customToDate ? nextLocalDay(customToDate) : null,
    };
};

const SalesSummaryBar = ({ summary }: { summary: SalesListSummary | null }) => {
    if (!summary) return null;

    return (
        <div className="mb-4 grid grid-cols-4 gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-3.5 text-xs sm:gap-4 sm:px-4">
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Sales</p>
                <p className="whitespace-nowrap text-sm font-semibold sm:text-base">{summary.completedCount}</p>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="whitespace-nowrap text-sm font-bold text-primary sm:text-base">
                    {formatCurrency(summary.salesTotal)}
                </p>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Collected</p>
                <p className="whitespace-nowrap text-sm font-semibold text-emerald-600 dark:text-emerald-400 sm:text-base">
                    {formatCurrency(summary.collectedTotal)}
                </p>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Due</p>
                <p className="whitespace-nowrap text-sm font-semibold text-amber-600 dark:text-amber-400 sm:text-base">
                    {formatCurrency(summary.dueTotal)}
                </p>
            </div>
        </div>
    );
};

const settlementOptions: Array<{
    value: SettlementMode;
    label: string;
    activeClassName: string;
}> = [
    {
        value: "full",
        label: "Paid",
        activeClassName: "bg-emerald-500 text-white",
    },
    {
        value: "partial",
        label: "Partial",
        activeClassName: "bg-sky-500 text-white",
    },
    { value: "due", label: "Due", activeClassName: "bg-amber-500 text-white" },
];

const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
];

const discountPresetPercentages = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 100] as const;

type BillingPageProps = {
    mode?: BillingWorkspaceMode;
    session?: DeviceSessionDTO | null;
    initialPanelTab?: "products" | "bills" | "reports" | "customers" | "purchases";
    productSearch?: string;
    salesSearch?: string;
    purchaseSearch?: string;
    customerSearch?: string;
    onPanelTabChange?: (
        tab: "products" | "bills" | "reports" | "customers" | "purchases",
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
    purchaseSearch: purchaseSearchProp,
    customerSearch: customerSearchProp,
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
    const [settlementEditorOpen, setSettlementEditorOpen] = useState(false);
    const [placeOrderDialogOpen, setPlaceOrderDialogOpen] = useState(false);
    const [replacingSaleId, setReplacingSaleId] = useState<string | null>(null);
    const [replaceConfirmationOpen, setReplaceConfirmationOpen] = useState(false);
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const [customerCreateOpen, setCustomerCreateOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");
    const [discountEditorOpen, setDiscountEditorOpen] = useState(false);
    const [historyFilter] = useState<"all" | "draft" | "open" | "paid" | "voided">("all");
    const [leftPanelTab, setLeftPanelTab] = useState<BillingPanelTab>(
        isDeviceMode ? initialPanelTab : "bills",
    );

    const [sortBy, setSortBy] = useState<SaleSort>("newest");
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<SalesPaymentMethodFilter>("all");
    const [dateFilter, setDateFilter] = useState<SalesDateMode>("date");
    const [datePreset, setDatePreset] = useState<SalesDatePreset>("today");
    const [specificDate, setSpecificDate] = useState(new Date());
    const [customFromDate, setCustomFromDate] = useState<Date | null>(null);
    const [customToDate, setCustomToDate] = useState<Date | null>(null);
    const [salesDatePopoverOpen, setSalesDatePopoverOpen] = useState(false);
    const [appliedDateFilter, setAppliedDateFilter] = useState<SalesDateMode>("date");
    const [appliedDatePreset, setAppliedDatePreset] = useState<SalesDatePreset>("today");
    const [appliedSpecificDate, setAppliedSpecificDate] = useState(new Date());
    const [appliedCustomFromDate, setAppliedCustomFromDate] = useState<Date | null>(null);
    const [appliedCustomToDate, setAppliedCustomToDate] = useState<Date | null>(null);
    const [customizeProductId, setCustomizeProductId] = useState<string | null>(null);
    const [configureComboProductId, setConfigureComboProductId] = useState<string | null>(null);
    const [mobileCartOpen, setMobileCartOpen] = useState(false);
    const [productLookupMode, setProductLookupMode] = useState<ProductLookupMode>("scan");
    const [scanValue, setScanValue] = useState("");
    const [directScanPaused, setDirectScanPaused] = useState(false);
    const [directScanActivationOpen, setDirectScanActivationOpen] = useState(false);
    const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
    const [scanDiagnostics, setScanDiagnostics] = useState<ScanDiagnostic[]>(() =>
        getStoredScanDiagnostics(scanDiagnosticStorageKey),
    );
    const scanInputRef = useRef<HTMLInputElement | null>(null);
    const productNameSearchInputRef = useRef<HTMLInputElement | null>(null);
    const directScanBufferRef = useRef("");

    const productSearch = productSearchProp ?? "";
    const salesSearch = salesSearchProp ?? "";
    const purchaseSearch = purchaseSearchProp ?? "";
    const deferredProductSearch = useDeferredValue(productSearch.trim().toLowerCase());
    const deferredCustomerSearch = useDeferredValue(customerSearch.trim().toLowerCase());
    const deferredSalesSearch = useDeferredValue(salesSearch.trim().toLowerCase());

    const applySalesDatePreset = (preset: SalesDatePreset) => {
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

        setDateFilter("date");
        setDatePreset("custom");
        setSpecificDate(nextDate);
        setAppliedDateFilter("date");
        setAppliedDatePreset("custom");
        setAppliedSpecificDate(nextDate);
        setAppliedCustomFromDate(null);
        setAppliedCustomToDate(null);
        setSalesDatePopoverOpen(false);
    };

    const setSalesDateMode = (mode: SalesDateMode) => {
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

        setAppliedDateFilter(dateFilter);
        setAppliedDatePreset(datePreset);
        setAppliedSpecificDate(specificDate);
        setAppliedCustomFromDate(customFromDate);
        setAppliedCustomToDate(customToDate);
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

    const changePanelTab = (tab: BillingPanelTab) => {
        if (tab === "bills" && leftPanelTab !== "bills") {
            applySalesDatePreset("today");
            setAppliedDateFilter("date");
            setAppliedDatePreset("today");
            setAppliedSpecificDate(startOfLocalDay(new Date()));
            setAppliedCustomFromDate(null);
            setAppliedCustomToDate(null);
        }
        setLeftPanelTab(tab);
    };

    const selectedStoreId = isDeviceMode ? (session?.store.id ?? "") : searchParams.get("storeId") || "";

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
            paymentMethod: paymentMethodFilter === "all" ? undefined : paymentMethodFilter,
            createdFrom: salesDateBounds.from?.toISOString(),
            createdTo: salesDateBounds.to?.toISOString(),
        };
    }, [deferredSalesSearch, paymentMethodFilter, salesDateBounds.from, salesDateBounds.to, salesPaymentStatusFilter, salesStatusFilter, sortBy]);

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
    const products = useMemo(
        () => (productsQuery.data?.status === "success" ? (productsQuery.data.data?.products ?? []) : []),
        [productsQuery.data],
    );
    const inactiveProductCodes = useMemo(
        () =>
            productsQuery.data?.status === "success"
                ? ((productsQuery.data.data?.inactiveProductCodes ?? []) as InactiveProductCode[])
                : [],
        [productsQuery.data],
    );
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
            leftPanelTab === "customers" ||
            leftPanelTab === "purchases"
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
        if (isDeviceMode) {
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
    }, [isDeviceMode, organization, selectedStoreId, setSearchParams]);

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
    const requiresCustomerForReceivable = displayedDueTotal > 0 && !selectedCustomerId;

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
        setDiscountInput(String(discountMode === "percent" ? percentage : amount));
        setDiscountEditorOpen(true);
    };

    const removeOrderDiscount = () => {
        setDiscountInput("");
        setDiscountMode("percent");
        setDiscountEditorOpen(false);
    };

    const toggleInvoiceAction = (action: InvoiceAction) => {
        setInvoiceActions((current) =>
            current.includes(action) ? current.filter((item) => item !== action) : [...current, action],
        );
    };

    const selectCustomer = (customer: CustomerDTO | null) => {
        setSelectedCustomerId(customer?.id ?? "");
        setSelectedCustomerFallback(customer);
        setCustomerSearch("");
        setCustomerPickerOpen(false);
        setCustomerCreateOpen(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
    };

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
        setNotes("");
        setItems([]);
        setSettlementMode("full");
        setSettlementEditorOpen(false);
        setSelectedPaymentMethod("cash");
        setPartialPaymentAmount("");
        setDiscountInput("");
        setDiscountMode("percent");
        setInvoiceActions(isDeviceMode && posPrinter?.connected ? ["print"] : []);
        setDiscountEditorOpen(false);
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
            const existingPlainItem = current.find((item) =>
                isSameComposerConfiguration(item, {
                    productId: product.id,
                    addOns: [],
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
                    name: product.name,
                    categoryId: product.categoryId,
                    unitPrice: Number(product.price),
                    unitDiscount: Number(product.discount ?? 0),
                    quantity: 1,
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
            if (productCode.length === 0) {
                return;
            }

            setScanValue("");
            const result = resolveProductCodeScan(productCode, products, inactiveProductCodes);
            if (result.kind === "unknown") {
                setScanFeedback({ kind: "unknown", productCode: result.productCode });
                recordScanDiagnostic({
                    kind: "unknown",
                    productCode: result.productCode,
                    message: "No Product is linked to this code.",
                });
                focusScanField();
                return;
            }

            if (result.kind === "inactive") {
                setScanFeedback({
                    kind: "inactive",
                    productCode: result.productCode,
                    productName: result.productName,
                });
                recordScanDiagnostic({
                    kind: "scan-to-cart-failure",
                    productCode: result.productCode,
                    message: `${result.productName} is inactive and was not added to the bill.`,
                });
                focusScanField();
                return;
            }

            if (result.kind === "ambiguous") {
                setScanFeedback({ kind: "ambiguous", productCode: result.productCode });
                recordScanDiagnostic({
                    kind: "duplicate-assignment",
                    productCode: result.productCode,
                    message: "Conflicting catalog assignments prevented the scan from resolving.",
                });
                focusScanField();
                return;
            }

            const productAttachments = attachmentsByProductId.get(result.product.id) ?? [];
            const combo = preloadedCombos.find((item) => item.product.id === result.product.id);
            const action = getProductCardAction(result.product, {
                hasAddOns: productAttachments.length > 0,
                comboAvailable: Boolean(combo),
                comboHasSettings: Boolean(combo?.choiceGroups.length),
                comboLoading: result.product.productType === "combo" && comboProductsQuery.isPending,
                comboHasError: comboProductsQuery.isError || comboProductsQuery.data?.status === "error",
            });

            if (action === "disabled" || action === "loading") {
                setScanFeedback({ kind: "unavailable", message: `${result.product.name} cannot be added right now.` });
                recordScanDiagnostic({
                    kind: "scan-to-cart-failure",
                    productCode: result.productCode,
                    message: `${result.product.name} cannot be added right now.`,
                });
                focusScanField();
                return;
            }

            if (action === "retry") {
                recordScanDiagnostic({
                    kind: "scan-to-cart-failure",
                    productCode: result.productCode,
                    message: `${result.product.name} options could not be loaded; the catalog is being retried.`,
                });
            }

            if (action === "add" || action === "retry") {
                addProductToBill(result.product, (quantity) => {
                    window.setTimeout(() => {
                        setScanFeedback({
                            kind: "success",
                            message: `${result.product.name} added. Quantity ${quantity}.`,
                        });
                        focusScanField();
                    }, 0);
                });
                return;
            } else {
                handleProductCardClick(result.product, action);
            }
            if (action === "customize" || action === "configure") {
                setScanFeedback({ kind: "success", message: `Choose options for ${result.product.name}.` });
                return;
            }
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

    useEffect(() => {
        const captureEnabled =
            isDeviceMode &&
            leftPanelTab === "products" &&
            productLookupMode === "scan" &&
            directBarcodeScanEnabled &&
            !directScanPaused;
        if (!captureEnabled) {
            directScanBufferRef.current = "";
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            const activeElement = document.activeElement;
            const scanFieldOwnsFocus = activeElement === scanInputRef.current;
            const dialogOwnsFocus = Boolean(document.querySelector('[role="dialog"]'));
            const canCapture = shouldCaptureDirectBarcodeScan({
                enabled: captureEnabled,
                scanFieldOwnsFocus,
                unrelatedEditableFieldOwnsFocus: isEditableFocusTarget(activeElement),
                dialogOwnsFocus,
            });

            if (!canCapture) {
                directScanBufferRef.current = "";
                return;
            }

            if (event.key === "Enter") {
                const result = consumeDirectBarcodeScanKey(directScanBufferRef.current, event.key);
                directScanBufferRef.current = result.buffer;
                if (result.scannedCode) {
                    event.preventDefault();
                    handleProductCodeScan(result.scannedCode);
                }
                return;
            }

            if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                directScanBufferRef.current = consumeDirectBarcodeScanKey(directScanBufferRef.current, event.key).buffer;
            }
        };

        window.addEventListener("keydown", handleKeyDown, true);
        return () => {
            directScanBufferRef.current = "";
            window.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [directBarcodeScanEnabled, directScanPaused, handleProductCodeScan, isDeviceMode, leftPanelTab, productLookupMode]);

    const addConfiguredProductToBill = (product: ProductResponseDTO, addOns: CustomizeAddOnSelection[]) => {
        if (addOns.length === 0) {
            addProductToBill(product);
            return;
        }

        setItems((current) => {
            const existingConfiguredItem = current.find((item) =>
                isSameComposerConfiguration(item, {
                    productId: product.id,
                    addOns,
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
                    name: product.name,
                    categoryId: product.categoryId,
                    unitPrice: Number(product.price),
                    unitDiscount: Number(product.discount ?? 0),
                    quantity: 1,
                    addOns,
                    bundleComponents: [],
                    comboSelections: [],
                },
            ];
        });
    };

    const addConfiguredComboToBill = (combo: ComboProductResponse, selections: ComboDialogSelection[]) => {
        setItems((current) => {
            const existing = current.find((item) =>
                isSameComposerConfiguration(item, {
                    productId: combo.product.id,
                    addOns: [],
                    comboSelections: selections,
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
                    name: combo.product.name,
                    categoryId: combo.product.categoryId,
                    unitPrice: Number(combo.product.price),
                    unitDiscount: Number(combo.product.discount ?? 0),
                    quantity: 1,
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

    const buildDraftPayload = (): CreateDraftSaleJSON => ({
        customerId: selectedCustomerId || null,
        orderDiscountAmount,
        notes: notes.trim() || null,
        items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
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

    const buildCommitPayload = (): CommitSaleJSON => ({
        customerId: selectedCustomerId || null,
        orderDiscountAmount,
        notes: notes.trim() || null,
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

            const payload = buildDraftPayload();
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

            if (requiresCustomerForReceivable) {
                throw new Error("Select a customer before creating a bill with a due balance");
            }

            if (replacingSaleId) {
                const response = await replacePosSale(replacingSaleId, {
                    requestId,
                    ...buildDraftPayload(),
                    ...buildCommitPayload(),
                    replacementReason: "Edited after bill change",
                } satisfies ReplaceSaleJSON);

                if (response.status !== "success" || !response.data?.sale) {
                    throw new Error(response.message || "Failed to edit bill");
                }

                return response.data.sale;
            }

            if (isDeviceMode && !activeDraftId) {
                const payload: CompleteSaleJSON = {
                    requestId,
                    ...buildDraftPayload(),
                    payments: buildCommitPayload().payments,
                };
                const response = await completePosSale(payload);

                if (response.status !== "success" || !response.data?.sale) {
                    throw new Error(response.message || "Failed to complete bill");
                }

                return response.data.sale;
            }

            const draftPayload = buildDraftPayload();
            const draftResponse = activeDraftId
                ? isDeviceMode
                    ? await updatePosDraftSale(activeDraftId, draftPayload as UpdateDraftSaleJSON)
                    : await updateDraftSale(
                          organizationId,
                          selectedStoreId,
                          activeDraftId,
                          draftPayload as UpdateDraftSaleJSON,
                      )
                : isDeviceMode
                  ? await createPosDraftSale(draftPayload)
                  : await createDraftSale(organizationId, selectedStoreId, draftPayload);

            if (draftResponse.status !== "success" || !draftResponse.data?.sale) {
                throw new Error(draftResponse.message || "Failed to prepare bill");
            }

            const commitResponse = isDeviceMode
                ? await commitPosSale(draftResponse.data.sale.id, buildCommitPayload())
                : await commitSale(organizationId, selectedStoreId, draftResponse.data.sale.id, buildCommitPayload());

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
                        toast.error("Connect the 80mm USB printer before printing");
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
        setCustomerSearch(sale.customer?.phone || sale.customer?.name || "");
        setNotes(sale.notes ?? "");
        setItems(
            sale.items.map((item) => ({
                key: item.id,
                productId: item.productId,
                name: item.productNameSnapshot,
                categoryId: "",
                unitPrice: Number(item.unitPriceSnapshot),
                unitDiscount: getComposerUnitDiscountFromSaleItem(item),
                quantity: Number(item.quantity),
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
        setSettlementEditorOpen(false);
        setSelectedPaymentMethod("cash");
        setPartialPaymentAmount("");
        setDiscountInput(Number(sale.orderDiscountAmount) > 0 ? String(sale.orderDiscountAmount) : "");
        setDiscountMode("amount");
        setDiscountEditorOpen(Number(sale.orderDiscountAmount) > 0);
        setLeftPanelTab("products");
    }, [getComposerUnitDiscountFromSaleItem]);

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

    const setStore = (storeId: string | null) => {
        if (isDeviceMode || !storeId) {
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
                    render={<Link to={`/organizations/${organizationId}/stores`} />}
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
                        render={<Link to={`/organizations/${organizationId}/stores`} />}
                    >
                        Go to store setup
                    </Button>
                </div>
            </div>
        );
    }

    const panelMaxHeight = isDeviceMode
        ? "calc(100dvh - var(--pos-header-height, 3.5rem) - env(safe-area-inset-top, 0px))"
        : "calc(100dvh - 3.5rem - 57px)";

    return (
        <div className="billing-pos-layout flex min-h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px))] flex-col gap-0 lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px))] lg:min-h-0 lg:overflow-hidden">
            {receiptToPrint ? (
                <span className="sr-only" aria-live="polite">
                    Preparing receipt for printing
                </span>
            ) : null}
            {!isDeviceMode ? (
                <header className="flex flex-col gap-3 border-b border-border/50 bg-card/60 px-5 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-4">
                        <div>
                            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                                Billing history
                            </h1>
                            <p className="text-xs text-muted-foreground">Admin read-only mode</p>
                        </div>
                        <span className="text-sm text-muted-foreground hidden sm:inline">{formatLongDate()}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Store className="size-4" />
                            <span className="hidden sm:inline">Store:</span>
                        </div>
                        <Select
                            key={`${selectedStoreId}-${organizationStores.length}`}
                            value={selectedStoreId}
                            onValueChange={setStore}
                        >
                            <SelectTrigger className="h-9 min-w-[160px] max-w-[240px] rounded-xl bg-background/80 px-3 text-sm">
                                <SelectValue placeholder="Choose store">{selectedStore?.name}</SelectValue>
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false} align="end">
                                {organizationStores.map((store) => (
                                    <SelectItem key={store.id} value={store.id}>
                                        {store.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </header>
            ) : null}

            {/* ─── Main Two-Panel Layout ─── */}
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <nav
                    aria-label="Billing workspace navigation"
                    className="hidden w-14 shrink-0 flex-col items-center gap-1.5 border-r border-border/40 bg-card/40 py-3 lg:flex"
                >
                    {canMutate ? (
                        <>
                            <button
                                type="button"
                                onClick={() => changePanelTab("products")}
                                className={cn(
                                    "relative flex size-10 items-center justify-center rounded-xl transition-all",
                                    leftPanelTab === "products"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                                aria-label="Products shelf"
                                title="Products shelf"
                            >
                                <LayoutGrid className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => changePanelTab("bills")}
                                className={cn(
                                    "relative flex size-10 items-center justify-center rounded-xl transition-all",
                                    leftPanelTab === "bills"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                                aria-label="Recent bills and drafts"
                                title="Recent bills and drafts"
                            >
                                <ReceiptText className="size-4" />
                                {sales.length > 0 && (
                                    <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
                                        {sales.length > 9 ? "9+" : sales.length}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => changePanelTab("reports")}
                                className={cn(
                                    "flex size-10 items-center justify-center rounded-xl transition-all",
                                    leftPanelTab === "reports"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                                aria-label="Product sales reports"
                                title="Product sales reports"
                            >
                                <BarChart3 className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => changePanelTab("customers")}
                                className={cn(
                                    "relative flex size-10 items-center justify-center rounded-xl transition-all",
                                    leftPanelTab === "customers"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                                aria-label="Customers"
                                title="Customers"
                            >
                                <Users className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => changePanelTab("purchases")}
                                className={cn(
                                    "relative flex size-10 items-center justify-center rounded-xl transition-all",
                                    leftPanelTab === "purchases"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                                aria-label="Purchases"
                                title="Purchases"
                            >
                                <ShoppingBag className="size-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => changePanelTab("bills")}
                                className={cn(
                                    "flex size-10 items-center justify-center rounded-xl transition-all",
                                    leftPanelTab === "bills"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                                aria-label="Store bills"
                                title="Store bills"
                            >
                                <ReceiptText className="size-4" />
                            </button>
                        </>
                    )}
                    {canMutate ? <AppVersionBadge className="mt-auto max-w-full px-1 text-[9px]" /> : null}
                </nav>

                {/* ─── LEFT PANEL: Product Grid ─── */}
                <div
                    ref={salesScrollContainerRef}
                    className={cn(
                        "min-h-0 flex-1 overflow-y-auto p-4 pb-24 lg:min-w-0 lg:pb-4",
                        canMutate && leftPanelTab === "products" && "lg:pt-0",
                    )}
                    style={{ maxHeight: panelMaxHeight }}
                >
                    {/* Tab Switcher */}
                    {canMutate ? (
                        <div className="-mt-2 mb-3 flex min-w-0 gap-1 rounded-lg border border-border/40 bg-muted/30 p-1 lg:hidden">
                            <button
                                type="button"
                                onClick={() => changePanelTab("products")}
                                className={cn(
                                    "flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-1.5 text-xs font-semibold transition-all duration-200 sm:px-2.5",
                                    leftPanelTab === "products"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                <LayoutGrid className="size-3.5" />
                                Products
                            </button>
                            <button
                                type="button"
                                onClick={() => changePanelTab("bills")}
                                className={cn(
                                    "flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-1.5 text-xs font-semibold transition-all duration-200 sm:px-2.5",
                                    leftPanelTab === "bills"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                <ReceiptText className="size-3.5" />
                                Bills
                                {sales.length > 0 && (
                                    <span
                                        className={cn(
                                            "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                                            leftPanelTab === "bills"
                                                ? "bg-primary-foreground/20 text-primary-foreground"
                                                : "bg-foreground/10 text-foreground",
                                        )}
                                    >
                                        {sales.length}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => changePanelTab("reports")}
                                className={cn(
                                    "flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-1.5 text-xs font-semibold transition-all duration-200 sm:px-2.5",
                                    leftPanelTab === "reports"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                <BarChart3 className="size-3.5" />
                                Reports
                            </button>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className={cn(
                                                "h-8 min-w-0 flex-1 gap-1.5 rounded-md px-1.5 text-xs font-semibold sm:px-2.5",
                                                leftPanelTab === "customers" || leftPanelTab === "purchases"
                                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90"
                                                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                            )}
                                        >
                                            <MoreHorizontal className="size-3.5" />
                                            More
                                        </Button>
                                    }
                                />
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem onClick={() => changePanelTab("customers")}>
                                        <Users className="size-4" />
                                        Customers
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => changePanelTab("purchases")}>
                                        <ShoppingBag className="size-4" />
                                        Purchases
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <div className="mb-5 flex gap-2 border-b border-border/40 pb-3 lg:hidden">
                            <button
                                type="button"
                                onClick={() => changePanelTab("bills")}
                                className={cn(
                                    "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200",
                                    leftPanelTab === "bills"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                <ReceiptText className="size-4" />
                                Store bills
                            </button>
                        </div>
                    )}

                    {canMutate && leftPanelTab === "reports" ? (
                        <div className="min-h-full p-4 pb-24 lg:p-6 lg:pb-6">
                            {session ? <ProductSalesSummary mode="pos" storeName={session.store.name} /> : null}
                        </div>
                    ) : canMutate && leftPanelTab === "purchases" ? (
                        session ? (
                            <PosPurchasesPanel session={session} search={purchaseSearch} />
                        ) : null
                    ) : canMutate && leftPanelTab === "products" ? (
                        <>
                            <div className="flex min-h-full min-w-0 flex-col pt-2">
                                {barcodeScanningEnabled ? (
                                    <div className="mb-4 rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm">
                                        <div className="mb-3 flex w-fit rounded-lg bg-muted/70 p-1" role="tablist" aria-label="Find products">
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={productLookupMode === "scan"}
                                                className={cn(
                                                    "flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                                                    productLookupMode === "scan"
                                                        ? "bg-background text-foreground shadow-sm"
                                                        : "text-muted-foreground hover:text-foreground",
                                                )}
                                                onClick={() => {
                                                    setProductLookupMode("scan");
                                                    window.setTimeout(() => scanInputRef.current?.focus(), 0);
                                                }}
                                            >
                                                <Barcode className="size-3.5" /> Scan code
                                            </button>
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={productLookupMode === "search"}
                                                className={cn(
                                                    "flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                                                    productLookupMode === "search"
                                                        ? "bg-background text-foreground shadow-sm"
                                                        : "text-muted-foreground hover:text-foreground",
                                                )}
                                                onClick={() => {
                                                    setProductLookupMode("search");
                                                    window.setTimeout(() => productNameSearchInputRef.current?.focus(), 0);
                                                }}
                                            >
                                                <Search className="size-3.5" /> Search by name
                                            </button>
                                        </div>

                                        {productLookupMode === "scan" ? (
                                            <div className="flex flex-wrap items-end gap-2">
                                                <form
                                                    className="min-w-[min(100%,16rem)] flex-1"
                                                    onSubmit={(event) => {
                                                        event.preventDefault();
                                                        handleProductCodeScan(scanValue);
                                                    }}
                                                >
                                                    <label
                                                        htmlFor="product-code-scan"
                                                        className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-foreground"
                                                    >
                                                        Scan or type a code
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            ref={scanInputRef}
                                                            id="product-code-scan"
                                                            value={scanValue}
                                                            onChange={(event) => setScanValue(event.target.value)}
                                                            placeholder="Product Code"
                                                            autoComplete="off"
                                                            className="h-9 rounded-lg"
                                                        />
                                                        <Button type="submit" size="sm" className="h-9 rounded-lg">
                                                            Add
                                                        </Button>
                                                    </div>
                                                </form>
                                                {directBarcodeScanEnabled ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-9 rounded-lg"
                                                        aria-pressed={!directScanPaused}
                                                        onClick={() => setDirectScanPaused((paused) => !paused)}
                                                    >
                                                        {directScanPaused ? (
                                                            <><Play className="size-3.5" /> Resume</>
                                                        ) : (
                                                            <><Pause className="size-3.5" /> Pause</>
                                                        )}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-9 rounded-lg"
                                                        disabled={!canEnableDirectBarcodeScan || updateDirectScanMutation.isPending}
                                                        onClick={() => setDirectScanActivationOpen(true)}
                                                    >
                                                        <Play className="size-3.5" /> Enable direct scan
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <div role="tabpanel">
                                                <label
                                                    htmlFor="product-name-search"
                                                    className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-foreground"
                                                >
                                                    Search products by name
                                                </label>
                                                <Input
                                                    ref={productNameSearchInputRef}
                                                    id="product-name-search"
                                                    value={productSearch}
                                                    onChange={(event) => onProductSearchChange?.(event.target.value)}
                                                    placeholder="Start typing a product name"
                                                    autoComplete="off"
                                                    className="h-9 rounded-lg"
                                                />
                                            </div>
                                        )}

                                        <details className="mt-2 text-xs text-muted-foreground">
                                            <summary className="cursor-pointer select-none hover:text-foreground">Scanner settings</summary>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span>
                                                    {activeProductCodesCount} active code{activeProductCodesCount === 1 ? "" : "s"} · Direct scan {directBarcodeScanEnabled ? (directScanPaused ? "paused" : "on") : "off"}
                                                </span>
                                                {directBarcodeScanEnabled ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 rounded-md px-2"
                                                        disabled={updateDirectScanMutation.isPending}
                                                        onClick={() => updateDirectScanMutation.mutate(false)}
                                                    >
                                                        Turn off direct scan
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </details>
                                        {scanFeedback ? (
                                            <div
                                                className={cn(
                                                    "mt-3 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm",
                                                    scanFeedback.kind === "success"
                                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                                        : "bg-amber-500/10 text-amber-800 dark:text-amber-200",
                                                )}
                                                role="status"
                                            >
                                                {scanFeedback.kind === "success" || scanFeedback.kind === "unavailable" ? (
                                                    <span>{scanFeedback.message}</span>
                                                ) : scanFeedback.kind === "inactive" ? (
                                                    <span>
                                                        {scanFeedback.productName} is inactive. Product Code: <code>{scanFeedback.productCode}</code>
                                                    </span>
                                                ) : scanFeedback.kind === "ambiguous" ? (
                                                    <span>
                                                        Product Code <code>{scanFeedback.productCode}</code> has conflicting catalog assignments. Ask an administrator to resolve it.
                                                    </span>
                                                ) : (
                                                    <span>
                                                        No Product is linked to <code>{scanFeedback.productCode}</code>.
                                                    </span>
                                                )}
                                                {scanFeedback.kind === "unknown" ? (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 rounded-md bg-background/70"
                                                            onClick={async () => {
                                                                try {
                                                                    await navigator.clipboard.writeText(scanFeedback.productCode);
                                                                    toast.success("Product Code copied for your administrator");
                                                                } catch {
                                                                    toast.error("Could not copy the Product Code");
                                                                }
                                                            }}
                                                        >
                                                            <Copy className="size-3" /> Copy for administrator
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 rounded-md"
                                                            onClick={() => {
                                                                setScanFeedback(null);
                                                                setProductLookupMode("search");
                                                                onProductSearchChange?.("");
                                                                window.setTimeout(() => {
                                                                    productNameSearchInputRef.current?.focus();
                                                                }, 0);
                                                            }}
                                                        >
                                                            Search products manually
                                                        </Button>
                                                    </>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        {scanDiagnostics.length > 0 ? (
                                            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">Scan diagnostics for this browser session</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Unknown codes, duplicate assignments, and add-to-cart failures are kept here for follow-up on this device.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 rounded-md bg-background/70"
                                                            onClick={async () => {
                                                                try {
                                                                    await navigator.clipboard.writeText(formatScanDiagnostics(scanDiagnostics));
                                                                    toast.success("Scan diagnostics copied");
                                                                } catch {
                                                                    toast.error("Could not copy scan diagnostics");
                                                                }
                                                            }}
                                                        >
                                                            <Copy className="size-3" /> Copy log
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 rounded-md"
                                                            onClick={() => {
                                                                setScanDiagnostics([]);
                                                                if (scanDiagnosticStorageKey) {
                                                                    try {
                                                                        window.sessionStorage.removeItem(scanDiagnosticStorageKey);
                                                                    } catch {
                                                                        // Clearing the visible session state is sufficient when storage is unavailable.
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            Clear
                                                        </Button>
                                                    </div>
                                                </div>
                                                <ul className="mt-2 space-y-1 text-xs text-muted-foreground" aria-label="Barcode scan diagnostics">
                                                    {[...scanDiagnostics].reverse().map((diagnostic, index) => (
                                                        <li key={`${diagnostic.occurredAt}-${index}`}>
                                                            <span className="font-medium text-foreground">{diagnostic.kind.replaceAll("-", " ")}</span>
                                                            {": "} <code>{diagnostic.productCode}</code> — {diagnostic.message}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <div className="mb-4 rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm">
                                        <label
                                            htmlFor="product-name-search"
                                            className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-foreground"
                                        >
                                            <Search className="size-3.5 text-primary" /> Search products by name
                                        </label>
                                        <Input
                                            ref={productNameSearchInputRef}
                                            id="product-name-search"
                                            value={productSearch}
                                            onChange={(event) => onProductSearchChange?.(event.target.value)}
                                            placeholder="Start typing a product name"
                                            autoComplete="off"
                                            className="h-9 rounded-lg"
                                        />
                                    </div>
                                )}
                                {/* Category Filter Pills */}
                                <div className="sticky top-0 z-10 -mx-4 mb-4 bg-background/95 px-4 pt-1 pb-2 backdrop-blur-md sm:-mx-4 sm:px-4">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                            Categories
                                        </p>
                                    </div>
                                    <div className="scrollbar-none flex min-h-9 min-w-0 touch-pan-x gap-1.5 overflow-x-auto pb-1">
                                        {categoryOptions.map((category) => (
                                            <button
                                                key={category.id}
                                                type="button"
                                                onClick={() => setCategoryFilter(category.id)}
                                                aria-pressed={activeCategoryFilter === category.id}
                                                className={cn(
                                                    "min-h-9 shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                                                    activeCategoryFilter === category.id
                                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                                        : "border border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                                                )}
                                            >
                                                {category.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Product Grid */}
                                <div
                                    {...(canMutate ? categorySwipeHandlers : {})}
                                    className="min-h-[320px] flex-1 touch-[pan-y_pinch-zoom]"
                                >
                                    {productsQuery.isPending ? (
                                        <div className="flex min-h-[320px] items-center justify-center">
                                            <Spinner className="size-8 text-primary" />
                                        </div>
                                    ) : filteredProducts.length === 0 ? (
                                        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40 p-6 text-center">
                                            <ShoppingCart className="size-10 text-muted-foreground/50" />
                                            <p className="mt-3 font-medium text-foreground">No products found</p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Try a different search or category.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                            {filteredProducts.map((product) => {
                                                const cartQuantity = items
                                                    .filter((item) => item.productId === product.id)
                                                    .reduce((total, item) => total + item.quantity, 0);
                                                const isInCart = cartQuantity > 0;
                                                const productAttachments = attachmentsByProductId.get(product.id) ?? [];
                                                const combo = preloadedCombos.find(
                                                    (item) => item.product.id === product.id,
                                                );
                                                const comboLoading =
                                                    product.productType === "combo" && comboProductsQuery.isPending;
                                                const cardAction = getProductCardAction(product, {
                                                    hasAddOns: productAttachments.length > 0,
                                                    comboAvailable: Boolean(combo),
                                                    comboHasSettings: Boolean(combo?.choiceGroups.length),
                                                    comboLoading,
                                                    comboHasError:
                                                        comboProductsQuery.isError ||
                                                        comboProductsQuery.data?.status === "error",
                                                });
                                                const cardActionLabel = getProductCardActionLabel(cardAction);
                                                const cardDisabled =
                                                    cardAction === "disabled" || cardAction === "loading";

                                                return (
                                                    <button
                                                        type="button"
                                                        key={product.id}
                                                        disabled={cardDisabled}
                                                        onClick={() => {
                                                            if (cardAction === "retry") {
                                                                addProductToBill(product);
                                                                return;
                                                            }

                                                            handleProductCardClick(product, cardAction);
                                                        }}
                                                        aria-label={`${cardActionLabel} ${product.name}`}
                                                        className={cn(
                                                            "group relative flex min-h-[76px] w-full cursor-pointer touch-[pan-y_pinch-zoom] items-center gap-2 rounded-xl border px-2 py-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
                                                            isInCart
                                                                ? "border-primary/40 bg-primary/5 shadow-md shadow-primary/10"
                                                                : "border-border/50 bg-card/80 hover:border-primary/30 hover:bg-card",
                                                        )}
                                                    >
                                                        {isInCart && (
                                                            <span className="absolute -top-2 -right-2 z-10 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-center text-xs font-bold leading-none text-primary-foreground shadow-md shadow-primary/25">
                                                                {cartQuantity}
                                                            </span>
                                                        )}
                                                        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/40 shadow-inner">
                                                            {cardAction === "loading" ? (
                                                                <Spinner className="size-4 text-primary" />
                                                            ) : product.imageSignedUrl ? (
                                                                <img
                                                                    src={product.imageSignedUrl}
                                                                    alt={product.name}
                                                                    className="h-full w-full rounded-lg border border-border/40 object-cover"
                                                                />
                                                            ) : (
                                                                <ShoppingCart className="size-5 text-muted-foreground/50" />
                                                            )}
                                                        </div>
                                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                            <p className="whitespace-normal break-words text-base font-semibold leading-snug text-foreground">
                                                                {product.name}
                                                            </p>
                                                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                                                                <ProductPriceDisplay
                                                                    price={product.price}
                                                                    discount={product.discount}
                                                                    size="sm"
                                                                    align="left"
                                                                />
                                                                {productAttachments.length > 0 ? (
                                                                    <span
                                                                        title="Click the product to customize add-ons"
                                                                        className="inline-flex min-w-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[11px] font-semibold leading-tight text-primary/80 transition-colors group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary"
                                                                    >
                                                                        <Link2 className="size-3 shrink-0" aria-hidden="true" />
                                                                        <span className="truncate">
                                                                            {productAttachments.length} add-ons
                                                                        </span>
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : canMutate && leftPanelTab === "customers" ? (
                        <CustomerDirectory
                            mode="device"
                            organizationId={organizationId}
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
                        <>
                            {/* Filters & Control Panel */}
                            <div className="mb-6 space-y-4">
                                {/* First Row: Search, Sort, View, Count */}
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    {/* Sort Controls */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                                        <div className="flex items-center gap-1 shrink-0 text-muted-foreground text-xs font-semibold uppercase tracking-wider mr-1">
                                            <ArrowUpDown className="size-3.5" />
                                        </div>
                                        {salesSortOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setSortBy(opt.value)}
                                                className={cn(
                                                    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer",
                                                    sortBy === opt.value
                                                        ? "bg-foreground text-background shadow-md shadow-foreground/5"
                                                        : "bg-muted/40 border border-border/10 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                </div>

                                {/* Second Row: Filters (Payment & Date) */}
                                <div className="flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                                    {/* Payment Method Filters */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-1 shrink-0 text-muted-foreground mr-1">
                                            <Filter className="size-3.5" />
                                        </div>
                                        {salesPaymentMethodOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setPaymentMethodFilter(opt.value)}
                                                className={cn(
                                                    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer",
                                                    paymentMethodFilter === opt.value
                                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                                        : "bg-muted/40 border border-border/10 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Divider for sm and up */}
                                    <div className="hidden sm:block h-4 w-px bg-border/40 mx-2" />

                                    {/* Date filters */}
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-1 shrink-0 text-muted-foreground mr-1">
                                            <Calendar className="size-3.5" />
                                        </div>
                                        {dateFilter === "date" ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="size-8 shrink-0 rounded-lg"
                                                aria-label="Previous date"
                                                onClick={() => shiftSalesDate(-1)}
                                            >
                                                <ChevronLeft className="size-4" />
                                            </Button>
                                        ) : null}
                                        <Popover open={salesDatePopoverOpen} onOpenChange={handleSalesDatePopoverOpenChange}>
                                            <PopoverTrigger
                                                render={
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-8 min-w-0 max-w-[280px] justify-start gap-2 rounded-lg px-2.5 text-xs"
                                                    >
                                                        <Calendar className="size-3.5 shrink-0" />
                                                        <span className="truncate">
                                                            {appliedDateFilter === "date"
                                                                ? formatSalesDate(appliedSpecificDate)
                                                                : appliedDatePreset === "all"
                                                                  ? "All dates"
                                                                  : appliedCustomFromDate && appliedCustomToDate
                                                                    ? `${formatSalesDate(appliedCustomFromDate)} — ${formatSalesDate(appliedCustomToDate)}`
                                                                    : "Select date range"}
                                                        </span>
                                                    </Button>
                                                }
                                            />
                                            <PopoverContent
                                                align="start"
                                                className="w-[240px] max-w-[calc(100vw-1rem)] overflow-hidden p-2"
                                            >
                                                <div className="flex min-w-0 flex-col gap-2">
                                                    <div className="flex min-w-0 rounded-md border border-border/50 bg-muted/30 p-px">
                                                        {(["date", "range"] as const).map((mode) => (
                                                            <button
                                                                key={mode}
                                                                type="button"
                                                                onClick={() => setSalesDateMode(mode)}
                                                                className={cn(
                                                                    "min-w-0 flex-1 rounded px-1.5 py-1 text-center text-[11px] font-semibold transition-colors",
                                                                    dateFilter === mode
                                                                        ? "bg-background text-foreground shadow-sm"
                                                                        : "text-muted-foreground hover:text-foreground",
                                                                )}
                                                            >
                                                                {mode === "date" ? "Date" : "Date range"}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="flex min-w-0 flex-wrap gap-1">
                                                        {getSalesDatePresetOptions(dateFilter).map((preset) => (
                                                            <button
                                                                key={preset.value}
                                                                type="button"
                                                                onClick={() => applySalesDatePreset(preset.value)}
                                                                className={cn(
                                                                    "min-w-0 max-w-full rounded-full border px-2 py-0.5 text-center text-[11px] font-medium whitespace-normal break-words transition-colors",
                                                                    datePreset === preset.value
                                                                        ? "border-primary/40 bg-primary/10 text-primary"
                                                                        : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                                                )}
                                                            >
                                                                {preset.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="min-w-0 max-w-full overflow-x-auto">
                                                        <div className="flex w-full min-w-max justify-center">
                                                        {dateFilter === "date" ? (
                                                            <DateCalendar
                                                                mode="single"
                                                                className="mx-auto p-1 [--cell-size:--spacing(6)]"
                                                                classNames={{
                                                                    day_button: "mx-auto size-(--cell-size) min-w-(--cell-size) w-(--cell-size)",
                                                                }}
                                                                selected={specificDate}
                                                                onSelect={(date) => {
                                                                    if (date) {
                                                                        setSpecificDate(date);
                                                                        setDatePreset("custom");
                                                                    }
                                                                }}
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <DateCalendar
                                                                mode="range"
                                                                className="mx-auto p-1 [--cell-size:--spacing(6)]"
                                                                classNames={{
                                                                    day_button: "mx-auto size-(--cell-size) min-w-(--cell-size) w-(--cell-size)",
                                                                }}
                                                                selected={{
                                                                    from: customFromDate ?? undefined,
                                                                    to: customToDate ?? undefined,
                                                                }}
                                                                onSelect={(range) => {
                                                                    setDatePreset("custom");
                                                                    setCustomFromDate(range?.from ?? null);
                                                                    setCustomToDate(range?.to ?? null);
                                                                }}
                                                                autoFocus
                                                            />
                                                        )}
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-end border-t border-border/50 pt-3">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            className="rounded-lg"
                                                            disabled={
                                                                dateFilter === "range" &&
                                                                datePreset === "custom" &&
                                                                (!customFromDate || !customToDate)
                                                            }
                                                            onClick={confirmSalesDateFilter}
                                                        >
                                                            Confirm
                                                        </Button>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        {dateFilter === "date" ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="size-8 shrink-0 rounded-lg"
                                                aria-label="Next date"
                                                onClick={() => shiftSalesDate(1)}
                                            >
                                                <ChevronRight className="size-4" />
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            <SalesSummaryBar summary={salesSummary} />

                            {/* Bills List */}
                            {dateRangeNeedsInput ? (
                                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40 p-5 text-center">
                                    <Calendar className="size-8 text-muted-foreground/50" />
                                    <p className="mt-3 font-medium text-foreground">Choose a date range</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Select a From date or To date to view matching bills.
                                    </p>
                                </div>
                            ) : salesQuery.isPending ? (
                                <div className="flex min-h-[320px] items-center justify-center">
                                    <Spinner className="size-6 text-primary" />
                                </div>
                            ) : salesPages.length === 0 && (salesQuery.isError || salesServiceError) ? (
                                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/20 bg-destructive/5 p-5 text-center">
                                    <ReceiptText className="size-8 text-destructive/70" />
                                    <p className="mt-3 font-medium text-foreground">Recent bills failed to load</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {salesServiceError || "Please refresh the page."}
                                    </p>
                                </div>
                            ) : filteredSales.length === 0 ? (
                                <>
                                    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40 p-5 text-center">
                                        <ReceiptText className="size-8 text-muted-foreground/50" />
                                        <p className="mt-3 font-medium text-foreground">No bills found</p>
                                        <p className="mt-1 text-sm text-muted-foreground">No bills in this view yet.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Render payment badges helper function */}
                                    {(() => {
                                        const renderPaymentStatusBadge = (sale: SaleSummaryDTO) => {
                                            if (sale.status === "draft") {
                                                return (
                                                    <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                        Draft
                                                    </span>
                                                );
                                            }

                                            if (sale.status === "voided") {
                                                return (
                                                    <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                                        Voided
                                                    </span>
                                                );
                                            }

                                            if (sale.paymentStatus === "paid") {
                                                return (
                                                    <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                        Paid
                                                    </span>
                                                );
                                            }

                                            if (sale.paymentStatus === "partial") {
                                                return (
                                                    <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                                        Partial
                                                    </span>
                                                );
                                            }

                                            return (
                                                <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                                    Due
                                                </span>
                                            );
                                        };

                                        const renderPaymentMethodBadges = (sale: SaleSummaryDTO) => {
                                            if (sale.status === "draft" || sale.status === "voided") {
                                                return (
                                                    <span className="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                                        No payment
                                                    </span>
                                                );
                                            }
                                            const methods = (sale.paymentMethods || "").toLowerCase();
                                            const badges: React.ReactNode[] = [];
                                            if (methods.includes("cash")) {
                                                badges.push(
                                                    <span
                                                        key="cash"
                                                        className="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                    >
                                                        Cash
                                                    </span>,
                                                );
                                            }
                                            if (methods.includes("upi")) {
                                                badges.push(
                                                    <span
                                                        key="upi"
                                                        className="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                                    >
                                                        UPI
                                                    </span>,
                                                );
                                            }
                                            if (methods.includes("card")) {
                                                badges.push(
                                                    <span
                                                        key="card"
                                                        className="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-500 border border-purple-500/20"
                                                    >
                                                        Card
                                                    </span>,
                                                );
                                            }
                                            if (badges.length === 0) {
                                                return (
                                                    <span className="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                                        Unpaid
                                                    </span>
                                                );
                                            }
                                            return <div className="flex gap-1">{badges}</div>;
                                        };

                                        // list view
                                        return (
                                            <div className="grid gap-1.5 xl:grid-cols-2">
                                                {filteredSales.map((sale) => (
                                                    <div
                                                        key={sale.id}
                                                        className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/70 px-3 py-2 transition-all hover:border-primary/20 hover:bg-card/90 hover:shadow-xs"
                                                    >
                                                        <div className="min-w-0 flex-1 pr-2">
                                                            <div className="flex min-w-0 items-center gap-2">
                                                                <p className="shrink-0 whitespace-nowrap text-xs font-bold text-amber-500 dark:text-amber-400">
                                                                    {sale.tokenNumber ? `Token ${sale.tokenNumber} · ` : ""}
                                                                    {sale.saleNumber ? `Bill ${sale.saleNumber}` : "Draft"}
                                                                </p>
                                                                <p className="min-w-0 truncate text-xs font-semibold text-foreground/80">
                                                                    {sale.customer?.name || "Walk-in customer"}
                                                                </p>
                                                            </div>
                                                            <div className="min-w-0">
                                                                {sale.customer?.phone ? (
                                                                    <p className="truncate text-[10px] text-muted-foreground">
                                                                        {sale.customer.phone}
                                                                    </p>
                                                                ) : null}
                                                                <p className="truncate text-[10px] text-muted-foreground/80">
                                                                    {sale.itemCount} item
                                                                    {sale.itemCount !== 1 ? "s" : ""} ·{" "}
                                                                    {formatDateTime(sale.createdAt)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex shrink-0 items-center gap-2">
                                                            <div className="hidden sm:block">
                                                                <div className="flex flex-col items-end gap-1">
                                                                    {renderPaymentStatusBadge(sale)}
                                                                    {renderPaymentMethodBadges(sale)}
                                                                </div>
                                                            </div>

                                                            <div className="w-20 text-right">
                                                                <p className="text-sm font-bold text-foreground">
                                                                    {formatCurrency(sale.grandTotal)}
                                                                </p>
                                                                {sale.status !== "draft" && sale.status !== "voided" ? (
                                                                    <p
                                                                        className={cn(
                                                                            "mt-0.5 text-[9px] font-bold",
                                                                            Number(sale.dueTotal) > 0
                                                                                ? "text-amber-600 dark:text-amber-400"
                                                                                : "text-emerald-500 dark:text-emerald-400",
                                                                        )}
                                                                    >
                                                                        {Number(sale.dueTotal) > 0
                                                                            ? `Due ${formatCurrency(sale.dueTotal)}`
                                                                            : "Paid in full"}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 mt-0.5">
                                                                        {sale.grandTotal > 0
                                                                            ? `+${Math.round(sale.grandTotal / 10)} pts`
                                                                            : ""}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="flex w-28 items-center justify-end gap-1">
                                                                {canMutate && sale.status === "draft" ? (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            className="rounded-lg text-[11px] h-7 px-2.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                                                            disabled={
                                                                                resumeDraftMutation.isPending ||
                                                                                deleteDraftMutation.isPending
                                                                            }
                                                                            aria-busy={resumingDraftId === sale.id}
                                                                            onClick={() => {
                                                                                setResumingDraftId(sale.id);
                                                                                resumeDraftMutation.mutate(sale.id);
                                                                            }}
                                                                        >
                                                                            {resumingDraftId === sale.id ? (
                                                                                <Spinner className="size-3.5" />
                                                                            ) : null}
                                                                            {resumingDraftId === sale.id ? null : "Resume"}
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="size-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                                            aria-label={`Delete draft ${sale.saleNumber ?? sale.id}`}
                                                                            disabled={
                                                                                resumeDraftMutation.isPending ||
                                                                                deleteDraftMutation.isPending
                                                                            }
                                                                            onClick={() => setDraftToDeleteId(sale.id)}
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="rounded-lg text-[11px] h-7 px-2.5"
                                                                        onClick={() => {
                                                                            setSelectedSaleId(sale.id);
                                                                            setSaleDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        Open Details
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                            {salesLoadMoreFooter}
                        </>
                    )}
                </div>

                {/* ─── RIGHT PANEL: Current Order ─── */}
                {canMutate ? (
                    leftPanelTab === "products" ? (
                        <>
                            {!mobileCartOpen ? (
                                <div className="fixed inset-x-3 z-30 lg:hidden bottom-3 max-lg:bottom-[calc(0.75rem+env(safe-area-inset-bottom))]">
                                    <button
                                        type="button"
                                        onClick={() => setMobileCartOpen(true)}
                                        className="flex min-h-16 w-full items-center justify-between rounded-2xl bg-primary px-4 text-left text-primary-foreground shadow-xl shadow-primary/25"
                                        aria-label="Open current order"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/15">
                                                <ShoppingCart className="size-5" />
                                            </span>
                                            <span>
                                                <span className="block text-sm font-bold">
                                                    {cartItemCount} item
                                                    {cartItemCount === 1 ? "" : "s"} in cart
                                                </span>
                                                <span className="block text-xs text-primary-foreground/75">
                                                    Tap to review order
                                                </span>
                                            </span>
                                        </span>
                                        <span className="text-lg font-bold">{formatCurrency(grandTotal)}</span>
                                    </button>
                                </div>
                            ) : null}

                            {mobileCartOpen ? (
                                <div
                                    className="fixed inset-0 z-30 bg-black/40 touch-none lg:hidden"
                                    onClick={() => setMobileCartOpen(false)}
                                    aria-hidden="true"
                                />
                            ) : null}

                            <aside
                                className={cn(
                                    "flex min-h-0 w-full flex-col overflow-hidden border-t border-border/50 bg-card/95 backdrop-blur-sm lg:static lg:h-full lg:w-[320px] lg:border-t-0 lg:border-l",
                                    mobileCartOpen
                                        ? "max-lg:fixed max-lg:inset-x-0 max-lg:top-[calc(var(--pos-header-height)+env(safe-area-inset-top,0px))] max-lg:bottom-0 max-lg:z-40 max-lg:max-h-none max-lg:overflow-hidden max-lg:overscroll-contain"
                                        : "hidden lg:flex",
                                )}
                                style={mobileCartOpen ? undefined : { maxHeight: panelMaxHeight }}
                            >
                                {/* Drag handle (mobile only) */}
                                <div className="flex justify-center pt-1.5 pb-0 lg:hidden">
                                    <div className="h-1.5 w-10 rounded-full bg-border/60" />
                                </div>

                                {/* Order Header */}
                                <div className="shrink-0 border-b border-border/40 px-2 py-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex min-w-0 items-baseline gap-1.5">
                                            <h2 className="text-sm font-bold text-foreground">Current Order</h2>
                                            <span className="truncate text-[10px] text-muted-foreground">
                                                {cartItemCount === 0
                                                    ? "0 items in cart"
                                                    : `${cartItemCount} item${cartItemCount !== 1 ? "s" : ""} in cart`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {items.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={resetComposer}
                                                    className="min-h-7 rounded-lg px-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-destructive"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setMobileCartOpen(false)}
                                                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
                                                aria-label="Close current order"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Cart Items - Scrollable */}
                                <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-2 py-1.5">
                                    {items.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <ShoppingCart className="size-10 text-muted-foreground/30" />
                                            <p className="mt-3 text-sm font-medium text-muted-foreground">
                                                Cart is empty
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground/60">
                                                Click products to add
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {items.map((item) => {
                                                const pricing = getComposerItemPricing(item);
                                                const lineTotal = pricing.lineTotal;

                                                return (
                                                    <div
                                                        key={item.key}
                                                        className="rounded-xl border border-border/40 bg-background/60 px-2 py-2"
                                                    >
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            {/* Name & Price */}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="whitespace-normal break-words text-sm font-semibold leading-snug text-foreground">
                                                                    {item.name}
                                                                </p>
                                                                <ProductPriceDisplay
                                                                    price={item.unitPrice}
                                                                    discount={item.unitDiscount}
                                                                    size="xs"
                                                                    align="left"
                                                                    singleTone="foreground"
                                                                    className="text-muted-foreground"
                                                                />
                                                            </div>

                                                            {/* Quantity Controls */}
                                                            <div className="flex shrink-0 items-center gap-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        updateItemQuantity(item.key, item.quantity - 1)
                                                                    }
                                                                    className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                                    aria-label={`Decrease ${item.name} quantity`}
                                                                >
                                                                    <Minus className="size-3.5" />
                                                                </button>
                                                                <span className="flex size-7 items-center justify-center text-sm font-bold text-foreground">
                                                                    {item.quantity}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        updateItemQuantity(item.key, item.quantity + 1)
                                                                    }
                                                                    className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                                                                    aria-label={`Increase ${item.name} quantity`}
                                                                >
                                                                    <Plus className="size-3.5" />
                                                                </button>
                                                            </div>

                                                            {/* Line Total */}
                                                            <p className="w-14 shrink-0 text-right text-xs font-bold text-foreground">
                                                                {formatCurrency(lineTotal)}
                                                            </p>

                                                            {/* Delete */}
                                                            <button
                                                                type="button"
                                                                onClick={() => updateItemQuantity(item.key, 0)}
                                                                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                                aria-label={`Remove ${item.name} from order`}
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </button>
                                                        </div>

                                                        {item.addOns.length > 0 ? (
                                                            <div className="mt-1 ml-3 space-y-0.5 border-l border-border/50 pl-3">
                                                                {item.addOns.map((addOn) => (
                                                                    <div
                                                                        key={`${item.key}-${addOn.addOnId}`}
                                                                        className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
                                                                    >
                                                                        <span className="truncate">
                                                                            + {addOn.name} × {addOn.quantity}
                                                                        </span>
                                                                        <span className="shrink-0 font-medium text-foreground/80">
                                                                            {formatCurrency(
                                                                                (addOn.unitPrice - addOn.unitDiscount) *
                                                                                    addOn.quantity *
                                                                                    item.quantity,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : null}

                                                        {item.comboSelections.length > 0 ? (
                                                            <div className="mt-1 ml-3 space-y-0.5 border-l border-border/50 pl-3">
                                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                                    Combo options
                                                                </p>
                                                                {item.comboSelections.map((selection) => (
                                                                    <div
                                                                        key={`${item.key}-${selection.groupId}-${selection.optionProductId}`}
                                                                        className="space-y-0.5 text-xs text-muted-foreground"
                                                                    >
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <span className="min-w-0 truncate">
                                                                                {selection.optionName} ×{" "}
                                                                                {selection.quantity}
                                                                            </span>
                                                                            {selection.priceAdjustment !== 0 ? (
                                                                                <span className="shrink-0 font-medium text-foreground/80">
                                                                                    {formatCurrency(
                                                                                        selection.priceAdjustment *
                                                                                            selection.quantity *
                                                                                            item.quantity,
                                                                                    )}
                                                                                </span>
                                                                            ) : null}
                                                                        </div>
                                                                        {selection.addOns.map((addOn) => (
                                                                            <div
                                                                                key={`${item.key}-${selection.groupId}-${selection.optionProductId}-${addOn.addOnId}`}
                                                                                className="flex items-center justify-between gap-3 pl-3"
                                                                            >
                                                                                <span className="min-w-0 truncate">
                                                                                    + {addOn.name} × {addOn.quantity}
                                                                                </span>
                                                                                <span className="shrink-0 font-medium text-foreground/80">
                                                                                    {formatCurrency(
                                                                                        (addOn.unitPrice -
                                                                                            addOn.unitDiscount) *
                                                                                            addOn.quantity *
                                                                                            selection.quantity *
                                                                                            item.quantity,
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : item.bundleComponents.length > 0 ? (
                                                            <div className="mt-1 ml-3 space-y-0.5 border-l border-border/50 pl-3">
                                                                {item.bundleComponents.map((component) => (
                                                                    <div
                                                                        key={`${item.key}-${component.id}`}
                                                                        className="space-y-0.5 text-xs text-muted-foreground"
                                                                    >
                                                                        <span className="truncate block">
                                                                            {component.name} ×{" "}
                                                                            {component.quantityPerBundle}
                                                                        </span>
                                                                        {component.priceAdjustment !== 0 ? (
                                                                            <span className="truncate block">
                                                                                Option adjustment:{" "}
                                                                                {formatCurrency(
                                                                                    component.priceAdjustment *
                                                                                        component.quantityPerBundle *
                                                                                        item.quantity,
                                                                                )}
                                                                            </span>
                                                                        ) : null}
                                                                        {component.addOns.map((addOn) => (
                                                                            <span
                                                                                key={`${item.key}-${component.id}-${addOn.addOnId}`}
                                                                                className="truncate block pl-3"
                                                                            >
                                                                                + {addOn.name} × {addOn.quantity} (
                                                                                {formatCurrency(
                                                                                    (addOn.unitPrice -
                                                                                        addOn.unitDiscount) *
                                                                                        addOn.quantity *
                                                                                        component.quantityPerBundle *
                                                                                        item.quantity,
                                                                                )}
                                                                                )
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* ─── Compact Checkout Summary ─── */}
                                <div className="shrink-0 border-t border-border/40 bg-card px-3 py-2.5 max-lg:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                                    <div className="mb-2 space-y-0.5 rounded-lg bg-background/40 px-2.5 py-2 text-[11px]">
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(subtotal)}</span>
                                        </div>
                                        {lineDiscountTotal > 0 ? (
                                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                                <span>Item discounts</span>
                                                <span>
                                                    -{formatCurrency(lineDiscountTotal)}
                                                    {itemDiscountPercentage ? ` (${itemDiscountPercentage})` : ""}
                                                </span>
                                            </div>
                                        ) : null}
                                        {orderDiscountAmount > 0 ? (
                                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                                <span>Order discount</span>
                                                <span>
                                                    -{formatCurrency(orderDiscountAmount)}
                                                    {orderDiscountPercentage ? ` (${orderDiscountPercentage})` : ""}
                                                </span>
                                            </div>
                                        ) : null}
                                        <div className="flex justify-between pt-1 text-sm font-bold text-foreground">
                                            <span>Total</span>
                                            <span>{formatCurrency(grandTotal)}</span>
                                        </div>
                                        {displayedDueTotal > 0 && items.length > 0 ? (
                                            <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                                <span>Due after bill</span>
                                                <span>{formatCurrency(displayedDueTotal)}</span>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {isReplacingSale ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-9 rounded-lg text-xs font-semibold"
                                                disabled={completeSaleMutation.isPending}
                                                onClick={resetComposer}
                                            >
                                                Cancel edit
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-9 rounded-lg text-xs font-semibold"
                                                disabled={
                                                    saveDraftMutation.isPending ||
                                                    completeSaleMutation.isPending ||
                                                    items.length === 0 ||
                                                    hasInvalidDiscount
                                                }
                                                onClick={() => saveDraftMutation.mutate()}
                                            >
                                                {saveDraftMutation.isPending
                                                    ? "Saving..."
                                                    : activeDraftId
                                                      ? "Update draft"
                                                      : "Save draft"}
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            className="h-9 rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
                                            disabled={
                                                completeSaleMutation.isPending ||
                                                saveDraftMutation.isPending ||
                                                items.length === 0
                                            }
                                            onClick={() => {
                                                setDiscountEditorOpen(true);
                                                setPlaceOrderDialogOpen(true);
                                            }}
                                        >
                                            {completeSaleMutation.isPending ? "Completing..." : "Place Order"}
                                        </Button>
                                    </div>
                                </div>
                            </aside>
                        </>
                    ) : null
                ) : (
                    <aside
                        className="flex w-full flex-col border-t border-border/50 bg-card/90 backdrop-blur-sm lg:w-[380px] lg:border-t-0 lg:border-l"
                        style={{ maxHeight: panelMaxHeight }}
                    >
                        <div className="space-y-5 border-b border-border/40 px-5 py-5">
                            <span className="w-fit rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
                                Admin read-only
                            </span>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Inspect store billing safely</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    This workspace is now inspection-only for admin users. Open the POS login to create
                                    drafts, complete bills, or collect money.
                                </p>
                            </div>
                            <Button className="w-full rounded-xl" render={<Link to="/pos/login" />}>
                                Open POS login
                            </Button>
                        </div>

                        <div className="grid gap-3 px-5 py-5">
                            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Store</p>
                                <p className="mt-2 text-lg font-semibold text-foreground">{selectedStore?.name ?? "Select a store"}</p>
                            </div>
                            <>
                                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                            Bills in view
                                        </p>
                                        <p className="mt-2 text-3xl font-semibold text-foreground">
                                            {filteredSales.length}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Drafts, paid bills, open dues, and voided bills for this store.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                            Drafts
                                        </p>
                                        <p className="mt-2 text-2xl font-semibold text-foreground">
                                            {sales.filter((sale) => sale.status === "draft").length}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                            Open dues
                                        </p>
                                        <p className="mt-2 text-2xl font-semibold text-foreground">
                                            {
                                                sales.filter(
                                                    (sale) =>
                                                        sale.status === "completed" && sale.paymentStatus !== "paid",
                                                ).length
                                            }
                                        </p>
                                    </div>
                            </>
                        </div>
                    </aside>
                )}
            </div>

            <Dialog
                open={placeOrderDialogOpen}
                disablePointerDismissal
                onOpenChange={(open) => {
                    setPlaceOrderDialogOpen(open);
                    if (!open) {
                        setCustomerPickerOpen(false);
                        setCustomerCreateOpen(false);
                        setCustomerSearch("");
                        setNewCustomerName("");
                        setNewCustomerPhone("");
                    }
                }}
            >
                <DialogContent
                    className={cn(
                        "grid max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] rounded-2xl border-border/70 bg-background/95 p-2 shadow-2xl backdrop-blur-xl sm:w-[calc(100vw-2rem)] sm:p-3",
                        customerPickerOpen && customerCreateOpen ? "overflow-visible" : "overflow-hidden",
                    )}
                >
                    <DialogHeader className="space-y-1 border-b border-border/50 pb-2">
                        <div className="flex items-start gap-2 pr-6">
                            {customerPickerOpen ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (customerCreateOpen) {
                                            setCustomerCreateOpen(false);
                                            setNewCustomerName("");
                                            setNewCustomerPhone("");
                                        } else {
                                            closeCustomerPicker();
                                        }
                                    }}
                                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    aria-label={customerCreateOpen ? "Back to customer search" : "Back to complete order"}
                                >
                                    <ArrowLeft className="size-4" />
                                </button>
                            ) : null}
                            <div className="min-w-0 flex-1">
                                <DialogTitle className="text-xl font-semibold tracking-tight">
                                    {customerCreateOpen
                                        ? "New customer"
                                        : customerPickerOpen
                                          ? "Select customer"
                                          : "Complete order"}
                                </DialogTitle>
                                <DialogDescription className="mt-1 text-xs">
                                    {customerCreateOpen
                                        ? "Add phone and name, then save"
                                        : customerPickerOpen
                                          ? "Search by name or phone · optional for paid bills"
                                          : `${cartItemCount} ${cartItemCount === 1 ? "item" : "items"} in this order`}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {customerPickerOpen ? (
                        <div className="flex min-h-0 flex-col gap-2 pt-1">
                            {customerCreateOpen ? (
                                <>
                                    <div className="shrink-0 space-y-2">
                                        <div>
                                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                                Phone
                                            </label>
                                            <PhoneInput
                                                autoFocus
                                                inputMode="tel"
                                                autoComplete="tel"
                                                className="h-12 rounded-xl bg-muted/40 text-base"
                                                placeholder="Phone number"
                                                value={newCustomerPhone || undefined}
                                                onChange={(value) => setNewCustomerPhone(value ?? "")}
                                                aria-label="Customer phone"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                                Name
                                            </label>
                                            <Input
                                                className="h-12 rounded-xl bg-muted/40 text-base"
                                                placeholder="Customer name"
                                                value={newCustomerName}
                                                onChange={(event) => setNewCustomerName(event.target.value)}
                                                aria-label="Customer name"
                                            />
                                        </div>
                                    </div>
                                    <p className="shrink-0 text-xs text-muted-foreground">
                                        Phone first keeps the number pad open. Name is required to save.
                                    </p>
                                    <div className="min-h-0 flex-1" />
                                </>
                            ) : (
                                <>
                                    <div className="relative shrink-0">
                                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            autoFocus
                                            className="h-11 rounded-xl bg-muted/40 pl-10 text-sm"
                                            placeholder="Search name or phone"
                                            value={customerSearch}
                                            onChange={(event) => setCustomerSearch(event.target.value)}
                                            aria-label="Search customer"
                                        />
                                    </div>

                                    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-0.5">
                                        <button
                                            type="button"
                                            aria-pressed={!selectedCustomer}
                                            onClick={() => selectCustomer(null)}
                                            className={cn(
                                                "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors",
                                                !selectedCustomer
                                                    ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                                                    : "text-foreground hover:bg-muted/80",
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                                                    !selectedCustomer ? "bg-primary/15" : "bg-muted",
                                                )}
                                            >
                                                <User className="size-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-semibold">Walk-in customer</span>
                                                <span className="block text-[11px] text-muted-foreground">
                                                    No account · fastest checkout
                                                </span>
                                            </span>
                                            {!selectedCustomer ? <Check className="size-4 shrink-0" /> : null}
                                        </button>

                                        {filteredCustomers.length > 0 ? (
                                            <>
                                                <p className="px-1 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                                    {customerSearch ? "Matches" : "Customers"}
                                                </p>
                                                {filteredCustomers.map((customer) => {
                                                    const isSelected = selectedCustomerId === customer.id;
                                                    return (
                                                        <button
                                                            key={customer.id}
                                                            type="button"
                                                            aria-pressed={isSelected}
                                                            onClick={() => selectCustomer(customer)}
                                                            className={cn(
                                                                "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors",
                                                                isSelected
                                                                    ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                                                                    : "text-foreground hover:bg-muted/80",
                                                            )}
                                                        >
                                                            <span
                                                                className={cn(
                                                                    "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                                                    isSelected
                                                                        ? "bg-primary/15"
                                                                        : "bg-muted text-muted-foreground",
                                                                )}
                                                            >
                                                                {(customer.name.trim()[0] || "?").toUpperCase()}
                                                            </span>
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block truncate text-sm font-semibold">
                                                                    {customer.name}
                                                                </span>
                                                                <span className="block truncate text-[11px] text-muted-foreground">
                                                                    {customer.phone || "No phone"}
                                                                </span>
                                                            </span>
                                                            {isSelected ? (
                                                                <Check className="size-4 shrink-0" />
                                                            ) : null}
                                                        </button>
                                                    );
                                                })}
                                            </>
                                        ) : (
                                            <div className="space-y-3 px-1 py-6 text-center">
                                                <p className="text-sm text-muted-foreground">No customers found</p>
                                                {customerSearch.trim() ? (
                                                    <button
                                                        type="button"
                                                        onClick={openCustomerCreate}
                                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                                                    >
                                                        <Plus className="size-4" />
                                                        Create “{customerSearch.trim()}”
                                                    </button>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>

                                    <div className="shrink-0 border-t border-border/50 pt-2">
                                        <button
                                            type="button"
                                            onClick={openCustomerCreate}
                                            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/60 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                                        >
                                            <Plus className="size-4" />
                                            <span>Create new customer</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                    <div className="min-h-0 space-y-3 overflow-y-auto pt-1 pb-0 pr-1">
                        <section>
                            <div className="flex items-stretch gap-1.5">
                                <button
                                    type="button"
                                    onClick={openCustomerPicker}
                                    className={cn(
                                        "flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border px-3 text-left transition-colors",
                                        selectedCustomer
                                            ? "border-primary/25 bg-primary/5 hover:bg-primary/10"
                                            : "border-border/60 bg-card/60 hover:bg-muted/50",
                                        requiresCustomerForReceivable &&
                                            "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20",
                                    )}
                                    aria-label="Select customer"
                                >
                                    <span
                                        className={cn(
                                            "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                            selectedCustomer
                                                ? "bg-primary/15 text-primary"
                                                : "bg-muted text-muted-foreground",
                                        )}
                                    >
                                        {selectedCustomer
                                            ? (selectedCustomer.name.trim()[0] || "?").toUpperCase()
                                            : <User className="size-4" />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-foreground">
                                            {selectedCustomer?.name || "Walk-in customer"}
                                        </span>
                                        <span className="block truncate text-[11px] text-muted-foreground">
                                            {selectedCustomer?.phone
                                                ? selectedCustomer.phone
                                                : requiresCustomerForReceivable
                                                  ? "Customer required for due balance"
                                                  : "Optional · tap to assign"}
                                        </span>
                                    </span>
                                    <Search className="size-4 shrink-0 text-muted-foreground" />
                                </button>
                                {selectedCustomer ? (
                                    <button
                                        type="button"
                                        onClick={() => selectCustomer(null)}
                                        className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        aria-label="Use walk-in customer"
                                    >
                                        <X className="size-4" />
                                    </button>
                                ) : null}
                            </div>
                        </section>

                        <section className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="flex min-w-0 flex-1 items-center justify-between text-left text-xs font-semibold text-foreground"
                                    onClick={() => setDiscountEditorOpen((open) => !open)}
                                    aria-expanded={discountEditorOpen}
                                >
                                    <span>{orderDiscountAmount > 0 ? "Order discount" : "Add discount"}</span>
                                    <span
                                        className={
                                            orderDiscountAmount > 0
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : "text-muted-foreground"
                                        }
                                    >
                                        {orderDiscountAmount > 0
                                            ? `-${formatCurrency(orderDiscountAmount)}${orderDiscountPercentage ? ` (${orderDiscountPercentage})` : ""}`
                                            : discountEditorOpen
                                              ? "Hide"
                                              : "Optional"}
                                    </span>
                                </button>
                                {orderDiscountAmount > 0 || discountInput.trim() !== "" ? (
                                    <button
                                        type="button"
                                        onClick={removeOrderDiscount}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
                                        aria-label="Remove discount"
                                    >
                                        <X className="size-3.5" />
                                        <span className="hidden sm:inline">Remove</span>
                                    </button>
                                ) : null}
                            </div>
                            {discountEditorOpen ? (
                                <div className="mt-3 grid gap-2 border-t border-border/50 pt-3 sm:grid-cols-[1fr_auto]">
                                    <div className="flex h-10 shrink-0 items-center rounded-xl border border-border/60 bg-background/50 p-0.5 sm:order-2">
                                        <button
                                            type="button"
                                            onClick={() => changeDiscountMode("amount")}
                                            aria-label="Discount amount"
                                            aria-pressed={discountMode === "amount"}
                                            className={cn(
                                                "flex size-7 items-center justify-center rounded-md text-xs font-semibold transition-colors",
                                                discountMode === "amount"
                                                    ? "bg-foreground text-background"
                                                    : "text-muted-foreground hover:text-foreground",
                                            )}
                                        >
                                            ₹
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => changeDiscountMode("percent")}
                                            aria-label="Discount percentage"
                                            aria-pressed={discountMode === "percent"}
                                            className={cn(
                                                "flex size-7 items-center justify-center rounded-md text-xs font-semibold transition-colors",
                                                discountMode === "percent"
                                                    ? "bg-foreground text-background"
                                                    : "text-muted-foreground hover:text-foreground",
                                            )}
                                        >
                                            %
                                        </button>
                                    </div>
                                    <Input
                                        type="number"
                                        min="0"
                                        max={discountMode === "percent" ? 100 : undefined}
                                        step="0.01"
                                        inputMode="decimal"
                                        className={cn(
                                            "h-10 rounded-xl bg-background/70 text-sm sm:order-1",
                                            discountValidationMessage &&
                                                "border-destructive focus-visible:ring-destructive",
                                        )}
                                        placeholder={discountMode === "percent" ? "0%" : "₹0.00"}
                                        value={discountInput}
                                        onChange={(event) => setDiscountInput(event.target.value)}
                                        aria-label={
                                            discountMode === "percent" ? "Discount percentage" : "Discount amount"
                                        }
                                        aria-invalid={hasInvalidDiscount}
                                    />
                                    <div className="sm:col-span-2">
                                        {discountPresetOptions.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {discountPresetOptions.map((preset) => {
                                                    const isSelected =
                                                        discountMode === "percent"
                                                            ? Number(discountInput) === preset.percentage
                                                            : Number(discountInput) === preset.amount;

                                                    return (
                                                        <button
                                                            key={preset.percentage}
                                                            type="button"
                                                            onClick={() => applyDiscountPreset(preset.percentage, preset.amount)}
                                                            aria-pressed={isSelected}
                                                            className={cn(
                                                                "rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-colors",
                                                                isSelected
                                                                    ? "border-primary bg-primary text-primary-foreground"
                                                                    : "border-border/60 bg-background/70 text-foreground hover:border-primary/40 hover:bg-primary/5",
                                                            )}
                                                        >
                                                            {discountMode === "percent"
                                                                ? `${preset.percentage}%`
                                                                : formatCurrency(preset.amount)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="rounded-lg bg-background/50 px-2 py-1.5 text-[10px] text-muted-foreground">
                                                Add items to enable discount presets.
                                            </p>
                                        )}
                                    </div>
                                    {discountValidationMessage ? (
                                        <p className="text-xs text-destructive sm:col-span-2">
                                            {discountValidationMessage}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </section>

                        <section className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <button
                                type="button"
                                className="flex w-full items-center justify-between text-left text-xs font-semibold text-foreground"
                                onClick={() => setSettlementEditorOpen((open) => !open)}
                                aria-expanded={settlementEditorOpen}
                            >
                                <span>Settlement</span>
                                <span className="text-muted-foreground">
                                    {settlementMode === "full"
                                        ? "Paid in full"
                                        : settlementMode === "partial"
                                          ? "Balance remains"
                                          : "Pay later"}{" "}
                                    {settlementEditorOpen ? "Hide" : "Edit"}
                                </span>
                            </button>
                            {settlementEditorOpen ? (
                                <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                                    <div className="grid grid-cols-3 gap-1">
                                        {settlementOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setSettlementMode(option.value)}
                                                aria-pressed={settlementMode === option.value}
                                                className={cn(
                                                    "h-8 min-h-8 rounded-lg px-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                    settlementMode === option.value
                                                        ? `${option.activeClassName} shadow-md`
                                                        : "border border-border/60 bg-background/70 text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>

                                    {settlementMode !== "due" ? (
                                        <div className="space-y-2 border-t border-border/50 pt-2">
                                            <p className="text-xs font-semibold text-foreground">Payment method</p>
                                            <div className="grid grid-cols-3 gap-1">
                                                {paymentMethodOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => setSelectedPaymentMethod(option.value)}
                                                        aria-pressed={selectedPaymentMethod === option.value}
                                                        className={cn(
                                                            "h-8 min-h-8 rounded-lg px-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                            selectedPaymentMethod === option.value
                                                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                                                : "border border-border/60 bg-background/70 text-muted-foreground hover:text-foreground",
                                                        )}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}

                                    {settlementMode === "partial" ? (
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            inputMode="decimal"
                                            className="h-8 rounded-lg bg-background/60 text-sm"
                                            placeholder="Amount received"
                                            value={partialPaymentAmount}
                                            onChange={(event) => setPartialPaymentAmount(event.target.value)}
                                            aria-label="Amount received"
                                        />
                                    ) : null}

                                    {requiresCustomerForReceivable ? (
                                        <button
                                            type="button"
                                            onClick={openCustomerPicker}
                                            className="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-300"
                                        >
                                            Select a customer to save a bill with a due balance.
                                        </button>
                                    ) : null}

                                    {isOverpaid ? (
                                        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                                            Collected amount exceeds the bill total.
                                        </p>
                                    ) : null}
                                    {settlementMode === "partial" && isPartialAmountMissing && !isOverpaid ? (
                                        <p className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-2 text-xs text-sky-700 dark:text-sky-300">
                                            Enter the amount the customer is paying now.
                                        </p>
                                    ) : null}
                                    {settlementMode === "partial" && matchesFullPayment && !isOverpaid ? (
                                        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-700 dark:text-amber-300">
                                            Select &quot;Paid&quot; when the customer is settling the entire bill
                                            amount.
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </section>

                        <section className="space-y-2 rounded-2xl border border-border/60 bg-card/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-foreground">Invoice options</p>
                                <p className="text-[11px] text-muted-foreground">After placing order</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    disabled={completeSaleMutation.isPending}
                                    aria-pressed={invoiceActions.includes("print")}
                                    onClick={() => toggleInvoiceAction("print")}
                                    className={cn(
                                        "flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        invoiceActions.includes("print")
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border/60 bg-background/70 text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <Printer className="size-3.5" aria-hidden="true" />
                                    Print invoice
                                </button>
                                <button
                                    type="button"
                                    disabled={completeSaleMutation.isPending}
                                    aria-pressed={invoiceActions.includes("whatsapp")}
                                    onClick={() => toggleInvoiceAction("whatsapp")}
                                    className={cn(
                                        "flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        invoiceActions.includes("whatsapp")
                                            ? "border-[#25D366] bg-[#25D366] text-white"
                                            : "border-border/60 bg-background/70 text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <WhatsAppIcon />
                                    WhatsApp
                                </button>
                            </div>
                        </section>

                        <aside className="space-y-3">
                            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    <span>Order total</span>
                                    <span>
                                        {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                {lineDiscountTotal > 0 ? (
                                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                                        <span>Item discounts</span>
                                        <span>
                                            -{formatCurrency(lineDiscountTotal)}
                                            {itemDiscountPercentage ? ` (${itemDiscountPercentage})` : ""}
                                        </span>
                                    </div>
                                ) : null}
                                {orderDiscountAmount > 0 ? (
                                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                                        <span>Order discount</span>
                                        <span>
                                            -{formatCurrency(orderDiscountAmount)}
                                            {orderDiscountPercentage ? ` (${orderDiscountPercentage})` : ""}
                                        </span>
                                    </div>
                                ) : null}
                                <div className="flex items-end justify-between border-t border-border/50 pt-3 text-foreground">
                                    <span>Total</span>
                                    <span className="text-2xl font-bold tracking-tight">
                                        {formatCurrency(grandTotal)}
                                    </span>
                                </div>
                                {displayedDueTotal > 0 ? (
                                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                                        <span>Due after bill</span>
                                        <span className="font-semibold">{formatCurrency(displayedDueTotal)}</span>
                                    </div>
                                ) : null}
                            </div>
                        </aside>
                    </div>
                    )}

                    <DialogFooter className="border-t border-border/50 bg-background/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4 sm:pb-4">
                        {customerCreateOpen ? (
                            <div className="grid w-full grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 w-full rounded-xl px-3 text-sm"
                                    disabled={createCustomerMutation.isPending}
                                    onClick={() => {
                                        setCustomerCreateOpen(false);
                                        setNewCustomerName("");
                                        setNewCustomerPhone("");
                                    }}
                                >
                                    Back
                                </Button>
                                <Button
                                    type="button"
                                    className="h-11 w-full rounded-xl px-3 text-sm font-semibold"
                                    disabled={
                                        createCustomerMutation.isPending || !newCustomerName.trim()
                                    }
                                    onClick={() => {
                                        const payload: CreateCustomerJSON = {
                                            name: newCustomerName.trim(),
                                            phone: newCustomerPhone.trim() || undefined,
                                            isActive: true,
                                        };
                                        createCustomerMutation.mutate(payload);
                                    }}
                                >
                                    {createCustomerMutation.isPending ? "Saving..." : "Save & use"}
                                </Button>
                            </div>
                        ) : customerPickerOpen ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 w-full rounded-xl px-3 text-xs"
                                onClick={closeCustomerPicker}
                            >
                                Done
                            </Button>
                        ) : (
                            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 w-full rounded-xl px-3 text-xs sm:w-auto"
                                    onClick={() => {
                                        setPlaceOrderDialogOpen(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    className="h-10 w-full rounded-xl px-3 text-xs font-semibold sm:w-auto sm:px-5"
                                    disabled={
                                        completeSaleMutation.isPending ||
                                        hasInvalidDiscount ||
                                        hasInvalidPartialPayment ||
                                        requiresCustomerForReceivable
                                    }
                                    onClick={handleCompleteSale}
                                >
                                    {completeSaleMutation.isPending ? "Placing..." : "Place order"}
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
        </div>
    );
};

export default BillingPage;
