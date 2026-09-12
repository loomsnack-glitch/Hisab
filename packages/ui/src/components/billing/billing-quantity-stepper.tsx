import { Minus, Plus } from "lucide-react";

export function BillingQuantityStepper({
    value,
    name,
    onDecrease,
    onIncrease,
}: {
    value: number;
    name: string;
    onDecrease: () => void;
    onIncrease: () => void;
}) {
    return (
        <div className="flex shrink-0 items-center gap-0.5">
            <button
                type="button"
                onClick={onDecrease}
                className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={`Decrease ${name} quantity`}
            >
                <Minus className="size-3.5" />
            </button>
            <span className="flex size-7 items-center justify-center text-sm font-bold text-foreground">{value}</span>
            <button
                type="button"
                onClick={onIncrease}
                className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                aria-label={`Increase ${name} quantity`}
            >
                <Plus className="size-3.5" />
            </button>
        </div>
    );
}
