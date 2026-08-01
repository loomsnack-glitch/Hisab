import { useMemo, useState } from "react";
import type { ProductAddOnAttachmentResponseDTO, ProductResponseDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@repo/ui/components/dialog";
import { Check, Minus, Plus } from "lucide-react";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import { formatCurrency } from "@/lib/format";
import { cn } from "@repo/ui/lib/utils";

export type CustomizeAddOnSelection = {
    addOnId: string;
    name: string;
    unitPrice: number;
    unitDiscount: number;
    quantity: number;
};

type CustomizeProductDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: ProductResponseDTO | null;
    attachments: ProductAddOnAttachmentResponseDTO[];
    onConfirm: (product: ProductResponseDTO, addOns: CustomizeAddOnSelection[]) => void;
};

const getInitialQuantities = (attachments: ProductAddOnAttachmentResponseDTO[]) => {
    return Object.fromEntries(attachments.map((attachment) => [attachment.addOnId, 0]));
};

const CustomizeProductDialog = ({
    open,
    onOpenChange,
    product,
    attachments,
    onConfirm,
}: CustomizeProductDialogProps) => {
    const [quantities, setQuantities] = useState<Record<string, number>>(() =>
        getInitialQuantities(attachments),
    );

    const selectedAddOns = useMemo(() => {
        return attachments
            .map((attachment) => {
                const quantity = quantities[attachment.addOnId] ?? 0;
                if (quantity <= 0) {
                    return null;
                }

                return {
                    addOnId: attachment.addOnId,
                    name: attachment.addOn.name,
                    unitPrice: Number(attachment.addOn.price),
                    unitDiscount: Number(attachment.addOn.discount ?? 0),
                    quantity,
                } satisfies CustomizeAddOnSelection;
            })
            .filter((addOn): addOn is CustomizeAddOnSelection => Boolean(addOn));
    }, [attachments, quantities]);

    const estimatedExtra = selectedAddOns.reduce(
        (total, addOn) => total + (addOn.unitPrice - addOn.unitDiscount) * addOn.quantity,
        0,
    );

    const updateQuantity = (addOnId: string, selectionCap: number, nextQuantity: number) => {
        setQuantities((current) => ({
            ...current,
            [addOnId]: Math.max(0, Math.min(selectionCap, nextQuantity)),
        }));
    };

    if (!product) {
        return null;
    }

    const productTotal = Number(product.price) - Number(product.discount ?? 0);
    const estimatedTotal = productTotal + estimatedExtra;
    const selectedQuantity = selectedAddOns.reduce((total, addOn) => total + addOn.quantity, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-background/95 p-0 shadow-2xl sm:max-h-[90dvh] sm:w-[calc(100%-2rem)]">
                <DialogHeader className="shrink-0 space-y-2 border-b border-border/60 px-4 py-4 sm:px-6 sm:py-5">
                    <DialogTitle className="break-words pr-8 font-display text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                        Customize {product.name}
                    </DialogTitle>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">Base price</span>
                        <ProductPriceDisplay
                            price={product.price}
                            discount={product.discount}
                            size="sm"
                            align="right"
                        />
                    </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                    {attachments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                            No extras available.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold text-foreground">Extras</h3>
                                <span className="text-xs text-muted-foreground">
                                    {attachments.length} available
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                {attachments.map((attachment) => {
                                    const quantity = quantities[attachment.addOnId] ?? 0;
                                    const isSelected = quantity > 0;
                                    const addOnPrice = Math.max(
                                        0,
                                        Number(attachment.addOn.price) - Number(attachment.addOn.discount ?? 0),
                                    );

                                    return (
                                        <div
                                            key={attachment.id}
                                            className={cn(
                                                "flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors",
                                                isSelected
                                                    ? "border-primary/40 bg-primary/5"
                                                    : "border-border/50 bg-card/40 hover:border-primary/25 hover:bg-muted/30",
                                            )}
                                        >
                                            <button
                                                type="button"
                                                className="min-w-0 flex-1 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                onClick={() =>
                                                    updateQuantity(
                                                        attachment.addOnId,
                                                        attachment.selectionCap,
                                                        quantity === 0 ? 1 : quantity,
                                                    )
                                                }
                                                aria-pressed={isSelected}
                                            >
                                                <span className="flex min-w-0 items-center gap-1.5">
                                                    {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                                                    <span className="min-w-0 break-words text-sm font-semibold text-foreground">
                                                        {attachment.addOn.name}
                                                    </span>
                                                </span>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                    <div className="inline-flex items-center gap-0.5">
                                                        <span>+</span>
                                                        <span>{formatCurrency(addOnPrice)}</span>
                                                    </div>
                                                    <span>
                                                        {quantity} / {attachment.selectionCap}
                                                    </span>
                                                </div>
                                            </button>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQuantity(
                                                            attachment.addOnId,
                                                            attachment.selectionCap,
                                                            quantity - 1,
                                                        )
                                                    }
                                                    disabled={quantity === 0}
                                                    aria-label={`Decrease ${attachment.addOn.name}`}
                                                    className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <Minus className="size-3.5" />
                                                </button>
                                                <span className="w-6 text-center text-sm font-bold text-foreground">
                                                    {quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQuantity(
                                                            attachment.addOnId,
                                                            attachment.selectionCap,
                                                            quantity + 1,
                                                        )
                                                    }
                                                    aria-label={`Increase ${attachment.addOn.name}`}
                                                    disabled={quantity >= attachment.selectionCap}
                                                    className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <Plus className="size-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-border/60 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="flex items-end justify-between gap-4">
                        <div className="min-w-0 text-xs text-muted-foreground">
                            <p>
                                {selectedQuantity} extra{selectedQuantity === 1 ? "" : "s"} selected
                            </p>
                            <p className="mt-0.5 text-primary">+{formatCurrency(estimatedExtra)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-base font-bold text-foreground">
                                {formatCurrency(estimatedTotal)}
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mx-0 mb-0 shrink-0 rounded-b-2xl border-t border-border/60 bg-muted/30 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4 sm:pb-4">
                    <div className="grid w-full grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            className="h-10 rounded-lg"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="h-10 rounded-lg"
                            onClick={() => {
                                onConfirm(product, selectedAddOns);
                                onOpenChange(false);
                            }}
                        >
                            Add to order
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CustomizeProductDialog;
