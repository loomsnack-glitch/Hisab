import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createPosPurchase,
    getPosPurchase,
    getPosPurchaseSummary,
    getPosPurchases,
    updatePosPurchase,
    voidPosPurchase,
} from "@repo/services";
import type { CreatePurchaseJSON, DeviceSessionDTO, PurchaseDetailDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@repo/ui/components/dialog";
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
import { Spinner } from "@repo/ui/components/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import PurchaseFormDialog from "@/components/purchases/purchase-form-dialog";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { purchaseKeys } from "@/lib/query-keys";

type PosPurchasesPanelProps = {
    session: DeviceSessionDTO;
    search: string;
};

const PosPurchasesPanel = ({ session, search }: PosPurchasesPanelProps) => {
    const queryClient = useQueryClient();
    const [formOpen, setFormOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseDetailDTO | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<PurchaseDetailDTO | null>(null);
    const [viewLoadingId, setViewLoadingId] = useState<string | null>(null);
    const [voidTarget, setVoidTarget] = useState<{ id: string; supplierName: string } | null>(null);
    const [voidReason, setVoidReason] = useState("");
    const [status, setStatus] = useState<"all" | "recorded" | "voided">("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const searchValue = search.trim() || undefined;
    const purchaseFilters = {
        search: searchValue,
        status: status === "all" ? undefined : status,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 50,
    };
    const purchasesQuery = useQuery({
        queryKey: purchaseKeys.posList(purchaseFilters),
        queryFn: () => getPosPurchases(purchaseFilters),
        enabled: Boolean(session),
    });
    const summaryQuery = useQuery({
        queryKey: purchaseKeys.posSummary(),
        queryFn: getPosPurchaseSummary,
        enabled: Boolean(session),
    });
    const purchases = purchasesQuery.data?.status === "success" ? purchasesQuery.data.data?.purchases ?? [] : [];
    const summary = summaryQuery.data?.status === "success" ? summaryQuery.data.data?.summary : null;

    useEffect(() => {
        if (voidTarget) setVoidReason("");
    }, [voidTarget]);

    const invalidate = () => {
        void queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
    };

    const saveMutation = useMutation({
        mutationFn: (data: CreatePurchaseJSON) => editingPurchase
            ? updatePosPurchase(editingPurchase.id, data)
            : createPosPurchase(data),
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
        mutationFn: ({ purchaseId, reason }: { purchaseId: string; reason: string }) => voidPosPurchase(purchaseId, { reason }),
        onSuccess: (response) => {
            if (response.status !== "success") { toast.error(response.message); return; }
            toast.success("Purchase voided");
            setVoidTarget(null);
            setVoidReason("");
            invalidate();
        },
        onError: () => toast.error("Could not void purchase"),
    });

    const openView = async (purchaseId: string) => {
        setViewLoadingId(purchaseId);
        try {
            const response = await getPosPurchase(purchaseId);
            if (response.status !== "success" || !response.data?.purchase) {
                toast.error(response.message || "Could not load purchase");
                return;
            }
            setSelectedPurchase(response.data.purchase);
        } finally {
            setViewLoadingId(null);
        }
    };

    const openEdit = async (purchaseId: string) => {
        setEditingPurchase(null);
        setEditLoading(true);
        setFormOpen(true);
        try {
            const response = await getPosPurchase(purchaseId);
            if (response.status !== "success" || !response.data?.purchase) {
                toast.error(response.message || "Could not load purchase");
                setFormOpen(false);
                return;
            }
            setEditingPurchase(response.data.purchase);
        } finally {
            setEditLoading(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-5xl space-y-4">
            <div className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{session.store.name}</p>
                    <h1 className="mt-1 text-xl font-bold">Purchases</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Supplier purchases for this store.</p>
                </div>
                <Button className="w-full sm:w-auto" onClick={() => { setEditingPurchase(null); setFormOpen(true); }}>
                    <Plus className="size-4" /> Add purchase
                </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
                {[["Today", summary?.today], ["This week", summary?.thisWeek], ["This month", summary?.thisMonth]].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-border/70 bg-card p-3">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="mt-1 text-lg font-bold">{formatCurrency((value as { amount: number } | undefined)?.amount ?? 0)}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{(value as { count: number } | undefined)?.count ?? 0} purchases</p>
                    </div>
                ))}
            </div>

            {summaryQuery.isError || summaryQuery.data?.status === "error" ? (
                <p className="text-sm text-destructive">Purchase totals could not be loaded. The list is still available.</p>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <div className="flex flex-col gap-3 border-b border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-semibold">Recent purchases</h2>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                        <label className="sr-only" htmlFor="pos-purchase-from">From date</label>
                        <input id="pos-purchase-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-8 min-w-0 rounded-lg border border-border/70 bg-background px-2 text-xs text-foreground" aria-label="From date" />
                        <label className="sr-only" htmlFor="pos-purchase-to">To date</label>
                        <input id="pos-purchase-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-8 min-w-0 rounded-lg border border-border/70 bg-background px-2 text-xs text-foreground" aria-label="To date" />
                        <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                            <SelectTrigger className="col-span-2 h-8 min-w-0 text-xs sm:col-span-1 sm:w-28"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="recorded">Recorded</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent>
                        </Select>
                        {(dateFrom || dateTo || status !== "all") ? <Button size="sm" variant="ghost" className="col-span-2 h-8 text-xs sm:col-span-1" onClick={() => { setDateFrom(""); setDateTo(""); setStatus("all"); }}>Clear filters</Button> : null}
                    </div>
                </div>
                {purchasesQuery.isError || purchasesQuery.data?.status === "error" ? (
                    <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-muted-foreground">
                        <p>Could not load purchases.</p>
                        <Button size="sm" variant="outline" onClick={() => void purchasesQuery.refetch()}>Try again</Button>
                    </div>
                ) : (
                    <div className="divide-y divide-border/60">
                        {purchasesQuery.isPending ? Array.from({ length: 5 }, (_, index) => (
                            <div key={`pos-purchase-skeleton-${index}`} className="animate-pulse space-y-3 p-4">
                                <div className="flex justify-between gap-3"><div className="h-4 w-36 rounded bg-muted" /><div className="h-4 w-20 rounded bg-muted" /></div>
                                <div className="h-3 w-64 rounded bg-muted" />
                                <div className="flex justify-end gap-2"><div className="h-8 w-16 rounded bg-muted" /><div className="h-8 w-8 rounded bg-muted" /></div>
                            </div>
                        )) : purchases.map((purchase) => (
                            <div key={purchase.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                                <div className="min-w-0">
                                    <div className="flex items-start justify-between gap-3 sm:block">
                                        <p className="truncate font-semibold">{purchase.supplierName}</p>
                                        <p className="shrink-0 font-bold sm:hidden">{formatCurrency(purchase.totalAmount)}</p>
                                    </div>
                                    <p className="truncate text-sm text-muted-foreground">
                                        {formatDateOnly(purchase.purchaseDate)} · {purchase.invoiceNumber || "No invoice"} · {purchase.itemsSummary || `${purchase.itemCount} item(s)`}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                                    <p className="hidden font-bold sm:block">{formatCurrency(purchase.totalAmount)}</p>
                                    <Button size="sm" variant="outline" disabled={viewLoadingId === purchase.id} onClick={() => void openView(purchase.id)}>
                                        {viewLoadingId === purchase.id ? <Spinner /> : <Eye className="size-3.5" />} View
                                    </Button>
                                    <Button size="sm" variant="ghost" disabled={purchase.status === "voided" || editLoading} onClick={() => void openEdit(purchase.id)}>
                                        {editLoading ? <Spinner /> : <Pencil className="size-3.5" />} Edit
                                    </Button>
                                    <Button size="icon-sm" variant="ghost" className="text-destructive" disabled={purchase.status === "voided" || voidMutation.isPending} onClick={() => setVoidTarget({ id: purchase.id, supplierName: purchase.supplierName })} aria-label="Void purchase">
                                        {voidTarget?.id === purchase.id && voidMutation.isPending ? <Spinner /> : <Trash2 className="size-4" />}
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {!purchasesQuery.isPending && purchases.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No purchases recorded yet.</div> : null}
                    </div>
                )}
            </div>

            <PurchaseFormDialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) { setEditingPurchase(null); setEditLoading(false); } }} purchase={editingPurchase} isLoading={editLoading} isPending={saveMutation.isPending} onSubmit={async (data) => { await saveMutation.mutateAsync(data); }} />
            <Dialog open={Boolean(selectedPurchase)} onOpenChange={(open) => { if (!open) setSelectedPurchase(null); }} disablePointerDismissal>
                <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col overflow-hidden rounded-2xl p-4 sm:p-5">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Purchase details</DialogTitle>
                        <DialogDescription>Read-only purchase information.</DialogDescription>
                    </DialogHeader>
                    {selectedPurchase ? (
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                            <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:grid-cols-2">
                                <div><p className="text-xs text-muted-foreground">Supplier</p><p className="mt-1 font-semibold">{selectedPurchase.supplierName}</p></div>
                                <div><p className="text-xs text-muted-foreground">Invoice number</p><p className="mt-1 font-semibold">{selectedPurchase.invoiceNumber || "No invoice"}</p></div>
                                <div><p className="text-xs text-muted-foreground">Purchase date</p><p className="mt-1 font-semibold">{formatDateOnly(selectedPurchase.purchaseDate)}</p></div>
                                <div><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 font-semibold capitalize">{selectedPurchase.status}</p></div>
                            </div>
                            <div className="overflow-hidden rounded-xl border border-border/60">
                                <div className="border-b border-border/60 bg-muted/20 px-3 py-2 text-sm font-semibold">Items</div>
                                <div className="divide-y divide-border/60">
                                    {selectedPurchase.items.map((item) => (
                                        <div key={item.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0"><p className="font-medium">{item.itemName}</p>{item.description ? <p className="truncate text-xs text-muted-foreground">{item.description}</p> : null}</div>
                                            <div className="flex items-center justify-between gap-4 text-sm sm:justify-end"><span className="text-muted-foreground">{item.quantity} × {formatCurrency(item.rate)}</span><span className="font-semibold">{formatCurrency(item.lineTotal)}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {selectedPurchase.notes ? <div className="rounded-xl border border-border/60 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{selectedPurchase.notes}</p></div> : null}
                            <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-3"><span className="font-semibold">Purchase total</span><span className="text-lg font-bold">{formatCurrency(selectedPurchase.totalAmount)}</span></div>
                        </div>
                    ) : null}
                    <DialogFooter className="shrink-0 border-t border-border/60 pt-4"><Button type="button" variant="outline" onClick={() => setSelectedPurchase(null)}>Close</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={Boolean(voidTarget)} onOpenChange={(open) => { if (!open) { setVoidTarget(null); setVoidReason(""); } }}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Void this purchase?</AlertDialogTitle><AlertDialogDescription>This keeps the purchase in history but removes it from totals. {voidTarget?.supplierName ? `Supplier: ${voidTarget.supplierName}.` : ""}</AlertDialogDescription></AlertDialogHeader>
                    <Input value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Reason for voiding" aria-label="Reason for voiding" />
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={!voidReason.trim() || voidMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (voidTarget && voidReason.trim()) voidMutation.mutate({ purchaseId: voidTarget.id, reason: voidReason.trim() }); }}>{voidMutation.isPending ? <><Spinner />Voiding...</> : "Void purchase"}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default PosPurchasesPanel;
