import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@repo/ui/components/alert-dialog";
import { ArrowLeft, Link2, LoaderCircle, LogOut, MessageCircle, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { normalizePhoneNumber, type WhatsAppAccountStatusResponseDTO } from "@repo/types";
import {
    connectWhatsAppAccount,
    assignWhatsAppAccount,
    changeWhatsAppAccountNumber,
    createWhatsAppAccount,
    disconnectWhatsAppAccount,
    getWhatsAppAccounts,
    getWhatsAppAccount,
    removeWhatsAppAccount,
} from "@repo/services";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { PhoneInput } from "@repo/ui/components/phone-input";
import { Badge } from "@repo/ui/components/badge";
import { Spinner } from "@repo/ui/components/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { whatsappKeys } from "@/lib/query-keys";

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
    const [phoneNumber, setPhoneNumber] = useState("");
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [changeNumberOpen, setChangeNumberOpen] = useState(false);
    const [newPhoneNumber, setNewPhoneNumber] = useState("");
    const [removeNumberOpen, setRemoveNumberOpen] = useState(false);
    const [changeNumberError, setChangeNumberError] = useState("");
    const [removeNumberError, setRemoveNumberError] = useState("");
    const accountKey = whatsappKeys.account(organizationId, storeId);
    const accountsKey = whatsappKeys.accounts(organizationId);

    const accountQuery = useQuery({
        queryKey: accountKey,
        queryFn: () => getWhatsAppAccount(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
        refetchInterval: query => {
            const error = query.state.error as WhatsAppAccountQueryError | null;
            const status = query.state.data?.data?.account.status ?? error?.data?.account.status;
            return status === "pending_qr" || status === "connecting" ? 2_000 : false;
        },
    });

    const refresh = () => void queryClient.invalidateQueries({ queryKey: accountKey });
    const accountsQuery = useQuery({
        queryKey: accountsKey,
        queryFn: () => getWhatsAppAccounts(organizationId),
        enabled: Boolean(organizationId),
    });
    const organizationAccounts = accountsQuery.data?.data?.accounts ?? [];
    const availableAccounts = organizationAccounts.filter(account => !account.assignedStoreIds.includes(storeId));
    const createMutation = useMutation({
        mutationFn: () => createWhatsAppAccount(organizationId, storeId, { phoneNumber: phoneNumber.trim() }),
        onSuccess: response => {
            if (response.status === "success") {
                toast.success("WhatsApp account linking started");
                setPhoneNumber("");
                if (response.data) {
                    queryClient.setQueryData(accountKey, response);
                }
                refresh();
                void queryClient.invalidateQueries({ queryKey: accountsKey });
            } else {
                toast.error(response.message);
            }
        },
        onError: error => {
            const message = (error as { message?: string })?.message ?? "Unable to link the WhatsApp number";
            toast.error(message);
        },
    });
    const assignMutation = useMutation({
        mutationFn: () => assignWhatsAppAccount(organizationId, storeId, { whatsappAccountId: selectedAccountId }),
        onSuccess: response => {
            if (response.status === "success") {
                toast.success("WhatsApp account assigned to this Store");
                setSelectedAccountId("");
                if (response.data) queryClient.setQueryData(accountKey, response);
                refresh();
                void queryClient.invalidateQueries({ queryKey: accountsKey });
            } else {
                toast.error(response.message);
            }
        },
        onError: error => {
            toast.error((error as { message?: string })?.message ?? "Unable to assign the WhatsApp account");
        },
    });
    const connectMutation = useMutation({
        mutationFn: () => connectWhatsAppAccount(organizationId, storeId),
        onSuccess: response => {
            if (response.status === "success") {
                toast.success("WhatsApp account linking started");
                if (response.data) {
                    queryClient.setQueryData(accountKey, response);
                }
                refresh();
            } else {
                toast.error(response.message);
            }
        },
    });
    const disconnectMutation = useMutation({
        mutationFn: () => disconnectWhatsAppAccount(organizationId, storeId),
        onSuccess: response => {
            if (response.status === "success") {
                toast.success("WhatsApp account disconnected");
                refresh();
            } else {
                toast.error(response.message);
            }
        },
    });
    const changeNumberMutation = useMutation({
        mutationFn: () => changeWhatsAppAccountNumber(organizationId, storeId, { phoneNumber: newPhoneNumber.trim() }),
        onMutate: () => setChangeNumberError(""),
        onSuccess: response => {
            if (response.status === "success") {
                toast.success("WhatsApp number changed. Scan the new QR code.");
                setChangeNumberOpen(false);
                setNewPhoneNumber("");
                refresh();
                void queryClient.invalidateQueries({ queryKey: accountsKey });
            } else {
                setChangeNumberError(response.message);
                toast.error(response.message);
            }
        },
        onError: error => {
            const message = (error as { message?: string })?.message ?? "Unable to change the WhatsApp number";
            setChangeNumberError(message);
            toast.error(message);
        },
    });
    const removeNumberMutation = useMutation({
        mutationFn: () => removeWhatsAppAccount(organizationId, storeId),
        onMutate: () => setRemoveNumberError(""),
        onSuccess: response => {
            if (response.status === "success") {
                toast.success("WhatsApp account unassigned from this Store");
                setRemoveNumberOpen(false);
                refresh();
                void queryClient.invalidateQueries({ queryKey: accountsKey });
            } else {
                setRemoveNumberError(response.message);
                toast.error(response.message);
            }
        },
        onError: error => {
            const message = (error as { message?: string })?.message ?? "Unable to remove the WhatsApp number";
            setRemoveNumberError(message);
            toast.error(message);
        },
    });

    const queryError = accountQuery.error as WhatsAppAccountQueryError | null;
    // The API can return the account inside an error response when the worker is
    // temporarily unavailable. Keep that account visible instead of showing the
    // create form and risking a duplicate-linking attempt.
    const accountData = accountQuery.data?.data ?? queryError?.data ?? null;
    const account = accountData?.account;
    const accountLoadError = accountQuery.isError && !account;
    const accountErrorMessage = queryError?.message ?? accountQuery.data?.message ?? "Unable to load the WhatsApp account.";
    const isBusy = createMutation.isPending || assignMutation.isPending || connectMutation.isPending || disconnectMutation.isPending || changeNumberMutation.isPending || removeNumberMutation.isPending;
    const phoneError = phoneNumber.length > 0 && !normalizePhoneNumber(phoneNumber);
    const newPhoneError = newPhoneNumber.length > 0 && !normalizePhoneNumber(newPhoneNumber);
    const samePhoneNumber = Boolean(account && newPhoneNumber && normalizePhoneNumber(newPhoneNumber) === account.phoneNumber);
    const statusText = useMemo(() => (account ? statusLabel[account.status] ?? account.status : ""), [account]);

    if (accountQuery.isPending) {
        return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="size-6 text-primary" /></div>;
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Button variant="ghost" className="rounded-full" render={<Link to={"/organizations/" + organizationId + "/stores"} />}>
                <ArrowLeft className="size-4" />
                Back to stores
            </Button>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 font-display text-2xl">
                                <MessageCircle className="size-5 text-primary" />
                                Store WhatsApp
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Assign an organization WhatsApp account to this Store. QR and session data are handled by the private worker.
                            </CardDescription>
                        </div>
                        {account ? <Badge variant="outline" className="rounded-full">{statusText}</Badge> : null}
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    {accountQuery.data?.status === "error" || (accountQuery.isError && account) ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                            {accountErrorMessage}
                        </div>
                    ) : null}

                    {accountLoadError ? (
                        <div className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                            <div>
                                <p className="font-medium">Unable to load WhatsApp account</p>
                                <p className="mt-1 text-sm text-muted-foreground">{accountErrorMessage}</p>
                            </div>
                            <Button variant="outline" className="rounded-full" onClick={() => void accountQuery.refetch()}>
                                <RefreshCw className="size-4" />
                                Retry
                            </Button>
                        </div>
                    ) : !account ? (
                        <div className="space-y-5">
                            {availableAccounts.length > 0 ? (
                                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                                    <div>
                                        <p className="text-sm font-medium">Use an existing organization account</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Assign a linked number to this Store. The WhatsApp session remains shared by the organization.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Select value={selectedAccountId} onValueChange={value => setSelectedAccountId(value ?? "")}>
                                            <SelectTrigger className="h-10 flex-1 rounded-xl bg-background/70">
                                                <SelectValue placeholder="Select a WhatsApp account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableAccounts.map(organizationAccount => (
                                                    <SelectItem key={organizationAccount.id} value={organizationAccount.id}>
                                                        {organizationAccount.phoneNumber} · {statusLabel[organizationAccount.status] ?? organizationAccount.status}
                                                        {organizationAccount.assignedStoreIds.length > 0
                                                            ? ` · ${organizationAccount.assignedStoreIds.length} Store${organizationAccount.assignedStoreIds.length === 1 ? "" : "s"}`
                                                            : " · Unassigned"}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button"
                                            className="rounded-full"
                                            disabled={isBusy || !selectedAccountId}
                                            onClick={() => assignMutation.mutate()}
                                        >
                                            {assignMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                                            Assign account
                                        </Button>
                                    </div>
                                </div>
                            ) : null}

                            <div className="border-t border-border/60 pt-5">
                                <form
                                    className="space-y-4"
                                    onSubmit={event => {
                                        event.preventDefault();
                                        if (phoneError) {
                                            toast.error("Enter a valid phone number");
                                            return;
                                        }
                                        createMutation.mutate();
                                    }}
                                >
                                    <div>
                                        <p className="text-sm font-medium">Link a new WhatsApp account</p>
                                        <p className="mt-1 text-xs text-muted-foreground">This number will be added to the organization account pool and assigned to this Store.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="whatsapp-phone" className="text-sm font-medium">WhatsApp phone number</label>
                                        <PhoneInput
                                            id="whatsapp-phone"
                                            className="h-9"
                                            value={phoneNumber || undefined}
                                            onChange={value => setPhoneNumber(value ?? "")}
                                            placeholder="9876543210"
                                            inputMode="tel"
                                            aria-invalid={phoneError}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            India (+91) is selected by default. Choose another country when needed.
                                        </p>
                                    </div>
                                    <Button type="submit" className="rounded-full" disabled={isBusy || phoneError || !phoneNumber.trim()}>
                                        {createMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                                        Start linking
                                    </Button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                                <div>
                                    <p className="text-sm font-medium">Linked number</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{account.phoneNumber}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Assigned to {account.assignedStoreIds.length} Store{account.assignedStoreIds.length === 1 ? "" : "s"}
                                    </p>
                                    {account.assignedStoreIds.length > 0 ? (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            New inbound chats use the default Store; existing conversations keep their original Store.
                                        </p>
                                    ) : null}
                                    {account.assignedStoreIds.length > 1 ? (
                                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                            Disconnecting or changing this number affects all assigned Stores.
                                        </p>
                                    ) : null}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        className="rounded-full"
                                        disabled={isBusy}
                                        onClick={() => {
                                            setNewPhoneNumber("");
                                            setChangeNumberError("");
                                            setChangeNumberOpen(true);
                                        }}
                                    >
                                        <Pencil className="size-4" />
                                        Change number
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        disabled={isBusy}
                                        onClick={() => {
                                            setRemoveNumberError("");
                                            setRemoveNumberOpen(true);
                                        }}
                                    >
                                        <Trash2 className="size-4" />
                                        Unassign from Store
                                    </Button>
                                    {(account.status === "disconnected" || account.status === "failed" || account.status === "revoked") ? (
                                        <Button variant="outline" className="rounded-full" disabled={isBusy} onClick={() => connectMutation.mutate()}>
                                            {connectMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                                            Link again
                                        </Button>
                                    ) : null}
                                    {account.status !== "disconnected" && account.status !== "revoked" ? (
                                        <Button variant="outline" className="rounded-full" disabled={isBusy} onClick={() => disconnectMutation.mutate()}>
                                            {disconnectMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                                            Disconnect
                                        </Button>
                                    ) : null}
                                </div>
                            </div>

                            {accountData?.qrImageDataUrl ? (
                                <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-white p-5">
                                    <img src={accountData.qrImageDataUrl} alt="WhatsApp account linking QR code" className="size-64" />
                                    <p className="text-center text-sm text-slate-600">Open WhatsApp on the phone, choose Linked devices, and scan this code.</p>
                                </div>
                            ) : null}

                            {account.status === "connected" ? (
                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                                    This Store WhatsApp account is connected and ready for the invoice-send phase.
                                </div>
                            ) : null}
                        </>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={changeNumberOpen} onOpenChange={setChangeNumberOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Change shared WhatsApp number?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This changes the number for every Store assigned to this account. The current WhatsApp session will be disconnected, and you will need to scan a new QR code. Existing conversations and invoices remain saved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                        <label htmlFor="whatsapp-new-phone" className="text-sm font-medium">New WhatsApp phone number</label>
                        <PhoneInput
                            id="whatsapp-new-phone"
                            className="h-9"
                            value={newPhoneNumber || undefined}
                            onChange={value => setNewPhoneNumber(value ?? "")}
                            placeholder="9876543210"
                            inputMode="tel"
                            aria-invalid={newPhoneError}
                        />
                        <p className="text-xs text-muted-foreground">India (+91) is selected by default. Choose another country when needed.</p>
                        {samePhoneNumber ? <p className="text-sm text-destructive">This is already the linked number. Enter a different number.</p> : null}
                        {changeNumberError ? <p className="text-sm text-destructive">{changeNumberError}</p> : null}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={changeNumberMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={changeNumberMutation.isPending || newPhoneError || samePhoneNumber || !newPhoneNumber.trim()}
                            onClick={event => {
                                event.preventDefault();
                                if (!newPhoneError && !samePhoneNumber && newPhoneNumber.trim()) changeNumberMutation.mutate();
                            }}
                        >
                            {changeNumberMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Pencil className="size-4" />}
                            Change number
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={removeNumberOpen} onOpenChange={setRemoveNumberOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unassign WhatsApp from this Store?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This only removes the assignment from this Store. The organization account, WhatsApp session, and saved conversation or invoice history are not deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {removeNumberError ? <p className="text-sm text-destructive">{removeNumberError}</p> : null}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={removeNumberMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={removeNumberMutation.isPending}
                            onClick={event => {
                                event.preventDefault();
                                removeNumberMutation.mutate();
                            }}
                        >
                            {removeNumberMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            Unassign from Store
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default WhatsAppAccountPage;
