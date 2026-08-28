import { useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Query } from "@tanstack/query-core";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@repo/ui/components/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { FileText, KeyRound, Link2, LoaderCircle, LogOut, Megaphone, Pencil, RefreshCw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { normalizePhoneNumber, STATUS_CODES, type WhatsAppAccountStatusResponseDTO } from "@repo/types";
import {
    connectWhatsAppOrganizationAccount,
    changeWhatsAppOrganizationAccountNumber,
    createWhatsAppOrganizationAccount,
    disconnectWhatsAppOrganizationAccount,
    getWhatsAppAccounts,
    getWhatsAppOrganizationAccount,
    getWhatsAppCloudAccounts,
    manuallyProvisionWhatsAppCloudAccount,
    startWhatsAppCloudOnboarding,
    completeWhatsAppCloudOnboarding,
    refreshWhatsAppCloudAccount,
    revokeWhatsAppCloudAccount,
    getOrganizationDetails,
} from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { PhoneInput } from "@repo/ui/components/phone-input";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import { whatsappKeys } from "@/lib/query-keys";
import WhatsAppTemplateManager from "@/components/organizations/whatsapp-template-manager";
import WhatsAppLinkManager from "@/components/organizations/whatsapp-link-manager";
import WhatsAppPromotionDashboard from "@/components/organizations/whatsapp-promotion-dashboard";
import WhatsAppCloudTemplateManager, { type WhatsAppCloudAccountOption } from "@/components/organizations/whatsapp-cloud-template-manager";
import WhatsAppCloudSafetyCard from "@/components/organizations/whatsapp-cloud-safety-card";

const ACCOUNT_STATUS_POLL_INTERVAL_MS = 2_000;
const ACCOUNT_STATUS_POLL_WINDOW_MS = 60_000;
const ACCOUNT_STATUS_RETRY_ATTEMPTS = 7;

type EmbeddedSignupSdk = {
    init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
    login: (callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>) => void;
};

type EmbeddedSignupMessage = { type?: string; event?: string; data?: { phone_number_id?: string; waba_id?: string } };

const getEmbeddedSignupSdk = async (): Promise<EmbeddedSignupSdk> => {
    const appId = import.meta.env.VITE_WHATSAPP_CLOUD_APP_ID?.trim();
    if (!appId) throw new Error("WhatsApp Cloud Embedded Signup is not configured");
    const existing = (window as Window & { FB?: EmbeddedSignupSdk }).FB;
    if (existing) return existing;
    await new Promise<void>((resolve, reject) => {
        const current = document.getElementById("whatsapp-cloud-facebook-sdk");
        if (current) {
            current.addEventListener("load", () => resolve(), { once: true });
            current.addEventListener("error", () => reject(new Error("Meta Embedded Signup could not be loaded")), { once: true });
            return;
        }
        const script = document.createElement("script");
        script.id = "whatsapp-cloud-facebook-sdk";
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        script.src = "https://connect.facebook.net/en_US/sdk.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Meta Embedded Signup could not be loaded"));
        document.head.appendChild(script);
    });
    const sdk = (window as Window & { FB?: EmbeddedSignupSdk }).FB;
    if (!sdk) throw new Error("Meta Embedded Signup is unavailable");
    const sdkVersion = import.meta.env.VITE_WHATSAPP_CLOUD_GRAPH_VERSION?.trim() || "v26.0";
    sdk.init({ appId, cookie: true, xfbml: true, version: sdkVersion });
    return sdk;
};

const launchEmbeddedSignup = async (): Promise<{ code: string; wabaId: string; phoneNumberId: string }> => {
    const configId = import.meta.env.VITE_WHATSAPP_CLOUD_CONFIG_ID?.trim();
    if (!configId) throw new Error("WhatsApp Cloud Embedded Signup config is not configured");
    const sdk = await getEmbeddedSignupSdk();
    return new Promise((resolve, reject) => {
        let code = "";
        let wabaId = "";
        let phoneNumberId = "";
        let settled = false;
        let timeout = 0;
        const onMessage = (event: MessageEvent<EmbeddedSignupMessage>) => {
            if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
            if (event.data?.type !== "WA_EMBEDDED_SIGNUP" || event.data.event !== "FINISH") return;
            wabaId = event.data.data?.waba_id?.trim() ?? "";
            phoneNumberId = event.data.data?.phone_number_id?.trim() ?? "";
            finish();
        };
        const finish = () => {
            if (settled || !code || !wabaId || !phoneNumberId) return;
            settled = true;
            window.clearTimeout(timeout);
            window.removeEventListener("message", onMessage);
            resolve({ code, wabaId, phoneNumberId });
        };
        timeout = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            window.removeEventListener("message", onMessage);
            reject(new Error("Meta Embedded Signup timed out or was cancelled"));
        }, 120_000);
        window.addEventListener("message", onMessage);
        sdk.login(response => {
            code = response.authResponse?.code?.trim() ?? "";
            if (!code) {
                window.clearTimeout(timeout);
                settled = true;
                window.removeEventListener("message", onMessage);
                reject(new Error("Meta Embedded Signup was cancelled"));
                return;
            }
            finish();
        }, {
            config_id: configId,
            response_type: "code",
            override_default_response_type: true,
            extras: { feature: "whatsapp_embedded_signup", sessionInfoVersion: "3" },
        });
    });
};

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

type WhatsAppQueryError = {
    message?: string;
    code?: number;
    data?: WhatsAppAccountStatusResponseDTO | null;
};

const mutationErrorMessage = (error: unknown, fallback: string): string => {
    if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
        return error.message;
    }
    return fallback;
};

const WhatsAppOrganizationPage = () => {
    const { organizationId = "" } = useParams();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const [phoneNumber, setPhoneNumber] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    const [manualCloudOpen, setManualCloudOpen] = useState(false);
    const [manualWabaId, setManualWabaId] = useState("");
    const [manualPhoneNumberId, setManualPhoneNumberId] = useState("");
    const [manualAccessToken, setManualAccessToken] = useState("");
    const [updateTokenAccountId, setUpdateTokenAccountId] = useState("");
    const [updateAccessToken, setUpdateAccessToken] = useState("");
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
    const cloudAccountsQuery = useQuery({
        queryKey: whatsappKeys.cloudAccounts(organizationId),
        queryFn: () => getWhatsAppCloudAccounts(organizationId),
        enabled: Boolean(organizationId),
    });
    const accounts = accountsQuery.data?.data?.accounts ?? [];
    const cloudAccounts = cloudAccountsQuery.data?.data?.accounts ?? [];
    const manualCloudSetupEnabled = import.meta.env.VITE_WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED?.trim() === "true";
    const baileysLinkingEnabled = import.meta.env.VITE_WHATSAPP_BAILEYS_LINKING_ENABLED?.trim() !== "false";
    // Legacy Baileys records remain in the database for controlled cleanup, but
    // must not appear in the active account pool once legacy linking is frozen.
    const visibleAccounts = baileysLinkingEnabled
        ? accounts
        : accounts.filter(account => account.provider === "cloud_api");
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
    const cloudAccountsForStore: WhatsAppCloudAccountOption[] = selectedStore
        ? visibleAccounts.flatMap(account => {
            if (account.provider !== "cloud_api" || !account.assignedStoreIds.includes(selectedStore.id)) return [];
            const snapshot = cloudAccounts.find(cloudAccount => cloudAccount.id === account.id);
            return snapshot ? [{ id: account.id, phoneNumber: account.phoneNumber, snapshot }] : [];
        })
        : [];
    const selectedAccount = selectedStore
        ? visibleAccounts.find(account => account.assignedStoreIds.includes(selectedStore.id))
        : undefined;
    const selectedCloudAccount = selectedAccount?.provider === "cloud_api"
        ? cloudAccountsForStore.find(account => account.id === selectedAccount.id)
        : undefined;
    const statusQueries = useQueries({
        queries: visibleAccounts.map(account => ({
            queryKey: whatsappKeys.organizationAccount(organizationId, account.id),
            queryFn: () => getWhatsAppOrganizationAccount(organizationId, account.id),
            enabled: Boolean(organizationId) && account.provider !== "cloud_api",
            refetchInterval: (query: Query<Awaited<ReturnType<typeof getWhatsAppOrganizationAccount>>, Error, Awaited<ReturnType<typeof getWhatsAppOrganizationAccount>>, readonly unknown[]>) => {
                const error = query.state.error as WhatsAppQueryError | null;
                const status = query.state.data?.data?.account.status ?? error?.data?.account.status;
                const pollUntil = statusPollUntilByAccountId[account.id] ?? 0;
                const pollRequested = pollUntil > Date.now() && status !== "connected" && status !== "failed" && status !== "revoked";
                const retryBudgetAvailable = query.state.fetchFailureCount < ACCOUNT_STATUS_RETRY_ATTEMPTS;
                const retryableError = error?.code === STATUS_CODES.SERVICE_UNAVAILABLE && retryBudgetAvailable;
                return retryBudgetAvailable && (retryableError || pollRequested || status === "pending_qr" || status === "connecting")
                    ? ACCOUNT_STATUS_POLL_INTERVAL_MS
                    : false;
            },
        })),
    });
    const cloudConnectMutation = useMutation({
        mutationFn: async () => {
            const started = await startWhatsAppCloudOnboarding(organizationId);
            if (started.status !== "success" || !started.data) throw new Error(started.message);
            const result = await launchEmbeddedSignup();
            return completeWhatsAppCloudOnboarding(organizationId, { state: started.data.state, ...result });
        },
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success("WhatsApp Cloud account connected");
            refresh();
        },
        onError: error => toast.error(mutationErrorMessage(error, "WhatsApp Cloud account could not be connected")),
    });
    const cloudRefreshMutation = useMutation({
        mutationFn: (accountId: string) => refreshWhatsAppCloudAccount(organizationId, accountId),
        onSuccess: response => {
            if (response.status !== "success") toast.error(response.message);
            else {
                toast.success("WhatsApp Cloud account refreshed");
                refresh();
            }
        },
        onError: error => toast.error(mutationErrorMessage(error, "WhatsApp Cloud account could not be refreshed")),
    });
    const cloudRevokeMutation = useMutation({
        mutationFn: (accountId: string) => revokeWhatsAppCloudAccount(organizationId, accountId),
        onSuccess: response => {
            if (response.status !== "success") toast.error(response.message);
            else {
                toast.success("WhatsApp Cloud account revoked");
                refresh();
            }
        },
        onError: error => toast.error(mutationErrorMessage(error, "WhatsApp Cloud account could not be revoked")),
    });
    const manualCloudMutation = useMutation({
        mutationFn: () => manuallyProvisionWhatsAppCloudAccount(organizationId, {
            wabaId: manualWabaId.trim(),
            phoneNumberId: manualPhoneNumberId.trim(),
            accessToken: manualAccessToken,
        }),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            setManualCloudOpen(false);
            setManualWabaId("");
            setManualPhoneNumberId("");
            setManualAccessToken("");
            toast.success("WhatsApp Cloud test account connected");
            refresh();
        },
        onError: error => toast.error(mutationErrorMessage(error, "WhatsApp Cloud test account could not be connected")),
    });
    const updateTokenAccount = cloudAccounts.find(account => account.id === updateTokenAccountId) ?? null;
    const updateTokenMutation = useMutation({
        mutationFn: () => {
            if (!updateTokenAccount?.wabaId || !updateTokenAccount.phoneNumberId) {
                throw new Error("WhatsApp Cloud account identity is unavailable");
            }
            return manuallyProvisionWhatsAppCloudAccount(organizationId, {
                wabaId: updateTokenAccount.wabaId,
                phoneNumberId: updateTokenAccount.phoneNumberId,
                accessToken: updateAccessToken,
            });
        },
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            setUpdateTokenAccountId("");
            setUpdateAccessToken("");
            toast.success("WhatsApp Cloud token updated");
            refresh();
        },
        onError: error => toast.error(mutationErrorMessage(error, "WhatsApp Cloud token could not be updated")),
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
        void queryClient.invalidateQueries({ queryKey: whatsappKeys.cloudAccounts(organizationId) });
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
        onError: error => toast.error(mutationErrorMessage(error, "WhatsApp account could not be added")),
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
        onError: (error, accountId) => {
            pollAccountStatus(accountId);
            toast.error(mutationErrorMessage(error, "WhatsApp account could not be linked"));
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
        onError: error => toast.error(mutationErrorMessage(error, "WhatsApp account could not be disconnected")),
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
        onError: error => toast.error(mutationErrorMessage(error, "WhatsApp number could not be changed")),
    });
    const newPhoneError = newPhoneNumber.length > 0 && !normalizePhoneNumber(newPhoneNumber);
    const isBusy = createMutation.isPending || connectMutation.isPending || disconnectMutation.isPending || changeMutation.isPending || cloudConnectMutation.isPending || cloudRefreshMutation.isPending || cloudRevokeMutation.isPending || updateTokenMutation.isPending;
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

    if (accountsQuery.isError) {
        const error = accountsQuery.error as { message?: string };
        return (
            <div className="mx-auto max-w-5xl">
                <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="flex flex-col gap-3 p-5">
                        <p className="font-medium">Unable to load WhatsApp accounts</p>
                        <p className="text-sm text-muted-foreground">{error.message ?? "Refresh the page and try again."}</p>
                        <Button variant="outline" className="w-fit rounded-full" onClick={() => accountsQuery.refetch()}>
                            <RefreshCw className="size-4" />Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
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
                                <Select value={selectedStoreId} onValueChange={(value) => { if (value) selectStore(value); }}>
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
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                <Button className="w-full rounded-full sm:w-auto" disabled={isBusy} onClick={() => cloudConnectMutation.mutate()}><Link2 className="size-4" />Connect with Meta</Button>
                                {manualCloudSetupEnabled ? <Button variant="outline" className="w-full rounded-full sm:w-auto" disabled={isBusy} onClick={() => setManualCloudOpen(true)}><Link2 className="size-4" />Add API test account</Button> : null}
                                {baileysLinkingEnabled ? <Button variant="outline" className="w-full rounded-full sm:w-auto" onClick={() => setAddOpen(true)}><Link2 className="size-4" />Add legacy account</Button> : null}
                            </div>
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
                    <Badge variant="outline" className="rounded-full">{visibleAccounts.length} account{visibleAccounts.length === 1 ? "" : "s"}</Badge>
                </div>

                {visibleAccounts.length === 0 ? (
                    <Card className="border-dashed border-border/70 bg-muted/10">
                        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                            <p className="text-sm text-muted-foreground">No WhatsApp Cloud accounts connected yet.</p>
                            {manualCloudSetupEnabled ? <Button variant="outline" className="rounded-full" onClick={() => setManualCloudOpen(true)}><Link2 className="size-4" />Add API test account</Button> : null}
                        </CardContent>
                    </Card>
                ) : visibleAccounts.map((account, index) => {
                    const isCloudAccount = account.provider === "cloud_api";
                    const cloudSnapshot = cloudAccounts.find(cloudAccount => cloudAccount.id === account.id);
                    const liveResponse = statusQueries[index]?.data?.data;
                    const statusQuery = statusQueries[index];
                    const statusError = statusQuery?.error as WhatsAppQueryError | null;
                    const liveAccount = liveResponse?.account ?? statusError?.data?.account ?? account;
                    const statusUnavailable = !isCloudAccount && Boolean(statusQuery?.isError);
                    const statusRetryExhausted = statusUnavailable
                        && (statusError?.code !== STATUS_CODES.SERVICE_UNAVAILABLE || (statusQuery?.failureCount ?? 0) >= ACCOUNT_STATUS_RETRY_ATTEMPTS);
                    const displayedCloudStatus = cloudSnapshot?.status ?? null;
                    const qrImageDataUrl = liveResponse?.qrImageDataUrl ?? ((liveAccount.status === "pending_qr" || liveAccount.status === "connecting") ? qrByAccountId[account.id] : null);
                    const connecting = connectMutation.isPending && connectMutation.variables === account.id;
                    const disconnecting = disconnectMutation.isPending && disconnectMutation.variables === account.id;
                    return (
                        <Card key={account.id} className="border-border/60 bg-card/80">
                            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium">{liveAccount.phoneNumber}</p>
                                        <Badge variant={statusUnavailable ? "secondary" : "outline"} className="rounded-full">
                                            {isCloudAccount ? (displayedCloudStatus?.replaceAll("_", " ") ?? "Cloud status unavailable") : statusUnavailable ? "Status unavailable" : statusLabel[liveAccount.status] ?? liveAccount.status}
                                        </Badge>
                                        {isCloudAccount ? <Badge variant="secondary" className="rounded-full">Cloud API</Badge> : null}
                                    </div>
                                    {statusUnavailable ? (
                                        statusRetryExhausted ? (
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <p className="text-xs text-muted-foreground">WhatsApp status could not be loaded.</p>
                                                <Button variant="link" className="h-auto p-0 text-xs" disabled={statusQuery?.isFetching} onClick={() => void statusQuery?.refetch()}>Retry status</Button>
                                            </div>
                                        ) : <p className="mt-2 text-xs text-muted-foreground">WhatsApp status is temporarily unavailable. Retrying automatically.</p>
                                    ) : null}
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Assigned to {account.assignedStoreIds.length} Store{account.assignedStoreIds.length === 1 ? "" : "s"}
                                    </p>
                                    {baileysLinkingEnabled && qrImageDataUrl ? (
                                        <div className="mt-4 flex flex-col items-start gap-2">
                                            <img src={qrImageDataUrl} alt={`QR code for ${account.phoneNumber}`} className="size-56 rounded-xl border bg-white p-2" />
                                            <p className="text-xs text-muted-foreground">Scan from WhatsApp → Linked devices.</p>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    {isCloudAccount ? (
                                        <>
                                            <Button variant="outline" className="rounded-full" disabled={isBusy} onClick={() => cloudRefreshMutation.mutate(account.id)}>
                                                {cloudRefreshMutation.isPending && cloudRefreshMutation.variables === account.id ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                                                Refresh
                                            </Button>
                                            {manualCloudSetupEnabled && cloudSnapshot?.wabaId && cloudSnapshot.phoneNumberId ? (
                                                <Button variant="outline" className="rounded-full" disabled={isBusy} onClick={() => { setUpdateTokenAccountId(account.id); setUpdateAccessToken(""); }}>
                                                    <KeyRound className="size-4" />
                                                    Update token
                                                </Button>
                                            ) : null}
                                            {displayedCloudStatus === "connected" ? (
                                                <Button variant="outline" className="rounded-full" disabled={isBusy} onClick={() => { if (window.confirm("Revoke this WhatsApp Cloud account? It will stop sending until connected again.")) cloudRevokeMutation.mutate(account.id); }}>
                                                    {cloudRevokeMutation.isPending && cloudRevokeMutation.variables === account.id ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                                                    Revoke access
                                                </Button>
                                            ) : (
                                                <Button variant="outline" className="rounded-full" disabled={isBusy} onClick={() => cloudConnectMutation.mutate()}>
                                                    {cloudConnectMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                                                    Connect with Meta
                                                </Button>
                                            )}
                                        </>
                                    ) : null}
                                    {!isCloudAccount && baileysLinkingEnabled ? <Button variant="outline" className="rounded-full" disabled={isBusy || statusUnavailable} onClick={() => { setChangeAccountId(account.id); setNewPhoneNumber(""); }}>
                                        <Pencil className="size-4" />
                                        Change number
                                    </Button> : null}
                                    {!isCloudAccount && baileysLinkingEnabled && statusUnavailable ? (
                                        <>
                                            {liveAccount.status === "connected" ? (
                                                <Button variant="outline" className="rounded-full" disabled={isBusy} onClick={() => disconnectMutation.mutate(account.id)}>
                                                    {disconnecting ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                                                    Disconnect
                                                </Button>
                                            ) : null}
                                            <Button variant="outline" className="rounded-full" disabled={statusQuery?.isFetching} onClick={() => void statusQuery?.refetch()}>
                                                {statusQuery?.isFetching ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                                                Retry status
                                            </Button>
                                        </>
                                    ) : !isCloudAccount && liveAccount.status === "connected" ? (
                                        <Button variant="outline" className="rounded-full" disabled={isBusy} onClick={() => disconnectMutation.mutate(account.id)}>
                                            {disconnecting ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                                            Disconnect
                                        </Button>
                                    ) : !isCloudAccount && (liveAccount.status === "pending_qr" || liveAccount.status === "connecting") ? (
                                        <Button variant="outline" className="rounded-full" disabled>
                                            <LoaderCircle className="size-4 animate-spin" />
                                            {liveAccount.status === "pending_qr" ? "Waiting for scan" : "Connecting"}
                                        </Button>
                                    ) : !isCloudAccount && baileysLinkingEnabled ? (
                                        <Button variant="outline" className="rounded-full" disabled={isBusy} onClick={() => connectMutation.mutate(account.id)}>
                                            {connecting ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                                            Link account
                                        </Button>
                                    ) : null}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
                <WhatsAppCloudSafetyCard organizationId={organizationId} />
            </section> : organizationQuery.data?.status === "success" && selectedStore ? (
                <section className="space-y-4">
                    {activeTab === "templates" ? (
                        <Card className="border-border/60 bg-card/80">
                            {cloudAccountsForStore.length > 0 ? <CardContent className="p-6">
                                <WhatsAppCloudTemplateManager organizationId={organizationId} storeId={selectedStore.id} storeName={selectedStore.name} accounts={cloudAccountsForStore} />
                            </CardContent> : <>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 font-display text-xl"><FileText className="size-5 text-primary" />Templates and links</CardTitle>
                                    <CardDescription>{`Reusable messages for ${selectedStore.name}. Links are inserted only where you choose.`}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <WhatsAppLinkManager organizationId={organizationId} store={selectedStore} />
                                    <WhatsAppTemplateManager organizationId={organizationId} storeId={selectedStore.id} kind="bill" links={selectedStore.whatsappLinks} />
                                    <WhatsAppTemplateManager organizationId={organizationId} storeId={selectedStore.id} kind="due_reminder" links={selectedStore.whatsappLinks} />
                                    <WhatsAppTemplateManager organizationId={organizationId} storeId={selectedStore.id} kind="promotion" links={selectedStore.whatsappLinks} />
                                </CardContent>
                            </>}
                        </Card>
                    ) : null}

                    {activeTab === "promotions" ? (
                        <WhatsAppPromotionDashboard organizationId={organizationId} storeId={selectedStore.id} storeName={selectedStore.name} links={selectedStore.whatsappLinks} cloudAccount={selectedCloudAccount} cloudEnabled={Boolean(selectedCloudAccount)} />
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
                            <PhoneInput id="organization-whatsapp-phone" className="h-10" value={phoneNumber || undefined} onChange={(value: string | undefined) => setPhoneNumber(value ?? "")} placeholder="9876543210" inputMode="tel" aria-invalid={phoneError} />
                            <p className="text-xs text-muted-foreground">India (+91) is selected by default.</p>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" className="rounded-full" onClick={() => setAddOpen(false)}>Cancel</Button>
                            <Button type="submit" className="rounded-full" disabled={isBusy || phoneError || !phoneNumber.trim()}>{createMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}Add account</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {manualCloudSetupEnabled ? <Dialog open={manualCloudOpen} onOpenChange={open => { if (!manualCloudMutation.isPending) setManualCloudOpen(open); }}>
                <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-2xl p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>Add Meta API test account</DialogTitle>
                        <DialogDescription>Development-only setup for the WABA and phone shown in Meta API Setup. The access token is sent once to the backend and is never returned.</DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={event => { event.preventDefault(); manualCloudMutation.mutate(); }}>
                        <div className="space-y-2"><label className="text-sm font-medium" htmlFor="manual-cloud-waba-id">WABA ID</label><Input id="manual-cloud-waba-id" value={manualWabaId} onChange={event => setManualWabaId(event.target.value)} inputMode="numeric" required /></div>
                        <div className="space-y-2"><label className="text-sm font-medium" htmlFor="manual-cloud-phone-id">Phone Number ID</label><Input id="manual-cloud-phone-id" value={manualPhoneNumberId} onChange={event => setManualPhoneNumberId(event.target.value)} inputMode="numeric" required /></div>
                        <div className="space-y-2"><label className="text-sm font-medium" htmlFor="manual-cloud-access-token">Access token</label><Input id="manual-cloud-access-token" type="password" value={manualAccessToken} onChange={event => setManualAccessToken(event.target.value)} autoComplete="off" required /></div>
                        <p className="text-xs text-muted-foreground">Use only a development/test token. Do not use this form for customer onboarding.</p>
                        <DialogFooter><Button type="button" variant="outline" className="rounded-full" disabled={manualCloudMutation.isPending} onClick={() => setManualCloudOpen(false)}>Cancel</Button><Button type="submit" className="rounded-full" disabled={manualCloudMutation.isPending || !manualWabaId.trim() || !manualPhoneNumberId.trim() || !manualAccessToken.trim()}>{manualCloudMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}Connect test account</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog> : null}

            {manualCloudSetupEnabled ? <Dialog open={Boolean(updateTokenAccountId)} onOpenChange={open => { if (!updateTokenMutation.isPending && !open) { setUpdateTokenAccountId(""); setUpdateAccessToken(""); } }}>
                <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-2xl p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>Update Cloud API token</DialogTitle>
                        <DialogDescription>Replace the stored token for this Cloud account. The token is validated against the existing WABA and phone number, then stored securely and never returned.</DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={event => { event.preventDefault(); updateTokenMutation.mutate(); }}>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2"><label className="text-sm font-medium" htmlFor="update-cloud-waba-id">WABA ID</label><Input id="update-cloud-waba-id" value={updateTokenAccount?.wabaId ?? ""} readOnly aria-readonly="true" /></div>
                            <div className="space-y-2"><label className="text-sm font-medium" htmlFor="update-cloud-phone-id">Phone Number ID</label><Input id="update-cloud-phone-id" value={updateTokenAccount?.phoneNumberId ?? ""} readOnly aria-readonly="true" /></div>
                        </div>
                        <div className="space-y-2"><label className="text-sm font-medium" htmlFor="update-cloud-access-token">New access token</label><Input id="update-cloud-access-token" type="password" value={updateAccessToken} onChange={event => setUpdateAccessToken(event.target.value)} autoComplete="off" required /></div>
                        <p className="text-xs text-muted-foreground">Use a fresh Meta System User token or temporary API Setup token. Do not paste tokens into chat, logs, or source code.</p>
                        <DialogFooter><Button type="button" variant="outline" className="rounded-full" disabled={updateTokenMutation.isPending} onClick={() => { setUpdateTokenAccountId(""); setUpdateAccessToken(""); }}>Cancel</Button><Button type="submit" className="rounded-full" disabled={updateTokenMutation.isPending || !updateTokenAccount?.wabaId || !updateTokenAccount.phoneNumberId || !updateAccessToken.trim()}>{updateTokenMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}Update token</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog> : null}

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
                        onChange={(value: string | undefined) => setNewPhoneNumber(value ?? "")}
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
