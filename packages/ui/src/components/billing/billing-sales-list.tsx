import type { ReactNode } from "react";
import { Calendar, ReceiptText } from "lucide-react";

import { Spinner } from "@repo/ui/components/spinner";

import { BillingEmptyState } from "./billing-empty-state";

export function BillingSalesList({
    needsDateRange,
    isPending,
    isError,
    errorMessage,
    isEmpty,
    children,
    footer,
}: {
    needsDateRange?: boolean;
    isPending?: boolean;
    isError?: boolean;
    errorMessage?: string;
    isEmpty?: boolean;
    children?: ReactNode;
    footer?: ReactNode;
}) {
    let body: ReactNode;

    if (needsDateRange) {
        body = (
            <BillingEmptyState
                className="min-h-[220px]"
                icon={<Calendar className="size-8 text-muted-foreground/50" />}
                title="Choose a date range"
                description="Select a From date or To date to view matching bills."
            />
        );
    } else if (isPending) {
        body = (
            <div className="flex min-h-[320px] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    } else if (isError) {
        body = (
            <BillingEmptyState
                className="border-destructive/20 bg-destructive/5"
                icon={<ReceiptText className="size-8 text-destructive/70" />}
                title="Recent bills failed to load"
                description={errorMessage || "Please refresh the page."}
            />
        );
    } else if (isEmpty) {
        body = (
            <BillingEmptyState
                icon={<ReceiptText className="size-8 text-muted-foreground/50" />}
                title="No bills found"
                description="No bills in this view yet."
            />
        );
    } else {
        body = <div className="grid gap-1.5 xl:grid-cols-2">{children}</div>;
    }

    return (
        <>
            {body}
            {footer}
        </>
    );
}
