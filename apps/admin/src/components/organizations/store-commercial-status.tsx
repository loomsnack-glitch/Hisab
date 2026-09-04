import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStoreCommercialStatus, startStoreTrial } from "@repo/services";
import { COMMERCIAL_TERM_TIMEZONE, type StoreCommercialStatusDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { BadgeCheck, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { commercialLicenseKeys } from "@/lib/query-keys";

type StoreCommercialStatusProps = {
    organizationId: string;
    storeId: string;
};

const formatCommercialTimestamp = (value: string | Date) =>
    new Date(value).toLocaleString("en-IN", {
        timeZone: COMMERCIAL_TERM_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short",
    });

const statusLabel = (status: StoreCommercialStatusDTO["baseAccess"]) => {
    if (!status) return "No Plan";
    if (status.status === "active") return status.planType === "trial" ? "Trial" : "Active";
    if (status.status === "scheduled") return "Scheduled";
    if (status.status === "expired") return "Expired";
    return "Revoked";
};

const StoreCommercialStatus = ({ organizationId, storeId }: StoreCommercialStatusProps) => {
    const queryClient = useQueryClient();
    const statusQuery = useQuery({
        queryKey: commercialLicenseKeys.status(organizationId, storeId),
        queryFn: () => getStoreCommercialStatus(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });
    const startTrial = useMutation({
        mutationFn: () => startStoreTrial(organizationId, storeId),
        onSuccess: (response) => {
            if (response.status === "error" || !response.data) {
                toast.error(response.message ?? "Unable to start the Trial Plan");
                return;
            }
            queryClient.setQueryData(commercialLicenseKeys.status(organizationId, storeId), response);
            toast.success(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to start the Trial Plan");
        },
    });

    const status =
        statusQuery.data?.status === "success" ? statusQuery.data.data?.commercialStatus ?? null : null;

    return (
        <Card className="border-border/60 bg-card/80 shadow-sm sm:shadow-md">
            <CardHeader>
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BadgeCheck className="size-4" />
                    </div>
                    <div className="min-w-0">
                        <CardTitle className="font-display text-xl">Store License</CardTitle>
                        <CardDescription>
                            Current Plan, expiry, and Features for this Store. Commercial access is decided by the server.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {statusQuery.isPending ? (
                    <div className="flex min-h-32 items-center justify-center">
                        <LoaderCircle className="size-5 animate-spin text-primary" />
                    </div>
                ) : statusQuery.isError || statusQuery.data?.status === "error" || !status ? (
                    <p className="text-sm text-muted-foreground">
                        {statusQuery.data?.message ?? "Unable to load this Store's commercial status."}
                    </p>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-full text-xs">
                                {statusLabel(status.baseAccess)}
                            </Badge>
                            {status.baseAccess ? (
                                <p className="text-sm text-muted-foreground">
                                    {status.baseAccess.planDisplayName}
                                    {" · "}
                                    {formatCommercialTimestamp(status.baseAccess.startsAt)}
                                    {" – "}
                                    {formatCommercialTimestamp(status.baseAccess.endsAt)}
                                    {` (${status.timezone})`}
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">No current Plan on this Store.</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-foreground">Available Features</h3>
                            {status.entitlements.features.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    This Store has no current Feature Entitlement.
                                </p>
                            ) : (
                                <ul className="flex flex-wrap gap-2">
                                    {status.entitlements.features.map((feature) => (
                                        <li key={feature.key}>
                                            <Badge variant="secondary" className="rounded-full text-xs">
                                                {feature.displayName}
                                            </Badge>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                            <p className="text-sm text-muted-foreground">{status.trial.message}</p>
                            {status.trial.eligible ? (
                                <Button
                                    className="rounded-full"
                                    disabled={startTrial.isPending}
                                    onClick={() => startTrial.mutate()}
                                >
                                    {startTrial.isPending ? "Starting Trial..." : "Start Trial"}
                                </Button>
                            ) : null}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default StoreCommercialStatus;
