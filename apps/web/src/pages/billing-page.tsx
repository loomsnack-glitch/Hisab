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
import { Card, CardContent } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";
import {
    ArrowLeft,
    CircleDollarSign,
    LayoutGrid,
    Minus,
    Plus,
    Receipt,
    ReceiptText,
    Search,
    ShoppingBag,
    Store,
    Trash2,
    UserPlus2,
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

const historyTabs = [
    { value: "all", label: "All bills" },
    { value: "draft", label: "Drafts" },
    { value: "open", label: "Open dues" },
    { value: "paid", label: "Paid" },
    { value: "voided", label: "Voided" },
] as const;

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank transfer" },
    { value: "other", label: "Other" },
];

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
    const [historyFilter, setHistoryFilter] = useState<(typeof historyTabs)[number]["value"]>("all");
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [saleDialogOpen, setSaleDialogOpen] = useState(false);

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
    const grandTotal = Math.max(subtotal - discountTotal, 0);
    const collectedTotal = paymentSplits.reduce((total, split) => total + Number(split.amount || 0), 0);
    const dueTotal = Math.max(grandTotal - collectedTotal, 0);
    const isOverpaid = collectedTotal > grandTotal;
    const openDueCount = sales.filter((sale) => sale.status === "completed" && sale.paymentStatus !== "paid").length;
    const draftCount = sales.filter((sale) => sale.status === "draft").length;
    const receivableBalance = sales
        .filter((sale) => sale.status === "completed" && sale.paymentStatus !== "paid")
        .reduce((total, sale) => total + Number(sale.dueTotal ?? 0), 0);

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

    const setFullPaymentPreset = (method: PaymentMethod) => {
        if (grandTotal <= 0) {
            return;
        }

        setPaymentSplits([createPaymentSplit(String(grandTotal))].map((split) => ({ ...split, method })));
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

    if (organizationQuery.isPending) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (organizationQuery.isError || organizationQuery.data?.status === "error" || !organization) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="space-y-4 p-8">
                    <p className="font-display text-2xl font-semibold text-foreground">Billing workspace unavailable</p>
                    <p className="text-sm text-muted-foreground">
                        {organizationQuery.data?.message
                            || (organizationQuery.error as { message?: string })?.message
                            || "This organization could not be loaded."}
                    </p>
                    <Button variant="outline" className="rounded-full" render={<Link to="/organizations" />}>
                        Back to organizations
                    </Button>
                </CardContent>
            </Card>
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

                <Card className="overflow-hidden rounded-[32px] border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardContent className="relative p-8">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_30%)]" />
                        <div className="relative space-y-4">
                            <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                                Billing needs a counter
                            </Badge>
                            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
                                Add a store before starting billing.
                            </h1>
                            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                                Billing is store-scoped so the cashier workspace needs at least one branch. Once a store exists,
                                this screen becomes the high-speed bill entry surface for that counter.
                            </p>
                            <Button className="rounded-full" render={<Link to={`/organizations/${organization.id}`} />}>
                                Go to store setup
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <section className="overflow-hidden rounded-[32px] border border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <div className="relative px-6 py-7 sm:px-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_30%)]" />
                    <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                        <div className="space-y-4">
                            <Button
                                variant="ghost"
                                className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                                render={<Link to={`/organizations/${organization.id}`} />}
                            >
                                <ArrowLeft className="mr-2 size-4" />
                                Back to organization
                            </Button>

                            <div className="space-y-3">
                                <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                                    Cashier workspace
                                </Badge>
                                <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                                    Butter-smooth billing for {organization.name}
                                </h1>
                                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                                    Build the bill on the left, settle it on the right, and keep drafts plus dues close at hand.
                                    The flow is optimized for fast counter work, not back-office friction.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                            <div className="rounded-[24px] border border-border/60 bg-background/75 p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Open dues</p>
                                <p className="mt-3 text-2xl font-semibold text-foreground">{openDueCount}</p>
                            </div>
                            <div className="rounded-[24px] border border-border/60 bg-background/75 p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Draft bills</p>
                                <p className="mt-3 text-2xl font-semibold text-foreground">{draftCount}</p>
                            </div>
                            <div className="rounded-[24px] border border-border/60 bg-slate-950 p-4 text-white shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Receivable total</p>
                                <p className="mt-3 text-2xl font-semibold">{formatCurrency(receivableBalance)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative mt-6 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-2 text-sm">
                            <Store className="size-4 text-primary" />
                            <span className="text-muted-foreground">Counter</span>
                        </div>
                        <Select value={selectedStoreId} onValueChange={setStore}>
                            <SelectTrigger className="h-11 min-w-[220px] rounded-2xl bg-background/80 px-4">
                                <SelectValue placeholder="Choose a store" />
                            </SelectTrigger>
                            <SelectContent>
                                {organization.stores.map((store) => (
                                    <SelectItem key={store.id} value={store.id}>
                                        {store.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedStore ? (
                            <p className="text-sm text-muted-foreground">
                                {selectedStore.address || "This store is ready for active billing."}
                            </p>
                        ) : null}
                    </div>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                    <Card className="rounded-[32px] border-border/60 bg-card/80 shadow-lg shadow-black/5">
                        <CardContent className="space-y-5 p-5 sm:p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <LayoutGrid className="size-4 text-amber-600 dark:text-amber-400" />
                                        <h2 className="font-display text-2xl font-semibold text-foreground">Product shelf</h2>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Search, tap, and stack products into the active bill.
                                    </p>
                                </div>

                                <div className="flex flex-1 flex-col gap-3 lg:max-w-xl lg:flex-row">
                                    <div className="relative flex-1">
                                        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            className="h-11 rounded-2xl pl-11"
                                            placeholder="Search product by name"
                                            value={productSearch}
                                            onChange={(event) => setProductSearch(event.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant={categoryFilter === "all" ? "default" : "outline"}
                                    className="rounded-full"
                                    onClick={() => setCategoryFilter("all")}
                                >
                                    All products
                                </Button>
                                {categories.map((category) => (
                                    <Button
                                        key={category.id}
                                        type="button"
                                        variant={categoryFilter === category.id ? "default" : "outline"}
                                        className="rounded-full"
                                        onClick={() => setCategoryFilter(category.id)}
                                    >
                                        {category.name}
                                    </Button>
                                ))}
                            </div>

                            {productsQuery.isPending ? (
                                <div className="flex min-h-[320px] items-center justify-center">
                                    <Spinner className="size-6 text-primary" />
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="rounded-[28px] border border-dashed border-border/70 bg-background/60 px-5 py-14 text-center">
                                    <ShoppingBag className="mx-auto size-6 text-muted-foreground" />
                                    <p className="mt-4 font-medium text-foreground">No products match this view</p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Try a different search or category, or add products in the catalog first.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                    {filteredProducts.map((product) => (
                                        <button
                                            key={product.id}
                                            type="button"
                                            onClick={() => addProductToBill(product)}
                                            className="group rounded-[26px] border border-border/60 bg-background/80 p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-foreground">{product.name}</p>
                                                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                        {categories.find((category) => category.id === product.categoryId)?.name || "Catalog item"}
                                                    </p>
                                                </div>
                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                                                    <Plus className="size-4" />
                                                </div>
                                            </div>
                                            <div className="mt-5 flex items-end justify-between gap-3">
                                                <div>
                                                    <p className="text-lg font-semibold text-foreground">
                                                        {formatCurrency(product.price)}
                                                    </p>
                                                    {Number(product.discount) > 0 ? (
                                                        <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                                            {formatCurrency(product.discount)} off per unit
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">No auto discount</p>
                                                    )}
                                                </div>
                                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                    Tap to add
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-[32px] border-border/60 bg-card/80 shadow-lg shadow-black/5">
                        <CardContent className="space-y-5 p-5 sm:p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Receipt className="size-4 text-sky-600 dark:text-sky-400" />
                                        <h2 className="font-display text-2xl font-semibold text-foreground">Recent bills</h2>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Re-open drafts, inspect bill lines, or collect more money from pending bills.
                                    </p>
                                </div>
                                <div className="relative w-full lg:max-w-sm">
                                    <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        className="h-11 rounded-2xl pl-11"
                                        placeholder="Search by bill number or customer"
                                        value={salesSearch}
                                        onChange={(event) => setSalesSearch(event.target.value)}
                                    />
                                </div>
                            </div>

                            <Tabs value={historyFilter} onValueChange={(value) => setHistoryFilter(value as typeof historyFilter)}>
                                <TabsList variant="line" color="primary" className="w-full justify-start gap-4 border-b border-border/60 bg-transparent p-0 pb-px">
                                    {historyTabs.map((tab) => (
                                        <TabsTrigger
                                            key={tab.value}
                                            value={tab.value}
                                            className="h-auto rounded-none px-1 py-3 text-sm font-semibold"
                                        >
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                <TabsContent value={historyFilter} className="pt-5">
                                    {salesQuery.isPending ? (
                                        <div className="flex min-h-[220px] items-center justify-center">
                                            <Spinner className="size-6 text-primary" />
                                        </div>
                                    ) : salesQuery.isError || salesQuery.data?.status === "error" ? (
                                        <div className="rounded-[28px] border border-destructive/20 bg-destructive/5 px-5 py-12 text-center">
                                            <ReceiptText className="mx-auto size-6 text-destructive" />
                                            <p className="mt-4 font-medium text-foreground">Recent bills failed to load</p>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {salesQuery.data?.message
                                                    || (salesQuery.error as { message?: string })?.message
                                                    || "Please refresh the page and try again."}
                                            </p>
                                        </div>
                                    ) : filteredSales.length === 0 ? (
                                        <div className="rounded-[28px] border border-dashed border-border/70 bg-background/60 px-5 py-12 text-center">
                                            <ReceiptText className="mx-auto size-6 text-muted-foreground" />
                                            <p className="mt-4 font-medium text-foreground">No bills in this view yet</p>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                Bills completed at this counter will start appearing here immediately.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {filteredSales.map((sale) => (
                                                <div
                                                    key={sale.id}
                                                    className="grid gap-4 rounded-[28px] border border-border/60 bg-background/75 p-4 transition-all hover:border-primary/25 hover:shadow-md lg:grid-cols-[1fr_auto]"
                                                >
                                                    <div className="space-y-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-semibold text-foreground">
                                                                {sale.saleNumber ? `Bill #${sale.saleNumber}` : "Draft bill"}
                                                            </p>
                                                            <Badge className={cn("rounded-full border text-xs", saleStatusStyles[sale.status])}>
                                                                {sale.status}
                                                            </Badge>
                                                            <Badge className={cn("rounded-full border text-xs", paymentStatusStyles[sale.paymentStatus])}>
                                                                {sale.paymentStatus}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                            <span>{sale.customer?.name || "Walk-in"}</span>
                                                            <span>{sale.itemCount} items</span>
                                                            <span>Created {formatDateTime(sale.createdAt)}</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-4 text-sm">
                                                            <div>
                                                                <span className="text-muted-foreground">Total</span>
                                                                <p className="font-semibold text-foreground">{formatCurrency(sale.grandTotal)}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Collected</span>
                                                                <p className="font-semibold text-foreground">{formatCurrency(sale.paidTotal)}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Due</span>
                                                                <p className="font-semibold text-foreground">{formatCurrency(sale.dueTotal)}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end lg:justify-between">
                                                        {sale.status === "draft" ? (
                                                            <Button
                                                                className="rounded-2xl"
                                                                disabled={resumeDraftMutation.isPending}
                                                                onClick={() => resumeDraftMutation.mutate(sale.id)}
                                                            >
                                                                {resumeDraftMutation.isPending ? "Loading..." : "Resume draft"}
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="outline"
                                                                className="rounded-2xl"
                                                                onClick={() => {
                                                                    setSelectedSaleId(sale.id);
                                                                    setSaleDialogOpen(true);
                                                                }}
                                                            >
                                                                Open details
                                                            </Button>
                                                        )}

                                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                            {sale.status === "draft" ? "Editable bill" : "Live record"}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
                    <Card className="overflow-hidden rounded-[32px] border-border/60 bg-card/80 shadow-xl shadow-black/5">
                        <CardContent className="space-y-6 p-5 sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <WalletCards className="size-4 text-emerald-600 dark:text-emerald-400" />
                                        <h2 className="font-display text-2xl font-semibold text-foreground">Active bill</h2>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {activeDraftId ? "This bill is linked to a saved draft." : "Build a bill and settle it in one smooth pass."}
                                    </p>
                                </div>

                                {(items.length > 0 || paymentSplits.length > 0 || selectedCustomerId || notes) ? (
                                    <Button variant="ghost" className="rounded-full text-muted-foreground" onClick={resetComposer}>
                                        Reset
                                    </Button>
                                ) : null}
                            </div>

                            <div className="space-y-4 rounded-[28px] border border-border/60 bg-background/75 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Customer</p>
                                        <p className="text-sm text-muted-foreground">
                                            Required only when this bill will carry a due balance.
                                        </p>
                                    </div>
                                    <CustomerQuickCreateDialog
                                        organizationId={organizationId}
                                        suggestedName={customerSearch}
                                        onCreated={(customer) => {
                                            setSelectedCustomerId(customer.id);
                                            setCustomerSearch(customer.name);
                                        }}
                                        trigger={
                                            <Button variant="outline" className="rounded-full">
                                                <UserPlus2 className="mr-2 size-4" />
                                                Quick add
                                            </Button>
                                        }
                                    />
                                </div>

                                <Input
                                    className="h-11 rounded-2xl"
                                    placeholder="Search customer by name or phone"
                                    value={customerSearch}
                                    onChange={(event) => setCustomerSearch(event.target.value)}
                                />

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className={cn(
                                            "rounded-2xl border px-3 py-2 text-left text-sm transition-all",
                                            !selectedCustomerId
                                                ? "border-primary/30 bg-primary/10 text-primary"
                                                : "border-border/60 bg-background/70 text-muted-foreground hover:text-foreground",
                                        )}
                                        onClick={() => setSelectedCustomerId("")}
                                    >
                                        Walk-in customer
                                    </button>
                                    {filteredCustomers.map((customer) => (
                                        <button
                                            key={customer.id}
                                            type="button"
                                            className={cn(
                                                "rounded-2xl border px-3 py-2 text-left text-sm transition-all",
                                                selectedCustomerId === customer.id
                                                    ? "border-primary/30 bg-primary/10 text-primary"
                                                    : "border-border/60 bg-background/70 text-muted-foreground hover:text-foreground",
                                            )}
                                            onClick={() => {
                                                setSelectedCustomerId(customer.id);
                                                setCustomerSearch(customer.name);
                                            }}
                                        >
                                            <p className="font-medium">{customer.name}</p>
                                            <p className="text-xs opacity-70">
                                                {customer.phone || "No phone"} • Balance {formatCurrency(customer.balance)}
                                            </p>
                                        </button>
                                    ))}
                                </div>

                                {selectedCustomer ? (
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
                                        <p className="font-medium text-emerald-800 dark:text-emerald-200">
                                            Billing for {selectedCustomer.name}
                                        </p>
                                        <p className="mt-1 text-emerald-700/80 dark:text-emerald-200/80">
                                            {selectedCustomer.phone || "No phone on file"} • Current balance {formatCurrency(selectedCustomer.balance)}
                                        </p>
                                    </div>
                                ) : null}
                            </div>

                            <div className="space-y-3">
                                {items.length === 0 ? (
                                    <div className="rounded-[28px] border border-dashed border-border/70 bg-background/60 px-5 py-14 text-center">
                                        <ShoppingBag className="mx-auto size-6 text-muted-foreground" />
                                        <p className="mt-4 font-medium text-foreground">No products on this bill yet</p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Tap products from the shelf to start building a bill.
                                        </p>
                                    </div>
                                ) : (
                                    items.map((item) => (
                                        <div
                                            key={item.productId}
                                            className="rounded-[24px] border border-border/60 bg-background/75 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-foreground">{item.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatCurrency(item.unitPrice)} each
                                                        {item.unitDiscount > 0 ? ` • ${formatCurrency(item.unitDiscount)} off/unit` : ""}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="rounded-full text-muted-foreground"
                                                    onClick={() => updateItemQuantity(item.productId, 0)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between gap-4">
                                                <div className="inline-flex items-center rounded-full border border-border/70 bg-background px-2 py-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="size-8 rounded-full"
                                                        onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                                                    >
                                                        <Minus className="size-4" />
                                                    </Button>
                                                    <span className="min-w-10 text-center text-sm font-semibold text-foreground">
                                                        {item.quantity}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="size-8 rounded-full"
                                                        onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                                                    >
                                                        <Plus className="size-4" />
                                                    </Button>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground">
                                                        Discount {formatCurrency(item.unitDiscount * item.quantity)}
                                                    </p>
                                                    <p className="text-lg font-semibold text-foreground">
                                                        {formatCurrency((item.unitPrice - item.unitDiscount) * item.quantity)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="space-y-4 rounded-[28px] border border-border/60 bg-slate-950 p-5 text-white shadow-lg">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Checkout summary</p>
                                    <p className="text-3xl font-semibold tracking-tight">{formatCurrency(grandTotal)}</p>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center justify-between text-white/75">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-white/75">
                                        <span>Discount</span>
                                        <span>{formatCurrency(discountTotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-white/75">
                                        <span>Collected now</span>
                                        <span>{formatCurrency(collectedTotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold">
                                        <span>Due after checkout</span>
                                        <span>{formatCurrency(dueTotal)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 rounded-[28px] border border-border/60 bg-background/75 p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button type="button" variant="outline" className="rounded-full" onClick={() => setFullPaymentPreset("cash")}>
                                        Full cash
                                    </Button>
                                    <Button type="button" variant="outline" className="rounded-full" onClick={() => setFullPaymentPreset("upi")}>
                                        Full UPI
                                    </Button>
                                    <Button type="button" variant="outline" className="rounded-full" onClick={() => setFullPaymentPreset("card")}>
                                        Full card
                                    </Button>
                                    <Button type="button" variant="ghost" className="rounded-full text-muted-foreground" onClick={() => setPaymentSplits([])}>
                                        Leave as due
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {paymentSplits.map((split) => (
                                        <div key={split.id} className="grid gap-3 rounded-2xl border border-border/60 bg-background p-3 md:grid-cols-[0.95fr_0.9fr_auto]">
                                            <Select
                                                value={split.method}
                                                onValueChange={(value) =>
                                                    setPaymentSplits((current) =>
                                                        current.map((entry) =>
                                                            entry.id === split.id
                                                                ? { ...entry, method: value as PaymentMethod }
                                                                : entry,
                                                        ),
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-11 w-full rounded-2xl">
                                                    <SelectValue placeholder="Method" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {paymentMethods.map((method) => (
                                                        <SelectItem key={method.value} value={method.value}>
                                                            {method.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="h-11 rounded-2xl"
                                                placeholder="Amount"
                                                value={split.amount}
                                                onChange={(event) =>
                                                    setPaymentSplits((current) =>
                                                        current.map((entry) =>
                                                            entry.id === split.id
                                                                ? { ...entry, amount: event.target.value }
                                                                : entry,
                                                        ),
                                                    )
                                                }
                                            />

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="h-11 rounded-2xl text-muted-foreground"
                                                onClick={() =>
                                                    setPaymentSplits((current) => current.filter((entry) => entry.id !== split.id))
                                                }
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                {grandTotal > 0 ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full rounded-2xl"
                                        onClick={() => setPaymentSplits((current) => [...current, createPaymentSplit(String(dueTotal || grandTotal))])}
                                    >
                                        Add payment split
                                    </Button>
                                ) : null}

                                {isOverpaid ? (
                                    <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                        Collected money cannot exceed the bill total.
                                    </div>
                                ) : null}

                                {!selectedCustomerId && dueTotal > 0 ? (
                                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                                        Choose a customer if this bill will remain pending or partial after checkout.
                                    </div>
                                ) : null}
                            </div>

                            <div className="space-y-3 rounded-[28px] border border-border/60 bg-background/75 p-4">
                                <p className="text-sm font-semibold text-foreground">Bill note</p>
                                <Textarea
                                    className="min-h-28 rounded-2xl"
                                    placeholder="Optional cashier note for this bill"
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Button
                                    variant="outline"
                                    className="h-12 rounded-2xl"
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
                                    className="h-12 rounded-2xl"
                                    disabled={completeSaleMutation.isPending || saveDraftMutation.isPending || items.length === 0 || isOverpaid}
                                    onClick={() => completeSaleMutation.mutate()}
                                >
                                    {completeSaleMutation.isPending ? "Completing..." : "Complete sale"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

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
