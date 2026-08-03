import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSwipeable } from "react-swipeable";
import {
    commitSale,
    commitPosSale,
    completePosSale,
    createDraftSale,
    createPosDraftSale,
    replacePosSale,
    getCategories,
    getOrganizationDetails,
    getPosCategories,
    getPosCustomers,
    getPosProductAddOnAttachments,
    getPosComboProducts,
    getComboProducts,
    deletePosDraftSale,
    getProductAddOnAttachments,
    getPosProducts,
    getPosSale,
    getPosSales,
    getProducts,
    getSale,
    getSales,
    updatePosDraftSale,
    updateDraftSale,
} from "@repo/services";
import type {
    CommitSaleJSON,
    ReplaceSaleJSON,
    CompleteSaleJSON,
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
import { DatePicker } from "@repo/ui/components/date-picker";
import { Input } from "@repo/ui/components/input";
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
    Calendar,
    Filter,
    LayoutGrid,
    MoreHorizontal,
    Minus,
    Plus,
    ReceiptText,
    ShoppingBag,
    ShoppingCart,
    Store,
    Trash2,
    User,
    Users,
    X,
} from "lucide-react";
import { toast } from "sonner";

import CustomerQuickCreateDialog from "@/components/billing/customer-quick-create-dialog";
import CustomerDirectory from "@/components/customers/customer-directory";
import CustomizeProductDialog, { type CustomizeAddOnSelection } from "@/components/billing/customize-product-dialog";
import ConfigureComboDialog, { type ComboDialogSelection } from "@/components/billing/configure-combo-dialog";
import SaleDetailDialog from "@/components/billing/sale-detail-dialog";
import ProductPriceDisplay from "@/components/catalog/product-price-display";
import PosPurchasesPanel from "@/components/purchases/pos-purchases-panel";
import type { BillingWorkspaceMode } from "@/lib/billing-mode";
import { billingKeys, catalogKeys, organizationKeys } from "@/lib/query-keys";
import { formatCurrency, formatDateTime, formatLongDate } from "@/lib/format";
import { getComposerItemPricing } from "@/lib/combo-pricing";
import { buildReceiptText } from "@/lib/receipt-text";
import { printReceiptText } from "@/lib/print-receipt-text";
import {
    getProductCardAction,
    getProductCardActionLabel,
    type ProductCardAction,
} from "@/lib/product-card-interaction";
import { safeRandomUUID } from "@/lib/uuid";

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
type SalesDateFilter = "all" | "today" | "yesterday" | "this-week" | "specific" | "custom";
type BillingPanelTab = "products" | "bills" | "purchases" | "customers";

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

const salesDateFilterOptions: Array<{ value: SalesDateFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this-week", label: "This Week" },
    { value: "specific", label: "Specific date" },
    { value: "custom", label: "Date range" },
];

const startOfLocalDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate());

const nextLocalDay = (value: Date) => {
    const next = startOfLocalDay(value);
    next.setDate(next.getDate() + 1);
    return next;
};

const getSalesDateBounds = (
    filter: SalesDateFilter,
    specificDate: Date | null,
    customFromDate: Date | null,
    customToDate: Date | null,
) => {
    const today = startOfLocalDay(new Date());

    if (filter === "today") {
        return { from: today, to: nextLocalDay(today) };
    }

    if (filter === "yesterday") {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: yesterday, to: today };
    }

    if (filter === "this-week") {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        return { from: weekStart, to: nextLocalDay(today) };
    }

    if (filter === "specific" && specificDate) {
        const from = startOfLocalDay(specificDate);
        return { from, to: nextLocalDay(from) };
    }

    if (filter === "custom") {
        return {
            from: customFromDate ? startOfLocalDay(customFromDate) : null,
            to: customToDate ? nextLocalDay(customToDate) : null,
        };
    }

    return { from: null, to: null };
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

type BillingPageProps = {
    mode?: BillingWorkspaceMode;
    session?: DeviceSessionDTO | null;
    initialPanelTab?: "products" | "bills" | "customers" | "purchases";
    productSearch?: string;
    salesSearch?: string;
    purchaseSearch?: string;
    customerSearch?: string;
    onPanelTabChange?: (tab: "products" | "bills" | "customers" | "purchases") => void;
    onCustomerSearchChange?: (value: string) => void;
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
    onCustomerSearchChange,
}: BillingPageProps) => {
    const queryClient = useQueryClient();
    const { organizationId: organizationIdParam = "" } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const isDeviceMode = mode === "device";
    const canMutate = isDeviceMode;
    const organizationId = isDeviceMode ? (session?.organization.id ?? "") : organizationIdParam;

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
    const [receiptToPrint, setReceiptToPrint] = useState<SaleDetailDTO | null>(null);
    const completionRequestRef = useRef<{
        requestId: string;
        fingerprint: string;
    } | null>(null);
    const [settlementMode, setSettlementMode] = useState<SettlementMode>("full");
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("cash");
    const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
    const [discountInput, setDiscountInput] = useState("");
    const [discountMode, setDiscountMode] = useState<"amount" | "percent">("amount");
    const [placeOrderDialogOpen, setPlaceOrderDialogOpen] = useState(false);
    const [replacingSaleId, setReplacingSaleId] = useState<string | null>(null);
    const [replaceConfirmationOpen, setReplaceConfirmationOpen] = useState(false);
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const [discountEditorOpen, setDiscountEditorOpen] = useState(false);
    const [historyFilter] = useState<"all" | "draft" | "open" | "paid" | "voided">("all");
    const [leftPanelTab, setLeftPanelTab] = useState<BillingPanelTab>(
        isDeviceMode ? initialPanelTab : "bills",
    );

    const [sortBy, setSortBy] = useState<SaleSort>("newest");
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<SalesPaymentMethodFilter>("all");
    const [dateFilter, setDateFilter] = useState<SalesDateFilter>("today");
    const [specificDate, setSpecificDate] = useState<Date | null>(new Date());
    const [customFromDate, setCustomFromDate] = useState<Date | null>(null);
    const [customToDate, setCustomToDate] = useState<Date | null>(null);
    const [customizeProductId, setCustomizeProductId] = useState<string | null>(null);
    const [configureComboProductId, setConfigureComboProductId] = useState<string | null>(null);
    const [mobileCartOpen, setMobileCartOpen] = useState(false);

    const productSearch = productSearchProp ?? "";
    const salesSearch = salesSearchProp ?? "";
    const purchaseSearch = purchaseSearchProp ?? "";
    const deferredProductSearch = useDeferredValue(productSearch.trim().toLowerCase());
    const deferredCustomerSearch = useDeferredValue(customerSearch.trim().toLowerCase());
    const deferredSalesSearch = useDeferredValue(salesSearch.trim().toLowerCase());

    const setSalesDateFilter = (filter: SalesDateFilter) => {
        setDateFilter(filter);
        if (filter === "specific" && !specificDate) {
            setSpecificDate(new Date());
        }
        if (filter !== "specific") {
            setSpecificDate(null);
        }
        if (filter !== "custom") {
            setCustomFromDate(null);
            setCustomToDate(null);
        }
    };

    const changePanelTab = (tab: BillingPanelTab) => {
        if (tab === "bills" && leftPanelTab !== "bills") {
            setSalesDateFilter("today");
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

    const selectableAttachmentsQuery = useQuery({
        queryKey: catalogKeys.selectableProductAttachments(organizationId),
        queryFn: () => getPosProductAddOnAttachments(),
        enabled: isDeviceMode && Boolean(organizationId),
    });

    const salesDateBounds = useMemo(
        () => getSalesDateBounds(dateFilter, specificDate, customFromDate, customToDate),
        [dateFilter, specificDate, customFromDate, customToDate],
    );
    const dateRangeNeedsInput = dateFilter === "custom" && !customFromDate && !customToDate;
    const salesQueryParams = useMemo<SalesListQuery>(() => {
        return {
            limit: 40,
            search: deferredSalesSearch || undefined,
            paymentMethod: paymentMethodFilter === "all" ? undefined : paymentMethodFilter,
            createdFrom: salesDateBounds.from?.toISOString(),
            createdTo: salesDateBounds.to?.toISOString(),
        };
    }, [deferredSalesSearch, paymentMethodFilter, salesDateBounds.from, salesDateBounds.to]);

    const customersQuery = useQuery({
        queryKey: billingKeys.customers(organizationId, { mode: "device" }),
        queryFn: () => getPosCustomers({ limit: 100 }),
        enabled: isDeviceMode && Boolean(organizationId),
    });

    const salesQuery = useQuery({
        queryKey: billingKeys.sales(organizationId, selectedStoreId, salesQueryParams),
        queryFn: () =>
            isDeviceMode
                ? getPosSales(salesQueryParams)
                : getSales(organizationId, selectedStoreId, salesQueryParams),
        enabled: Boolean(organizationId && selectedStoreId) && !dateRangeNeedsInput,
    });

    const organization = isDeviceMode
        ? null
        : organizationQuery.data?.status === "success"
          ? (organizationQuery.data.data?.organization ?? null)
          : null;
    const categories = categoriesQuery.data?.status === "success" ? (categoriesQuery.data.data?.categories ?? []) : [];
    const products = productsQuery.data?.status === "success" ? (productsQuery.data.data?.products ?? []) : [];
    const getComposerUnitDiscountFromSaleItem = (item: SaleDetailDTO["items"][number]) => {
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
    };
    const comboProductsQuery = useQuery({
        queryKey: catalogKeys.combos(organizationId),
        queryFn: () => (isDeviceMode ? getPosComboProducts() : getComboProducts(organizationId)),
        enabled: Boolean(organizationId),
        staleTime: 5 * 60 * 1000,
    });
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
    const sales = salesQuery.data?.status === "success" ? (salesQuery.data.data?.sales ?? []) : [];
    const salesSummary =
        !dateRangeNeedsInput && salesQuery.data?.status === "success" ? salesQuery.data.data?.summary ?? null : null;
    const selectedCustomer =
        customers.find((customer) => customer.id === selectedCustomerId) ?? selectedCustomerFallback;
    const customerSearchLooksLikePhone = /^[+\d\s()-]+$/.test(customerSearch);

    const categoryOptions = [{ id: "all", name: "All" }, ...categories];
    const activeCategoryFilter =
        categoryFilter !== "all" && !categories.some((category) => category.id === categoryFilter)
            ? "all"
            : categoryFilter;
    const filteredCustomers = customers
        .filter((customer) => {
            if (!deferredCustomerSearch) {
                return true;
            }

            return (
                customer.name.toLowerCase().includes(deferredCustomerSearch) ||
                (customer.phone ?? "").toLowerCase().includes(deferredCustomerSearch)
            );
        })
        .slice(0, 6);

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

        if (leftPanelTab === "products" || leftPanelTab === "bills" || leftPanelTab === "customers" || leftPanelTab === "purchases") {
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

    const filteredSales = sales
        .filter((sale) => {
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
        })
        .sort((a, b) => {
            if (sortBy === "newest") {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            if (sortBy === "oldest") {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            if (sortBy === "highest") {
                return b.grandTotal - a.grandTotal;
            }
            if (sortBy === "lowest") {
                return a.grandTotal - b.grandTotal;
            }
            return 0;
        });

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
        setSelectedPaymentMethod("cash");
        setPartialPaymentAmount("");
        setDiscountInput("");
        setDiscountMode("amount");
        setDiscountEditorOpen(false);
        setPlaceOrderDialogOpen(false);
        setCustomerPickerOpen(false);
        setMobileCartOpen(false);
    };

    useEffect(() => {
        if (!receiptToPrint) {
            return;
        }

        const printTimer = window.setTimeout(() => {
            printReceiptText({
                text: buildReceiptText(receiptToPrint),
                title: receiptToPrint.saleNumber ? `Receipt_${receiptToPrint.saleNumber}` : "Receipt",
            });
            setReceiptToPrint(null);
        }, 100);

        return () => {
            window.clearTimeout(printTimer);
        };
    }, [receiptToPrint]);

    const addPlainProductToBill = (product: ProductResponseDTO) => {
        setItems((current) => {
            const existingPlainItem = current.find((item) =>
                isSameComposerConfiguration(item, {
                    productId: product.id,
                    addOns: [],
                }),
            );
            if (existingPlainItem) {
                return current.map((item) =>
                    item.key === existingPlainItem.key ? { ...item, quantity: item.quantity + 1 } : item,
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
                    addOns: [],
                    bundleComponents: [],
                    comboSelections: [],
                },
            ];
        });
    };

    const addProductToBill = (product: ProductResponseDTO) => {
        if (product.productType !== "combo") {
            addPlainProductToBill(product);
            return;
        }

        const combo = preloadedCombos.find((item) => item.product.id === product.id);
        if (comboProductsQuery.isError || comboProductsQuery.data?.status === "error") {
            toast.error("Unable to load Combo options. Retrying now.");
            void comboProductsQuery.refetch();
            return;
        }

        if (!combo) {
            toast.error("This Combo is no longer available");
            return;
        }

        if (combo?.choiceGroups.length) {
            setConfigureComboProductId(product.id);
            return;
        }

        addPlainProductToBill(product);
    };

    const handleProductCardClick = (product: ProductResponseDTO, action: ProductCardAction) => {
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
    };

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
        mutationFn: async ({ requestId }: { requestId: string }) => {
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
        onSuccess: (sale) => {
            const wasReplacing = Boolean(replacingSaleId);
            completionRequestRef.current = null;
            invalidateBillingQueries();
            setPlaceOrderDialogOpen(false);
            setMobileCartOpen(false);
            resetComposer();
            setReceiptToPrint(sale);
            toast.success(
                wasReplacing
                    ? `Bill #${sale.saleNumber ?? ""} edited`
                    : `Bill #${sale.saleNumber ?? ""} completed`,
            );
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to complete bill");
        },
    });

    const submitCompleteSale = () => {
        const fingerprint = JSON.stringify({
            ...buildDraftPayload(),
            payments: buildCommitPayload().payments,
        });
        const existingRequest = completionRequestRef.current;
        const requestId = existingRequest?.fingerprint === fingerprint ? existingRequest.requestId : safeRandomUUID();
        completionRequestRef.current = { requestId, fingerprint };
        completeSaleMutation.mutate({ requestId });
    };

    const handleCompleteSale = () => {
        if (replacingSaleId) {
            setReplaceConfirmationOpen(true);
            return;
        }

        submitCompleteSale();
    };

    const loadSaleIntoComposer = (sale: SaleDetailDTO, editSaleId: string | null) => {
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
        setSelectedPaymentMethod("cash");
        setPartialPaymentAmount("");
        setDiscountInput(Number(sale.orderDiscountAmount) > 0 ? String(sale.orderDiscountAmount) : "");
        setDiscountMode("amount");
        setDiscountEditorOpen(Number(sale.orderDiscountAmount) > 0);
        setLeftPanelTab("products");
    };

    const handleEditSale = (sale: SaleDetailDTO) => {
        loadSaleIntoComposer(sale, sale.id);
        setSaleDialogOpen(false);
        setSelectedSaleId(null);
        setMobileCartOpen(true);
        toast.success("Bill loaded for editing");
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
            loadSaleIntoComposer(sale, null);
            window.scrollTo({ top: 0, behavior: "smooth" });
            toast.success("Draft loaded into the composer");
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to load draft");
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
                    <ArrowLeft className="mr-2 size-4" />
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
                </nav>

                {/* ─── LEFT PANEL: Product Grid ─── */}
                <div
                    className={cn(
                        "min-h-0 flex-1 overflow-y-auto p-4 pb-24 lg:min-w-0 lg:pb-4",
                        canMutate && leftPanelTab === "products" && "lg:pt-0",
                    )}
                    style={{ maxHeight: panelMaxHeight }}
                >
                    {/* Tab Switcher */}
                    {canMutate ? (
                        <div className="-mt-2 mb-3 flex gap-1 rounded-lg border border-border/40 bg-muted/30 p-1 lg:hidden">
                            <button
                                type="button"
                                onClick={() => changePanelTab("products")}
                                className={cn(
                                    "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all duration-200",
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
                                    "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all duration-200",
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
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className={cn(
                                                "h-8 flex-1 gap-1.5 rounded-md px-2.5 text-xs font-semibold",
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

                    {canMutate && leftPanelTab === "purchases" ? (
                        session ? (
                            <PosPurchasesPanel session={session} search={purchaseSearch} />
                        ) : null
                    ) : canMutate && leftPanelTab === "products" ? (
                        <>
                            <div className="flex min-h-full min-w-0 flex-col">
                                {/* Category Filter Pills */}
                                <div className="sticky top-0 z-10 -mx-4 mt-0 mb-0 bg-background/95 px-4 pt-2 pb-5 shadow-sm backdrop-blur-md sm:-mx-4 sm:pb-2 sm:px-4">
                                    <div className="mb-1 flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                            Categories
                                        </p>
                                    </div>
                                    <div className="flex min-w-0 flex-wrap gap-1.5">
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
                                                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
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
                                    className="min-h-[320px] flex-1 touch-pan-y"
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
                                                            "group relative flex min-h-[76px] w-full touch-pan-y items-center gap-2 rounded-xl border px-2 py-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
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
                                                        <div className="min-w-0 flex-1">
                                                            <p className="whitespace-normal break-words text-base font-semibold leading-snug text-foreground">
                                                                {product.name}
                                                            </p>
                                                            <ProductPriceDisplay
                                                                className="mt-0.5"
                                                                price={product.price}
                                                                discount={product.discount}
                                                                size="sm"
                                                                align="left"
                                                            />
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
                                <div className="flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:flex-wrap sm:items-start">
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

                                    {/* Date range Filters */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-1 shrink-0 text-muted-foreground mr-1">
                                            <Calendar className="size-3.5" />
                                        </div>
                                        {salesDateFilterOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setSalesDateFilter(opt.value)}
                                                className={cn(
                                                    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer",
                                                    dateFilter === opt.value
                                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                                        : "bg-muted/40 border border-border/10 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    {dateFilter === "specific" && (
                                        <div className="flex w-full min-w-0 items-center gap-1.5 border-t border-border/40 pt-3 sm:w-auto sm:border-t-0 sm:pt-0">
                                            <DatePicker
                                                value={specificDate}
                                                onChange={(date) => {
                                                    setSpecificDate(date);
                                                    if (date) setDateFilter("specific");
                                                }}
                                                placeholder="Choose date"
                                                className="h-8 min-w-0 w-full text-xs sm:w-40"
                                                clearable={false}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setSalesDateFilter("today")}
                                                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    )}

                                    {dateFilter === "custom" && (
                                        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 border-t border-border/40 pt-3 sm:flex sm:w-auto sm:flex-wrap sm:border-t-0 sm:pt-0">
                                            <DatePicker
                                                value={customFromDate}
                                                onChange={(date) => {
                                                    setCustomFromDate(date);
                                                    setDateFilter("custom");
                                                }}
                                                placeholder="From date"
                                                className="h-8 min-w-0 w-full text-xs sm:w-36"
                                                clearable={false}
                                            />
                                            <span className="shrink-0 text-xs text-muted-foreground">to</span>
                                            <DatePicker
                                                value={customToDate}
                                                onChange={(date) => {
                                                    setCustomToDate(date);
                                                    setDateFilter("custom");
                                                }}
                                                placeholder="To date"
                                                className="h-8 min-w-0 w-full text-xs sm:w-36"
                                                clearable={false}
                                            />
                                            {(customFromDate || customToDate) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSalesDateFilter("all");
                                                    }}
                                                    aria-label="Clear custom date range"
                                                    className="col-span-3 inline-flex h-8 items-center justify-center gap-1 justify-self-end rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:col-span-1"
                                                >
                                                    <X className="size-3.5" />
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    )}
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
                            ) : salesQuery.isError || salesQuery.data?.status === "error" ? (
                                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/20 bg-destructive/5 p-5 text-center">
                                    <ReceiptText className="size-8 text-destructive/70" />
                                    <p className="mt-3 font-medium text-foreground">Recent bills failed to load</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {salesQuery.data?.message || "Please refresh the page."}
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
                                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                                            <div className="w-14 shrink-0">
                                                                <p className="font-bold text-amber-500 dark:text-amber-400 text-sm">
                                                                    {sale.saleNumber ? `#${sale.saleNumber}` : "Draft"}
                                                                </p>
                                                            </div>

                                                            <div className="min-w-0 flex-1 pr-2">
                                                                <p className="truncate text-xs font-semibold text-foreground/80">
                                                                    {sale.customer?.name || "Walk-in customer"}
                                                                </p>
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
                                                                            onClick={() =>
                                                                                resumeDraftMutation.mutate(sale.id)
                                                                            }
                                                                        >
                                                                            Resume
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
                                                <span>-{formatCurrency(lineDiscountTotal)}</span>
                                            </div>
                                        ) : null}
                                        {orderDiscountAmount > 0 ? (
                                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                                <span>Order discount</span>
                                                <span>-{formatCurrency(orderDiscountAmount)}</span>
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
                                            onClick={() => setPlaceOrderDialogOpen(true)}
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
                }}
            >
                <DialogContent className="grid max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border-border/70 bg-background/95 p-2 shadow-2xl backdrop-blur-xl sm:w-[calc(100vw-2rem)] sm:p-3">
                    <DialogHeader className="space-y-1 border-b border-border/50 pb-2">
                        <div className="flex items-start justify-between gap-3 pr-6">
                            <div>
                                <DialogTitle className="text-xl font-semibold tracking-tight">
                                    Complete order
                                </DialogTitle>
                                <DialogDescription className="mt-1 text-xs">
                                    {cartItemCount} {cartItemCount === 1 ? "item" : "items"} in this order
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="min-h-0 space-y-3 overflow-y-auto pt-1 pb-0 pr-1">
                        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <User className="size-4 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                            Customer
                                        </p>
                                        <p className="truncate text-sm font-medium text-foreground">
                                            {selectedCustomer?.name || "Walk-in"}
                                        </p>
                                        {selectedCustomer?.phone ? (
                                            <p className="text-[10px] text-muted-foreground">
                                                {selectedCustomer.phone}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {!selectedCustomer ? (
                                        <span className="hidden text-[11px] font-medium text-muted-foreground sm:block">
                                            Cash sale
                                        </span>
                                    ) : null}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-8 shrink-0 rounded-lg px-2.5 text-[11px]"
                                        onClick={() => {
                                            setCustomerSearch("");
                                            setCustomerPickerOpen((open) => !open);
                                        }}
                                    >
                                        {customerPickerOpen ? "Done" : "Change"}
                                    </Button>
                                </div>
                            </div>

                            {customerPickerOpen ? (
                                <div className="space-y-2 border-t border-border/50 pt-3">
                                    {selectedCustomer ? (
                                        <button
                                            type="button"
                                            className="flex min-h-9 w-full items-center gap-2 rounded-lg border border-dashed border-border/60 bg-background/50 px-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                            onClick={() => {
                                                setSelectedCustomerId("");
                                                setSelectedCustomerFallback(null);
                                                setCustomerSearch("");
                                                setCustomerPickerOpen(false);
                                            }}
                                        >
                                            <User className="size-3.5" />
                                            <span>Continue as Walk-in</span>
                                        </button>
                                    ) : null}
                                    <div className="relative">
                                        <Input
                                            className="h-9 rounded-xl bg-background/70 pr-9 text-xs"
                                            placeholder="Search by name or phone"
                                            value={customerSearch}
                                            onChange={(event) => {
                                                setCustomerSearch(event.target.value);
                                                if (selectedCustomerId) {
                                                    setSelectedCustomerId("");
                                                    setSelectedCustomerFallback(null);
                                                }
                                            }}
                                            aria-label="Search customer"
                                        />
                                        {customerSearch ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCustomerSearch("");
                                                    setSelectedCustomerId("");
                                                    setSelectedCustomerFallback(null);
                                                }}
                                                className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                                aria-label="Clear customer"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        ) : null}
                                    </div>

                                    {customerSearch && !selectedCustomer && filteredCustomers.length > 0 ? (
                                        <div className="space-y-1">
                                            {filteredCustomers.map((customer) => (
                                                <button
                                                    key={customer.id}
                                                    type="button"
                                                    className="flex min-h-9 w-full items-center gap-2 rounded-lg bg-background/60 px-3 text-left text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                                                    onClick={() => {
                                                        setSelectedCustomerId(customer.id);
                                                        setSelectedCustomerFallback(null);
                                                        setCustomerSearch(customer.phone || customer.name);
                                                        setCustomerPickerOpen(false);
                                                    }}
                                                >
                                                    <User className="size-3.5 shrink-0" />
                                                    <span className="font-medium">{customer.name}</span>
                                                    <span className="ml-auto text-[10px] opacity-60">
                                                        {customer.phone || ""}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}

                                    {customerSearch && !selectedCustomer ? (
                                        <CustomerQuickCreateDialog
                                            organizationId={organizationId}
                                            mode={mode}
                                            suggestedName={customerSearchLooksLikePhone ? "" : customerSearch}
                                            suggestedPhone={customerSearchLooksLikePhone ? customerSearch : ""}
                                            onCreated={(customer) => {
                                                setSelectedCustomerId(customer.id);
                                                setSelectedCustomerFallback(customer);
                                                setCustomerSearch(customer.phone || customer.name);
                                                setCustomerPickerOpen(false);
                                            }}
                                            trigger={
                                                <button
                                                    type="button"
                                                    className="flex min-h-9 w-full items-center gap-2 rounded-lg border border-dashed border-border/60 bg-background/50 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                                >
                                                    <Plus className="size-3.5" />
                                                    <span>
                                                        {filteredCustomers.length > 0
                                                            ? "Create a different customer"
                                                            : "Create new customer"}
                                                    </span>
                                                </button>
                                            }
                                        />
                                    ) : null}
                                </div>
                            ) : null}
                        </section>

                        <section className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <button
                                type="button"
                                className="flex w-full items-center justify-between text-left text-xs font-semibold text-foreground"
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
                                        ? `-${formatCurrency(orderDiscountAmount)}`
                                        : discountEditorOpen
                                          ? "Hide"
                                          : "Optional"}
                                </span>
                            </button>
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
                                    {discountValidationMessage ? (
                                        <p className="text-xs text-destructive sm:col-span-2">
                                            {discountValidationMessage}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </section>

                        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-foreground">Settlement</p>
                                <p className="text-xs text-muted-foreground">
                                    {settlementMode === "full"
                                        ? "Paid in full"
                                        : settlementMode === "partial"
                                          ? "Balance remains"
                                          : "Pay later"}
                                </p>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                        {settlementOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setSettlementMode(option.value)}
                                                aria-pressed={settlementMode === option.value}
                                                className={cn(
                                                    "min-h-9 rounded-lg px-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {paymentMethodOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => setSelectedPaymentMethod(option.value)}
                                                        aria-pressed={selectedPaymentMethod === option.value}
                                                        className={cn(
                                                            "min-h-9 rounded-lg px-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
                                            className="h-9 rounded-lg bg-background/60 text-sm"
                                            placeholder="Amount received"
                                            value={partialPaymentAmount}
                                            onChange={(event) => setPartialPaymentAmount(event.target.value)}
                                            aria-label="Amount received"
                                        />
                                    ) : null}

                                    {requiresCustomerForReceivable ? (
                                        <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                                            Select a customer to save a bill with a due balance.
                                        </p>
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
                                        <span>-{formatCurrency(lineDiscountTotal)}</span>
                                    </div>
                                ) : null}
                                {orderDiscountAmount > 0 ? (
                                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                                        <span>Order discount</span>
                                        <span>-{formatCurrency(orderDiscountAmount)}</span>
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

                    <DialogFooter className="border-t border-border/50 bg-background/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4 sm:pb-4">
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

            <CustomizeProductDialog
                key={`${customizeProductId ?? "customize-dialog"}-${customizeProductId ? "open" : "closed"}`}
                open={Boolean(customizeProductId)}
                onOpenChange={(open) => {
                    if (!open) {
                        setCustomizeProductId(null);
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
                    if (!open) setConfigureComboProductId(null);
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
                onEdit={handleEditSale}
            />
        </div>
    );
};

export default BillingPage;
