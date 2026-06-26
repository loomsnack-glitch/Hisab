import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    commitSale,
    createDraftSale,
    getCategories,
    getCustomers,
    getOrganizationDetails,
    getProducts,
    getSale,
    getSales,
    updateDraftSale,
} from "@repo/services";
import type {
    CommitSaleJSON,
    CreateDraftSaleJSON,
    CreatePaymentJSON,
    PaymentMethod,
    ProductResponseDTO,
    SaleSummaryDTO,
    UpdateDraftSaleJSON,
} from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";
import {
    ArrowLeft,
    Banknote,
    CircleDollarSign,
    CreditCard,
    LayoutGrid,
    Minus,
    Plus,
    Receipt,
    ReceiptText,
    Search,
    ShoppingCart,
    Smartphone,
    Store,
    Trash2,
    User,
    WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import CustomerQuickCreateDialog from "@/components/billing/customer-quick-create-dialog";
import SaleDetailDialog from "@/components/billing/sale-detail-dialog";
import { billingKeys, catalogKeys, organizationKeys } from "@/lib/query-keys";
import { formatCurrency, formatDateTime } from "@/lib/format";

type ComposerItem = {
    productId: string;
    name: string;
    categoryId: string;
    unitPrice: number;
    unitDiscount: number;
    quantity: number;
};

type PaymentSplit = {
    id: string;
    method: PaymentMethod;
    amount: string;
    referenceNumber: string;
    notes: string;
};

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank transfer" },
    { value: "other", label: "Other" },
];

const historyTabs = [
    { value: "all", label: "All bills" },
    { value: "draft", label: "Drafts" },
    { value: "open", label: "Open dues" },
    { value: "paid", label: "Paid" },
    { value: "voided", label: "Voided" },
] as const;

const saleStatusStyles: Record<string, string> = {
    draft: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    voided: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const paymentStatusStyles: Record<string, string> = {
    pending: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    partial: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const toMoney = (value: number | string | null | undefined) => Math.round(Number(value ?? 0) * 100) / 100;

const createPaymentSplit = (amount = ""): PaymentSplit => ({
    id: crypto.randomUUID(),
    method: "cash",
    amount,
    referenceNumber: "",
    notes: "",
});

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

const formatDate = () => {
    return new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

const BillingPage = () => {
    const queryClient = useQueryClient();
    const { organizationId = "" } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<ComposerItem[]>([]);
    const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const [salesSearch, setSalesSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [saleDialogOpen, setSaleDialogOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | "due">("cash");
    const [discountInput, setDiscountInput] = useState("");
    const [historyFilter, setHistoryFilter] = useState<"all" | "draft" | "open" | "paid" | "voided">("all");
    const [leftPanelTab, setLeftPanelTab] = useState<"products" | "bills">("products");

    const deferredProductSearch = useDeferredValue(productSearch.trim().toLowerCase());
    const deferredCustomerSearch = useDeferredValue(customerSearch.trim().toLowerCase());
    const deferredSalesSearch = useDeferredValue(salesSearch.trim().toLowerCase());

    const selectedStoreId = searchParams.get("storeId") || "";

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

    const categoriesQuery = useQuery({
        queryKey: catalogKeys.categories(organizationId),
        queryFn: () => getCategories(organizationId),
        enabled: Boolean(organizationId),
    });

    const productsQuery = useQuery({
        queryKey: catalogKeys.products(organizationId),
        queryFn: () => getProducts(organizationId),
        enabled: Boolean(organizationId),
    });

    const customersQuery = useQuery({
        queryKey: billingKeys.customers(organizationId),
        queryFn: () => getCustomers(organizationId, { limit: 200 }),
        enabled: Boolean(organizationId),
    });

    const salesQuery = useQuery({
        queryKey: billingKeys.sales(organizationId, selectedStoreId),
        queryFn: () => getSales(organizationId, selectedStoreId, { limit: 40 }),
        enabled: Boolean(organizationId && selectedStoreId),
    });

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization ?? null : null;
    const categories =
        categoriesQuery.data?.status === "success" ? categoriesQuery.data.data?.categories ?? [] : [];
    const products =
        productsQuery.data?.status === "success" ? productsQuery.data.data?.products ?? [] : [];
    const customers =
        customersQuery.data?.status === "success" ? customersQuery.data.data?.customers ?? [] : [];
    const sales =
        salesQuery.data?.status === "success" ? salesQuery.data.data?.sales ?? [] : [];

    useEffect(() => {
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
    }, [organization, selectedStoreId, setSearchParams]);

    const selectedStore = organization?.stores.find((store) => store.id === selectedStoreId) ?? null;
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

    const filteredSales = sales.filter((sale) => {
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

        return matchesHistoryFilter && matchesSearch;
    });

    const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    const discountTotal = items.reduce((total, item) => total + item.unitDiscount * item.quantity, 0);
    const extraDiscount = Number(discountInput || 0);
    const grandTotal = Math.max(subtotal - discountTotal - extraDiscount, 0);
    const collectedTotal = paymentSplits.reduce((total, split) => total + Number(split.amount || 0), 0);
    const dueTotal = Math.max(grandTotal - collectedTotal, 0);
    const isOverpaid = collectedTotal > grandTotal;

    const invalidateBillingQueries = () => {
        queryClient.invalidateQueries({ queryKey: billingKeys.organization(organizationId) });
    };

    const resetComposer = () => {
        setActiveDraftId(null);
        setSelectedCustomerId("");
        setCustomerSearch("");
        setNotes("");
        setItems([]);
        setPaymentSplits([]);
        setDiscountInput("");
        setSelectedPaymentMethod("cash");
    };

    const addProductToBill = (product: ProductResponseDTO) => {
        setItems((current) => {
            const existingItem = current.find((item) => item.productId === product.id);
            if (existingItem) {
                return current.map((item) =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                );
            }

            return [
                ...current,
                {
                    productId: product.id,
                    name: product.name,
                    categoryId: product.categoryId,
                    unitPrice: Number(product.price),
                    unitDiscount: Number(product.discount ?? 0),
                    quantity: 1,
                },
            ];
        });
    };

    const updateItemQuantity = (productId: string, nextQuantity: number) => {
        setItems((current) =>
            current.flatMap((item) => {
                if (item.productId !== productId) {
                    return item;
                }

                if (nextQuantity <= 0) {
                    return [];
                }

                return [{ ...item, quantity: nextQuantity }];
            }),
        );
    };

    const setFullPaymentPreset = (method: PaymentMethod | "due") => {
        setSelectedPaymentMethod(method);
    };

    useEffect(() => {
        if (grandTotal > 0 && selectedPaymentMethod !== "due") {
            setPaymentSplits([createPaymentSplit(String(grandTotal))].map((split) => ({ ...split, method: selectedPaymentMethod })));
        } else {
            setPaymentSplits([]);
        }
    }, [grandTotal, selectedPaymentMethod]);

    const ensureCustomerForDue = () => {
        if (dueTotal <= 0 || selectedCustomerId) {
            return true;
        }

        toast.error("Attach a customer before leaving any balance unpaid");
        return false;
    };

    const buildDraftPayload = (): CreateDraftSaleJSON => ({
        customerId: selectedCustomerId || null,
        notes: notes.trim() || null,
        items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.unitDiscount * item.quantity,
        })),
    });

    const buildCommitPayload = (): CommitSaleJSON => ({
        customerId: selectedCustomerId || null,
        notes: notes.trim() || null,
        payments: paymentSplits
            .filter((split) => Number(split.amount || 0) > 0)
            .map((split) => ({
                amount: Number(split.amount),
                method: split.method,
                referenceNumber: split.referenceNumber.trim() || null,
                notes: split.notes.trim() || null,
            })) as CreatePaymentJSON[],
    });

    const saveDraftMutation = useMutation({
        mutationFn: async () => {
            if (!selectedStoreId) {
                throw new Error("Select a store first");
            }

            if (items.length === 0) {
                throw new Error("Add at least one product before saving a draft");
            }

            const payload = buildDraftPayload();
            const response = activeDraftId
                ? await updateDraftSale(organizationId, selectedStoreId, activeDraftId, payload as UpdateDraftSaleJSON)
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
                throw new Error("Select a store first");
            }

            if (items.length === 0) {
                throw new Error("Add at least one product before completing the bill");
            }

            if (isOverpaid) {
                throw new Error("Collected amount cannot exceed the bill total");
            }

            if (!ensureCustomerForDue()) {
                throw new Error("A customer is required for unpaid or partially paid bills");
            }

            const draftPayload = buildDraftPayload();
            const draftResponse = activeDraftId
                ? await updateDraftSale(organizationId, selectedStoreId, activeDraftId, draftPayload as UpdateDraftSaleJSON)
                : await createDraftSale(organizationId, selectedStoreId, draftPayload);

            if (draftResponse.status !== "success" || !draftResponse.data?.sale) {
                throw new Error(draftResponse.message || "Failed to prepare bill");
            }

            const commitResponse = await commitSale(
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
                throw new Error("Select a store first");
            }

            const response = await getSale(organizationId, selectedStoreId, saleId);
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
                    productId: item.productId,
                    name: item.productNameSnapshot,
                    categoryId: "",
                    unitPrice: Number(item.unitPriceSnapshot),
                    unitDiscount: Number(item.quantity) > 0 ? Number(item.discountAmount) / Number(item.quantity) : 0,
                    quantity: Number(item.quantity),
                })),
            );
            setPaymentSplits([]);
            setLeftPanelTab("products");
            window.scrollTo({ top: 0, behavior: "smooth" });
            toast.success("Draft loaded into the composer");
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to load draft");
        },
    });

    const setStore = (storeId: string) => {
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

    if (organizationQuery.isPending) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (organizationQuery.isError || organizationQuery.data?.status === "error" || !organization) {
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

    if (organization.stores.length === 0) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                    render={<Link to={`/organizations/${organization.id}`} />}
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
                    <Button className="mt-4 rounded-full" render={<Link to={`/organizations/${organization.id}`} />}>
                        Go to store setup
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="billing-pos-layout flex flex-col gap-0" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
            {/* ─── Compact Header Bar ─── */}
            <header className="flex items-center justify-between border-b border-border/50 bg-card/60 px-5 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <h1 className="font-display text-xl font-bold tracking-tight text-foreground">POS Billing</h1>
                    <span className="text-sm text-muted-foreground">{formatDate()}</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Store className="size-4" />
                        <span className="hidden sm:inline">Counter:</span>
                    </div>
                    <Select value={selectedStoreId} onValueChange={setStore}>
                        <SelectTrigger className="h-9 min-w-[160px] rounded-xl bg-background/80 px-3 text-sm">
                            <SelectValue placeholder="Choose store" />
                        </SelectTrigger>
                        <SelectContent>
                            {organization.stores.map((store) => (
                                <SelectItem key={store.id} value={store.id}>
                                    {store.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </header>

            {/* ─── Main Two-Panel Layout ─── */}
            <div className="flex flex-1 flex-col xl:flex-row">
                {/* ─── LEFT PANEL: Product Grid ─── */}
                <div className="flex-1 overflow-y-auto p-5" style={{ maxHeight: "calc(100vh - 3.5rem - 57px)" }}>
                    {/* Tab Switcher */}
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

                    {leftPanelTab === "products" ? (
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
                                        const isInCart = items.some((item) => item.productId === product.id);

                                        return (
                                            <button
                                                key={product.id}
                                                type="button"
                                                onClick={() => addProductToBill(product)}
                                                className={cn(
                                                    "group relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all duration-200",
                                                    "hover:-translate-y-0.5 hover:shadow-lg",
                                                    isInCart
                                                        ? "border-primary/40 bg-primary/5 shadow-md shadow-primary/10"
                                                        : "border-border/50 bg-card/80 hover:border-primary/30",
                                                )}
                                            >
                                                {isInCart && (
                                                    <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                                                        {items.find((i) => i.productId === product.id)?.quantity}
                                                    </div>
                                                )}
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
                                                <p className="mt-2 text-base font-bold text-primary">
                                                    {formatCurrency(product.price)}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Recent Bills Shelf Search */}
                            <div className="relative mb-4">
                                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="h-10 rounded-xl bg-background/80 pl-10 text-sm"
                                    placeholder="Search bills by number or customer..."
                                    value={salesSearch}
                                    onChange={(event) => setSalesSearch(event.target.value)}
                                />
                            </div>

                            {/* History Filter Tabs */}
                            <div className="mb-5 flex flex-wrap gap-2">
                                {historyTabs.map((tab) => (
                                    <button
                                        key={tab.value}
                                        type="button"
                                        onClick={() => setHistoryFilter(tab.value)}
                                        className={cn(
                                            "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
                                            historyFilter === tab.value
                                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
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
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {filteredSales.map((sale) => (
                                        <div
                                            key={sale.id}
                                            className="flex flex-col justify-between rounded-2xl border border-border/50 bg-card/85 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-semibold text-foreground text-sm">
                                                        {sale.saleNumber ? `Bill #${sale.saleNumber}` : "Draft bill"}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1 justify-end">
                                                        <Badge className={cn("rounded-full border text-[10px] px-2 py-0 leading-none", saleStatusStyles[sale.status])}>
                                                            {sale.status}
                                                        </Badge>
                                                        <Badge className={cn("rounded-full border text-[10px] px-2 py-0 leading-none", paymentStatusStyles[sale.paymentStatus])}>
                                                            {sale.paymentStatus}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground space-y-1">
                                                    <p className="truncate font-semibold text-foreground/80">{sale.customer?.name || "Walk-in Customer"}</p>
                                                    <p>{sale.itemCount} items • {formatDateTime(sale.createdAt)}</p>
                                                </div>
                                                <div className="flex justify-between border-t border-border/40 pt-2 text-[11px] gap-2">
                                                    <div>
                                                        <span className="text-muted-foreground block text-[9px] uppercase">Total</span>
                                                        <p className="font-bold text-foreground">{formatCurrency(sale.grandTotal)}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block text-[9px] uppercase">Collected</span>
                                                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(sale.paidTotal)}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block text-[9px] uppercase">Due</span>
                                                        <p className="font-bold text-foreground">{formatCurrency(sale.dueTotal)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-2 border-t border-border/40 flex justify-end gap-2">
                                                {sale.status === "draft" ? (
                                                    <Button
                                                        size="sm"
                                                        className="w-full rounded-xl text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                                                        disabled={resumeDraftMutation.isPending}
                                                        onClick={() => resumeDraftMutation.mutate(sale.id)}
                                                    >
                                                        {resumeDraftMutation.isPending ? "Loading..." : "Resume draft"}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full rounded-xl text-xs h-8"
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
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ─── RIGHT PANEL: Current Order ─── */}
                <aside
                    className="flex w-full flex-col border-t border-border/50 bg-card/90 backdrop-blur-sm xl:w-[380px] xl:border-t-0 xl:border-l"
                    style={{ maxHeight: "calc(100vh - 3.5rem - 57px)" }}
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
                                        const lineTotal = (item.unitPrice - item.unitDiscount) * item.quantity;

                                        return (
                                            <div
                                                key={item.productId}
                                                className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/60 px-3 py-2.5"
                                            >
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
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatCurrency(item.unitPrice)}
                                                    </p>
                                                </div>

                                                {/* Quantity Controls */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    >
                                                        <Minus className="size-3" />
                                                    </button>
                                                    <span className="w-6 text-center text-sm font-bold text-foreground">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
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
                                                    onClick={() => updateItemQuantity(item.productId, 0)}
                                                    className="text-muted-foreground/50 transition-colors hover:text-destructive shrink-0"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
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
                        <div className="mb-3">
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
                            {discountTotal + extraDiscount > 0 && (
                                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(discountTotal + extraDiscount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-1.5 text-lg font-bold text-foreground">
                                <span>Total</span>
                                <span>{formatCurrency(grandTotal)}</span>
                            </div>
                        </div>

                        {/* Payment Method Pills */}
                        <div className="mb-3 grid grid-cols-4 gap-1.5">
                            <button
                                type="button"
                                onClick={() => setFullPaymentPreset("cash")}
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
                                onClick={() => setFullPaymentPreset("upi")}
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
                                onClick={() => setFullPaymentPreset("card")}
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
                            <button
                                type="button"
                                onClick={() => setFullPaymentPreset("due")}
                                className={cn(
                                    "flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition-all duration-200",
                                    selectedPaymentMethod === "due"
                                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                                        : "border border-border/60 bg-background/70 text-muted-foreground hover:border-amber-500/40 hover:text-foreground",
                                )}
                            >
                                <Receipt className="size-3.5" />
                                Due
                            </button>
                        </div>

                        {/* Warnings */}
                        {isOverpaid && (
                            <div className="mb-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                Collected amount exceeds the bill total.
                            </div>
                        )}

                        {!selectedCustomerId && dueTotal > 0 && items.length > 0 && (
                            <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                                Attach a customer for partial/pending bills.
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
                                disabled={completeSaleMutation.isPending || saveDraftMutation.isPending || items.length === 0 || isOverpaid}
                                onClick={() => completeSaleMutation.mutate()}
                            >
                                {completeSaleMutation.isPending
                                    ? "Completing..."
                                    : `Place Order — ${formatCurrency(grandTotal)}`}
                            </Button>
                        </div>
                    </div>
                </aside>
            </div>

            <SaleDetailDialog
                open={saleDialogOpen}
                onOpenChange={setSaleDialogOpen}
                organizationId={organizationId}
                storeId={selectedStoreId}
                saleId={selectedSaleId}
            />
        </div>
    );
};

export default BillingPage;
