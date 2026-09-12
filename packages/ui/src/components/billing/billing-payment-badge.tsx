import { cn } from "@repo/ui/lib/utils";

import {
    BILLING_PAYMENT_METHOD_LABELS,
    BILLING_PAYMENT_STATUS_LABELS,
    detectBillingPaymentMethods,
    resolveBillingPaymentBadgeStatus,
    type BillingDetectedPaymentMethod,
    type BillingPaymentBadgeStatus,
} from "./billing-payment";

const statusClassName: Record<BillingPaymentBadgeStatus, string> = {
    draft: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    voided: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    paid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    partial: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    due: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const methodClassName: Record<BillingDetectedPaymentMethod, string> = {
    cash: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-300",
    upi: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    card: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    bank_transfer: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    other: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const badgeClassName =
    "rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider";

export function BillingPaymentStatusBadge({
    status,
    paymentStatus,
    className,
}: {
    status?: string | null;
    paymentStatus?: string | null;
    className?: string;
}) {
    const badgeStatus = resolveBillingPaymentBadgeStatus({ status, paymentStatus });

    return (
        <span className={cn(badgeClassName, statusClassName[badgeStatus], className)}>
            {BILLING_PAYMENT_STATUS_LABELS[badgeStatus]}
        </span>
    );
}

export function BillingPaymentMethodBadges({
    status,
    paymentMethods,
    className,
}: {
    status?: string | null;
    paymentMethods?: string | null;
    className?: string;
}) {
    if (status === "draft" || status === "voided") {
        return (
            <span className={cn(badgeClassName, "text-[9px] bg-zinc-500/10 text-zinc-400 border-zinc-500/20", className)}>
                No payment
            </span>
        );
    }

    const methods = detectBillingPaymentMethods(paymentMethods);
    if (methods.length === 0) {
        return (
            <span className={cn(badgeClassName, "text-[9px] bg-zinc-500/10 text-zinc-400 border-zinc-500/20", className)}>
                Unpaid
            </span>
        );
    }

    return (
        <div className={cn("flex flex-wrap gap-1", className)}>
            {methods.map((method) => (
                <span key={method} className={cn(badgeClassName, "text-[9px]", methodClassName[method])}>
                    {BILLING_PAYMENT_METHOD_LABELS[method]}
                </span>
            ))}
        </div>
    );
}
