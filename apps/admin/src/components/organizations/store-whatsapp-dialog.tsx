import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@repo/ui/components/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Link2, LoaderCircle, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getWhatsAppAccount, getWhatsAppAccounts, assignWhatsAppAccount, removeWhatsAppAccount } from "@repo/services";
import type { WhatsAppAccountStatusResponseDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import { whatsappKeys } from "@/lib/query-keys";
import WhatsAppIcon from "@/components/icons/whatsapp-icon";

const cloudStatusLabel: Record<string, string> = {
    connected: "Connected",
    disconnected: "Disconnected",
    needs_action: "Needs attention",
    revoked: "Access revoked",
    suspended: "Suspended",
    failed: "Connection failed",
};

type Props = { organizationId: string; storeId: string; storeName: string };
type QueryError = { message?: string; data?: WhatsAppAccountStatusResponseDTO | null };

const StoreWhatsAppDialog = ({ organizationId, storeId, storeName }: Props) => {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [unlinkOpen, setUnlinkOpen] = useState(false);
    const accountKey = whatsappKeys.account(organizationId, storeId);
    const accountsKey = whatsappKeys.accounts(organizationId);
    const accountQuery = useQuery({
        queryKey: accountKey,
        queryFn: () => getWhatsAppAccount(organizationId, storeId),
        enabled: open,
    });
    const accountsQuery = useQuery({ queryKey: accountsKey, queryFn: () => getWhatsAppAccounts(organizationId), enabled: open });
    const accountError = accountQuery.error as QueryError | null;
    const accountData = accountQuery.isError ? accountError?.data ?? null : accountQuery.data?.data ?? null;
    const account = accountData?.account;
    const accounts = accountsQuery.data?.data?.accounts ?? [];
    const availableAccounts = accounts.filter(candidate =>
        candidate.provider === "cloud_api"
        && !candidate.assignedStoreIds.includes(storeId),
    );
    const selectedAccount = availableAccounts.find(candidate => candidate.id === selectedAccountId);
    const assignMutation = useMutation({
        mutationFn: () => assignWhatsAppAccount(organizationId, storeId, { whatsappAccountId: selectedAccountId }),
        onSuccess: response => {
            if (response.status !== "success") return toast.error(response.message);
            setSelectedAccountId("");
            queryClient.setQueryData(accountKey, response);
            void queryClient.invalidateQueries({ queryKey: accountsKey });
            toast.success("WhatsApp account linked to this Store");
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "WhatsApp account could not be linked");
        },
    });
    const unlinkMutation = useMutation({
        mutationFn: () => removeWhatsAppAccount(organizationId, storeId),
        onSuccess: response => {
            if (response.status !== "success") return toast.error(response.message);
            setUnlinkOpen(false);
            setSelectedAccountId("");
            queryClient.setQueryData(accountKey, {
                status: "success",
                message: "WhatsApp account not linked",
                data: null,
                code: 200,
            });
            void queryClient.invalidateQueries({ queryKey: accountKey });
            void queryClient.invalidateQueries({ queryKey: accountsKey });
            toast.success("WhatsApp account unlinked from this Store");
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "WhatsApp account could not be unlinked");
        },
    });
    const isBusy = assignMutation.isPending || unlinkMutation.isPending;

    return (
        <>
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="pointer-events-auto relative z-10 shrink-0 rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                onClick={() => setOpen(true)}
                aria-label={`${storeName} WhatsApp`}
            >
                <WhatsAppIcon className="size-4" />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90dvh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto rounded-2xl p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-display text-xl"><WhatsAppIcon className="size-5 text-primary" />{storeName} WhatsApp</DialogTitle>
                        <DialogDescription>Link this Store to an account from the organization WhatsApp pool.</DialogDescription>
                    </DialogHeader>
                    {accountQuery.isPending || accountsQuery.isPending ? (
                        <div className="flex min-h-32 items-center justify-center"><Spinner className="size-5 text-primary" /></div>
                    ) : account ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div><p className="text-xs text-muted-foreground">Linked mobile</p><p className="mt-1 text-lg font-semibold tracking-tight">{account.phoneNumber}</p></div>
                                    <Badge variant={accountQuery.isError ? "secondary" : "outline"} className="rounded-full">
                                        {accountQuery.isError ? "Status unavailable" : cloudStatusLabel[account.cloudStatus ?? account.status] ?? "Cloud status unavailable"}
                                    </Badge>
                                </div>
                                <p className="mt-3 text-xs text-muted-foreground">Linked to {account.assignedStoreIds.length} Store{account.assignedStoreIds.length === 1 ? "" : "s"} in this organization.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" className="rounded-full" onClick={() => setUnlinkOpen(true)} disabled={isBusy}><Trash2 className="size-4" />Unlink from Store</Button>
                                <Button variant="outline" className="rounded-full" render={<Link to={`/organizations/${organizationId}/whatsapp/accounts`} />} onClick={() => setOpen(false)}><Settings2 className="size-4" />Manage account</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {accountsQuery.isError ? (
                                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                                    <p>{(accountsQuery.error as { message?: string })?.message ?? "Unable to load organization WhatsApp accounts."}</p>
                                    <Button variant="link" className="h-auto px-0 text-destructive" onClick={() => accountsQuery.refetch()}>Retry</Button>
                                </div>
                            ) : null}
                            {accountQuery.isError && !accountError?.data ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{accountError?.message ?? "Unable to load this Store account."}</p> : null}
                            {availableAccounts.length > 0 ? (
                                <div className="space-y-3">
                                    <div><p className="text-sm font-medium">Choose an organization account</p><p className="mt-1 text-xs text-muted-foreground">The account session is managed centrally; this action only links it to the Store.</p></div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Select value={selectedAccountId} onValueChange={value => setSelectedAccountId(value ?? "")}>
                                            <SelectTrigger className="h-10 min-w-0 flex-1 rounded-xl bg-background/70">
                                                <SelectValue placeholder="Select a WhatsApp account">
                                                    {selectedAccount ? <span className="truncate">{selectedAccount.phoneNumber}</span> : null}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent align="start" className="max-w-[calc(100vw-2rem)]">
                                                {availableAccounts.map(candidate => (
                                                    <SelectItem key={candidate.id} value={candidate.id} className="min-w-0">
                                                        <span className="flex min-w-0 flex-1 items-center gap-2">
                                                            <WhatsAppIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block truncate font-medium leading-5">{candidate.phoneNumber}</span>
                                                                <span className="block truncate text-[11px] leading-4 text-muted-foreground">{cloudStatusLabel[candidate.cloudStatus ?? candidate.status] ?? "Cloud API"} · Cloud API · {candidate.assignedStoreIds.length} Store{candidate.assignedStoreIds.length === 1 ? "" : "s"} linked</span>
                                                            </span>
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button className="rounded-full" disabled={isBusy || !selectedAccountId} onClick={() => assignMutation.mutate()}>{assignMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}Link account</Button>
                                    </div>
                                </div>
                            ) : null}
                            <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                                {availableAccounts.length > 0 ? "Need another number? Add it from the organization account manager." : "No organization WhatsApp account is available yet."}
                                <Button variant="link" className="h-auto px-1 font-medium" render={<Link to={`/organizations/${organizationId}/whatsapp/accounts`} />} onClick={() => setOpen(false)}>Add or manage accounts</Button>
                            </div>
                        </div>
                    )}
                    <DialogFooter><Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Close</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Unlink WhatsApp from {storeName}?</AlertDialogTitle><AlertDialogDescription>The organization account, session, and saved history remain. Only this Store link will be removed.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel disabled={unlinkMutation.isPending}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={unlinkMutation.isPending} onClick={event => { event.preventDefault(); unlinkMutation.mutate(); }}>{unlinkMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Unlink from Store</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default StoreWhatsAppDialog;
