import { useState } from "react";
import { Contact } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getGoogleContactsSyncStatus, startGoogleContactsOAuth } from "@repo/services";
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
    errorMessage?: string | null;
    onConnect?: () => void;
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

export const GoogleContactsSyncStatusCardView = ({
    status,
    isPending = false,
    isSubmitting = false,
    errorMessage,
    onConnect,
}: GoogleContactsSyncStatusCardViewProps) => {
    const connectionStatus = status?.connectionStatus ?? "disconnected";
    const canConnect = connectionStatus !== "connected";
    const email = status?.googleAccountEmail;

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
                <Badge variant={connectionStatus === "connected" ? "default" : "outline"} className="rounded-full">
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

    return (
        <GoogleContactsSyncStatusCardView
            status={status}
            isPending={query.isPending}
            isSubmitting={connectMutation.isPending}
            errorMessage={errorMessage ?? (query.data?.status === "error" ? query.data.message : null)}
            onConnect={() => {
                setErrorMessage(null);
                connectMutation.mutate();
            }}
        />
    );
};

export default GoogleContactsSyncStatusCard;
