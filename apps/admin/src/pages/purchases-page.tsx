import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrganizationDetails, getPurchase, getPurchaseSummary, getPurchases, createPurchase, updatePurchase, voidPurchase } from "@repo/services";
import type { CreatePurchaseJSON, PurchaseDetailDTO } from "@repo/types";
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
import { Input } from "@repo/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Spinner } from "@repo/ui/components/spinner";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import PurchaseFormDialog from "@/components/purchases/purchase-form-dialog";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { organizationKeys, purchaseKeys } from "@/lib/query-keys";

type Range = "all" | "today" | "week" | "month" | "custom";

const dateOnly = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const rangeDates = (range: Range, customFrom: string, customTo: string) => {
    const today = new Date();
    const end = dateOnly(today);
    if (range === "today") return { dateFrom: end, dateTo: end };
    if (range === "month") return { dateFrom: dateOnly(new Date(today.getFullYear(), today.getMonth(), 1)), dateTo: end };
    if (range === "week") {
        const start = new Date(today);
        const day = start.getDay();
        start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
        return { dateFrom: dateOnly(start), dateTo: end };
    }
    if (range === "custom") {
        return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
    }
    return {};
};

const PurchasesPage = () => {
    const { organizationId = "" } = useParams();
    const queryClient = useQueryClient();
    const [storeId, setStoreId] = useState("");
    const [search, setSearch] = useState("");
    const [range, setRange] = useState<Range>("all");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [status, setStatus] = useState<"all" | "recorded" | "voided">("all");
    const [formOpen, setFormOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseDetailDTO | null>(null);
    const [voidTarget, setVoidTarget] = useState<{ id: string; supplierName: string } | null>(null);
    const [voidReason, setVoidReason] = useState("");

    useEffect(() => {
        if (voidTarget) setVoidReason("");
    }, [voidTarget]);

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });
    const organization = organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;
    const selectedStore = organization?.stores?.find((store) => store.id === storeId);

    useEffect(() => {
        if (!organization?.stores?.length) {
            setStoreId("");
            return;
        }
        if (!organization.stores.some((store) => store.id === storeId)) setStoreId(organization.stores[0].id);
    }, [organization, storeId]);

    const dates = useMemo(() => rangeDates(range, customFrom, customTo), [customFrom, customTo, range]);
    const filters = useMemo(() => ({ search: search.trim() || undefined, status: status === "all" ? undefined : status, ...dates }), [dates, search, status]);
    const purchasesQuery = useQuery({
        queryKey: purchaseKeys.list(organizationId, storeId, filters),
        queryFn: () => getPurchases(organizationId, storeId, { ...filters, limit: 100 }),
        enabled: Boolean(organizationId && storeId),
    });
    const summaryQuery = useQuery({
        queryKey: purchaseKeys.summary(organizationId, storeId),
        queryFn: () => getPurchaseSummary(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });

    const invalidate = () => {
        void queryClient.invalidateQueries({ queryKey: purchaseKeys.store(organizationId, storeId) });
    };

    const saveMutation = useMutation({
        mutationFn: (data: CreatePurchaseJSON) => editingPurchase
            ? updatePurchase(organizationId, storeId, editingPurchase.id, data)
            : createPurchase(organizationId, storeId, data),
        onSuccess: (response) => {
            if (response.status !== "success") { toast.error(response.message); return; }
            toast.success(editingPurchase ? "Purchase updated" : "Purchase saved");
            setFormOpen(false);
            setEditingPurchase(null);
            invalidate();
        },
        onError: () => toast.error("Could not save purchase"),
    });

    const voidMutation = useMutation({
        mutationFn: ({ purchaseId, reason }: { purchaseId: string; reason: string }) => voidPurchase(organizationId, storeId, purchaseId, { reason }),
        onSuccess: (response) => {
            if (response.status !== "success") { toast.error(response.message); return; }
            toast.success("Purchase voided");
            setVoidTarget(null);
            setVoidReason("");
            invalidate();
        },
        onError: () => toast.error("Could not void purchase"),
    });

    const openEdit = async (purchaseId: string) => {
        const response = await getPurchase(organizationId, storeId, purchaseId);
        if (response.status !== "success" || !response.data?.purchase) { toast.error(response.message || "Could not load purchase"); return; }
        setEditingPurchase(response.data.purchase);
        setFormOpen(true);
    };

    const purchases = purchasesQuery.data?.status === "success" ? purchasesQuery.data.data?.purchases ?? [] : [];
    const summary = summaryQuery.data?.status === "success" ? summaryQuery.data.data?.summary : null;

    return (
        <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Store money movement</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Purchases</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Record supplier purchases without changing inventory.</p>
                </div>
                <Button onClick={() => { setEditingPurchase(null); setFormOpen(true); }} disabled={!storeId}>
                    <Plus className="size-4" /> Add purchase
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
                    <label className="flex min-w-52 flex-1 items-center gap-2 text-sm">
                        <span className="shrink-0 font-medium">Store</span>
                        <Select value={storeId} onValueChange={(value) => setStoreId(value ?? "")}>
                        <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="Select store">{selectedStore?.name ?? "Select store"}</SelectValue></SelectTrigger>
                            <SelectContent>{organization?.stores?.map((store) => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </label>
                <div className="relative min-w-56 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pl-9 pr-8" placeholder="Search supplier, invoice, item" />
                    {search ? <button type="button" onClick={() => setSearch("")} className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Clear search"><X className="size-4" /></button> : null}
                </div>
                <Select value={range} onValueChange={(value) => setRange((value ?? "all") as Range)}>
                    <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All dates</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="week">This week</SelectItem><SelectItem value="month">This month</SelectItem><SelectItem value="custom">Custom range</SelectItem></SelectContent>
                </Select>
                <Select value={status} onValueChange={(value) => setStatus((value ?? "all") as typeof status)}>
                    <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="recorded">Recorded</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent>
                </Select>
            </div>
            {range === "custom" ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
                    <label className="flex items-center gap-2 text-sm"><span className="font-medium">From</span><Input type="date" className="h-9 w-40" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label>
                    <label className="flex items-center gap-2 text-sm"><span className="font-medium">To</span><Input type="date" className="h-9 w-40" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label>
                </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    { label: "Today", value: summary?.today },
                    { label: "This week", value: summary?.thisWeek },
                    { label: "This month", value: summary?.thisMonth },
                ].map(({ label, value }) => (
                    <div key={String(label)} className="rounded-xl border border-border/70 bg-card p-4">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="mt-1 text-2xl font-bold">{formatCurrency((value as { amount: number } | undefined)?.amount ?? 0)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{(value as { count: number } | undefined)?.count ?? 0} purchases</p>
                    </div>
                ))}
            </div>

            {summaryQuery.isError || summaryQuery.data?.status === "error" ? (
                <p className="text-sm text-destructive">Purchase totals could not be loaded. The purchase list is still available.</p>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <div className="flex items-center justify-between border-b border-border/70 px-4 py-3"><div><h2 className="font-semibold">Purchase history</h2><p className="text-xs text-muted-foreground">{selectedStore?.name ?? "Select a store"}</p></div><span className="text-sm text-muted-foreground">{purchases.length} records</span></div>
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                        <tbody className="divide-y divide-border/60">
                            {purchasesQuery.isPending ? Array.from({ length: 5 }, (_, index) => <tr key={`purchase-skeleton-${index}`} className="animate-pulse"><td className="px-4 py-4"><div className="h-4 w-24 rounded bg-muted" /></td><td className="px-4 py-4"><div className="h-4 w-32 rounded bg-muted" /></td><td className="px-4 py-4"><div className="h-4 w-24 rounded bg-muted" /></td><td className="px-4 py-4"><div className="h-4 w-40 rounded bg-muted" /></td><td className="px-4 py-4"><div className="h-4 w-20 rounded bg-muted" /></td><td className="px-4 py-4"><div className="h-5 w-16 rounded-full bg-muted" /></td><td className="px-4 py-4"><div className="ml-auto h-8 w-16 rounded bg-muted" /></td></tr>) : purchases.map((purchase) => <tr key={purchase.id} className="hover:bg-muted/20"><td className="px-4 py-3">{formatDateOnly(purchase.purchaseDate)}</td><td className="px-4 py-3 font-medium">{purchase.supplierName}</td><td className="px-4 py-3 text-muted-foreground">{purchase.invoiceNumber || "—"}</td><td className="max-w-56 truncate px-4 py-3 text-muted-foreground">{purchase.itemsSummary || `${purchase.itemCount} item(s)`}</td><td className="px-4 py-3 font-semibold">{formatCurrency(purchase.totalAmount)}</td><td className="px-4 py-3"><span className={purchase.status === "voided" ? "rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive" : "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600"}>{purchase.status}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" disabled={purchase.status === "voided"} onClick={() => void openEdit(purchase.id)} aria-label="Edit purchase"><Pencil className="size-4" /></Button><Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={purchase.status === "voided" || voidMutation.isPending} onClick={() => setVoidTarget({ id: purchase.id, supplierName: purchase.supplierName })} aria-label="Void purchase">{voidTarget?.id === purchase.id && voidMutation.isPending ? <Spinner /> : <Trash2 className="size-4" />}</Button></div></td></tr>)}
                        </tbody>
                    </table>
                </div>
                <div className="divide-y divide-border/60 md:hidden">{purchasesQuery.isPending ? Array.from({ length: 4 }, (_, index) => <div key={`purchase-mobile-skeleton-${index}`} className="animate-pulse space-y-3 p-4"><div className="flex justify-between gap-3"><div className="h-4 w-32 rounded bg-muted" /><div className="h-4 w-20 rounded bg-muted" /></div><div className="h-3 w-48 rounded bg-muted" /><div className="flex justify-between"><div className="h-5 w-16 rounded-full bg-muted" /><div className="h-8 w-20 rounded bg-muted" /></div></div>) : purchases.map((purchase) => <div key={purchase.id} className="space-y-2 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{purchase.supplierName}</p><p className="text-xs text-muted-foreground">{formatDateOnly(purchase.purchaseDate)} · {purchase.invoiceNumber || "No invoice"}</p></div><p className="font-bold">{formatCurrency(purchase.totalAmount)}</p></div><p className="truncate text-sm text-muted-foreground">{purchase.itemsSummary || `${purchase.itemCount} item(s)`}</p><div className="flex items-center justify-between"><span className={purchase.status === "voided" ? "rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive" : "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600"}>{purchase.status}</span><div className="flex gap-1"><Button size="sm" variant="outline" disabled={purchase.status === "voided"} onClick={() => void openEdit(purchase.id)}>Edit</Button><Button size="sm" variant="ghost" className="text-destructive" disabled={purchase.status === "voided" || voidMutation.isPending} onClick={() => setVoidTarget({ id: purchase.id, supplierName: purchase.supplierName })}>{voidTarget?.id === purchase.id && voidMutation.isPending ? <><Spinner />Voiding...</> : "Void"}</Button></div></div></div>)}</div>
                {purchasesQuery.isError || purchasesQuery.data?.status === "error" ? (
                    <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-muted-foreground">
                        <p>Could not load purchases.</p>
                        <Button size="sm" variant="outline" onClick={() => void purchasesQuery.refetch()}>Try again</Button>
                    </div>
                ) : !purchasesQuery.isPending && purchases.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No purchases found for this store.</div> : null}
            </div>

            <PurchaseFormDialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingPurchase(null); }} purchase={editingPurchase} isPending={saveMutation.isPending} onSubmit={async (data) => { await saveMutation.mutateAsync(data); }} />
            <AlertDialog open={Boolean(voidTarget)} onOpenChange={(open) => { if (!open) { setVoidTarget(null); setVoidReason(""); } }}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Void this purchase?</AlertDialogTitle><AlertDialogDescription>This will keep the record in history but remove it from purchase totals. {voidTarget?.supplierName ? `Supplier: ${voidTarget.supplierName}.` : ""}</AlertDialogDescription></AlertDialogHeader><Input value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Reason for voiding" aria-label="Reason for voiding" /><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={!voidReason.trim() || voidMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (voidTarget && voidReason.trim()) voidMutation.mutate({ purchaseId: voidTarget.id, reason: voidReason.trim() }); }}>{voidMutation.isPending ? <><Spinner />Voiding...</> : "Void purchase"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default PurchasesPage;
