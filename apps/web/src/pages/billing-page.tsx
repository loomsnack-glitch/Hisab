import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    commitSale,
    commitPosSale,
    createDraftSale,
    createPosDraftSale,
    getCategories,
    getCustomers,
    getOrganizationDetails,
    getPosCategories,
    getPosCustomers,
    getPosProductAddOnAttachments,
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
    CreateDraftSaleJSON,
    DeviceSessionDTO,
    PaymentMethod,
    ProductResponseDTO,
    UpdateDraftSaleJSON,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import {
    ArrowLeft,
    ArrowUpDown,
    Banknote,
    Calendar,
    CreditCard,
    Filter,
    Grid,
    LayoutGrid,
    List,
    Minus,
    Plus,
    Receipt,
    ReceiptText,
    Search,
    ShoppingCart,
    SlidersHorizontal,
    Smartphone,
    Store,
    Trash2,
    User,
} from "lucide-react";
import { toast } from "sonner";

import CustomerQuickCreateDialog from "@/components/billing/customer-quick-create-dialog";
import CustomizeProductDialog, {
    type CustomizeAddOnSelection,
} from "@/components/billing/customize-product-dialog";
import SaleDetailDialog from "@/components/billing/sale-detail-dialog";
import ProductPriceDisplay from "@/components/catalog/product-price-display";
import type { BillingWorkspaceMode } from "@/lib/billing-mode";
import { billingKeys, catalogKeys, organizationKeys } from "@/lib/query-keys";
import { formatCurrency, formatDateTime, formatLongDate } from "@/lib/format";

type ComposerAddOn = CustomizeAddOnSelection;

type ComposerItem = {
    key: string;
    productId: string;
    name: string;
    categoryId: string;
    unitPrice: number;
    unitDiscount: number;
    quantity: number;
    addOns: ComposerAddOn[];
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

const isSameComposerConfiguration = (left: ComposerItem, right: {
    productId: string;
    addOns: ComposerAddOn[];
}) =>
    left.productId === right.productId
    && buildComposerConfigurationSignature(left.addOns)
        === buildComposerConfigurationSignature(right.addOns);

type SettlementMode = "full" | "partial" | "due";

/* ---------- emoji map for product categories ---------- */
const categoryEmojis: Record<string, string> = {
    burger: "🍔",
    burgers: "🍔",
    pizza: "🍕",
    pizzas: "🍕",
    drink: "🥤",
    drinks: "🥤",
    beverage: "🥤",
    beverages: "🥤",
    dessert: "🍰",
    desserts: "🍰",
    sides: "🍟",
    side: "🍟",
    fries: "🍟",
    shake: "🥛",
    shakes: "🥛",
    coffee: "☕",
    tea: "🍵",
    ice: "🧊",
    icecream: "🍦",
    sandwich: "🥪",
    wrap: "🌯",
    salad: "🥗",
    chicken: "🍗",
    noodles: "🍜",
    pasta: "🍝",
    snack: "🍿",
    snacks: "🍿",
};

const getProductEmoji = (categoryName: string) => {
    const key = categoryName.toLowerCase().trim();
    if (categoryEmojis[key]) return categoryEmojis[key];
    // partial match
    for (const [k, v] of Object.entries(categoryEmojis)) {
        if (key.includes(k) || k.includes(key)) return v;
    }
    return "🛒";
};

type BillingPageProps = {
    mode?: BillingWorkspaceMode;
    session?: DeviceSessionDTO | null;
};

const BillingPage = ({
    mode = "admin",
    session = null,
}: BillingPageProps) => {
    const queryClient = useQueryClient();
    const { organizationId: organizationIdParam = "" } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const isDeviceMode = mode === "device";
    const canMutate = isDeviceMode;
    const organizationId = isDeviceMode ? session?.organization.id ?? "" : organizationIdParam;

    const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<ComposerItem[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const [salesSearch, setSalesSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [saleDialogOpen, setSaleDialogOpen] = useState(false);
    const [settlementMode, setSettlementMode] = useState<SettlementMode>("full");
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("cash");
    const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
    const [discountInput, setDiscountInput] = useState("");
    const [historyFilter] = useState<"all" | "draft" | "open" | "paid" | "voided">("all");
    const [leftPanelTab, setLeftPanelTab] = useState<"products" | "bills" | "customers">(
        isDeviceMode ? "products" : "bills",
    );
    const [customerDirectorySearch, setCustomerDirectorySearch] = useState("");

    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
    const [viewLayout, setViewLayout] = useState<"large" | "small" | "list">("large");
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<"all" | "cash" | "upi" | "card">("all");
    const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "this-week">("all");
    const [customizeProductId, setCustomizeProductId] = useState<string | null>(null);

    const deferredProductSearch = useDeferredValue(productSearch.trim().toLowerCase());
    const deferredCustomerSearch = useDeferredValue(customerSearch.trim().toLowerCase());
    const deferredCustomerDirectorySearch = useDeferredValue(customerDirectorySearch.trim().toLowerCase());
    const deferredSalesSearch = useDeferredValue(salesSearch.trim().toLowerCase());

    const selectedStoreId = isDeviceMode ? session?.store.id ?? "" : searchParams.get("storeId") || "";

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: !isDeviceMode && Boolean(organizationId),
    });

    const categoriesQuery = useQuery({
        queryKey: catalogKeys.categories(organizationId),
        queryFn: () => isDeviceMode ? getPosCategories() : getCategories(organizationId),
        enabled: Boolean(organizationId),
    });

    const productsQuery = useQuery({
        queryKey: catalogKeys.products(organizationId),
        queryFn: () => isDeviceMode ? getPosProducts() : getProducts(organizationId),
        enabled: Boolean(organizationId),
    });

    const selectableAttachmentsQuery = useQuery({
        queryKey: catalogKeys.selectableProductAttachments(organizationId),
        queryFn: () => getPosProductAddOnAttachments(),
        enabled: isDeviceMode && Boolean(organizationId),
    });

    const customersQuery = useQuery({
        queryKey: billingKeys.customers(organizationId),
        queryFn: () => isDeviceMode ? getPosCustomers({ limit: 100 }) : getCustomers(organizationId, { limit: 100 }),
        enabled: Boolean(organizationId),
    });

    const salesQuery = useQuery({
        queryKey: billingKeys.sales(organizationId, selectedStoreId),
        queryFn: () => isDeviceMode ? getPosSales({ limit: 40 }) : getSales(organizationId, selectedStoreId, { limit: 40 }),
        enabled: Boolean(organizationId && selectedStoreId),
    });

    const organization =
        isDeviceMode
            ? null
            : organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization ?? null : null;
    const categories =
        categoriesQuery.data?.status === "success" ? categoriesQuery.data.data?.categories ?? [] : [];
    const products =
        productsQuery.data?.status === "success" ? productsQuery.data.data?.products ?? [] : [];
    const selectableAttachments =
        selectableAttachmentsQuery.data?.status === "success"
            ? selectableAttachmentsQuery.data.data?.attachments ?? []
            : [];
    const customers =
        customersQuery.data?.status === "success" ? customersQuery.data.data?.customers ?? [] : [];
    const sales =
        salesQuery.data?.status === "success" ? salesQuery.data.data?.sales ?? [] : [];

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
    const customizeAttachments = customizeProduct
        ? attachmentsByProductId.get(customizeProduct.id) ?? []
        : [];

    const organizationStores = isDeviceMode && session ? [session.store] : organization?.stores ?? [];
    const selectedStore = isDeviceMode
        ? session?.store ?? null
        : organizationStores.find((store) => store.id === selectedStoreId) ?? null;

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

    const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;

    const activeProducts = products.filter((product) => product.status === "active");
    const filteredProducts = activeProducts.filter((product) => {
        const matchesCategory = categoryFilter === "all" || product.categoryId === categoryFilter;
        const matchesSearch = !deferredProductSearch
            || product.name.toLowerCase().includes(deferredProductSearch);
        return matchesCategory && matchesSearch;
    });

    const filteredCustomers = customers.filter((customer) => {
        if (!deferredCustomerSearch) {
            return true;
        }

        return customer.name.toLowerCase().includes(deferredCustomerSearch)
            || (customer.phone ?? "").toLowerCase().includes(deferredCustomerSearch);
    }).slice(0, 6);

    const directoryCustomers = customers.filter((customer) => {
        if (!deferredCustomerDirectorySearch) {
            return true;
        }

        return customer.name.toLowerCase().includes(deferredCustomerDirectorySearch)
            || (customer.phone ?? "").toLowerCase().includes(deferredCustomerDirectorySearch);
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
            const saleNumberText = sale.saleNumber ? String(sale.saleNumber) : "";
            const matchesSearch = !deferredSalesSearch
                || customerName.includes(deferredSalesSearch)
                || saleNumberText.includes(deferredSalesSearch);

            const matchesPaymentMethod = (() => {
                if (paymentMethodFilter === "all") return true;
                return (sale.paymentMethods ?? "").toLowerCase().includes(paymentMethodFilter);
            })();

            const matchesDate = (() => {
                if (dateFilter === "all") return true;
                const created = new Date(sale.createdAt);
                const now = new Date();
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfYesterday.getDate() - 1);
                const startOfThisWeek = new Date(startOfToday);
                startOfThisWeek.setDate(startOfThisWeek.getDate() - 7);

                if (dateFilter === "today") return created >= startOfToday;
                if (dateFilter === "yesterday") return created >= startOfYesterday && created < startOfToday;
                if (dateFilter === "this-week") return created >= startOfThisWeek;
                return true;
            })();

            return matchesHistoryFilter && matchesSearch && matchesPaymentMethod && matchesDate;
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
        const parentSubtotal = item.unitPrice * item.quantity;
        const addOnSubtotal = item.addOns.reduce(
            (addOnTotal, addOn) => addOnTotal + addOn.unitPrice * addOn.quantity * item.quantity,
            0,
        );
        return total + parentSubtotal + addOnSubtotal;
    }, 0);
    const lineDiscountTotal = items.reduce((total, item) => {
        const parentDiscount = item.unitDiscount * item.quantity;
        const addOnDiscount = item.addOns.reduce(
            (addOnTotal, addOn) => addOnTotal + addOn.unitDiscount * addOn.quantity * item.quantity,
            0,
        );
        return total + parentDiscount + addOnDiscount;
    }, 0);
    const orderDiscountAmount = Math.max(Number(discountInput || 0), 0);
    const totalDiscount = lineDiscountTotal + orderDiscountAmount;
    const grandTotal = Math.max(subtotal - totalDiscount, 0);
    const rawPartialPaymentAmount = Math.max(Number(partialPaymentAmount || 0), 0);
    const collectedTotal = settlementMode === "due"
        ? 0
        : settlementMode === "full"
            ? grandTotal
            : rawPartialPaymentAmount;
    const dueTotal = Math.max(grandTotal - collectedTotal, 0);
    const isOverpaid = settlementMode === "partial" && rawPartialPaymentAmount > grandTotal;
    const isPartialAmountMissing = settlementMode === "partial" && rawPartialPaymentAmount <= 0;
    const matchesFullPayment = settlementMode === "partial" && grandTotal > 0 && rawPartialPaymentAmount === grandTotal;
    const hasInvalidPartialPayment = isOverpaid || isPartialAmountMissing || matchesFullPayment;

    const invalidateBillingQueries = () => {
        queryClient.invalidateQueries({ queryKey: billingKeys.organization(organizationId) });
    };

    const resetComposer = () => {
        setActiveDraftId(null);
        setSelectedCustomerId("");
        setCustomerSearch("");
        setNotes("");
        setItems([]);
        setSettlementMode("full");
        setSelectedPaymentMethod("cash");
        setPartialPaymentAmount("");
        setDiscountInput("");
    };

    const addProductToBill = (product: ProductResponseDTO) => {
        setItems((current) => {
            const existingPlainItem = current.find(
                (item) => isSameComposerConfiguration(item, { productId: product.id, addOns: [] }),
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
                    key: crypto.randomUUID(),
                    productId: product.id,
                    name: product.name,
                    categoryId: product.categoryId,
                    unitPrice: Number(product.price),
                    unitDiscount: Number(product.discount ?? 0),
                    quantity: 1,
                    addOns: [],
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
                    key: crypto.randomUUID(),
                    productId: product.id,
                    name: product.name,
                    categoryId: product.categoryId,
                    unitPrice: Number(product.price),
                    unitDiscount: Number(product.discount ?? 0),
                    quantity: 1,
                    addOns,
                },
            ];
        });
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

    const ensureCustomerForDue = () => {
        if (dueTotal <= 0 || selectedCustomerId) {
            return true;
        }

        toast.error("Attach a customer before leaving any balance unpaid");
        return false;
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
        })),
    });

    const buildCommitPayload = (): CommitSaleJSON => ({
        customerId: selectedCustomerId || null,
        orderDiscountAmount,
        notes: notes.trim() || null,
        payments:
            settlementMode === "due"
                ? []
                : [{
                    amount: settlementMode === "full" ? grandTotal : rawPartialPaymentAmount,
                    method: selectedPaymentMethod,
                    referenceNumber: null,
                    notes: null,
                }],
    });

    const saveDraftMutation = useMutation({
        mutationFn: async () => {
            if (!selectedStoreId) {
                throw new Error(isDeviceMode ? "Store session is missing" : "Select a store first");
            }

            if (items.length === 0) {
                throw new Error("Add at least one product before saving a draft");
            }

            const payload = buildDraftPayload();
            const response = activeDraftId
                ? isDeviceMode
                    ? await updatePosDraftSale(activeDraftId, payload as UpdateDraftSaleJSON)
                    : await updateDraftSale(organizationId, selectedStoreId, activeDraftId, payload as UpdateDraftSaleJSON)
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
            invalidateBillingQueries();
            toast.success(sale.status === "draft" ? "Draft saved" : "Bill updated");
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to save draft");
        },
    });

    const completeSaleMutation = useMutation({
        mutationFn: async () => {
            if (!selectedStoreId) {
                throw new Error(isDeviceMode ? "Store session is missing" : "Select a store first");
            }

            if (items.length === 0) {
                throw new Error("Add at least one product before completing the bill");
            }

            if (isOverpaid) {
                throw new Error("Collected amount cannot exceed the bill total");
            }

            if (settlementMode === "partial" && isPartialAmountMissing) {
                throw new Error("Enter the amount the customer is paying now");
            }

            if (matchesFullPayment) {
                throw new Error("Use 'Pay full now' when the customer is paying the full bill amount");
            }

            if (!ensureCustomerForDue()) {
                throw new Error("A customer is required for unpaid or partially paid bills");
            }

            const draftPayload = buildDraftPayload();
            const draftResponse = activeDraftId
                ? isDeviceMode
                    ? await updatePosDraftSale(activeDraftId, draftPayload as UpdateDraftSaleJSON)
                    : await updateDraftSale(organizationId, selectedStoreId, activeDraftId, draftPayload as UpdateDraftSaleJSON)
                : isDeviceMode
                    ? await createPosDraftSale(draftPayload)
                    : await createDraftSale(organizationId, selectedStoreId, draftPayload);

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
            invalidateBillingQueries();
            resetComposer();
            toast.success(`Bill #${sale.saleNumber ?? ""} completed`);
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to complete bill");
        },
    });

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
            setActiveDraftId(sale.id);
            setSelectedCustomerId(sale.customerId ?? "");
            const cust = customers.find((c) => c.id === sale.customerId);
            setCustomerSearch(cust ? (cust.phone || cust.name) : "");
            setNotes(sale.notes ?? "");
            setItems(
                sale.items.map((item) => ({
                    key: item.id,
                    productId: item.productId,
                    name: item.productNameSnapshot,
                    categoryId: "",
                    unitPrice: Number(item.unitPriceSnapshot),
                    unitDiscount: Number(item.quantity) > 0 ? Number(item.discountAmount) / Number(item.quantity) : 0,
                    quantity: Number(item.quantity),
                    addOns: (item.addOns ?? []).map((addOn) => ({
                        addOnId: addOn.addOnId,
                        name: addOn.addOnNameSnapshot,
                        unitPrice: Number(addOn.unitPriceSnapshot),
                        unitDiscount: Number(addOn.unitDiscountSnapshot),
                        quantity: Number(addOn.quantityPerParent),
                    })),
                })),
            );
            setSettlementMode("full");
            setSelectedPaymentMethod("cash");
            setPartialPaymentAmount("");
            setDiscountInput(sale.orderDiscountAmount > 0 ? String(sale.orderDiscountAmount) : "");
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

    const handleFindCustomer = () => {
        if (!customerSearch.trim()) return;
        const match = customers.find(
            (c) =>
                c.phone?.includes(customerSearch.trim()) ||
                c.name.toLowerCase().includes(customerSearch.trim().toLowerCase()),
        );
        if (match) {
            setSelectedCustomerId(match.id);
            setCustomerSearch(match.phone || match.name);
            toast.success(`Customer found: ${match.name}`);
        } else {
            toast.error("No customer found");
        }
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
                    {organizationQuery.data?.message
                        || (organizationQuery.error as { message?: string })?.message
                        || "This organization could not be loaded."}
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
                    render={<Link to={`/organizations/${organizationId}`} />}
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
                    <Button className="mt-4 rounded-full" render={<Link to={`/organizations/${organizationId}`} />}>
                        Go to store setup
                    </Button>
                </div>
            </div>
        );
    }

    const panelMaxHeight = isDeviceMode
        ? "calc(100vh - 3.5rem)"
        : "calc(100vh - 3.5rem - 57px)";

    return (
        <div className="billing-pos-layout flex flex-col gap-0" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
            {!isDeviceMode ? (
                <header className="flex items-center justify-between border-b border-border/50 bg-card/60 px-5 py-3 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                                Billing history
                            </h1>
                            <p className="text-xs text-muted-foreground">Admin read-only mode</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatLongDate()}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Store className="size-4" />
                            <span className="hidden sm:inline">Store:</span>
                        </div>
                        <Select value={selectedStoreId} onValueChange={setStore}>
                            <SelectTrigger className="h-9 min-w-[160px] rounded-xl bg-background/80 px-3 text-sm">
                                <SelectValue placeholder="Choose store" />
                            </SelectTrigger>
                            <SelectContent>
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
            <div className="flex flex-1 flex-col xl:flex-row">
                {/* ─── LEFT PANEL: Product Grid ─── */}
                <div className="flex-1 overflow-y-auto p-5" style={{ maxHeight: panelMaxHeight }}>
                    {/* Tab Switcher */}
                    {canMutate ? (
                        <div className="mb-5 flex gap-2 border-b border-border/40 pb-3">
                            <button
                                type="button"
                                onClick={() => setLeftPanelTab("products")}
                                className={cn(
                                    "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200",
                                    leftPanelTab === "products"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                <LayoutGrid className="size-4" />
                                Products Shelf
                            </button>
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
                                Recent Bills & Drafts
                                {sales.length > 0 && (
                                    <span className="flex h-5 items-center justify-center rounded-full bg-background/25 px-1.5 text-[10px] font-bold text-foreground">
                                        {sales.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="mb-5 flex gap-2 border-b border-border/40 pb-3">
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

                    {canMutate && leftPanelTab === "products" ? (
                        <>
                            {/* Search Bar */}
                            <div className="relative mb-4">
                                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="h-10 rounded-xl bg-background/80 pl-10 text-sm"
                                    placeholder="Search products..."
                                    value={productSearch}
                                    onChange={(event) => setProductSearch(event.target.value)}
                                />
                            </div>

                            {/* Category Filter Pills */}
                            <div className="mb-5 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCategoryFilter("all")}
                                    className={cn(
                                        "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
                                        categoryFilter === "all"
                                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                    )}
                                >
                                    All
                                </button>
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => setCategoryFilter(category.id)}
                                        className={cn(
                                            "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
                                            categoryFilter === category.id
                                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                        )}
                                    >
                                        {category.name}
                                    </button>
                                ))}
                            </div>

                            {/* Product Grid */}
                            {productsQuery.isPending ? (
                                <div className="flex min-h-[320px] items-center justify-center">
                                    <Spinner className="size-6 text-primary" />
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40">
                                    <ShoppingCart className="size-8 text-muted-foreground/50" />
                                    <p className="mt-3 font-medium text-foreground">No products found</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Try a different search or category.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                                    {filteredProducts.map((product) => {
                                        const catName = categories.find((c) => c.id === product.categoryId)?.name || "Item";
                                        const emoji = getProductEmoji(catName);
                                        const cartQuantity = items
                                            .filter((item) => item.productId === product.id)
                                            .reduce((total, item) => total + item.quantity, 0);
                                        const isInCart = cartQuantity > 0;
                                        const productAttachments = attachmentsByProductId.get(product.id) ?? [];
                                        const canCustomize = canMutate && productAttachments.length > 0;

                                        return (
                                            <div
                                                key={product.id}
                                                className={cn(
                                                    "group relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all duration-200",
                                                    isInCart
                                                        ? "border-primary/40 bg-primary/5 shadow-md shadow-primary/10"
                                                        : "border-border/50 bg-card/80",
                                                )}
                                            >
                                                {isInCart && (
                                                    <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                                                        {cartQuantity}
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => addProductToBill(product)}
                                                    className="flex w-full flex-col items-center hover:-translate-y-0.5 transition-transform"
                                                >
                                                    <div className="relative mb-2.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted/40 transition-transform duration-300 group-hover:scale-105 shadow-inner">
                                                        {product.imagePath?.startsWith("icon:") ? (
                                                            <span className="text-3xl select-none select-none-emoji">{product.imagePath.replace("icon:", "")}</span>
                                                        ) : product.imageSignedUrl ? (
                                                            <img
                                                                src={product.imageSignedUrl}
                                                                alt={product.name}
                                                                className="h-full w-full rounded-full object-cover border border-border/40"
                                                            />
                                                        ) : (
                                                            <span className="text-3xl select-none select-none-emoji">{emoji}</span>
                                                        )}
                                                    </div>
                                                    <p className="mt-2.5 text-sm font-semibold leading-tight text-foreground">
                                                        {product.name}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">{catName}</p>
                                                    <ProductPriceDisplay
                                                        className="mt-2"
                                                        price={product.price}
                                                        discount={product.discount}
                                                        size="md"
                                                    />
                                                </button>
                                                {canCustomize ? (
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setCustomizeProductId(product.id);
                                                        }}
                                                        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                                    >
                                                        <SlidersHorizontal className="size-3" />
                                                        Customize
                                                    </button>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : !canMutate && leftPanelTab === "customers" ? (
                        <>
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Organization customers</p>
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
                                    onChange={(event) => setCustomerDirectorySearch(event.target.value)}
                                />
                            </div>

                            {customersQuery.isPending ? (
                                <div className="flex min-h-[320px] items-center justify-center">
                                    <Spinner className="size-6 text-primary" />
                                </div>
                            ) : directoryCustomers.length === 0 ? (
                                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40">
                                    <User className="size-8 text-muted-foreground/50" />
                                    <p className="mt-3 font-medium text-foreground">No customers found</p>
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
                                    {/* Search input */}
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            className="h-10 rounded-xl bg-background/80 pl-10 text-sm"
                                            placeholder="Search by ID or customer..."
                                            value={salesSearch}
                                            onChange={(event) => setSalesSearch(event.target.value)}
                                        />
                                    </div>

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
                                                        : "bg-muted/40 border border-border/10 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Layout controls & count */}
                                    <div className="flex items-center gap-3 self-end lg:self-auto shrink-0">
                                        <div className="flex items-center rounded-xl bg-muted/30 p-1 border border-border/10">
                                            {[
                                                { value: "large", label: "Large", icon: LayoutGrid },
                                                { value: "small", label: "Small", icon: Grid },
                                                { value: "list", label: "List", icon: List },
                                            ].map((layout) => {
                                                const IconComponent = layout.icon;
                                                return (
                                                    <button
                                                        key={layout.value}
                                                        type="button"
                                                        onClick={() => setViewLayout(layout.value as any)}
                                                        className={cn(
                                                            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer",
                                                            viewLayout === layout.value
                                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                                : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        <IconComponent className="size-3.5" />
                                                        <span>{layout.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                                            {filteredSales.length} {filteredSales.length === 1 ? "order" : "orders"}
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
                                                        : "bg-muted/40 border border-border/10 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
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
                                                        : "bg-muted/40 border border-border/10 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
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
                                    <p className="mt-3 font-medium text-foreground">Recent bills failed to load</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {salesQuery.data?.message || "Please refresh the page."}
                                    </p>
                                </div>
                            ) : filteredSales.length === 0 ? (
                                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40 p-5 text-center">
                                    <ReceiptText className="size-8 text-muted-foreground/50" />
                                    <p className="mt-3 font-medium text-foreground">No bills found</p>
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
                                                    <span key="cash" className="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                        Cash
                                                    </span>
                                                );
                                            }
                                            if (methods.includes("upi")) {
                                                badges.push(
                                                    <span key="upi" className="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                        UPI
                                                    </span>
                                                );
                                            }
                                            if (methods.includes("card")) {
                                                badges.push(
                                                    <span key="card" className="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                                        Card
                                                    </span>
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

                                        if (viewLayout === "large") {
                                            return (
                                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                    {filteredSales.map((sale) => (
                                                        <div
                                                            key={sale.id}
                                                            className="group flex flex-col justify-between rounded-2xl border border-border/50 bg-card/85 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                                                        >
                                                            <div>
                                                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                                                    <p className="font-bold text-amber-500 dark:text-amber-400 text-sm">
                                                                        {sale.saleNumber ? `#${sale.saleNumber}` : "Draft Bill"}
                                                                    </p>
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        {renderPaymentStatusBadge(sale)}
                                                                        {renderPaymentMethodBadges(sale)}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                    <Calendar className="size-3.5 text-muted-foreground/70" />
                                                                    <span>{formatDateTime(sale.createdAt)}</span>
                                                                </div>

                                                                <p className="text-sm font-semibold text-foreground/90 line-clamp-2 mt-3.5 leading-relaxed min-h-[40px]">
                                                                    {sale.itemsSummary || "No items"}
                                                                </p>

                                                                <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-border/40">
                                                                    <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                                                                        {sale.customer?.name || "Walk-in"} • {sale.itemCount} item{sale.itemCount !== 1 ? "s" : ""}
                                                                    </span>
                                                                    <div className="text-right">
                                                                        <span className="text-lg font-bold text-foreground">
                                                                            {formatCurrency(sale.grandTotal)}
                                                                        </span>
                                                                        {sale.status !== "draft" && sale.status !== "voided" && (
                                                                            <p className={cn(
                                                                                "mt-1 text-[10px] font-semibold",
                                                                                Number(sale.dueTotal) > 0
                                                                                    ? "text-amber-600 dark:text-amber-400"
                                                                                    : "text-emerald-600 dark:text-emerald-400",
                                                                            )}>
                                                                                {Number(sale.dueTotal) > 0
                                                                                    ? `Due ${formatCurrency(sale.dueTotal)}`
                                                                                    : "Paid in full"}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between mt-5 pt-3 border-t border-border/40">
                                                                <div className="text-[11px] font-bold text-emerald-500 dark:text-emerald-400">
                                                                    {sale.grandTotal > 0 ? `+${Math.round(sale.grandTotal / 10)} pts` : ""}
                                                                </div>
                                                                <div>
                                                                    {canMutate && sale.status === "draft" ? (
                                                                        <Button
                                                                            size="sm"
                                                                            className="rounded-xl text-xs h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
                                                                            disabled={resumeDraftMutation.isPending}
                                                                            onClick={() => resumeDraftMutation.mutate(sale.id)}
                                                                        >
                                                                            {resumeDraftMutation.isPending ? "Loading..." : "Resume draft"}
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="rounded-xl text-xs h-8 px-4"
                                                                            onClick={() => {
                                                                                setSelectedSaleId(sale.id);
                                                                                setSaleDialogOpen(true);
                                                                            }}
                                                                        >
                                                                            Open details
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }

                                        if (viewLayout === "small") {
                                            return (
                                                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                                    {filteredSales.map((sale) => (
                                                        <div
                                                            key={sale.id}
                                                            className="flex flex-col justify-between rounded-xl border border-border/40 bg-card/75 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                                                        >
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <p className="font-bold text-amber-500 dark:text-amber-400 text-xs">
                                                                        {sale.saleNumber ? `#${sale.saleNumber}` : "Draft"}
                                                                    </p>
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        {renderPaymentStatusBadge(sale)}
                                                                        {renderPaymentMethodBadges(sale)}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="text-[10px] text-muted-foreground truncate">
                                                                    {formatDateTime(sale.createdAt)}
                                                                </div>

                                                                <div className="flex items-center justify-between border-t border-border/30 pt-2">
                                                                    <span className="text-[11px] text-muted-foreground truncate max-w-[90px]">
                                                                        {sale.customer?.name || "Walk-in"}
                                                                    </span>
                                                                    <div className="text-right">
                                                                        <span className="text-sm font-bold text-foreground">
                                                                            {formatCurrency(sale.grandTotal)}
                                                                        </span>
                                                                        {sale.status !== "draft" && sale.status !== "voided" && (
                                                                            <p className={cn(
                                                                                "mt-0.5 text-[9px] font-semibold",
                                                                                Number(sale.dueTotal) > 0
                                                                                    ? "text-amber-600 dark:text-amber-400"
                                                                                    : "text-emerald-600 dark:text-emerald-400",
                                                                            )}>
                                                                                {Number(sale.dueTotal) > 0
                                                                                    ? `Due ${formatCurrency(sale.dueTotal)}`
                                                                                    : "Paid"}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="mt-3.5">
                                                                {canMutate && sale.status === "draft" ? (
                                                                    <Button
                                                                        size="sm"
                                                                        className="w-full rounded-lg text-[11px] h-7 bg-primary text-primary-foreground hover:bg-primary/90"
                                                                        disabled={resumeDraftMutation.isPending}
                                                                        onClick={() => resumeDraftMutation.mutate(sale.id)}
                                                                    >
                                                                        Resume
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="w-full rounded-lg text-[11px] h-7"
                                                                        onClick={() => {
                                                                            setSelectedSaleId(sale.id);
                                                                            setSaleDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        Details
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }

                                        // list view
                                        return (
                                            <div className="flex flex-col gap-2">
                                                {filteredSales.map((sale) => (
                                                    <div
                                                        key={sale.id}
                                                        className="flex items-center justify-between border border-border/40 bg-card/70 px-4 py-3 rounded-xl transition-all hover:bg-card/90 hover:border-primary/20 hover:shadow-xs"
                                                    >
                                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                                            <div className="w-14 shrink-0">
                                                                <p className="font-bold text-amber-500 dark:text-amber-400 text-sm">
                                                                    {sale.saleNumber ? `#${sale.saleNumber}` : "Draft"}
                                                                </p>
                                                            </div>
                                                            
                                                            <div className="w-32 shrink-0 hidden md:block text-xs text-muted-foreground">
                                                                {formatDateTime(sale.createdAt)}
                                                            </div>

                                                            <div className="min-w-0 flex-1 pr-4">
                                                                <p className="text-xs font-semibold text-foreground/80 truncate">
                                                                    {sale.customer?.name || "Walk-in"} • {sale.itemCount} item{sale.itemCount !== 1 ? "s" : ""}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                                    {sale.itemsSummary || "No items"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 shrink-0">
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
                                                                    <p className={cn(
                                                                        "mt-0.5 text-[9px] font-bold",
                                                                        Number(sale.dueTotal) > 0
                                                                            ? "text-amber-600 dark:text-amber-400"
                                                                            : "text-emerald-500 dark:text-emerald-400",
                                                                    )}>
                                                                        {Number(sale.dueTotal) > 0
                                                                            ? `Due ${formatCurrency(sale.dueTotal)}`
                                                                            : "Paid in full"}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 mt-0.5">
                                                                        {sale.grandTotal > 0 ? `+${Math.round(sale.grandTotal / 10)} pts` : ""}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="w-24 text-right">
                                                                {canMutate && sale.status === "draft" ? (
                                                                    <Button
                                                                        size="sm"
                                                                        className="rounded-lg text-[11px] h-7 px-2.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                                                        disabled={resumeDraftMutation.isPending}
                                                                        onClick={() => resumeDraftMutation.mutate(sale.id)}
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
                <aside
                    className="flex w-full flex-col border-t border-border/50 bg-card/90 backdrop-blur-sm xl:w-[380px] xl:border-t-0 xl:border-l"
                    style={{ maxHeight: panelMaxHeight }}
                >
                    {/* Order Header */}
                    <div className="border-b border-border/40 px-5 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Current Order</h2>
                                <p className="text-sm text-muted-foreground">
                                    {items.length === 0
                                        ? "0 items in cart"
                                        : `${items.reduce((s, i) => s + i.quantity, 0)} item${items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""} in cart`}
                                </p>
                            </div>
                            {items.length > 0 && (
                                <button
                                    type="button"
                                    onClick={resetComposer}
                                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable content area */}
                    <div className="flex flex-1 flex-col overflow-y-auto">
                        {/* Phone Number / Customer Search */}
                        <div className="border-b border-border/40 px-5 py-3">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        className="h-10 rounded-xl bg-background/70 pl-9 text-sm"
                                        placeholder="Phone number"
                                        value={customerSearch}
                                        onChange={(event) => {
                                            setCustomerSearch(event.target.value);
                                            if (!event.target.value) setSelectedCustomerId("");
                                        }}
                                        onKeyDown={(e) => e.key === "Enter" && handleFindCustomer()}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
                                    onClick={handleFindCustomer}
                                >
                                    Find
                                </Button>
                            </div>

                            {selectedCustomer && (
                                <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs">
                                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                        {selectedCustomer.name}
                                    </span>
                                    <span className="text-emerald-600/70 dark:text-emerald-300/70">
                                        {selectedCustomer.phone || "No phone"}
                                    </span>
                                    <button
                                        type="button"
                                        className="ml-auto text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
                                        onClick={() => { setSelectedCustomerId(""); setCustomerSearch(""); }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Customer quick-create (hidden trigger, accessible from phone search) */}
                            {customerSearch && !selectedCustomer && filteredCustomers.length === 0 && (
                                <div className="mt-2">
                                    <CustomerQuickCreateDialog
                                        organizationId={organizationId}
                                        mode={mode}
                                        suggestedName={customerSearch}
                                        onCreated={(customer) => {
                                            setSelectedCustomerId(customer.id);
                                            setCustomerSearch(customer.phone || customer.name);
                                        }}
                                        trigger={
                                            <button
                                                type="button"
                                                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border/60 bg-background/50 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                            >
                                                <Plus className="size-3.5" />
                                                <span>Create new customer "{customerSearch}"</span>
                                            </button>
                                        }
                                    />
                                </div>
                            )}

                            {/* Customer search dropdown results */}
                            {customerSearch && !selectedCustomer && filteredCustomers.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {filteredCustomers.slice(0, 4).map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className="flex w-full items-center gap-2 rounded-lg bg-background/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                                            onClick={() => {
                                                setSelectedCustomerId(c.id);
                                                setCustomerSearch(c.phone || c.name);
                                            }}
                                        >
                                            <User className="size-3 shrink-0" />
                                            <span className="font-medium">{c.name}</span>
                                            <span className="ml-auto text-[10px] opacity-60">{c.phone || ""}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 px-5 py-3">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <ShoppingCart className="size-10 text-muted-foreground/30" />
                                    <p className="mt-3 text-sm font-medium text-muted-foreground">Cart is empty</p>
                                    <p className="mt-1 text-xs text-muted-foreground/60">Click products to add</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {items.map((item) => {
                                        const associatedProduct = products.find((p) => p.id === item.productId);
                                        const catName = categories.find((c) => c.id === item.categoryId)?.name || "Item";
                                        const emoji = getProductEmoji(catName);
                                        const parentTotal = (item.unitPrice - item.unitDiscount) * item.quantity;
                                        const addOnTotal = item.addOns.reduce(
                                            (total, addOn) =>
                                                total + (addOn.unitPrice - addOn.unitDiscount) * addOn.quantity * item.quantity,
                                            0,
                                        );
                                        const lineTotal = parentTotal + addOnTotal;

                                        return (
                                            <div
                                                key={item.key}
                                                className="rounded-xl border border-border/40 bg-background/60 px-3 py-2.5"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Image/Emoji */}
                                                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/40 shadow-inner">
                                                        {associatedProduct?.imagePath?.startsWith("icon:") ? (
                                                            <span className="text-lg select-none select-none-emoji">{associatedProduct.imagePath.replace("icon:", "")}</span>
                                                        ) : associatedProduct?.imageSignedUrl ? (
                                                            <img
                                                                src={associatedProduct.imageSignedUrl}
                                                                alt={item.name}
                                                                className="h-full w-full rounded-full object-cover border border-border/40"
                                                            />
                                                        ) : (
                                                            <span className="text-lg select-none select-none-emoji">{emoji}</span>
                                                        )}
                                                    </div>

                                                    {/* Name & Price */}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-foreground">
                                                            {item.name}
                                                        </p>
                                                        <ProductPriceDisplay
                                                            price={item.unitPrice}
                                                            discount={item.unitDiscount}
                                                            size="sm"
                                                            align="left"
                                                            singleTone="foreground"
                                                        />
                                                    </div>

                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateItemQuantity(item.key, item.quantity - 1)}
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Minus className="size-3" />
                                                        </button>
                                                        <span className="w-6 text-center text-sm font-bold text-foreground">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateItemQuantity(item.key, item.quantity + 1)}
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                                                        >
                                                            <Plus className="size-3" />
                                                        </button>
                                                    </div>

                                                    {/* Line Total */}
                                                    <p className="w-16 text-right text-sm font-bold text-foreground shrink-0">
                                                        {formatCurrency(lineTotal)}
                                                    </p>

                                                    {/* Delete */}
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItemQuantity(item.key, 0)}
                                                        className="text-muted-foreground/50 transition-colors hover:text-destructive shrink-0"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>

                                                {item.addOns.length > 0 ? (
                                                    <div className="mt-2 space-y-1 border-l border-border/50 pl-4 ml-4">
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
                                                                        (addOn.unitPrice - addOn.unitDiscount)
                                                                        * addOn.quantity
                                                                        * item.quantity,
                                                                    )}
                                                                </span>
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
                    </div>

                    {/* ─── Bottom Checkout Area (always visible) ─── */}
                    <div className="border-t border-border/40 bg-card px-5 py-4">
                        {/* Discount Input */}
                        <div className="mb-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                    Pricing
                                </span>
                                {orderDiscountAmount > 0 ? (
                                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                        Order discount applied
                                    </span>
                                ) : null}
                            </div>
                            <Input
                                type="number"
                                min="0"
                                step="1"
                                className="h-10 rounded-xl bg-background/60 text-sm"
                                placeholder="Discount ₹"
                                value={discountInput}
                                onChange={(e) => setDiscountInput(e.target.value)}
                            />
                        </div>

                        {/* Summary */}
                        <div className="mb-3 space-y-1.5 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {lineDiscountTotal > 0 && (
                                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                    <span>Item discounts</span>
                                    <span>-{formatCurrency(lineDiscountTotal)}</span>
                                </div>
                            )}
                            {orderDiscountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                    <span>Order discount</span>
                                    <span>-{formatCurrency(orderDiscountAmount)}</span>
                                </div>
                            )}
                            {collectedTotal > 0 && (
                                <div className="flex justify-between text-sky-600 dark:text-sky-400">
                                    <span>Collected now</span>
                                    <span>{formatCurrency(collectedTotal)}</span>
                                </div>
                            )}
                            {dueTotal > 0 && items.length > 0 && (
                                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                    <span>Due after bill</span>
                                    <span>{formatCurrency(dueTotal)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-1.5 text-lg font-bold text-foreground">
                                <span>Total</span>
                                <span>{formatCurrency(grandTotal)}</span>
                            </div>
                        </div>

                        <div className="mb-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Settlement
                            </p>
                            <div className="grid grid-cols-3 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setSettlementMode("full")}
                                    className={cn(
                                        "flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition-all duration-200",
                                        settlementMode === "full"
                                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                                            : "border border-border/60 bg-background/70 text-muted-foreground hover:border-emerald-500/40 hover:text-foreground",
                                    )}
                                >
                                    <ReceiptText className="size-3.5" />
                                    Pay full
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSettlementMode("partial")}
                                    className={cn(
                                        "flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition-all duration-200",
                                        settlementMode === "partial"
                                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                                            : "border border-border/60 bg-background/70 text-muted-foreground hover:border-sky-500/40 hover:text-foreground",
                                    )}
                                >
                                    <CreditCard className="size-3.5" />
                                    Pay partial
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSettlementMode("due")}
                                    className={cn(
                                        "flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition-all duration-200",
                                        settlementMode === "due"
                                            ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                                            : "border border-border/60 bg-background/70 text-muted-foreground hover:border-amber-500/40 hover:text-foreground",
                                    )}
                                >
                                    <Receipt className="size-3.5" />
                                    Mark due
                                </button>
                            </div>
                        </div>

                        {settlementMode !== "due" && (
                            <div className="mb-3">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                    Payment Method
                                </p>
                                <div className="grid grid-cols-3 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPaymentMethod("cash")}
                                        className={cn(
                                            "flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition-all duration-200",
                                            selectedPaymentMethod === "cash"
                                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                                                : "border border-border/60 bg-background/70 text-muted-foreground hover:border-emerald-500/40 hover:text-foreground",
                                        )}
                                    >
                                        <Banknote className="size-3.5" />
                                        Cash
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPaymentMethod("upi")}
                                        className={cn(
                                            "flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition-all duration-200",
                                            selectedPaymentMethod === "upi"
                                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                                : "border border-border/60 bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                        )}
                                    >
                                        <Smartphone className="size-3.5" />
                                        UPI
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPaymentMethod("card")}
                                        className={cn(
                                            "flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition-all duration-200",
                                            selectedPaymentMethod === "card"
                                                ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                                                : "border border-border/60 bg-background/70 text-muted-foreground hover:border-sky-500/40 hover:text-foreground",
                                        )}
                                    >
                                        <CreditCard className="size-3.5" />
                                        Card
                                    </button>
                                </div>
                            </div>
                        )}

                        {settlementMode === "partial" && (
                            <div className="mb-3">
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="h-10 rounded-xl bg-background/60 text-sm"
                                    placeholder="Collected Amount INR"
                                    value={partialPaymentAmount}
                                    onChange={(e) => setPartialPaymentAmount(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Warnings */}
                        {isOverpaid && (
                            <div className="mb-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                Collected amount exceeds the bill total.
                            </div>
                        )}

                        {settlementMode === "partial" && isPartialAmountMissing && !isOverpaid && (
                            <div className="mb-3 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
                                Enter the amount the customer is paying now.
                            </div>
                        )}

                        {settlementMode === "partial" && matchesFullPayment && !isOverpaid && (
                            <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                                Use &quot;Pay full&quot; when the customer is settling the entire bill amount.
                            </div>
                        )}

                        {!selectedCustomerId && dueTotal > 0 && items.length > 0 && (
                            <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                                Attach a customer for partial or due bills.
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 rounded-xl text-sm font-semibold"
                                disabled={saveDraftMutation.isPending || completeSaleMutation.isPending || items.length === 0}
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
                                className="h-11 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 text-sm"
                                disabled={
                                    completeSaleMutation.isPending
                                    || saveDraftMutation.isPending
                                    || items.length === 0
                                    || hasInvalidPartialPayment
                                }
                                onClick={() => completeSaleMutation.mutate()}
                            >
                                {completeSaleMutation.isPending
                                    ? "Completing..."
                                    : `Place Order — ${formatCurrency(grandTotal)}`}
                            </Button>
                        </div>
                    </div>
                </aside>
                ) : (
                    <aside
                        className="flex w-full flex-col border-t border-border/50 bg-card/90 backdrop-blur-sm xl:w-[380px] xl:border-t-0 xl:border-l"
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
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                    {leftPanelTab === "customers" ? "Organization" : "Store"}
                                </p>
                                <p className="mt-2 text-lg font-semibold text-foreground">
                                    {leftPanelTab === "customers"
                                        ? organization?.name ?? "Organization"
                                        : selectedStore?.name ?? "Select a store"}
                                </p>
                            </div>
                            {leftPanelTab === "customers" ? (
                                <>
                                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                            Total customers
                                        </p>
                                        <p className="mt-2 text-3xl font-semibold text-foreground">{customers.length}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Shared across {organizationStores.length} store{organizationStores.length !== 1 ? "s" : ""}.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                            With balance due
                                        </p>
                                        <p className="mt-2 text-2xl font-semibold text-foreground">
                                            {customers.filter((customer) => customer.balance > 0).length}
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
                                <p className="mt-2 text-3xl font-semibold text-foreground">{filteredSales.length}</p>
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
                                    {sales.filter((sale) => sale.status === "completed" && sale.paymentStatus !== "paid").length}
                                </p>
                            </div>
                                </>
                            )}
                        </div>
                    </aside>
                )}
            </div>

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
