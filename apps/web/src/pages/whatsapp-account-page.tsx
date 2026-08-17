import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@repo/ui/components/alert-dialog";
import { ArrowLeft, Link2, LoaderCircle, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { WhatsAppAccountStatusResponseDTO } from "@repo/types";
import { assignWhatsAppAccount, getWhatsAppAccount, getWhatsAppAccounts, removeWhatsAppAccount } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import { whatsappKeys } from "@/lib/query-keys";
import WhatsAppIcon from "@/components/icons/whatsapp-icon";

const statusLabel: Record<string, string> = {
    pending_qr: "Scan the QR code",
    connecting: "Connecting",
    connected: "Connected",
    disconnected: "Disconnected",
    failed: "Connection failed",
    revoked: "Session revoked",
};

type WhatsAppAccountQueryError = {
    message?: string;
    data?: WhatsAppAccountStatusResponseDTO | null;
};

const WhatsAppAccountPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const queryClient = useQueryClient();
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [removeOpen, setRemoveOpen] = useState(false);
    const accountKey = whatsappKeys.account(organizationId, storeId);
    const accountsKey = whatsappKeys.accounts(organizationId);
    const accountQuery = useQuery({
        queryKey: accountKey,
        queryFn: () => getWhatsAppAccount(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });
    const accountsQuery = useQuery({
        queryKey: accountsKey,
        queryFn: () => getWhatsAppAccounts(organizationId),
        enabled: Boolean(organizationId),
    });
    const accountError = accountQuery.error as WhatsAppAccountQueryError | null;
    const accountData = accountQuery.isError ? accountError?.data ?? null : accountQuery.data?.data ?? null;
    const account = accountData?.account;
    const accounts = accountsQuery.data?.data?.accounts ?? [];
    const availableAccounts = accounts.filter(candidate => !candidate.assignedStoreIds.includes(storeId));
    const selectedAccount = availableAccounts.find(candidate => candidate.id === selectedAccountId);
    const assignMutation = useMutation({
        mutationFn: () => assignWhatsAppAccount(organizationId, storeId, { whatsappAccountId: selectedAccountId }),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            setSelectedAccountId("");
            queryClient.setQueryData(accountKey, response);
            void queryClient.invalidateQueries({ queryKey: accountsKey });
            toast.success("WhatsApp account linked to this Store");
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "WhatsApp account could not be linked");
        },
    });
    const unassignMutation = useMutation({
        mutationFn: () => removeWhatsAppAccount(organizationId, storeId),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            setSelectedAccountId("");
            queryClient.setQueryData(accountKey, {
                status: "success",
                message: "WhatsApp account not linked",
                data: null,
                code: 200,
            });
            setRemoveOpen(false);
            void queryClient.invalidateQueries({ queryKey: accountKey });
            void queryClient.invalidateQueries({ queryKey: accountsKey });
            toast.success("WhatsApp account unlinked from this Store");
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "WhatsApp account could not be unlinked");
        },
    });
    const isBusy = assignMutation.isPending || unassignMutation.isPending;

    if (accountQuery.isPending || accountsQuery.isPending) {
        return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="size-6 text-primary" /></div>;
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Button variant="ghost" className="rounded-full" render={<Link to={`/organizations/${organizationId}/stores`} />}>
                <ArrowLeft className="size-4" />
                Back to stores
            </Button>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 font-display text-2xl">
                                <WhatsAppIcon className="size-5 text-primary" />
                                Store WhatsApp
                            </CardTitle>
                            <CardDescription className="mt-2">Link an organization WhatsApp account to this Store. Add and manage accounts from the organization page.</CardDescription>
                        </div>
                        {account ? <Badge variant="outline" className="rounded-full">{statusLabel[account.status] ?? account.status}</Badge> : null}
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    {accountQuery.isError && !account ? (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                            {(accountError?.message ?? "Unable to load the Store WhatsApp account.")}
                        </div>
                    ) : account ? (
                        <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-medium">{account.phoneNumber}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Shared with {account.assignedStoreIds.length} Store{account.assignedStoreIds.length === 1 ? "" : "s"} in this organization.</p>
                            </div>
                            <Button variant="outline" className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isBusy} onClick={() => setRemoveOpen(true)}>
                                {unassignMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                Unlink from Store
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {availableAccounts.length > 0 ? (
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-medium">Choose an organization account</p>
                                        <p className="mt-1 text-xs text-muted-foreground">This Store can use an account already added to the organization pool.</p>
                                    </div>
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
                                                                <span className="block truncate text-[11px] leading-4 text-muted-foreground">{statusLabel[candidate.status] ?? candidate.status} · {candidate.assignedStoreIds.length} Store{candidate.assignedStoreIds.length === 1 ? "" : "s"} linked</span>
                                                            </span>
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button className="rounded-full" disabled={isBusy || !selectedAccountId} onClick={() => assignMutation.mutate()}>
                                            {assignMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                                            Link account
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                            <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                                {availableAccounts.length > 0 ? "Need another number? Add it from the organization WhatsApp manager." : "No organization WhatsApp account is available yet. Add one from the organization WhatsApp manager."}
                                <Button variant="link" className="h-auto px-1 font-medium" render={<Link to={`/organizations/${organizationId}/whatsapp/accounts`} />}>
                                    <Settings2 className="size-3.5" />
                                    Manage organization accounts
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unlink WhatsApp from this Store?</AlertDialogTitle>
                        <AlertDialogDescription>The organization account, session, and saved history will remain. Only this Store assignment will be removed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={unassignMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={unassignMutation.isPending} onClick={event => { event.preventDefault(); unassignMutation.mutate(); }}>
                            {unassignMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            Unlink from Store
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default WhatsAppAccountPage;
