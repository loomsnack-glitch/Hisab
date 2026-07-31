import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSwipeable } from "react-swipeable";
import {
    commitSale,
    commitPosSale,
    completePosSale,
    createDraftSale,
    createPosDraftSale,
    getCategories,
    getCustomers,
    getOrganizationDetails,
    getPosCategories,
    getPosCustomers,
    getPosProductAddOnAttachments,
    getPosComboProducts,
    getComboProducts,
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
    CompleteSaleJSON,
    CreateDraftSaleJSON,
    DeviceSessionDTO,
    PaymentMethod,
    ProductResponseDTO,
    ComboProductResponse,
    SaleDetailDTO,
    UpdateDraftSaleJSON,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import {
    ArrowLeft,
    ArrowUpDown,
    Calendar,
    Filter,
    LayoutGrid,
    Minus,
    Plus,
    ReceiptText,
    Search,
    ShoppingBag,
    ShoppingCart,
    SlidersHorizontal,
    Store,
    Trash2,
    User,
    X,
} from "lucide-react";
import { toast } from "sonner";

import CustomizeProductDialog, {
  type CustomizeAddOnSelection,
} from "@/components/billing/customize-product-dialog";
import ConfigureComboDialog, { type ComboDialogSelection } from "@/components/billing/configure-combo-dialog";
import SaleDetailDialog from "@/components/billing/sale-detail-dialog";
import ProductPriceDisplay from "@/components/catalog/product-price-display";
import PosPurchasesPanel from "@/components/purchases/pos-purchases-panel";
import type { BillingWorkspaceMode } from "@/lib/billing-mode";
import { billingKeys, catalogKeys, organizationKeys } from "@/lib/query-keys";
import { formatCurrency, formatDateTime, formatLongDate } from "@/lib/format";
import { buildReceiptText } from "@/lib/receipt-text";
import { printReceiptText } from "@/lib/print-receipt-text";
import { safeRandomUUID } from "@/lib/uuid";

type ComposerAddOn = CustomizeAddOnSelection;

type ComposerBundleComponentAddOn = {
    addOnId: string;
    name: string;
    quantity: number;
};

type ComposerBundleComponent = {
    id: string;
    componentProductId: string;
    name: string;
    quantityPerBundle: number;
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

const buildComboConfigurationSignature = (selections: ComposerComboSelection[]) => [...selections]
  .sort((left, right) => `${left.groupId}:${left.optionProductId}`.localeCompare(`${right.groupId}:${right.optionProductId}`))
  .map((selection) => `${selection.groupId}:${selection.optionProductId}:${selection.quantity}:${buildComposerConfigurationSignature(selection.addOns)}`)
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
  buildComboConfigurationSignature(left.comboSelections ?? []) === buildComboConfigurationSignature(right.comboSelections ?? []);

type SettlementMode = "full" | "partial" | "due";

type BillingPageProps = {
    mode?: BillingWorkspaceMode;
    session?: DeviceSessionDTO | null;
  productSearch?: string;
  salesSearch?: string;
  purchaseSearch?: string;
  onPanelTabChange?: (tab: "products" | "bills" | "purchases") => void;
};

const BillingPage = ({
  mode = "admin",
  session = null,
  productSearch: productSearchProp,
  salesSearch: salesSearchProp,
  purchaseSearch: purchaseSearchProp,
  onPanelTabChange,
}: BillingPageProps) => {
    const queryClient = useQueryClient();
    const { organizationId: organizationIdParam = "" } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const isDeviceMode = mode === "device";
    const canMutate = isDeviceMode;
  const organizationId = isDeviceMode
    ? (session?.organization.id ?? "")
    : organizationIdParam;

    const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<ComposerItem[]>([]);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [saleDialogOpen, setSaleDialogOpen] = useState(false);
    const [receiptToPrint, setReceiptToPrint] = useState<SaleDetailDTO | null>(null);
    const completionRequestRef = useRef<{ requestId: string; fingerprint: string } | null>(null);
    const [settlementMode, setSettlementMode] = useState<SettlementMode>("full");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("cash");
    const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
    const [discountInput, setDiscountInput] = useState("");
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">(
    "amount",
    );
  const [placeOrderDialogOpen, setPlaceOrderDialogOpen] = useState(false);
  const [historyFilter] = useState<
    "all" | "draft" | "open" | "paid" | "voided"
  >("all");
  const [leftPanelTab, setLeftPanelTab] = useState<
    "products" | "bills" | "purchases" | "customers"
  >(isDeviceMode ? "products" : "bills");
    const [customerDirectorySearch, setCustomerDirectorySearch] = useState("");

  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "highest" | "lowest"
  >("newest");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<
    "all" | "cash" | "upi" | "card"
  >("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "yesterday" | "this-week"
  >("all");
  const [customizeProductId, setCustomizeProductId] = useState<string | null>(
    null,
  );
  const [configureComboProductId, setConfigureComboProductId] = useState<string | null>(null);
    const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const productSearch = productSearchProp ?? "";
  const salesSearch = salesSearchProp ?? "";
  const purchaseSearch = purchaseSearchProp ?? "";
  const deferredProductSearch = useDeferredValue(
    productSearch.trim().toLowerCase(),
  );
  const deferredCustomerDirectorySearch = useDeferredValue(
    customerDirectorySearch.trim().toLowerCase(),
  );
  const deferredSalesSearch = useDeferredValue(
    salesSearch.trim().toLowerCase(),
  );

  const selectedStoreId = isDeviceMode
    ? (session?.store.id ?? "")
    : searchParams.get("storeId") || "";

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: !isDeviceMode && Boolean(organizationId),
    });

    const categoriesQuery = useQuery({
        queryKey: catalogKeys.categories(organizationId),
    queryFn: () =>
      isDeviceMode ? getPosCategories() : getCategories(organizationId),
        enabled: Boolean(organizationId),
    });

    const productsQuery = useQuery({
        queryKey: catalogKeys.products(organizationId),
    queryFn: () =>
      isDeviceMode ? getPosProducts() : getProducts(organizationId),
        enabled: Boolean(organizationId),
    });

  const selectableAttachmentsQuery = useQuery({
        queryKey: catalogKeys.selectableProductAttachments(organizationId),
        queryFn: () => getPosProductAddOnAttachments(),
        enabled: isDeviceMode && Boolean(organizationId),
    });

    const customersQuery = useQuery({
        queryKey: billingKeys.customers(organizationId),
    queryFn: () =>
      isDeviceMode
        ? getPosCustomers({ limit: 100 })
        : getCustomers(organizationId, { limit: 100 }),
        enabled: Boolean(organizationId),
    });

    const salesQuery = useQuery({
        queryKey: billingKeys.sales(organizationId, selectedStoreId),
        queryFn: () =>
      isDeviceMode
        ? getPosSales({ limit: 40 })
        : getSales(organizationId, selectedStoreId, { limit: 40 }),
        enabled: Boolean(organizationId && selectedStoreId),
    });

    const organization = isDeviceMode
        ? null
        : organizationQuery.data?.status === "success"
          ? (organizationQuery.data.data?.organization ?? null)
          : null;
  const categories =
    categoriesQuery.data?.status === "success"
      ? (categoriesQuery.data.data?.categories ?? [])
      : [];
  const products =
    productsQuery.data?.status === "success"
      ? (productsQuery.data.data?.products ?? [])
      : [];
  const comboProductsQuery = useQuery({
    queryKey: catalogKeys.combos(organizationId),
    queryFn: () => isDeviceMode ? getPosComboProducts() : getComboProducts(organizationId),
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });
  const preloadedCombos = comboProductsQuery.data?.status === "success"
    ? (comboProductsQuery.data.data?.combos ?? [])
    : [];
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
    const selectableAttachments =
        isDeviceMode
            ? selectableAttachmentsQuery.data?.status === "success"
                ? (selectableAttachmentsQuery.data.data?.attachments ?? [])
                : []
            : adminAttachmentQueries.flatMap((query) =>
                  query.data?.status === "success"
                      ? (query.data.data?.attachments ?? []).filter(
                            (attachment) =>
                                attachment.status === "active" && attachment.addOn.status === "active",
                        )
                      : [],
              );
  const customers =
    customersQuery.data?.status === "success"
      ? (customersQuery.data.data?.customers ?? [])
      : [];
  const sales =
    salesQuery.data?.status === "success"
      ? (salesQuery.data.data?.sales ?? [])
      : [];

    const categoryOptions = [{ id: "all", name: "All" }, ...categories];
    const activeCategoryFilter =
    categoryFilter !== "all" &&
    !categories.some((category) => category.id === categoryFilter)
            ? "all"
            : categoryFilter;

    const selectAdjacentCategory = (direction: -1 | 1) => {
        const currentIndex = Math.max(
            0,
      categoryOptions.findIndex(
        (category) => category.id === activeCategoryFilter,
      ),
    );
    const nextIndex = Math.min(
      Math.max(currentIndex + direction, 0),
      categoryOptions.length - 1,
        );
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

        if (leftPanelTab === "products" || leftPanelTab === "bills" || leftPanelTab === "purchases") {
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

  const customizeProduct =
    products.find((product) => product.id === customizeProductId) ?? null;
  const customizeAttachments = customizeProduct
    ? (attachmentsByProductId.get(customizeProduct.id) ?? [])
    : [];
  useEffect(() => {
    if (!configureComboProductId) return;
    if (comboProductsQuery.data?.status === "success" && !configureCombo) {
      toast.error("This Combo is no longer available");
      setConfigureComboProductId(null);
    }
  }, [comboProductsQuery.data, configureCombo, configureComboProductId]);

  const organizationStores =
    isDeviceMode && session ? [session.store] : (organization?.stores ?? []);
    const selectedStore = isDeviceMode
        ? (session?.store ?? null)
    : (organizationStores.find((store) => store.id === selectedStoreId) ??
      null);

    useEffect(() => {
        if (isDeviceMode) {
            return;
        }

        if (!organization?.stores?.length) {
            return;
        }

    const hasSelectedStore = organization.stores.some(
      (store) => store.id === selectedStoreId,
    );
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

  const activeProducts = products.filter(
    (product) => product.status === "active",
  );
    const filteredProducts = activeProducts.filter((product) => {
    const matchesCategory =
      activeCategoryFilter === "all" ||
      product.categoryId === activeCategoryFilter;
    const matchesSearch =
      !deferredProductSearch ||
      product.name.toLowerCase().includes(deferredProductSearch);
        return matchesCategory && matchesSearch;
    });
    const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

    const directoryCustomers = customers.filter((customer) => {
        if (!deferredCustomerDirectorySearch) {
            return true;
        }

        return (
            customer.name.toLowerCase().includes(deferredCustomerDirectorySearch) ||
      (customer.phone ?? "")
        .toLowerCase()
        .includes(deferredCustomerDirectorySearch)
        );
    });

    const filteredSales = sales
        .filter((sale) => {
            const matchesHistoryFilter = (() => {
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
            })();

            const customerName = sale.customer?.name?.toLowerCase() ?? "";
            const customerPhone = sale.customer?.phone?.toLowerCase() ?? "";
            const saleNumberText = sale.saleNumber ? String(sale.saleNumber) : "";
            const matchesSearch =
                !deferredSalesSearch ||
                customerName.includes(deferredSalesSearch) ||
                customerPhone.includes(deferredSalesSearch) ||
                saleNumberText.includes(deferredSalesSearch);

            const matchesPaymentMethod = (() => {
                if (paymentMethodFilter === "all") return true;
        return (sale.paymentMethods ?? "")
          .toLowerCase()
          .includes(paymentMethodFilter);
            })();

            const matchesDate = (() => {
                if (dateFilter === "all") return true;
                const created = new Date(sale.createdAt);
                const now = new Date();
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfYesterday.getDate() - 1);
                const startOfThisWeek = new Date(startOfToday);
                startOfThisWeek.setDate(startOfThisWeek.getDate() - 7);

                if (dateFilter === "today") return created >= startOfToday;
        if (dateFilter === "yesterday")
          return created >= startOfYesterday && created < startOfToday;
                if (dateFilter === "this-week") return created >= startOfThisWeek;
                return true;
            })();

      return (
        matchesHistoryFilter &&
        matchesSearch &&
        matchesPaymentMethod &&
        matchesDate
      );
        })
        .sort((a, b) => {
            if (sortBy === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
            }
            if (sortBy === "oldest") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
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
        const parentSubtotal = item.unitPrice * item.quantity;
        const addOnSubtotal = item.addOns.reduce(
      (addOnTotal, addOn) =>
        addOnTotal + addOn.unitPrice * addOn.quantity * item.quantity,
            0,
        );
        return total + parentSubtotal + addOnSubtotal;
    }, 0);
    const lineDiscountTotal = items.reduce((total, item) => {
        const parentDiscount = item.unitDiscount * item.quantity;
        const addOnDiscount = item.addOns.reduce(
      (addOnTotal, addOn) =>
        addOnTotal + addOn.unitDiscount * addOn.quantity * item.quantity,
            0,
        );
        return total + parentDiscount + addOnDiscount;
    }, 0);
  const discountBase = Math.max(subtotal - lineDiscountTotal, 0);
  const parsedDiscountValue =
    discountInput.trim() === "" ? 0 : Number(discountInput);
  const normalizedDiscountValue =
    Number.isFinite(parsedDiscountValue) && parsedDiscountValue >= 0
      ? parsedDiscountValue
      : 0;
  const roundCurrency = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;
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
  const rawPartialPaymentAmount = Math.max(
    Number(partialPaymentAmount || 0),
    0,
  );
    const collectedTotal =
    settlementMode === "due"
      ? 0
      : settlementMode === "full"
        ? grandTotal
        : rawPartialPaymentAmount;
    const dueTotal = Math.max(grandTotal - collectedTotal, 0);
  const isOverpaid =
    settlementMode === "partial" && rawPartialPaymentAmount > grandTotal;
  const isPartialAmountMissing =
    settlementMode === "partial" && rawPartialPaymentAmount <= 0;
  const matchesFullPayment =
    settlementMode === "partial" &&
    grandTotal > 0 &&
    rawPartialPaymentAmount === grandTotal;
  const hasInvalidPartialPayment =
    isOverpaid || isPartialAmountMissing || matchesFullPayment;

  const changeDiscountMode = (nextMode: "amount" | "percent") => {
    if (nextMode === discountMode) {
      return;
    }

    if (
      discountInput.trim() !== "" &&
      Number.isFinite(parsedDiscountValue) &&
      parsedDiscountValue >= 0
    ) {
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
        setSelectedCustomerId("");
        setNotes("");
        setItems([]);
        setSettlementMode("full");
        setSelectedPaymentMethod("cash");
        setPartialPaymentAmount("");
    setDiscountInput("");
    setDiscountMode("amount");
    setPlaceOrderDialogOpen(false);
    };

    useEffect(() => {
        if (!receiptToPrint) {
            return;
        }

        const printTimer = window.setTimeout(() => {
            printReceiptText({
                text: buildReceiptText(receiptToPrint),
                title: receiptToPrint.saleNumber
                    ? `Receipt_${receiptToPrint.saleNumber}`
                    : "Receipt",
            });
            setReceiptToPrint(null);
        }, 100);

        return () => {
            window.clearTimeout(printTimer);
        };
    }, [receiptToPrint]);

    const addProductToBill = (product: ProductResponseDTO) => {
        if (product.productType === "combo") {
            if (comboProductsQuery.isPending) {
                toast.info("Combo options are still loading");
                return;
            }
            if (comboProductsQuery.isError || comboProductsQuery.data?.status === "error") {
                toast.error("Unable to load Combo options. Retrying now.");
                void comboProductsQuery.refetch();
                return;
            }
            if (!preloadedCombos.some((combo) => combo.product.id === product.id)) {
                toast.error("This Combo is no longer available");
                return;
            }
            setConfigureComboProductId(product.id);
            return;
        }

        setItems((current) => {
            const existingPlainItem = current.find((item) =>
                isSameComposerConfiguration(item, {
                    productId: product.id,
                    addOns: [],
                }),
            );
            if (existingPlainItem) {
                return current.map((item) =>
          item.key === existingPlainItem.key
            ? { ...item, quantity: item.quantity + 1 }
            : item,
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

  const addConfiguredProductToBill = (
    product: ProductResponseDTO,
    addOns: CustomizeAddOnSelection[],
  ) => {
        if (addOns.length === 0) {
            addProductToBill(product);
            return;
        }

        setItems((current) => {
            const existingConfiguredItem = current.find((item) =>
                isSameComposerConfiguration(item, { productId: product.id, addOns }),
            );

            if (existingConfiguredItem) {
                return current.map((item) =>
          item.key === existingConfiguredItem.key
            ? { ...item, quantity: item.quantity + 1 }
            : item,
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
            const existing = current.find((item) => isSameComposerConfiguration(item, {
                productId: combo.product.id,
                addOns: [],
                comboSelections: selections,
            }));
            if (existing) {
                return current.map((item) => item.key === existing.key ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...current, {
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
            }];
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
                addOns: selection.addOns.map((addOn) => ({ addOnId: addOn.addOnId, quantity: addOn.quantity })),
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
              amount:
                settlementMode === "full"
                  ? grandTotal
                  : rawPartialPaymentAmount,
                          method: selectedPaymentMethod,
                          referenceNumber: null,
                          notes: null,
                      },
                  ],
    });

    const saveDraftMutation = useMutation({
        mutationFn: async () => {
            if (!selectedStoreId) {
        throw new Error(
          isDeviceMode ? "Store session is missing" : "Select a store first",
        );
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
          ? await updatePosDraftSale(
              activeDraftId,
              payload as UpdateDraftSaleJSON,
            )
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
            setActiveDraftId(sale.id);
            setItems(
                sale.items.map((item) => ({
                    key: item.id,
                    productId: item.productId,
                    name: item.productNameSnapshot,
          categoryId:
            products.find((product) => product.id === item.productId)
              ?.categoryId ?? "",
                    unitPrice: Number(item.unitPriceSnapshot),
          unitDiscount:
            Number(item.quantity) > 0
              ? Number(item.discountAmount) / Number(item.quantity)
              : 0,
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
                        addOns: (component.addOns ?? []).map((addOn) => ({
                            addOnId: addOn.addOnId,
                            name: addOn.addOnNameSnapshot,
                            quantity: Number(addOn.quantityPerComponent),
                        })),
                    })),
                    comboSelections: (item.bundleComponents ?? []).filter((component) => Boolean(component.choiceGroupId)).map((component) => ({
                        groupId: component.choiceGroupId!,
                        optionProductId: component.componentProductId,
                        quantity: Number(component.quantityPerBundle),
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
            invalidateBillingQueries();
            setMobileCartOpen(false);
            toast.success(sale.status === "draft" ? "Draft saved" : "Bill updated");
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to save draft");
        },
    });

    const completeSaleMutation = useMutation({
        mutationFn: async ({ requestId }: { requestId: string }) => {
            if (!selectedStoreId) {
        throw new Error(
          isDeviceMode ? "Store session is missing" : "Select a store first",
        );
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
        throw new Error(
          "Select 'Paid' when the customer is paying the full bill amount",
        );
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
          ? await updatePosDraftSale(
              activeDraftId,
              draftPayload as UpdateDraftSaleJSON,
            )
                    : await updateDraftSale(
                          organizationId,
                          selectedStoreId,
                          activeDraftId,
                          draftPayload as UpdateDraftSaleJSON,
                      )
                : isDeviceMode
                  ? await createPosDraftSale(draftPayload)
          : await createDraftSale(
              organizationId,
              selectedStoreId,
              draftPayload,
            );

            if (draftResponse.status !== "success" || !draftResponse.data?.sale) {
                throw new Error(draftResponse.message || "Failed to prepare bill");
            }

            const commitResponse = isDeviceMode
                ? await commitPosSale(draftResponse.data.sale.id, buildCommitPayload())
        : await commitSale(
            organizationId,
            selectedStoreId,
            draftResponse.data.sale.id,
            buildCommitPayload(),
          );

            if (commitResponse.status !== "success" || !commitResponse.data?.sale) {
                throw new Error(commitResponse.message || "Failed to complete bill");
            }

            return commitResponse.data.sale;
        },
        onSuccess: (sale) => {
            completionRequestRef.current = null;
            invalidateBillingQueries();
            setPlaceOrderDialogOpen(false);
            setMobileCartOpen(false);
            resetComposer();
            setReceiptToPrint(sale);
            toast.success(`Bill #${sale.saleNumber ?? ""} completed`);
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to complete bill");
        },
    });

    const handleCompleteSale = () => {
        const fingerprint = JSON.stringify({
            ...buildDraftPayload(),
            payments: buildCommitPayload().payments,
        });
        const existingRequest = completionRequestRef.current;
        const requestId = existingRequest?.fingerprint === fingerprint
            ? existingRequest.requestId
            : safeRandomUUID();
        completionRequestRef.current = { requestId, fingerprint };
        completeSaleMutation.mutate({ requestId });
    };

    const resumeDraftMutation = useMutation({
        mutationFn: async (saleId: string) => {
            if (!selectedStoreId) {
        throw new Error(
          isDeviceMode ? "Store session is missing" : "Select a store first",
        );
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
            setActiveDraftId(sale.id);
            setSelectedCustomerId(sale.customerId ?? "");
            setNotes(sale.notes ?? "");
            setItems(
                sale.items.map((item) => ({
                    key: item.id,
                    productId: item.productId,
                    name: item.productNameSnapshot,
                    categoryId: "",
                    unitPrice: Number(item.unitPriceSnapshot),
          unitDiscount:
            Number(item.quantity) > 0
              ? Number(item.discountAmount) / Number(item.quantity)
              : 0,
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
                        addOns: (component.addOns ?? []).map((addOn) => ({
                            addOnId: addOn.addOnId,
                            name: addOn.addOnNameSnapshot,
                            quantity: Number(addOn.quantityPerComponent),
                        })),
                    })),
                    comboSelections: (item.bundleComponents ?? []).filter((component) => Boolean(component.choiceGroupId)).map((component) => ({
                        groupId: component.choiceGroupId!,
                        optionProductId: component.componentProductId,
                        quantity: Number(component.quantityPerBundle),
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
      setDiscountInput(
        sale.orderDiscountAmount > 0 ? String(sale.orderDiscountAmount) : "",
      );
      setDiscountMode("amount");
            setLeftPanelTab("products");
            window.scrollTo({ top: 0, behavior: "smooth" });
            toast.success("Draft loaded into the composer");
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to load draft");
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

  if (
    !isDeviceMode &&
    (organizationQuery.isError ||
      organizationQuery.data?.status === "error" ||
      !organization)
  ) {
        return (
            <div className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-xl shadow-black/5">
        <p className="font-display text-2xl font-semibold text-foreground">
          Billing workspace unavailable
        </p>
                <p className="mt-2 text-sm text-muted-foreground">
                    {organizationQuery.data?.message ||
                        (organizationQuery.error as { message?: string })?.message ||
                        "This organization could not be loaded."}
                </p>
        <Button
          variant="outline"
          className="mt-4 rounded-full"
          render={<Link to="/organizations" />}
        >
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
            Billing is store-scoped. Once a store exists, this screen becomes
            the POS billing surface.
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
              <p className="text-xs text-muted-foreground">
                Admin read-only mode
              </p>
                        </div>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {formatLongDate()}
            </span>
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
                                <SelectValue placeholder="Choose store">
                                    {selectedStore?.name}
                                </SelectValue>
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
            <div className="flex flex-1 flex-col lg:flex-row">
        <nav
          aria-label="Billing workspace navigation"
          className="hidden w-14 shrink-0 flex-col items-center gap-1.5 border-r border-border/40 bg-card/40 py-3 lg:flex"
        >
          {canMutate ? (
            <>
              <button
                type="button"
                onClick={() => setLeftPanelTab("products")}
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
                onClick={() => setLeftPanelTab("bills")}
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
                onClick={() => setLeftPanelTab("purchases")}
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
                onClick={() => setLeftPanelTab("bills")}
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
              <button
                type="button"
                onClick={() => setLeftPanelTab("customers")}
                className={cn(
                  "relative flex size-10 items-center justify-center rounded-xl transition-all",
                  leftPanelTab === "customers"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-label="All customers"
                title="All customers"
              >
                <User className="size-4" />
                {customers.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
                    {customers.length > 9 ? "9+" : customers.length}
                  </span>
                )}
              </button>
            </>
          )}
        </nav>

                {/* ─── LEFT PANEL: Product Grid ─── */}
        <div
          className="flex-1 overflow-y-auto p-4 pb-24 lg:min-w-0 lg:pb-4"
          style={{ maxHeight: panelMaxHeight }}
        >
                    {/* Tab Switcher */}
                    {canMutate ? (
            <div className="mb-3 flex gap-1 rounded-lg border border-border/40 bg-muted/30 p-1 lg:hidden">
                            <button
                                type="button"
                                onClick={() => setLeftPanelTab("products")}
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
                                onClick={() => setLeftPanelTab("bills")}
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
                            <button
                                type="button"
                                onClick={() => setLeftPanelTab("purchases")}
                                className={cn(
                                    "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all duration-200",
                                    leftPanelTab === "purchases"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                <ShoppingBag className="size-3.5" />
                                Purchases
                            </button>
                        </div>
                    ) : (
            <div className="mb-5 flex gap-2 border-b border-border/40 pb-3 lg:hidden">
                            <button
                                type="button"
                                onClick={() => setLeftPanelTab("bills")}
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
                            <button
                                type="button"
                                onClick={() => setLeftPanelTab("customers")}
                                className={cn(
                                    "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200",
                                    leftPanelTab === "customers"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                <User className="size-4" />
                                All customers
                                {customers.length > 0 && (
                                    <span className="flex h-5 items-center justify-center rounded-full bg-background/25 px-1.5 text-[10px] font-bold text-foreground">
                                        {customers.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    {canMutate && leftPanelTab === "purchases" ? (
                        session ? <PosPurchasesPanel session={session} search={purchaseSearch} /> : null
                    ) : canMutate && leftPanelTab === "products" ? (
                        <>
              <div
                className="flex min-h-full flex-col"
                                        >
                                {/* Category Filter Pills */}
                <div className="mb-4">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                            Categories
                                        </p>
                                    </div>
                  <div className="scrollbar-none flex min-h-9 touch-pan-x gap-1.5 overflow-x-auto pb-1">
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
                    <p className="mt-3 font-medium text-foreground">
                      No products found
                    </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Try a different search or category.
                                        </p>
                                    </div>
                                ) : (
                  <div
                    className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                  >
                                    {filteredProducts.map((product) => {
                                        const cartQuantity = items
                                            .filter((item) => item.productId === product.id)
                                            .reduce((total, item) => total + item.quantity, 0);
                                        const isInCart = cartQuantity > 0;
                      const productAttachments =
                        attachmentsByProductId.get(product.id) ?? [];
                      const canCustomize =
                        canMutate && productAttachments.length > 0;

                      const canSellProduct =
                        product.productType === "single" ||
                        product.productType === "combo";
                      const comboLoading = product.productType === "combo" && comboProductsQuery.isPending;
                      const canAddProduct = canSellProduct && !comboLoading;

                                        return (
                                            <div
                                                key={product.id}
                                                className={cn(
                            "group relative flex min-h-[76px] touch-pan-y items-center gap-2 rounded-xl border px-2 py-3 transition-all duration-200",
                                                    isInCart
                                                        ? "border-primary/40 bg-primary/5 shadow-md shadow-primary/10"
                                                        : "border-border/50 bg-card/80",
                                                )}
                                            >
                                                {isInCart && (
                            <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary p-0 text-center text-[9px] font-bold leading-none text-primary-foreground shadow-sm">
                                                        {cartQuantity}
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!canAddProduct) {
                                                            return;
                                                        }

                                                        addProductToBill(product);
                                                    }}
                                                    disabled={!canAddProduct}
                            className={`flex min-w-0 flex-1 items-center gap-2 text-left transition-opacity ${
                                                        canAddProduct
                                ? "hover:opacity-80"
                                                            : "cursor-not-allowed opacity-70"
                                                    }`}
                                                >
                            <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/40 shadow-inner">
                                                        {product.imageSignedUrl ? (
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
                          <button
                            type="button"
                            onClick={() => {
                              if (canAddProduct) {
                                addProductToBill(product);
                              }
                            }}
                            disabled={!canAddProduct}
                            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Add ${product.name} to order`}
                          >
                            {comboLoading
                              ? <Spinner className="size-3.5" />
                              : <Plus className="size-4" />}
                                                </button>
                                                {canCustomize && product.productType === "single" ? (
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setCustomizeProductId(product.id);
                                                        }}
                              className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                              aria-label={`Customize ${product.name}`}
                              title="Customize"
                                                    >
                                                        <SlidersHorizontal className="size-3" />
                                                    </button>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                    </div>
                                )}
                                </div>
                            </div>
                        </>
                    ) : !canMutate && leftPanelTab === "customers" ? (
                        <>
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Organization customers
                  </p>
                                    <p className="text-xs text-muted-foreground">
                                        Shared across all stores in this organization.
                                    </p>
                                </div>
                                <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                                    {directoryCustomers.length} shown
                                </span>
                            </div>

                            <div className="relative mb-5 max-w-md">
                                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="h-10 rounded-xl bg-background/80 pl-10 text-sm"
                                    placeholder="Search by name or phone..."
                                    value={customerDirectorySearch}
                  onChange={(event) =>
                    setCustomerDirectorySearch(event.target.value)
                  }
                                />
                            </div>

                            {customersQuery.isPending ? (
                                <div className="flex min-h-[320px] items-center justify-center">
                                    <Spinner className="size-6 text-primary" />
                                </div>
                            ) : directoryCustomers.length === 0 ? (
                                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40">
                                    <User className="size-8 text-muted-foreground/50" />
                  <p className="mt-3 font-medium text-foreground">
                    No customers found
                  </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {customerDirectorySearch
                                            ? "Try a different search term."
                                            : "Customers created at any store will appear here."}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {directoryCustomers.map((customer) => (
                                        <div
                                            key={customer.id}
                                            className="flex items-center justify-between rounded-xl border border-border/40 bg-card/70 px-4 py-3"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                    <User className="size-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-foreground">
                                                        {customer.name}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {customer.phone || "No phone on file"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {formatCurrency(customer.balance)}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {customer.isActive ? "Active" : "Inactive"}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
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
                                        {[
                                            { value: "newest", label: "Newest" },
                                            { value: "oldest", label: "Oldest" },
                                            { value: "highest", label: "Highest \u20B9" },
                                            { value: "lowest", label: "Lowest \u20B9" },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setSortBy(opt.value as any)}
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

                                    {/* Result count */}
                                    <div className="flex items-center self-end lg:self-auto shrink-0">
                                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                      {filteredSales.length}{" "}
                      {filteredSales.length === 1 ? "order" : "orders"}
                                        </span>
                                    </div>
                                </div>

                                {/* Second Row: Filters (Payment & Date) */}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center border-t border-border/40 pt-4">
                                    {/* Payment Method Filters */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                                        <div className="flex items-center gap-1 shrink-0 text-muted-foreground mr-1">
                                            <Filter className="size-3.5" />
                                        </div>
                                        {[
                                            { value: "all", label: "All" },
                                            { value: "cash", label: "Cash" },
                                            { value: "upi", label: "UPI" },
                                            { value: "card", label: "Card" },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setPaymentMethodFilter(opt.value as any)}
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
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                                        <div className="flex items-center gap-1 shrink-0 text-muted-foreground mr-1">
                                            <Calendar className="size-3.5" />
                                        </div>
                                        {[
                                            { value: "all", label: "All" },
                                            { value: "today", label: "Today" },
                                            { value: "yesterday", label: "Yesterday" },
                                            { value: "this-week", label: "This Week" },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setDateFilter(opt.value as any)}
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
                                </div>
                            </div>

                            {/* Bills List */}
                            {salesQuery.isPending ? (
                                <div className="flex min-h-[320px] items-center justify-center">
                                    <Spinner className="size-6 text-primary" />
                                </div>
                            ) : salesQuery.isError || salesQuery.data?.status === "error" ? (
                                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/20 bg-destructive/5 p-5 text-center">
                                    <ReceiptText className="size-8 text-destructive/70" />
                  <p className="mt-3 font-medium text-foreground">
                    Recent bills failed to load
                  </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {salesQuery.data?.message || "Please refresh the page."}
                                    </p>
                                </div>
                            ) : filteredSales.length === 0 ? (
                                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40 p-5 text-center">
                                    <ReceiptText className="size-8 text-muted-foreground/50" />
                  <p className="mt-3 font-medium text-foreground">
                    No bills found
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No bills in this view yet.
                  </p>
                                </div>
                            ) : (
                                <>
                                    {/* Render payment badges helper function */}
                                    {(() => {
                                        const renderPaymentStatusBadge = (sale: any) => {
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

                                        const renderPaymentMethodBadges = (sale: any) => {
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
                                  {sale.saleNumber
                                    ? `#${sale.saleNumber}`
                                    : "Draft"}
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
                                                                    {sale.itemCount} item{sale.itemCount !== 1 ? "s" : ""} · {formatDateTime(sale.createdAt)}
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
                                {sale.status !== "draft" &&
                                sale.status !== "voided" ? (
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

                                                            <div className="w-24 text-right">
                                                                {canMutate && sale.status === "draft" ? (
                                                                    <Button
                                                                        size="sm"
                                                                        className="rounded-lg text-[11px] h-7 px-2.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                                                        disabled={resumeDraftMutation.isPending}
                                                                        onClick={() =>
                                                                            resumeDraftMutation.mutate(sale.id)
                                                                        }
                                                                    >
                                                                        Resume
                                                                    </Button>
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
                        {cartItemCount} item{cartItemCount === 1 ? "" : "s"} in
                        cart
                                            </span>
                                            <span className="block text-xs text-primary-foreground/75">
                                                Tap to review order
                                            </span>
                                        </span>
                                    </span>
                  <span className="text-lg font-bold">
                    {formatCurrency(grandTotal)}
                  </span>
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
                "flex w-full flex-col border-t border-border/50 bg-card/95 backdrop-blur-sm lg:static lg:w-[320px] lg:border-t-0 lg:border-l",
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
              <div className="border-b border-border/40 px-2 py-1">
                            <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-baseline gap-1.5">
                    <h2 className="text-sm font-bold text-foreground">
                      Current Order
                    </h2>
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
                        <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-1.5">
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
                        const parentTotal =
                          (item.unitPrice - item.unitDiscount) * item.quantity;
                                            const addOnTotal = item.addOns.reduce(
                                                (total, addOn) =>
                                                    total +
                                                    (addOn.unitPrice - addOn.unitDiscount) *
                                                        addOn.quantity *
                                                        item.quantity,
                                                0,
                                            );
                                            const lineTotal = parentTotal + addOnTotal;

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
                                                            />
                                                        </div>

                                                        {/* Quantity Controls */}
                              <div className="flex shrink-0 items-center gap-0.5">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                    updateItemQuantity(
                                      item.key,
                                      item.quantity - 1,
                                    )
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
                                    updateItemQuantity(
                                      item.key,
                                      item.quantity + 1,
                                    )
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

                                                    {item.bundleComponents.length > 0 ? (
                                                        <div className="mt-1 ml-3 space-y-0.5 border-l border-border/50 pl-3">
                                                            {item.comboSelections.length > 0 ? <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Combo options</p> : null}
                                                            {item.bundleComponents.map((component) => (
                                                                <div
                                                                    key={`${item.key}-${component.id}`}
                                                                    className="space-y-0.5 text-xs text-muted-foreground"
                                                                >
                                                                    <span className="truncate block">
                                      {component.name} ×{" "}
                                      {component.quantityPerBundle}
                                                                    </span>
                                                                    {component.addOns.map((addOn) => (
                                                                        <span
                                                                            key={`${item.key}-${component.id}-${addOn.addOnId}`}
                                                                            className="truncate block pl-3"
                                                                        >
                                                                            + {addOn.name} × {addOn.quantity}
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
              <div className="border-t border-border/40 bg-card px-3 py-2.5 max-lg:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
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
                  {dueTotal > 0 && items.length > 0 ? (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span>Due after bill</span>
                      <span>{formatCurrency(dueTotal)}</span>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                                    {completeSaleMutation.isPending
                                        ? "Completing..."
                      : "Place Order"}
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
                <h2 className="text-lg font-bold text-foreground">
                  Inspect store billing safely
                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                  This workspace is now inspection-only for admin users. Open
                  the POS login to create drafts, complete bills, or collect
                  money.
                                </p>
                            </div>
              <Button
                className="w-full rounded-xl"
                render={<Link to="/pos/login" />}
              >
                                Open POS login
                            </Button>
                        </div>

                        <div className="grid gap-3 px-5 py-5">
                            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                    {leftPanelTab === "customers" ? "Organization" : "Store"}
                                </p>
                                <p className="mt-2 text-lg font-semibold text-foreground">
                                    {leftPanelTab === "customers"
                                        ? (organization?.name ?? "Organization")
                                        : (selectedStore?.name ?? "Select a store")}
                                </p>
                            </div>
                            {leftPanelTab === "customers" ? (
                                <>
                                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                            Total customers
                                        </p>
                                        <p className="mt-2 text-3xl font-semibold text-foreground">
                                            {customers.length}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Shared across {organizationStores.length} store
                                            {organizationStores.length !== 1 ? "s" : ""}.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                            With balance due
                                        </p>
                                        <p className="mt-2 text-2xl font-semibold text-foreground">
                      {
                        customers.filter((customer) => customer.balance > 0)
                          .length
                      }
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                            Active customers
                                        </p>
                                        <p className="mt-2 text-2xl font-semibold text-foreground">
                                            {customers.filter((customer) => customer.isActive).length}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                            Bills in view
                                        </p>
                                        <p className="mt-2 text-3xl font-semibold text-foreground">
                                            {filteredSales.length}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                      Drafts, paid bills, open dues, and voided bills for this
                      store.
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
                            sale.status === "completed" &&
                            sale.paymentStatus !== "paid",
                                                ).length
                                            }
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </aside>
                )}
            </div>

      <Dialog
        open={placeOrderDialogOpen}
        onOpenChange={(open) => {
          setPlaceOrderDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-6xl overflow-y-auto rounded-2xl border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur-xl sm:p-5 max-sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold">
              Complete order
            </DialogTitle>
            <DialogDescription className="sr-only">
              Review the total, discount, and payment before placing the order.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr] lg:items-start">
            <div className="space-y-4 rounded-xl border border-border/60 bg-card/60 p-4">
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Discount</p>
                </div>
                <div className="flex h-9 shrink-0 items-center rounded-lg border border-border/60 bg-background/50 p-0.5">
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
              </div>
              <Input
                type="number"
                min="0"
                max={discountMode === "percent" ? 100 : undefined}
                step="0.01"
                inputMode="decimal"
                className={cn(
                  "h-9 rounded-lg bg-background/60 text-sm",
                  discountValidationMessage &&
                    "border-destructive focus-visible:ring-destructive",
                )}
                placeholder={discountMode === "percent" ? "0%" : "₹0.00"}
                value={discountInput}
                onChange={(event) => setDiscountInput(event.target.value)}
                aria-label={
                  discountMode === "percent"
                    ? "Discount percentage"
                    : "Discount amount"
                }
                aria-invalid={hasInvalidDiscount}
              />
              {discountValidationMessage ? (
                <p className="text-xs text-destructive">
                  {discountValidationMessage}
                </p>
              ) : null}
            </section>

            <div className="space-y-3">
            <section className="space-y-2 border-t border-border/50 pt-4">
              <p className="text-xs font-semibold text-foreground">Settlement</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: "full" as const, label: "Paid", active: "bg-emerald-500 text-white" },
                  { value: "partial" as const, label: "Partial", active: "bg-sky-500 text-white" },
                  { value: "due" as const, label: "Due", active: "bg-amber-500 text-white" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSettlementMode(option.value)}
                    className={cn(
                      "min-h-9 rounded-lg px-2 text-xs font-semibold transition-all duration-200",
                      settlementMode === option.value
                        ? `${option.active} shadow-md`
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
                    {[
                      { value: "cash" as const, label: "Cash" },
                      { value: "upi" as const, label: "UPI" },
                      { value: "card" as const, label: "Card" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(option.value)}
                        className={cn(
                          "min-h-9 rounded-lg px-2 text-xs font-semibold transition-all duration-200",
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
                  Select &quot;Paid&quot; when the customer is settling the entire bill amount.
                </p>
              ) : null}
            </section>

            </div>
            </div>

            <div className="space-y-3 lg:sticky lg:top-0">
            <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-xs">
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
              <div className="flex items-center justify-between border-t border-border/50 pt-1.5 text-base font-bold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
              {dueTotal > 0 ? (
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                  <span>Due after bill</span>
                  <span className="font-semibold">{formatCurrency(dueTotal)}</span>
                </div>
              ) : null}
            </div>

          </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border/50 pt-3 max-sm:flex-row max-sm:[&>button]:flex-1 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl text-xs"
              onClick={() => {
                setPlaceOrderDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl text-xs font-semibold"
              disabled={
                completeSaleMutation.isPending ||
                hasInvalidDiscount ||
                hasInvalidPartialPayment
              }
              onClick={handleCompleteSale}
            >
              {completeSaleMutation.isPending ? "Placing..." : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

            <CustomizeProductDialog
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
                open={Boolean(configureComboProductId)}
                onOpenChange={(open) => {
                    if (!open) setConfigureComboProductId(null);
                }}
                combo={configureCombo}
                attachmentsByProductId={attachmentsByProductId}
                onConfirm={addConfiguredComboToBill}
            />

            <SaleDetailDialog
                open={saleDialogOpen}
                onOpenChange={setSaleDialogOpen}
                mode={mode}
                organizationId={organizationId}
                storeId={selectedStoreId}
                saleId={selectedSaleId}
            />
        </div>
    );
};

export default BillingPage;
