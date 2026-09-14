import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    disconnectGoogleContacts,
    getGoogleContactsSyncStatus,
    replaceGoogleContactsOAuth,
    startGoogleContactsInitialSync,
    startGoogleContactsOAuth,
    updateGoogleContactsNameAffix,
} from "@repo/services";
import { googleContactDisplayName, type GoogleContactsSyncStatus } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Spinner } from "@repo/ui/components/spinner";
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
import { toast } from "sonner";

import { rememberGoogleContactsOAuthOrganization } from "@/lib/google-contacts-oauth";
import { formatDateTime } from "@/lib/format";
import { googleContactsKeys } from "@/lib/query-keys";

type GoogleContactsSyncStatusCardViewProps = {
    status: GoogleContactsSyncStatus | null;
    isPending?: boolean;
    isSubmitting?: boolean;
    isSyncing?: boolean;
    isDisconnecting?: boolean;
    isReplacing?: boolean;
    errorMessage?: string | null;
    onConnect?: () => void;
    onStartInitialSync?: () => void;
    onDisconnect?: () => void;
    onReplace?: () => void;
    contactNamePrefix?: string;
    contactNamePostfix?: string;
    onContactNamePrefixChange?: (value: string) => void;
    onContactNamePostfixChange?: (value: string) => void;
    onSaveNameAffix?: () => void;
    isSavingNameAffix?: boolean;
};

const statusLabel = (connectionStatus: GoogleContactsSyncStatus["connectionStatus"]) => {
    switch (connectionStatus) {
        case "connecting":
            return "Connecting";
        case "connected":
            return "Connected";
        case "reconnect_required":
            return "Reconnect required";
        default:
            return "Not connected";
    }
};

const statusVariant = (connectionStatus: GoogleContactsSyncStatus["connectionStatus"]) => {
    switch (connectionStatus) {
        case "connected":
            return "default" as const;
        case "reconnect_required":
            return "destructive" as const;
        default:
            return "outline" as const;
    }
};

const connectLabel = (connectionStatus: GoogleContactsSyncStatus["connectionStatus"]) => {
    switch (connectionStatus) {
        case "connecting":
            return "Continue with Google";
        case "reconnect_required":
            return "Reconnect Google";
        default:
            return "Connect Google";
    }
};

const buildSyncSummary = (status: GoogleContactsSyncStatus): string | null => {
    const parts: string[] = [];
    if (status.pendingCount > 0) parts.push(`${status.pendingCount} pending`);
    if (status.retryingCount > 0) parts.push(`${status.retryingCount} retrying`);
    if (status.errorCount > 0) parts.push(`${status.errorCount} failed`);
    if (status.conflictCount > 0) parts.push(`${status.conflictCount} conflicts`);
    return parts.length > 0 ? parts.join(" · ") : null;
};

export const GoogleContactsSyncStatusCardView = ({
    status,
    isPending = false,
    isSubmitting = false,
    isSyncing = false,
    isDisconnecting = false,
    isReplacing = false,
    errorMessage,
    onConnect,
    onStartInitialSync,
    onDisconnect,
    onReplace,
    contactNamePrefix,
    contactNamePostfix,
    onContactNamePrefixChange,
    onContactNamePostfixChange,
    onSaveNameAffix,
    isSavingNameAffix = false,
}: GoogleContactsSyncStatusCardViewProps) => {
    const connectionStatus = status?.connectionStatus ?? "disconnected";
    const canConnect = connectionStatus !== "connected";
    const email = status?.googleAccountEmail;
    const connected = connectionStatus === "connected";
    const showAccountDetails = Boolean(status) && (connected || connectionStatus === "reconnect_required");
    const syncSummary = status ? buildSyncSummary(status) : null;
    const canStartInitialSync = connected && status?.initialSyncStatus === "not_started" && Boolean(onStartInitialSync);
    const initialSyncPending = connected && status?.initialSyncStatus === "pending";
    const canDisconnect = (connected || connectionStatus === "reconnect_required") && Boolean(onDisconnect);
    const canReplace = connected && Boolean(onReplace);
    const lifecycleBusy = isSubmitting || isDisconnecting || isReplacing || isSyncing || isSavingNameAffix;
    const prefix = contactNamePrefix ?? status?.contactNamePrefix ?? "";
    const postfix = contactNamePostfix ?? status?.contactNamePostfix ?? "";
    const canEditNameAffix = connected || connectionStatus === "reconnect_required";
    const namePreview = googleContactDisplayName({
        customerName: "Dev Jariwala",
        prefix,
        postfix,
    });
    const nameAffixDirty =
        prefix !== (status?.contactNamePrefix ?? "") || postfix !== (status?.contactNamePostfix ?? "");

    return (
        <Card className="border-border/60 bg-card/80">
            <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">Connection</p>
                    <Badge variant={statusVariant(connectionStatus)} className="rounded-full">
                        {isPending ? "Loading" : statusLabel(connectionStatus)}
                    </Badge>
                </div>

                {isPending ? (
                    <div className="flex min-h-16 items-center justify-center">
                        <Spinner className="size-5 text-primary" />
                    </div>
                ) : (
                    <>
                        {showAccountDetails && email ? (
                            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                                <p className="font-medium text-foreground">{email}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Last synced {formatDateTime(status?.lastSuccessfulSyncAt)}
                                </p>
                                {initialSyncPending ? (
                                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <RefreshCw className="size-3.5" />
                                        Initial sync in progress
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Connect a Google account to start syncing customers.</p>
                        )}

                        {syncSummary ? (
                            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                <span>{syncSummary}</span>
                            </div>
                        ) : null}

                        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

                        {canEditNameAffix ? (
                            <div className="space-y-3 border-t border-border/60 pt-5">
                                <div>
                                    <p className="text-sm font-medium text-foreground">Contact label</p>
                                    <p className="text-sm text-muted-foreground">Optional prefix or postfix in Google Contacts.</p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="google-contact-name-prefix">Prefix</Label>
                                        <Input
                                            id="google-contact-name-prefix"
                                            value={prefix}
                                            maxLength={32}
                                            placeholder="e.g. PH"
                                            disabled={lifecycleBusy}
                                            onChange={(event) => onContactNamePrefixChange?.(event.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="google-contact-name-postfix">Postfix</Label>
                                        <Input
                                            id="google-contact-name-postfix"
                                            value={postfix}
                                            maxLength={32}
                                            placeholder="e.g. @ph"
                                            disabled={lifecycleBusy}
                                            onChange={(event) => onContactNamePostfixChange?.(event.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-sm text-muted-foreground">Preview: {namePreview}</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl"
                                        onClick={onSaveNameAffix}
                                        disabled={lifecycleBusy || !nameAffixDirty || !onSaveNameAffix}
                                    >
                                        {isSavingNameAffix ? "Saving…" : "Save label"}
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-5">
                            {canConnect && onConnect ? (
                                <Button type="button" className="rounded-xl" onClick={onConnect} disabled={lifecycleBusy}>
                                    {isSubmitting ? "Connecting…" : connectLabel(connectionStatus)}
                                </Button>
                            ) : null}
                            {canStartInitialSync ? (
                                <Button type="button" className="rounded-xl" onClick={onStartInitialSync} disabled={lifecycleBusy}>
                                    {isSyncing ? "Scheduling…" : "Run initial sync"}
                                </Button>
                            ) : null}
                            {canReplace ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={onReplace}
                                    disabled={lifecycleBusy}
                                >
                                    {isReplacing ? "Replacing…" : "Replace account"}
                                </Button>
                            ) : null}
                            {canDisconnect ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={onDisconnect}
                                    disabled={lifecycleBusy}
                                >
                                    {isDisconnecting ? "Disconnecting…" : "Disconnect"}
                                </Button>
                            ) : null}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

type GoogleContactsSyncStatusCardProps = {
    organizationId: string;
    redirectTo?: (url: string) => void;
};

const defaultRedirect = (url: string) => {
    window.location.assign(url);
};

const GoogleContactsSyncStatusCard = ({ organizationId, redirectTo = defaultRedirect }: GoogleContactsSyncStatusCardProps) => {
    const queryClient = useQueryClient();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [confirmDisconnect, setConfirmDisconnect] = useState(false);
    const [confirmReplace, setConfirmReplace] = useState(false);
    const [contactNamePrefix, setContactNamePrefix] = useState("");
    const [contactNamePostfix, setContactNamePostfix] = useState("");
    const query = useQuery({
        queryKey: googleContactsKeys.status(organizationId),
        queryFn: () => getGoogleContactsSyncStatus(organizationId),
        enabled: Boolean(organizationId),
    });
    const status = query.data?.status === "success" ? (query.data.data ?? null) : null;
    useEffect(() => {
        if (!status) return;
        setContactNamePrefix(status.contactNamePrefix ?? "");
        setContactNamePostfix(status.contactNamePostfix ?? "");
    }, [status?.contactNamePrefix, status?.contactNamePostfix]);
    const connectMutation = useMutation({
        mutationFn: async () => {
            const started = await startGoogleContactsOAuth(organizationId);
            if (started.status !== "success" || !started.data) {
                throw {
                    message: started.message || "Google Contacts authorization could not be started",
                };
            }
            return started.data;
        },
        onSuccess: (data) => {
            rememberGoogleContactsOAuthOrganization(organizationId);
            redirectTo(data.authorizationUrl);
        },
        onError: (error: { message?: string }) => {
            const message = error.message || "Google Contacts authorization could not be started";
            setErrorMessage(message);
            toast.error(message);
        },
    });
    const syncMutation = useMutation({
        mutationFn: async () => {
            const started = await startGoogleContactsInitialSync(organizationId);
            if (started.status !== "success" || !started.data) {
                throw {
                    message: started.message || "Google Contacts initial sync could not be started",
                };
            }
            return started.data;
        },
        onSuccess: () => {
            setErrorMessage(null);
            toast.success("Google Contacts initial sync scheduled");
            void queryClient.invalidateQueries({
                queryKey: googleContactsKeys.status(organizationId),
            });
        },
        onError: (error: { message?: string }) => {
            const message = error.message || "Google Contacts initial sync could not be started";
            setErrorMessage(message);
            toast.error(message);
        },
    });
    const disconnectMutation = useMutation({
        mutationFn: async () => {
            const disconnected = await disconnectGoogleContacts(organizationId);
            if (disconnected.status !== "success" || !disconnected.data) {
                throw {
                    message: disconnected.message || "Google Contacts could not be disconnected",
                };
            }
            return disconnected.data;
        },
        onSuccess: () => {
            setConfirmDisconnect(false);
            setErrorMessage(null);
            toast.success("Google Contacts disconnected");
            void queryClient.invalidateQueries({
                queryKey: googleContactsKeys.status(organizationId),
            });
        },
        onError: (error: { message?: string }) => {
            const message = error.message || "Google Contacts could not be disconnected";
            setErrorMessage(message);
            toast.error(message);
        },
    });
    const replaceMutation = useMutation({
        mutationFn: async () => {
            const started = await replaceGoogleContactsOAuth(organizationId);
            if (started.status !== "success" || !started.data) {
                throw {
                    message: started.message || "Google Contacts replacement could not be started",
                };
            }
            return started.data;
        },
        onSuccess: (data) => {
            setConfirmReplace(false);
            rememberGoogleContactsOAuthOrganization(organizationId);
            redirectTo(data.authorizationUrl);
        },
        onError: (error: { message?: string }) => {
            const message = error.message || "Google Contacts replacement could not be started";
            setErrorMessage(message);
            toast.error(message);
        },
    });
    const nameAffixMutation = useMutation({
        mutationFn: async () => {
            const saved = await updateGoogleContactsNameAffix(organizationId, {
                contactNamePrefix: contactNamePrefix ?? "",
                contactNamePostfix: contactNamePostfix ?? "",
            });
            if (saved.status !== "success" || !saved.data) {
                throw {
                    message: saved.message || "Google Contact Name Affix could not be saved",
                };
            }
            return saved.data;
        },
        onSuccess: () => {
            setErrorMessage(null);
            toast.success("Google contact label saved");
            void queryClient.invalidateQueries({
                queryKey: googleContactsKeys.status(organizationId),
            });
        },
        onError: (error: { message?: string }) => {
            const message = error.message || "Google Contact Name Affix could not be saved";
            setErrorMessage(message);
            toast.error(message);
        },
    });

    return (
        <>
            <GoogleContactsSyncStatusCardView
                status={status}
                isPending={query.isPending}
                isSubmitting={connectMutation.isPending}
                isSyncing={syncMutation.isPending}
                isDisconnecting={disconnectMutation.isPending}
                isReplacing={replaceMutation.isPending}
                isSavingNameAffix={nameAffixMutation.isPending}
                errorMessage={errorMessage ?? (query.data?.status === "error" ? query.data.message : null)}
                contactNamePrefix={contactNamePrefix}
                contactNamePostfix={contactNamePostfix}
                onContactNamePrefixChange={setContactNamePrefix}
                onContactNamePostfixChange={setContactNamePostfix}
                onSaveNameAffix={() => {
                    setErrorMessage(null);
                    nameAffixMutation.mutate();
                }}
                onConnect={() => {
                    setErrorMessage(null);
                    connectMutation.mutate();
                }}
                onStartInitialSync={() => {
                    setErrorMessage(null);
                    syncMutation.mutate();
                }}
                onDisconnect={() => {
                    setErrorMessage(null);
                    setConfirmDisconnect(true);
                }}
                onReplace={() => {
                    setErrorMessage(null);
                    setConfirmReplace(true);
                }}
            />
            <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Google Contacts?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Syncing will stop and Ganatri will lose access to this Google account. Existing Google Contacts are not
                            deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl"
                            isLoading={disconnectMutation.isPending}
                            loadingText="Disconnecting..."
                            onClick={() => disconnectMutation.mutate()}
                        >
                            Disconnect
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Replace the connected Google account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The current account stays unchanged in Google. The new account starts fresh and needs an initial sync.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl"
                            isLoading={replaceMutation.isPending}
                            loadingText="Replacing..."
                            onClick={() => replaceMutation.mutate()}
                        >
                            Continue with Google
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default GoogleContactsSyncStatusCard;
