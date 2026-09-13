import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Link2, LoaderCircle, Phone, Settings2, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { WhatsAppAccountStatusResponseDTO } from "@repo/types";
import {
    assignWhatsAppAccount,
    getStoreCommercialStatus,
    getWhatsAppAccount,
    getWhatsAppAccounts,
    removeWhatsAppAccount,
} from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import CopyToClipboard from "@repo/ui/components/copy-to-clipboard";
import { CustomOption } from "@repo/ui/components/react-select/components";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import CatalogAccessPaused from "@/components/commercial/catalog-access-paused";
import WhatsAppIcon from "@/components/icons/whatsapp-icon";
import { featureAccessPausedState } from "@/lib/commercial-access-paused-state";
import { isQueryCommercialAccessDenied } from "@/lib/commercial-access";
import { commercialLicenseKeys, whatsappKeys } from "@/lib/query-keys";
import { getStoreLicensePath } from "@/lib/store-workspace-routes";
import { adminNestedTabPageHeightClass } from "@/lib/workspace-page-layout";

const cloudStatusLabel: Record<string, string> = {
    connected: "Connected",
    disconnected: "Disconnected",
    needs_action: "Needs attention",
    revoked: "Access revoked",
    suspended: "Suspended",
    failed: "Connection failed",
};

const WHATSAPP_NOT_LINKED_MESSAGE = "WhatsApp account is not linked";

type WhatsAppAccountQueryError = {
    message?: string;
    data?: WhatsAppAccountStatusResponseDTO | null;
};

type StoreWhatsAppLinkCardProps = {
    organizationId: string;
    storeId: string;
};

type WhatsAppAccountOption = {
    value: string;
    label: string;
    phoneNumber: string;
    statusLabel: string;
    linkedStores: number;
};

const formatAccountOption = (option: WhatsAppAccountOption, meta: { context: "menu" | "value" }) => {
    if (meta.context === "value") {
        return <span className="truncate">{option.phoneNumber}</span>;
    }

    return (
        <div className="flex min-w-0 items-center gap-2 py-0.5">
            <WhatsAppIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0">
                <p className="font-medium truncate">{option.phoneNumber}</p>
                <p className="text-xs text-muted-foreground truncate">
                    {option.statusLabel} · {option.linkedStores} Store{option.linkedStores === 1 ? "" : "s"} linked
                </p>
            </div>
        </div>
    );
};

const isWhatsAppNotLinkedError = (error: unknown) =>
    typeof error === "object"
    && error !== null
    && "message" in error
    && (error as { message?: string }).message === WHATSAPP_NOT_LINKED_MESSAGE;

const loadStoreWhatsAppAccount = async (organizationId: string, storeId: string) => {
    try {
        return await getWhatsAppAccount(organizationId, storeId);
    } catch (error) {
        if (isWhatsAppNotLinkedError(error)) {
            return {
                status: "success" as const,
                data: null,
                message: "WhatsApp account not linked",
                code: 200,
            };
        }
        throw error;
    }
};

const StoreWhatsAppLinkCard = ({ organizationId, storeId }: StoreWhatsAppLinkCardProps) => {
    const queryClient = useQueryClient();
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [removeOpen, setRemoveOpen] = useState(false);
    const accountKey = whatsappKeys.account(organizationId, storeId);
    const accountsKey = whatsappKeys.accounts(organizationId);
    const accountQuery = useQuery({
        queryKey: accountKey,
        queryFn: () => loadStoreWhatsAppAccount(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });
    const accountsQuery = useQuery({
        queryKey: accountsKey,
        queryFn: () => getWhatsAppAccounts(organizationId),
        enabled: Boolean(organizationId),
    });
    const commercialStatusQuery = useQuery({
        queryKey: commercialLicenseKeys.status(organizationId, storeId),
        queryFn: () => getStoreCommercialStatus(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });
    const accountError = accountQuery.error as WhatsAppAccountQueryError | null;
    const isNotLinked = isWhatsAppNotLinkedError(accountError);
    const accountData = isNotLinked
        ? null
        : accountQuery.isError
            ? accountError?.data ?? null
            : accountQuery.data?.data ?? null;
    const account = accountData?.account;
    const failedToLoadAccount = !isNotLinked && accountQuery.isError && !account;
    const commercialStatus = commercialStatusQuery.data?.status === "success"
        ? commercialStatusQuery.data.data?.commercialStatus ?? null
        : null;
    const commercialAccessDenied = isQueryCommercialAccessDenied(accountQuery)
        || isQueryCommercialAccessDenied(accountsQuery);
    const accessState = commercialStatus ? featureAccessPausedState(commercialStatus, "whatsapp") : null;
    const retryingCommercialAccess = accountQuery.isFetching
        || accountsQuery.isFetching
        || commercialStatusQuery.isFetching;
    const accounts = accountsQuery.data?.data?.accounts ?? [];
    const availableAccounts = accounts.filter(candidate =>
        candidate.provider === "cloud_api" && !candidate.assignedStoreIds.includes(storeId),
    );
    const accountOptions = useMemo<WhatsAppAccountOption[]>(
        () =>
            availableAccounts.map(candidate => ({
                value: candidate.id,
                label: candidate.phoneNumber,
                phoneNumber: candidate.phoneNumber,
                statusLabel: cloudStatusLabel[candidate.cloudStatus ?? candidate.status] ?? "Cloud status unavailable",
                linkedStores: candidate.assignedStoreIds.length,
            })),
        [availableAccounts],
    );
    const selectedAccountOption =
        accountOptions.find(candidate => candidate.value === selectedAccountId) ?? null;
    const assignMutation = useMutation({
        mutationFn: () => assignWhatsAppAccount(organizationId, storeId, { whatsappAccountId: selectedAccountId }),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            setSelectedAccountId("");
            queryClient.setQueryData(accountKey, response);
            void queryClient.invalidateQueries({ queryKey: accountsKey });
            toast.success("WhatsApp account linked to this Store");
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "WhatsApp account could not be linked");
        },
    });
    const unassignMutation = useMutation({
        mutationFn: () => removeWhatsAppAccount(organizationId, storeId),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            setSelectedAccountId("");
            queryClient.setQueryData(accountKey, {
                status: "success",
                message: "WhatsApp account not linked",
                data: null,
                code: 200,
            });
            setRemoveOpen(false);
            void queryClient.invalidateQueries({ queryKey: accountKey });
            void queryClient.invalidateQueries({ queryKey: accountsKey });
            toast.success("WhatsApp account unlinked from this Store");
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "WhatsApp account could not be unlinked");
        },
    });
    const isBusy = assignMutation.isPending || unassignMutation.isPending;
    const statusLabel = account
        ? cloudStatusLabel[account.cloudStatus ?? account.status] ?? "Cloud status unavailable"
        : null;

    if (
        !accountQuery.isPending
        && !accountsQuery.isPending
        && commercialAccessDenied
        && accessState
    ) {
        return (
            <div className={adminNestedTabPageHeightClass}>
                <CatalogAccessPaused
                    className="h-full min-h-0"
                    badge={accessState.badge}
                    title={accessState.title}
                    message={accessState.description}
                    actionLabel={accessState.actionLabel}
                    actionHref={getStoreLicensePath(organizationId, storeId)}
                    featureIcon={WhatsAppIcon}
                    retrying={retryingCommercialAccess}
                    onRetry={() => {
                        void accountQuery.refetch();
                        void accountsQuery.refetch();
                        void commercialStatusQuery.refetch();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="max-w-xl">
            <Card className="group overflow-hidden rounded-2xl border-border/60 bg-card/80 shadow-2xs transition-all duration-200 hover:border-primary/20 hover:shadow-md">
                <CardContent className="p-0">
                    <div className="relative overflow-hidden border-b border-border/50 px-5 py-5 sm:px-6">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_55%)]" />
                        <div className="relative flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/10 text-emerald-600 shadow-sm dark:text-emerald-400">
                                    <WhatsAppIcon className="size-5" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Messaging</p>
                                    <h3 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                        Store WhatsApp
                                    </h3>
                                </div>
                            </div>
                            {account ? (
                                <Badge
                                    variant="outline"
                                    className="rounded-full shrink-0 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                >
                                    {statusLabel} · Cloud API
                                </Badge>
                            ) : !accountQuery.isPending && !accountsQuery.isPending ? (
                                <Badge variant="outline" className="rounded-full shrink-0">
                                    Not linked
                                </Badge>
                            ) : null}
                        </div>
                    </div>

                    <div className="space-y-4 px-5 py-4 sm:px-6">
                        {accountQuery.isPending || accountsQuery.isPending ? (
                            <div className="flex min-h-32 items-center justify-center">
                                <Spinner className="size-6 text-primary" />
                            </div>
                        ) : failedToLoadAccount ? (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                                {accountError?.message ?? "Unable to load the Store WhatsApp account."}
                            </div>
                        ) : account ? (
                            <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <Phone className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Linked number</p>
                                            <div className="mt-1 flex items-center gap-1">
                                                <p className="font-medium text-foreground truncate">{account.phoneNumber}</p>
                                                <CopyToClipboard
                                                    getValue={() => account.phoneNumber}
                                                    tooltip="Copy number"
                                                    showTooltip={false}
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="shrink-0 rounded-lg"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Store className="size-3.5 shrink-0" />
                                            <span>
                                                Shared with {account.assignedStoreIds.length} Store
                                                {account.assignedStoreIds.length === 1 ? "" : "s"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {availableAccounts.length > 0 ? (
                                    <div className="rounded-xl border border-border/60 bg-muted/15 p-4 space-y-3">
                                        <p className="text-xs font-medium text-muted-foreground">Organization account</p>
                                        <div className="space-y-2">
                                            <ReactSelect
                                                options={accountOptions}
                                                value={selectedAccountOption}
                                                onChange={option => setSelectedAccountId(option?.value ?? "")}
                                                placeholder="Select a WhatsApp account"
                                                isDisabled={isBusy}
                                                isLoading={accountsQuery.isPending}
                                                formatOptionLabel={formatAccountOption}
                                                components={{ Option: CustomOption }}
                                                classNames={{
                                                    control: () => "!min-h-11 rounded-xl bg-background/80",
                                                    menu: () => "rounded-xl",
                                                }}
                                            />
                                            <Button
                                                className="h-11 w-full rounded-xl"
                                                disabled={isBusy || !selectedAccountId}
                                                onClick={() => assignMutation.mutate()}
                                            >
                                                {assignMutation.isPending ? (
                                                    <LoaderCircle className="size-4 animate-spin" />
                                                ) : (
                                                    <Link2 className="size-4" />
                                                )}
                                                Link account
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}

                                <div
                                    className={cn(
                                        "rounded-xl border border-dashed p-4",
                                        availableAccounts.length > 0
                                            ? "border-border/50 bg-muted/5"
                                            : "border-border/60 bg-muted/10",
                                    )}
                                >
                                    <p className="text-sm text-muted-foreground">
                                        {availableAccounts.length > 0
                                            ? "Need another number? Add it from the organization WhatsApp manager."
                                            : "No organization WhatsApp account is available yet."}
                                    </p>
                                    <div className="mt-3">
                                        <Button
                                            variant="outline"
                                            className="rounded-xl"
                                            render={<Link to={`/organizations/${organizationId}/whatsapp/accounts`} />}
                                        >
                                            <Settings2 className="size-4" />
                                            Add or manage accounts
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {account ? (
                        <div className="flex items-center justify-end border-t border-border/40 px-5 py-3 sm:px-6">
                            <Button
                                variant="outline"
                                className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={isBusy}
                                onClick={() => setRemoveOpen(true)}
                            >
                                {unassignMutation.isPending ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                    <Trash2 className="size-4" />
                                )}
                                Unlink from Store
                            </Button>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unlink WhatsApp from this Store?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={unassignMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={unassignMutation.isPending}
                            onClick={event => {
                                event.preventDefault();
                                unassignMutation.mutate();
                            }}
                        >
                            {unassignMutation.isPending ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <Trash2 className="size-4" />
                            )}
                            Unlink from Store
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default StoreWhatsAppLinkCard;
