import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";

import { BillingQuantityStepper } from "./billing-quantity-stepper";

export function BillingCartLineDetails({
    title,
    children,
}: {
    title?: string;
    children: ReactNode;
}) {
    return (
        <div className="mt-1 ml-3 space-y-0.5 border-l border-border/50 pl-3">
            {title ? (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
            ) : null}
            {children}
        </div>
    );
}

export function BillingCartLineDetail({
    label,
    amount,
}: {
    label: string;
    amount?: ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">{label}</span>
            {amount ? <span className="shrink-0 font-medium text-foreground/80">{amount}</span> : null}
        </div>
    );
}

export function BillingCartItem({
    name,
    price,
    quantity,
    lineTotal,
    onDecrease,
    onIncrease,
    onRemove,
    details,
}: {
    name: string;
    price?: ReactNode;
    quantity: number;
    lineTotal: ReactNode;
    onDecrease: () => void;
    onIncrease: () => void;
    onRemove: () => void;
    details?: ReactNode;
}) {
    return (
        <div className="rounded-xl border border-border/40 bg-background/60 px-2 py-2">
            <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0 flex-1">
                    <p className="whitespace-normal break-words text-sm font-semibold leading-snug text-foreground">
                        {name}
                    </p>
                    {price}
                </div>
                <BillingQuantityStepper
                    value={quantity}
                    name={name}
                    onDecrease={onDecrease}
                    onIncrease={onIncrease}
                />
                <p className="w-14 shrink-0 text-right text-xs font-bold text-foreground">{lineTotal}</p>
                <button
                    type="button"
                    onClick={onRemove}
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${name} from order`}
                >
                    <Trash2 className="size-4" />
                </button>
            </div>
            {details}
        </div>
    );
}
