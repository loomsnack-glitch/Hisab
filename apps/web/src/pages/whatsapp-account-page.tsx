import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Link2, LoaderCircle, LogOut, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
    connectWhatsAppAccount,
    createWhatsAppAccount,
    disconnectWhatsAppAccount,
    getWhatsAppAccount,
} from "@repo/services";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Badge } from "@repo/ui/components/badge";
import { Spinner } from "@repo/ui/components/spinner";
import { whatsappKeys } from "@/lib/query-keys";

const phonePattern = /^\+[1-9]\d{7,14}$/;

const statusLabel: Record<string, string> = {
    pending_qr: "Scan the QR code",
    connecting: "Connecting",
    connected: "Connected",
    disconnected: "Disconnected",
    failed: "Connection failed",
    revoked: "Session revoked",
};

const WhatsAppAccountPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const queryClient = useQueryClient();
    const [phoneNumber, setPhoneNumber] = useState("");
    const accountKey = whatsappKeys.account(organizationId, storeId);

    const accountQuery = useQuery({
        queryKey: accountKey,
        queryFn: () => getWhatsAppAccount(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
        refetchInterval: query => {
            const status = query.state.data?.data?.account.status;
            return status === "pending_qr" || status === "connecting" ? 2_000 : false;
        },
    });

    const refresh = () => void queryClient.invalidateQueries({ queryKey: accountKey });
    const createMutation = useMutation({
        mutationFn: () => createWhatsAppAccount(organizationId, storeId, { phoneNumber: phoneNumber.trim() }),
        onSuccess: response => {
            if (response.status === "success") {
                toast.success("WhatsApp account linking started");
                setPhoneNumber("");
                refresh();
            } else {
                toast.error(response.message);
            }
        },
    });
    const connectMutation = useMutation({
        mutationFn: () => connectWhatsAppAccount(organizationId, storeId),
        onSuccess: response => {
            if (response.status === "success") {
                toast.success("WhatsApp account linking started");
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

    const accountData = accountQuery.data?.data ?? null;
    const account = accountData?.account;
    const isBusy = createMutation.isPending || connectMutation.isPending || disconnectMutation.isPending;
    const phoneError = phoneNumber.length > 0 && !phonePattern.test(phoneNumber.trim());
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
                                Link one store-owned WhatsApp account. QR and session data are handled by the private worker.
                            </CardDescription>
                        </div>
                        {account ? <Badge variant="outline" className="rounded-full">{statusText}</Badge> : null}
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    {accountQuery.data?.status === "error" ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                            {accountQuery.data.message}
                        </div>
                    ) : null}

                    {!account ? (
                        <form
                            className="space-y-4"
                            onSubmit={event => {
                                event.preventDefault();
                                if (!phonePattern.test(phoneNumber.trim())) {
                                    toast.error("Enter a valid international number like +919876543210");
                                    return;
                                }
                                createMutation.mutate();
                            }}
                        >
                            <div className="space-y-2">
                                <label htmlFor="whatsapp-phone" className="text-sm font-medium">WhatsApp phone number</label>
                                <Input
                                    id="whatsapp-phone"
                                    value={phoneNumber}
                                    onChange={event => setPhoneNumber(event.target.value)}
                                    placeholder="+919876543210"
                                    inputMode="tel"
                                    aria-invalid={phoneError}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use the number that will own this store&apos;s WhatsApp session, including country code.
                                </p>
                            </div>
                            <Button type="submit" className="rounded-full" disabled={isBusy || phoneError || !phoneNumber.trim()}>
                                {createMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                                Start linking
                            </Button>
                        </form>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                                <div>
                                    <p className="text-sm font-medium">Linked number</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{account.phoneNumber}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
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
                                    This store WhatsApp account is connected and ready for the invoice-send phase.
                                </div>
                            ) : null}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default WhatsAppAccountPage;
