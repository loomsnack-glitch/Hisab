import { useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@repo/ui/components/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { FileText, Link2, LoaderCircle, LogOut, Megaphone, Pencil, RefreshCw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { normalizePhoneNumber, type WhatsAppAccountStatusResponseDTO } from "@repo/types";
import {
    connectWhatsAppOrganizationAccount,
    changeWhatsAppOrganizationAccountNumber,
    createWhatsAppOrganizationAccount,
    disconnectWhatsAppOrganizationAccount,
    getWhatsAppAccounts,
    getWhatsAppOrganizationAccount,
    getOrganizationDetails,
} from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { PhoneInput } from "@repo/ui/components/phone-input";
import { Spinner } from "@repo/ui/components/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import { whatsappKeys } from "@/lib/query-keys";
import WhatsAppTemplateManager from "@/components/organizations/whatsapp-template-manager";
import WhatsAppLinkManager from "@/components/organizations/whatsapp-link-manager";
import WhatsAppPromotionDashboard from "@/components/organizations/whatsapp-promotion-dashboard";

const ACCOUNT_STATUS_POLL_INTERVAL_MS = 2_000;
const ACCOUNT_STATUS_POLL_WINDOW_MS = 60_000;

const statusLabel: Record<string, string> = {
    pending_qr: "Scan the QR code",
    connecting: "Connecting",
    connected: "Connected",
    disconnected: "Disconnected",
    failed: "Connection failed",
    revoked: "Session revoked",
};

const workspaceTabs = [
    { id: "accounts", label: "Accounts", icon: Settings2 },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "promotions", label: "Promotions", icon: Megaphone },
] as const;

type WorkspaceTab = (typeof workspaceTabs)[number]["id"];

const WhatsAppOrganizationPage = () => {
    const { organizationId = "" } = useParams();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const [phoneNumber, setPhoneNumber] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    const [qrByAccountId, setQrByAccountId] = useState<Record<string, string>>({});
    const [changeAccountId, setChangeAccountId] = useState("");
    const [newPhoneNumber, setNewPhoneNumber] = useState("");
    const [statusPollUntilByAccountId, setStatusPollUntilByAccountId] = useState<Record<string, number>>({});
    const accountsKey = whatsappKeys.accounts(organizationId);
    const organizationQuery = useQuery({
        queryKey: ["whatsapp-workspace", organizationId, "organization"],
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });
    const accountsQuery = useQuery({
        queryKey: accountsKey,
        queryFn: () => getWhatsAppAccounts(organizationId),
        enabled: Boolean(organizationId),
    });
    const accounts = accountsQuery.data?.data?.accounts ?? [];
    const stores = organizationQuery.data?.status === "success"
        ? organizationQuery.data.data?.organization.stores ?? []
        : [];
    const basePath = `/organizations/${organizationId}/whatsapp`;
    const activeTab: WorkspaceTab = workspaceTabs.find(tab => location.pathname.startsWith(`${basePath}/${tab.id}`))?.id ?? "accounts";
    const requestedStoreId = searchParams.get("storeId");
    const selectedStoreId = stores.some(store => store.id === requestedStoreId)
        ? requestedStoreId!
        : stores[0]?.id ?? "";
    const selectedStore = stores.find(store => store.id === selectedStoreId);
    const statusQueries = useQueries({
        queries: accounts.map(account => ({
            queryKey: whatsappKeys.organizationAccount(organizationId, account.id),
            queryFn: () => getWhatsAppOrganizationAccount(organizationId, account.id),
            enabled: Boolean(organizationId),
            refetchInterval: query => {
                const status = query.state.data?.data?.account.status;
                const pollUntil = statusPollUntilByAccountId[account.id] ?? 0;
                const pollRequested = pollUntil > Date.now() && status !== "connected" && status !== "failed" && status !== "revoked";
                return (pollRequested || status === "pending_qr" || status === "connecting") ? ACCOUNT_STATUS_POLL_INTERVAL_MS : false;
            },
        })),
    });
    const phoneError = phoneNumber.length > 0 && !normalizePhoneNumber(phoneNumber);

    const pollAccountStatus = (accountId: string) => {
        setStatusPollUntilByAccountId(current => ({
            ...current,
            [accountId]: Date.now() + ACCOUNT_STATUS_POLL_WINDOW_MS,
        }));
    };
    const refresh = (accountId?: string) => {
        void queryClient.invalidateQueries({ queryKey: accountsKey });
        if (accountId) {
            void queryClient.invalidateQueries({
                queryKey: whatsappKeys.organizationAccount(organizationId, accountId),
                refetchType: "active",
            });
        }
    };
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
        onMutate: accountId => {
            pollAccountStatus(accountId);
        },
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
            refresh(accountId);
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
            refresh(disconnectMutation.variables);
        },
    });
    const changeMutation = useMutation({
        mutationFn: () => changeWhatsAppOrganizationAccountNumber(organizationId, changeAccountId, { phoneNumber: newPhoneNumber.trim() }),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            const accountId = response.data?.account.id ?? changeAccountId;
            setChangeAccountId("");
            setNewPhoneNumber("");
            if (response.data?.qrImageDataUrl) setQrByAccountId(current => ({ ...current, [response.data!.account.id]: response.data!.qrImageDataUrl! }));
            toast.success("WhatsApp number changed. Scan the new QR code.");
            refresh(accountId);
        },
    });
    const newPhoneError = newPhoneNumber.length > 0 && !normalizePhoneNumber(newPhoneNumber);
    const isBusy = createMutation.isPending || connectMutation.isPending || disconnectMutation.isPending || changeMutation.isPending;
    const liveAccounts = accounts.map((account, index) => statusQueries[index]?.data?.data?.account ?? account);
    const selectStore = (storeId: string) => {
        setSearchParams({ storeId });
    };

    const workspaceLink = (tab: WorkspaceTab) => {
        const params = new URLSearchParams();
        if (selectedStoreId) params.set("storeId", selectedStoreId);
        const query = params.toString();
        return `${basePath}/${tab}${query ? `?${query}` : ""}`;
    };

    if (accountsQuery.isPending) {
        return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="size-6 text-primary" /></div>;
    }

    return (
        <div className="mx-auto max-w-5xl space-y-5">
            <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-semibold sm:text-3xl">WhatsApp</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage accounts, templates, and promotions.</p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                        {activeTab !== "accounts" && organizationQuery.data?.status === "success" ? (
                            <div className="flex w-full items-center gap-2 sm:w-auto">
                                <span className="text-sm font-medium">Store</span>
                                <Select value={selectedStoreId} onValueChange={selectStore}>
                                    <SelectTrigger className="w-full rounded-xl sm:w-64" aria-label="Select Store for WhatsApp settings">
                                    <SelectValue placeholder="Select Store">
                                        {selectedStore?.name ? <span className="truncate">{selectedStore.name}</span> : null}
                                    </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stores.map(store => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}
                        {activeTab === "accounts" ? (
                            <Button className="w-full rounded-full sm:w-auto" onClick={() => setAddOpen(true)}><Link2 className="size-4" />Add account</Button>
                        ) : null}
                    </div>
                </div>

                <nav aria-label="WhatsApp workspace tabs" className="border-b border-border/60">
                    <div className="grid grid-cols-3 gap-1 sm:flex sm:w-fit">
                        {workspaceTabs.map(tab => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.id;
                            return (
                                <Link
                                    key={tab.id}
                                    to={workspaceLink(tab.id)}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "relative flex items-center justify-center gap-1.5 whitespace-nowrap rounded-t-lg px-2 py-2.5 text-center text-xs font-medium transition-colors duration-200 sm:gap-2 sm:px-4 sm:text-sm",
                                        active
                                            ? "font-semibold text-primary"
                                            : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                                    )}
                                >
                                    <Icon className="size-4" />
                                    <span>{tab.label}</span>
                                    {active ? <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" /> : null}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>

            {activeTab !== "accounts" && organizationQuery.isPending ? (
                <Card className="border-border/60 bg-card/70"><CardContent className="flex min-h-24 items-center justify-center"><Spinner className="size-5 text-primary" /></CardContent></Card>
            ) : null}

            {activeTab !== "accounts" && (organizationQuery.isError || organizationQuery.data?.status === "error") ? (
                <Card className="border-destructive/30 bg-destructive/5"><CardContent className="flex flex-col gap-3 p-5"><p className="font-medium">Unable to load Store WhatsApp settings</p><p className="text-sm text-muted-foreground">{(organizationQuery.error as { message?: string })?.message ?? organizationQuery.data?.message ?? "Refresh the page and try again."}</p><Button variant="outline" className="w-fit rounded-full" onClick={() => organizationQuery.refetch()}><RefreshCw className="size-4" />Retry</Button></CardContent></Card>
            ) : null}

            {activeTab === "accounts" ? <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-xl font-semibold">Accounts</h2>
                        <p className="text-sm text-muted-foreground">Add and manage shared WhatsApp numbers.</p>
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
            </section> : organizationQuery.data?.status === "success" && selectedStore ? (
                <section className="space-y-4">
                    {activeTab === "templates" ? (
                        <Card className="border-border/60 bg-card/80">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 font-display text-xl"><FileText className="size-5 text-primary" />Templates and links</CardTitle>
                                <CardDescription>Reusable messages for {selectedStore.name}. Links are inserted only where you choose.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <WhatsAppLinkManager organizationId={organizationId} store={selectedStore} />
                                <WhatsAppTemplateManager organizationId={organizationId} storeId={selectedStore.id} kind="bill" links={selectedStore.whatsappLinks} />
                                <WhatsAppTemplateManager organizationId={organizationId} storeId={selectedStore.id} kind="due_reminder" links={selectedStore.whatsappLinks} />
                                <WhatsAppTemplateManager organizationId={organizationId} storeId={selectedStore.id} kind="promotion" links={selectedStore.whatsappLinks} />
                            </CardContent>
                        </Card>
                    ) : null}

                    {activeTab === "promotions" ? (
                        <WhatsAppPromotionDashboard organizationId={organizationId} storeId={selectedStore.id} storeName={selectedStore.name} links={selectedStore.whatsappLinks} />
                    ) : null}
                </section>
            ) : organizationQuery.data?.status === "success" ? (
                <Card className="border-dashed border-border/70 bg-muted/10"><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><Settings2 className="size-7 text-muted-foreground" /><p className="font-medium">Add a Store to configure WhatsApp settings</p><p className="max-w-md text-sm text-muted-foreground">Templates and promotions become available after a Store is created.</p></CardContent></Card>
            ) : null}

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
