import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createStoreAccessGrant as createStoreAccessGrantRequest,
    getPlatformStoreCommercialStatus as getPlatformStoreCommercialStatusRequest,
    refundAndRevokeLicense as refundAndRevokeLicenseRequest,
} from "@repo/services";
import {
    COMMERCIAL_TERM_TIMEZONE,
    type CreateCommercialRefundAndRevocationJSON,
    type CreateStoreAccessGrantJSON,
    type RefundableCommercialPaymentDTO,
    type StoreAccessGrantSelection,
    type StoreAccessGrantTermKind,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { BadgeCheck } from "lucide-react";

const storeCommercialQueryKey = ["platform-owner", "store-commercial"] as const;

type ConsoleStoreCommercialAccessProps = {
    organizationId: string;
    storeId: string;
    getPlatformStoreCommercialStatus?: typeof getPlatformStoreCommercialStatusRequest;
    createStoreAccessGrant?: typeof createStoreAccessGrantRequest;
    refundAndRevokeLicense?: typeof refundAndRevokeLicenseRequest;
    onUnauthorized?: () => Promise<void>;
};

const formatCommercialTimestamp = (value: string | Date) =>
    new Date(value).toLocaleString("en-IN", {
        timeZone: COMMERCIAL_TERM_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short",
    });

const toKolkataIso = (localValue: string) => {
    if (!localValue) return "";
    return new Date(`${localValue}:00+05:30`).toISOString();
};

const readDatetimeLocalValue = (form: HTMLFormElement | undefined, name: string, fallback: string) => {
    const field = form?.elements.namedItem(name);
    if (field instanceof HTMLInputElement && field.value) {
        return field.value;
    }
    return fallback;
};

const ConsoleStoreCommercialAccess = ({
    organizationId,
    storeId,
    getPlatformStoreCommercialStatus = getPlatformStoreCommercialStatusRequest,
    createStoreAccessGrant = createStoreAccessGrantRequest,
    refundAndRevokeLicense = refundAndRevokeLicenseRequest,
    onUnauthorized,
}: ConsoleStoreCommercialAccessProps) => {
    const queryClient = useQueryClient();
    const [termKind, setTermKind] = useState<StoreAccessGrantTermKind>("seven_day");
    const [selectionKind, setSelectionKind] = useState<StoreAccessGrantSelection["kind"]>("plan");
    const [selectedKey, setSelectedKey] = useState("");
    const [termCount, setTermCount] = useState("30");
    const [termUnit, setTermUnit] = useState<"day" | "month" | "year">("day");
    const [customEndsAt, setCustomEndsAt] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [selectedRefundPaymentId, setSelectedRefundPaymentId] = useState("");
    const [refundAmountPaise, setRefundAmountPaise] = useState("");
    const [refundEffectiveEndsAt, setRefundEffectiveEndsAt] = useState("");
    const [refundError, setRefundError] = useState<string | null>(null);

    const statusQuery = useQuery({
        queryKey: [...storeCommercialQueryKey, organizationId, storeId],
        queryFn: () => getPlatformStoreCommercialStatus(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
        retry: false,
    });
    const inspection = statusQuery.data?.status === "success" ? statusQuery.data.data ?? null : null;
    const status = inspection?.commercialStatus ?? null;
    const grantable = inspection?.grantableAccess;
    const refundablePayments = inspection?.refundablePayments ?? [];
    const errorCode = (statusQuery.error as { code?: number } | null)?.code
        ?? (statusQuery.data?.status === "error" ? statusQuery.data.code : undefined);

    if (errorCode === 401) {
        void onUnauthorized?.();
    }

    const createGrant = useMutation({
        mutationFn: (input: CreateStoreAccessGrantJSON) =>
            createStoreAccessGrant(organizationId, storeId, input),
        onSuccess: (response) => {
            if (response.status === "error" || !response.data) {
                setFormError(response.message ?? "Unable to create the Store Access Grant");
                return;
            }
            queryClient.setQueryData(
                [...storeCommercialQueryKey, organizationId, storeId],
                response,
            );
            setFormError(null);
        },
        onError: (error: { message?: string }) => {
            setFormError(error.message ?? "Unable to create the Store Access Grant");
        },
    });

    const selectedRefund = refundablePayments.find(
        (payment) => payment.paymentEventId === (selectedRefundPaymentId || refundablePayments[0]?.paymentEventId),
    ) ?? null;
    const resolvedRefundPaymentId = selectedRefund?.paymentEventId ?? "";

    const createRefund = useMutation({
        mutationFn: (input: CreateCommercialRefundAndRevocationJSON) =>
            refundAndRevokeLicense(organizationId, storeId, input),
        onSuccess: (response) => {
            if (response.status === "error" || !response.data) {
                setRefundError(response.message ?? "Unable to record the refund and License Revocation");
                return;
            }
            queryClient.setQueryData(
                [...storeCommercialQueryKey, organizationId, storeId],
                response,
            );
            setRefundError(null);
            setRefundAmountPaise("");
            setRefundEffectiveEndsAt("");
        },
        onError: (error: { message?: string }) => {
            setRefundError(error.message ?? "Unable to record the refund and License Revocation");
        },
    });

    const submitRefund = (form?: HTMLFormElement) => {
        if (!selectedRefund) {
            setRefundError("Select a paid commercial payment to refund.");
            return;
        }
        const amountPaise = Number(refundAmountPaise || selectedRefund.amountPaise);
        if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
            setRefundError("Enter a whole-number refund amount in paise.");
            return;
        }
        if (selectedRefund.accessSourceStatus === "active") {
            const effectiveEndsAt = toKolkataIso(
                readDatetimeLocalValue(form, "refundEffectiveEndsAt", refundEffectiveEndsAt),
            );
            if (!effectiveEndsAt) {
                setRefundError("Choose an Asia/Kolkata access end timestamp.");
                return;
            }
            createRefund.mutate({
                paymentEventId: selectedRefund.paymentEventId,
                amountPaise,
                effectiveEndsAt,
            });
            return;
        }
        createRefund.mutate({
            paymentEventId: selectedRefund.paymentEventId,
            amountPaise,
        });
    };

    const plans = grantable?.plans ?? [];
    const modules = grantable?.modules ?? [];
    const selectionOptions = selectionKind === "plan" ? plans : modules;
    const resolvedKey = selectedKey || selectionOptions[0]?.key || "";

    const submitGrant = (form?: HTMLFormElement) => {
        if (!resolvedKey) {
            setFormError("Select a Plan or Module to grant.");
            return;
        }
        const selection: StoreAccessGrantSelection = selectionKind === "plan"
            ? { kind: "plan", planKey: resolvedKey }
            : { kind: "module", moduleKey: resolvedKey };
        if (termKind === "seven_day") {
            createGrant.mutate({ termKind, selection });
            return;
        }
        if (termKind === "custom_range") {
            const endsAt = toKolkataIso(readDatetimeLocalValue(form, "grantEndsAt", customEndsAt));
            if (!endsAt) {
                setFormError("Choose an Asia/Kolkata end timestamp.");
                return;
            }
            createGrant.mutate({ termKind, selection, endsAt });
            return;
        }
        const count = Number(termCount);
        if (!Number.isInteger(count) || count < 1) {
            setFormError("Enter a whole-number term of at least 1.");
            return;
        }
        createGrant.mutate({
            termKind,
            selection,
            term: { count, unit: termUnit },
        });
    };

    const onCreate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        submitGrant(event.currentTarget);
    };

    return (
        <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader>
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BadgeCheck className="size-4" />
                    </div>
                    <div className="min-w-0">
                        <CardTitle className="font-display text-xl">Store commercial access</CardTitle>
                        <CardDescription>
                            Inspect this Store's access sources and create a time-bounded Plan or Module Store Access Grant.
                            This does not change Organization business data or paid history.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {statusQuery.isPending ? (
                    <div className="flex min-h-24 items-center justify-center" aria-busy="true" aria-label="Loading commercial access">
                        <Spinner className="size-5 text-primary" />
                    </div>
                ) : statusQuery.isError || statusQuery.data?.status === "error" || !status ? (
                    <Alert role="alert">
                        <AlertTitle>Commercial access could not be loaded</AlertTitle>
                        <AlertDescription>
                            {statusQuery.data?.message ?? "This Store's commercial status is unavailable."}
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-foreground">Current Plan</h3>
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

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">Access Grants</h3>
                            {status.accessGrants.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No Store Access Grants on this Store.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {status.accessGrants.map((grant) => (
                                        <li
                                            key={grant.id}
                                            className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className="rounded-full text-xs">
                                                    {grant.label}
                                                </Badge>
                                                <p className="text-sm text-muted-foreground">
                                                    {grant.selectionLabel}
                                                    {" · "}
                                                    {formatCommercialTimestamp(grant.startsAt)}
                                                    {" – "}
                                                    {formatCommercialTimestamp(grant.endsAt)}
                                                    {` (${status.timezone})`}
                                                </p>
                                            </div>
                                            <ul className="flex flex-wrap gap-2">
                                                {grant.modules.flatMap((moduleItem) =>
                                                    moduleItem.features.map((feature) => (
                                                        <li key={`${grant.id}-${moduleItem.key}-${feature.key}`}>
                                                            <Badge variant="secondary" className="rounded-full text-xs">
                                                                {feature.displayName}
                                                            </Badge>
                                                        </li>
                                                    )),
                                                )}
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">Commercial history</h3>
                            {status.commercialHistory.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No commercial history on this Store.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {status.commercialHistory.slice(0, 8).map((entry) => (
                                        <li
                                            key={`${entry.kind}-${entry.id}`}
                                            className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-sm"
                                        >
                                            <p className="font-medium text-foreground">{entry.title}</p>
                                            <p className="text-muted-foreground">{entry.detail}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">Refundable payments</h3>
                            {refundablePayments.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No paid commercial payments are currently eligible for refund.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {refundablePayments.map((payment: RefundableCommercialPaymentDTO) => (
                                        <li
                                            key={payment.paymentEventId}
                                            className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-sm"
                                        >
                                            <p className="font-medium text-foreground">{payment.accessSourceLabel}</p>
                                            <p className="text-muted-foreground">
                                                {formatCommercialTimestamp(payment.paidAt)}
                                                {" · "}
                                                {payment.accessSourceStatus}
                                                {" · "}
                                                {new Intl.NumberFormat("en-IN", {
                                                    style: "currency",
                                                    currency: "INR",
                                                }).format(payment.amountInr)}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <form className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4" onSubmit={onCreate}>
                            <h3 className="text-sm font-medium text-foreground">Create Store Access Grant</h3>
                            <label className="block space-y-1.5 text-sm">
                                <span className="font-medium">Grant type</span>
                                <select
                                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                                    value={termKind}
                                    onChange={(event) => setTermKind(event.target.value as StoreAccessGrantTermKind)}
                                    aria-label="Grant type"
                                >
                                    <option value="seven_day">Seven-day</option>
                                    <option value="extended">Extended</option>
                                    <option value="complimentary">Complimentary</option>
                                    <option value="custom_range">Custom range</option>
                                </select>
                            </label>
                            <label className="block space-y-1.5 text-sm">
                                <span className="font-medium">Catalog selection</span>
                                <select
                                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                                    value={selectionKind}
                                    onChange={(event) => {
                                        setSelectionKind(event.target.value as StoreAccessGrantSelection["kind"]);
                                        setSelectedKey("");
                                    }}
                                    aria-label="Catalog selection"
                                >
                                    <option value="plan">Plan</option>
                                    <option value="module">Module</option>
                                </select>
                            </label>
                            <label className="block space-y-1.5 text-sm">
                                <span className="font-medium">{selectionKind === "plan" ? "Plan" : "Module"}</span>
                                <select
                                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                                    value={resolvedKey}
                                    onChange={(event) => setSelectedKey(event.target.value)}
                                    aria-label={selectionKind === "plan" ? "Plan" : "Module"}
                                >
                                    {selectionOptions.map((option) => (
                                        <option key={option.key} value={option.key}>
                                            {option.displayName}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {termKind === "extended" || termKind === "complimentary" ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="block space-y-1.5 text-sm">
                                        <span className="font-medium">Term count</span>
                                        <input
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={termCount}
                                            onChange={(event) => setTermCount(event.target.value)}
                                            aria-label="Term count"
                                            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                                        />
                                    </label>
                                    <label className="block space-y-1.5 text-sm">
                                        <span className="font-medium">Term unit</span>
                                        <select
                                            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                                            value={termUnit}
                                            onChange={(event) => setTermUnit(event.target.value as "day" | "month" | "year")}
                                            aria-label="Term unit"
                                        >
                                            <option value="day">Day</option>
                                            <option value="month">Month</option>
                                            <option value="year">Year</option>
                                        </select>
                                    </label>
                                </div>
                            ) : null}
                            {termKind === "custom_range" ? (
                                <label className="block space-y-1.5 text-sm">
                                    <span className="font-medium">Ends at (Asia/Kolkata)</span>
                                    <input
                                        type="datetime-local"
                                        name="grantEndsAt"
                                        value={customEndsAt}
                                        onChange={(event) => setCustomEndsAt(event.target.value)}
                                        aria-label="Grant ends at"
                                        className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                                    />
                                </label>
                            ) : null}
                            {formError ? (
                                <p className="text-sm text-destructive" role="alert">{formError}</p>
                            ) : null}
                            <Button
                                type="submit"
                                className="rounded-full"
                                disabled={createGrant.isPending}
                            >
                                {createGrant.isPending ? "Creating grant..." : "Create Store Access Grant"}
                            </Button>
                        </form>

                        <form
                            className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                submitRefund(event.currentTarget);
                            }}
                        >
                            <h3 className="text-sm font-medium text-foreground">Refund and revoke access</h3>
                            <p className="text-sm text-muted-foreground">
                                Initiate a Razorpay refund and record the matching License Revocation.
                                Refund amounts are entered manually; Hisab does not calculate a pro-rata refund.
                            </p>
                            <label className="block space-y-1.5 text-sm">
                                <span className="font-medium">Paid commercial payment</span>
                                <select
                                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                                    value={resolvedRefundPaymentId}
                                    onChange={(event) => setSelectedRefundPaymentId(event.target.value)}
                                    aria-label="Paid commercial payment"
                                    disabled={refundablePayments.length === 0}
                                >
                                    {refundablePayments.map((payment) => (
                                        <option key={payment.paymentEventId} value={payment.paymentEventId}>
                                            {payment.accessSourceLabel}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block space-y-1.5 text-sm">
                                <span className="font-medium">Refund amount (paise)</span>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={refundAmountPaise}
                                    placeholder={selectedRefund ? String(selectedRefund.amountPaise) : ""}
                                    onChange={(event) => setRefundAmountPaise(event.target.value)}
                                    aria-label="Refund amount in paise"
                                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                                    disabled={!selectedRefund}
                                />
                            </label>
                            {selectedRefund?.accessSourceStatus === "active" ? (
                                <label className="block space-y-1.5 text-sm">
                                    <span className="font-medium">Access ends at (Asia/Kolkata)</span>
                                    <input
                                        type="datetime-local"
                                        name="refundEffectiveEndsAt"
                                        value={refundEffectiveEndsAt}
                                        onChange={(event) => setRefundEffectiveEndsAt(event.target.value)}
                                        aria-label="Access ends at"
                                        className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                                    />
                                </label>
                            ) : null}
                            {refundError ? (
                                <p className="text-sm text-destructive" role="alert">{refundError}</p>
                            ) : null}
                            <Button
                                type="submit"
                                variant="outline"
                                className="rounded-full"
                                disabled={createRefund.isPending || !selectedRefund}
                            >
                                {createRefund.isPending ? "Recording refund..." : "Refund and revoke access"}
                            </Button>
                        </form>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default ConsoleStoreCommercialAccess;
