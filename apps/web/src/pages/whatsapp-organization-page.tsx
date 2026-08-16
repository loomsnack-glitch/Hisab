import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@repo/ui/components/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { ArrowLeft, Link2, LoaderCircle, LogOut, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { normalizePhoneNumber, type WhatsAppAccountStatusResponseDTO } from "@repo/types";
import {
    connectWhatsAppOrganizationAccount,
    changeWhatsAppOrganizationAccountNumber,
    createWhatsAppOrganizationAccount,
    disconnectWhatsAppOrganizationAccount,
    getWhatsAppAccounts,
    getWhatsAppOrganizationAccount,
} from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { PhoneInput } from "@repo/ui/components/phone-input";
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

const WhatsAppOrganizationPage = () => {
    const { organizationId = "" } = useParams();
    const queryClient = useQueryClient();
    const [phoneNumber, setPhoneNumber] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    const [qrByAccountId, setQrByAccountId] = useState<Record<string, string>>({});
    const [changeAccountId, setChangeAccountId] = useState("");
    const [newPhoneNumber, setNewPhoneNumber] = useState("");
    const accountsKey = whatsappKeys.accounts(organizationId);
    const accountsQuery = useQuery({
        queryKey: accountsKey,
        queryFn: () => getWhatsAppAccounts(organizationId),
        enabled: Boolean(organizationId),
    });
    const accounts = accountsQuery.data?.data?.accounts ?? [];
    const statusQueries = useQueries({
        queries: accounts.map(account => ({
            queryKey: whatsappKeys.organizationAccount(organizationId, account.id),
            queryFn: () => getWhatsAppOrganizationAccount(organizationId, account.id),
            enabled: Boolean(organizationId),
            refetchInterval: query => {
                const status = query.state.data?.data?.account.status;
                return status === "pending_qr" || status === "connecting" ? 2_000 : false;
            },
        })),
    });
    const phoneError = phoneNumber.length > 0 && !normalizePhoneNumber(phoneNumber);

    const refresh = () => void queryClient.invalidateQueries({ queryKey: accountsKey });
    const createMutation = useMutation({
        mutationFn: () => createWhatsAppOrganizationAccount(organizationId, { phoneNumber: phoneNumber.trim() }),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            setPhoneNumber("");
            setAddOpen(false);
            if (response.data?.qrImageDataUrl) {
                setQrByAccountId(current => ({ ...current, [response.data!.account.id]: response.data!.qrImageDataUrl! }));
            }
            toast.success("WhatsApp account added to the organization");
            refresh();
        },
    });
    const connectMutation = useMutation({
        mutationFn: (accountId: string) => connectWhatsAppOrganizationAccount(organizationId, accountId),
        onSuccess: response => {
            const accountId = connectMutation.variables;
            if (accountId && response.data) {
                queryClient.setQueryData(whatsappKeys.organizationAccount(organizationId, accountId), response);
            }
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            if (response.data?.qrImageDataUrl) {
                setQrByAccountId(current => ({ ...current, [response.data!.account.id]: response.data!.qrImageDataUrl! }));
            }
            toast.success("WhatsApp account linking started");
            refresh();
        },
    });
    const disconnectMutation = useMutation({
        mutationFn: (accountId: string) => disconnectWhatsAppOrganizationAccount(organizationId, accountId),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success("WhatsApp account disconnected");
            refresh();
        },
    });
    const changeMutation = useMutation({
        mutationFn: () => changeWhatsAppOrganizationAccountNumber(organizationId, changeAccountId, { phoneNumber: newPhoneNumber.trim() }),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            setChangeAccountId("");
            setNewPhoneNumber("");
            if (response.data?.qrImageDataUrl) setQrByAccountId(current => ({ ...current, [response.data!.account.id]: response.data!.qrImageDataUrl! }));
            toast.success("WhatsApp number changed. Scan the new QR code.");
            refresh();
        },
    });
    const newPhoneError = newPhoneNumber.length > 0 && !normalizePhoneNumber(newPhoneNumber);
    const isBusy = createMutation.isPending || connectMutation.isPending || disconnectMutation.isPending || changeMutation.isPending;
    const connectedCount = accounts.filter(account => account.status === "connected").length;
    const assignedStoreCount = accounts.reduce((total, account) => total + account.assignedStoreIds.length, 0);

    if (accountsQuery.isPending) {
        return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="size-6 text-primary" /></div>;
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <Button variant="ghost" className="rounded-full" render={<Link to={`/organizations/${organizationId}/stores`} />}>
                <ArrowLeft className="size-4" />
                Back to stores
            </Button>

            <div>
                <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <WhatsAppIcon className="size-5" />
                    </div>
                    <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Organization WhatsApp</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Add WhatsApp accounts here, then assign them from each Store.</p>
                        </div>
                        <Button className="w-full rounded-full sm:w-auto" onClick={() => setAddOpen(true)}><Link2 className="size-4" />Add account</Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <Card className="border-border/60 bg-card/70"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Accounts</p><p className="mt-1 text-2xl font-semibold">{accounts.length}</p></CardContent></Card>
                <Card className="border-border/60 bg-card/70"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Connected</p><p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{connectedCount}</p></CardContent></Card>
                <Card className="border-border/60 bg-card/70"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Store links</p><p className="mt-1 text-2xl font-semibold">{assignedStoreCount}</p></CardContent></Card>
            </div>

            <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-xl font-semibold">Account pool</h2>
                        <p className="text-sm text-muted-foreground">Manage sessions here. Stores only select which account they use.</p>
                    </div>
                    <Badge variant="outline" className="rounded-full">{accounts.length} account{accounts.length === 1 ? "" : "s"}</Badge>
                </div>

                {accounts.length === 0 ? (
                    <Card className="border-dashed border-border/70 bg-muted/10">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">No organization WhatsApp accounts yet.</CardContent>
                    </Card>
                ) : accounts.map((account, index) => {
                    const liveResponse = statusQueries[index]?.data?.data;
                    const liveAccount = liveResponse?.account ?? account;
                    const qrImageDataUrl = liveResponse?.qrImageDataUrl ?? ((liveAccount.status === "pending_qr" || liveAccount.status === "connecting") ? qrByAccountId[account.id] : null);
                    const connecting = connectMutation.isPending && connectMutation.variables === account.id;
                    const disconnecting = disconnectMutation.isPending && disconnectMutation.variables === account.id;
                    return (
                        <Card key={account.id} className="border-border/60 bg-card/80">
                            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium">{liveAccount.phoneNumber}</p>
                                        <Badge variant="outline" className="rounded-full">{statusLabel[liveAccount.status] ?? liveAccount.status}</Badge>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Assigned to {account.assignedStoreIds.length} Store{account.assignedStoreIds.length === 1 ? "" : "s"}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">New inbound chats use the default Store; existing conversations keep their original Store.</p>
                                    {qrImageDataUrl ? (
                                        <div className="mt-4 flex flex-col items-start gap-2">
                                            <img src={qrImageDataUrl} alt={`QR code for ${account.phoneNumber}`} className="size-56 rounded-xl border bg-white p-2" />
                                            <p className="text-xs text-muted-foreground">Scan from WhatsApp → Linked devices.</p>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button variant="outline" className="rounded-full" disabled={isBusy} onClick={() => { setChangeAccountId(account.id); setNewPhoneNumber(""); }}>
                                        <Pencil className="size-4" />
                                        Change number
                                    </Button>
                                    {liveAccount.status === "connected" ? (
                                        <Button variant="outline" className="rounded-full" disabled={isBusy} onClick={() => disconnectMutation.mutate(account.id)}>
                                            {disconnecting ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                                            Disconnect
                                        </Button>
                                    ) : liveAccount.status === "pending_qr" || liveAccount.status === "connecting" ? (
                                        <Button variant="outline" className="rounded-full" disabled>
                                            <LoaderCircle className="size-4 animate-spin" />
                                            {liveAccount.status === "pending_qr" ? "Waiting for scan" : "Connecting"}
                                        </Button>
                                    ) : (
                                        <Button variant="outline" className="rounded-full" disabled={isBusy} onClick={() => connectMutation.mutate(account.id)}>
                                            {connecting ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                                            Link account
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </section>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-2xl p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>Add WhatsApp account</DialogTitle>
                        <DialogDescription>This account will join the organization pool and can then be linked from any Store.</DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={event => {
                        event.preventDefault();
                        if (phoneError || !phoneNumber.trim()) {
                            toast.error("Enter a valid phone number");
                            return;
                        }
                        createMutation.mutate();
                    }}>
                        <div className="space-y-2">
                            <PhoneInput id="organization-whatsapp-phone" className="h-10" value={phoneNumber || undefined} onChange={value => setPhoneNumber(value ?? "")} placeholder="9876543210" inputMode="tel" aria-invalid={phoneError} />
                            <p className="text-xs text-muted-foreground">India (+91) is selected by default.</p>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" className="rounded-full" onClick={() => setAddOpen(false)}>Cancel</Button>
                            <Button type="submit" className="rounded-full" disabled={isBusy || phoneError || !phoneNumber.trim()}>{createMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}Add account</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={Boolean(changeAccountId)} onOpenChange={open => { if (!open && !changeMutation.isPending) setChangeAccountId(""); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Change shared WhatsApp number?</AlertDialogTitle>
                        <AlertDialogDescription>This changes the number for every Store assigned to this account. The current session will disconnect and require a new QR scan.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <PhoneInput
                        id="organization-whatsapp-new-phone"
                        className="h-10"
                        value={newPhoneNumber || undefined}
                        onChange={value => setNewPhoneNumber(value ?? "")}
                        placeholder="9876543210"
                        inputMode="tel"
                        aria-invalid={newPhoneError}
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={changeMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction disabled={changeMutation.isPending || newPhoneError || !newPhoneNumber.trim()} onClick={event => { event.preventDefault(); if (!newPhoneError && newPhoneNumber.trim()) changeMutation.mutate(); }}>
                            {changeMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Pencil className="size-4" />}
                            Change number
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default WhatsAppOrganizationPage;
