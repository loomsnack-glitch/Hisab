import { useState } from "react";
import { Contact } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getGoogleContactsSyncStatus,
    startGoogleContactsInitialSync,
    startGoogleContactsOAuth,
} from "@repo/services";
import type { GoogleContactsSyncStatus } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { toast } from "sonner";

import { rememberGoogleContactsOAuthOrganization } from "@/lib/google-contacts-oauth";
import { googleContactsKeys } from "@/lib/query-keys";

type GoogleContactsSyncStatusCardViewProps = {
    status: GoogleContactsSyncStatus | null;
    isPending?: boolean;
    isSubmitting?: boolean;
    isSyncing?: boolean;
    errorMessage?: string | null;
    onConnect?: () => void;
    onStartInitialSync?: () => void;
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
    errorMessage,
    onConnect,
    onStartInitialSync,
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
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Connecting…" : connectLabel(connectionStatus)}
                            </Button>
                        ) : null}
                        {canStartInitialSync ? (
                            <Button
                                type="button"
                                className="rounded-xl"
                                onClick={onStartInitialSync}
                                disabled={isSyncing}
                            >
                                {isSyncing ? "Scheduling…" : "Run initial sync"}
                            </Button>
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

    return (
        <GoogleContactsSyncStatusCardView
            status={status}
            isPending={query.isPending}
            isSubmitting={connectMutation.isPending}
            isSyncing={syncMutation.isPending}
            errorMessage={errorMessage ?? (query.data?.status === "error" ? query.data.message : null)}
            onConnect={() => {
                setErrorMessage(null);
                connectMutation.mutate();
            }}
            onStartInitialSync={() => {
                setErrorMessage(null);
                syncMutation.mutate();
            }}
        />
    );
};

export default GoogleContactsSyncStatusCard;
