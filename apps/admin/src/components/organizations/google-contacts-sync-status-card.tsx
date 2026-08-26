import { useState } from "react";
import { Contact } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    disconnectGoogleContacts,
    getGoogleContactsSyncStatus,
    replaceGoogleContactsOAuth,
    startGoogleContactsInitialSync,
    startGoogleContactsOAuth,
} from "@repo/services";
import type { GoogleContactsSyncStatus } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
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
            return "Disconnected";
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

const initialSyncLabel = (status: GoogleContactsSyncStatus) => {
    if (status.initialSyncStatus === "pending") return "Initial sync pending";
    if (status.initialSyncStatus === "completed") return "Initial sync completed";
    return "Run initial sync";
};

const formatSyncTime = (value: GoogleContactsSyncStatus["lastSuccessfulSyncAt"]): string | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
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
}: GoogleContactsSyncStatusCardViewProps) => {
    const connectionStatus = status?.connectionStatus ?? "disconnected";
    const canConnect = connectionStatus !== "connected";
    const email = status?.googleAccountEmail;
    const connected = connectionStatus === "connected";
    const lastSuccessfulSyncAt = status ? formatSyncTime(status.lastSuccessfulSyncAt) : null;
    const showSummary =
        Boolean(status) && (connected || connectionStatus === "reconnect_required");
    const retrying = Boolean(
        status && status.pendingCount > 0 && status.initialSyncStatus === "completed",
    );
    const canStartInitialSync =
        connected && status?.initialSyncStatus === "not_started" && Boolean(onStartInitialSync);
    const canDisconnect =
        (connected || connectionStatus === "reconnect_required") && Boolean(onDisconnect);
    const canReplace = connected && Boolean(onReplace);
    const lifecycleBusy = isSubmitting || isDisconnecting || isReplacing || isSyncing;

    return (
        <Card className="border-border/60 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 font-display text-lg">
                        <Contact className="size-5 text-primary" />
                        Google Contacts Synchronization
                    </CardTitle>
                    <CardDescription>
                        Connect one Google account so this Organization can export Customer names and phone numbers.
                    </CardDescription>
                </div>
                <Badge variant={connected ? "default" : "outline"} className="rounded-full">
                    {isPending ? "Loading" : statusLabel(connectionStatus)}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                {isPending ? (
                    <div className="flex min-h-16 items-center justify-center">
                        <Spinner className="size-5 text-primary" />
                    </div>
                ) : (
                    <>
                        {email ? (
                            <p className="text-sm text-foreground">
                                Connected account: <span className="font-medium">{email}</span>
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No Google account is connected yet.
                            </p>
                        )}
                        {showSummary && status ? (
                            <div className="space-y-1 text-sm text-muted-foreground">
                                {connected ? <p>{initialSyncLabel(status)}</p> : null}
                                <p>
                                    Last successful sync:{" "}
                                    {lastSuccessfulSyncAt ?? "None yet"}
                                </p>
                                <p>
                                    Pending {status.pendingCount}, errors {status.errorCount}, conflicts {status.conflictCount}
                                </p>
                                {retrying ? <p>Retrying failed Google writes in the background.</p> : null}
                            </div>
                        ) : null}
                        {errorMessage ? (
                            <p className="text-sm text-destructive">{errorMessage}</p>
                        ) : null}
                        {canConnect && onConnect ? (
                            <Button
                                type="button"
                                className="rounded-xl"
                                onClick={onConnect}
                                disabled={lifecycleBusy}
                            >
                                {isSubmitting ? "Connecting…" : connectLabel(connectionStatus)}
                            </Button>
                        ) : null}
                        {canStartInitialSync ? (
                            <Button
                                type="button"
                                className="rounded-xl"
                                onClick={onStartInitialSync}
                                disabled={lifecycleBusy}
                            >
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
                                {isReplacing ? "Replacing…" : "Replace Google account"}
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
                        {canDisconnect || canReplace ? (
                            <p className="text-sm text-muted-foreground">
                                Disconnecting or replacing this account does not delete Google Contacts.
                            </p>
                        ) : null}
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

const GoogleContactsSyncStatusCard = ({
    organizationId,
    redirectTo = defaultRedirect,
}: GoogleContactsSyncStatusCardProps) => {
    const queryClient = useQueryClient();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [confirmDisconnect, setConfirmDisconnect] = useState(false);
    const [confirmReplace, setConfirmReplace] = useState(false);
    const query = useQuery({
        queryKey: googleContactsKeys.status(organizationId),
        queryFn: () => getGoogleContactsSyncStatus(organizationId),
        enabled: Boolean(organizationId),
    });
    const status = query.data?.status === "success" ? query.data.data ?? null : null;
    const connectMutation = useMutation({
        mutationFn: async () => {
            const started = await startGoogleContactsOAuth(organizationId);
            if (started.status !== "success" || !started.data) {
                throw { message: started.message || "Google Contacts authorization could not be started" };
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
                throw { message: started.message || "Google Contacts initial sync could not be started" };
            }
            return started.data;
        },
        onSuccess: () => {
            setErrorMessage(null);
            toast.success("Google Contacts initial sync scheduled");
            void queryClient.invalidateQueries({ queryKey: googleContactsKeys.status(organizationId) });
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
                throw { message: disconnected.message || "Google Contacts could not be disconnected" };
            }
            return disconnected.data;
        },
        onSuccess: () => {
            setConfirmDisconnect(false);
            setErrorMessage(null);
            toast.success("Google Contacts disconnected");
            void queryClient.invalidateQueries({ queryKey: googleContactsKeys.status(organizationId) });
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
                throw { message: started.message || "Google Contacts replacement could not be started" };
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

    return (
        <>
        <GoogleContactsSyncStatusCardView
            status={status}
            isPending={query.isPending}
            isSubmitting={connectMutation.isPending}
            isSyncing={syncMutation.isPending}
            isDisconnecting={disconnectMutation.isPending}
            isReplacing={replaceMutation.isPending}
            errorMessage={errorMessage ?? (query.data?.status === "error" ? query.data.message : null)}
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
                        Future synchronization will stop immediately and Ganatri will no longer hold
                        usable authorization for this account. Existing Google Contacts are left unchanged.
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
                        The current Google account is left unchanged and its Contacts are not deleted.
                        The replacement account starts as a fresh destination and needs an initial catch-up sync.
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
