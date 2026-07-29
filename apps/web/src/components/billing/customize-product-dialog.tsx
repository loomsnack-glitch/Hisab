import { useEffect, useMemo, useState } from "react";
import type { ProductAddOnAttachmentResponseDTO, ProductResponseDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@repo/ui/components/dialog";
import { Check, Minus, Plus, SlidersHorizontal } from "lucide-react";

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

const CustomizeProductDialog = ({
    open,
    onOpenChange,
    product,
    attachments,
    onConfirm,
}: CustomizeProductDialogProps) => {
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!open || !product) {
            return;
        }

        const nextQuantities: Record<string, number> = {};
        for (const attachment of attachments) {
            nextQuantities[attachment.addOnId] = 0;
        }
        setQuantities(nextQuantities);
    }, [open, product, attachments]);

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
            <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-background/95 p-0 shadow-2xl max-lg:max-h-[90dvh] max-lg:rounded-2xl">
                <DialogHeader className="shrink-0 space-y-1 border-b border-border/60 px-4 py-2.5 sm:px-6 sm:py-3">
                    <div className="flex items-center gap-2 text-primary">
                        <SlidersHorizontal className="size-3.5" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Customize</span>
                    </div>
                    <DialogTitle className="truncate font-display text-lg font-semibold tracking-tight sm:text-xl">
                        Customize {product.name}
                    </DialogTitle>
                    <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-muted-foreground">Base price</span>
                        <ProductPriceDisplay
                            price={product.price}
                            discount={product.discount}
                            size="sm"
                            align="right"
                        />
                    </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:max-h-[55vh] sm:px-6 sm:py-3">
                    {attachments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                            No extras are available for this product.
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {attachments.map((attachment) => {
                            const quantity = quantities[attachment.addOnId] ?? 0;
                            const isSelected = quantity > 0;
                            return (
                                <div
                                    key={attachment.id}
                                    className={cn(
                                        "flex items-center justify-between gap-2 px-2 py-2.5 transition-colors first:rounded-t-lg last:rounded-b-lg",
                                        isSelected
                                            ? "bg-primary/5"
                                            : "hover:bg-muted/40",
                                    )}
                                >
                                    <div
                                        className="min-w-0 flex-1 cursor-pointer"
                                        onClick={() =>
                                            updateQuantity(
                                                attachment.addOnId,
                                                attachment.selectionCap,
                                                quantity === 0 ? 1 : quantity,
                                            )
                                        }
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                updateQuantity(
                                                    attachment.addOnId,
                                                    attachment.selectionCap,
                                                    quantity === 0 ? 1 : quantity,
                                                );
                                            }
                                        }}
                                    >
                                        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                                            {isSelected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                                            <span className="truncate">{attachment.addOn.name}</span>
                                        </p>
                                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                            <ProductPriceDisplay
                                                price={attachment.addOn.price}
                                                discount={attachment.addOn.discount}
                                                size="xs"
                                                align="left"
                                                singleTone="foreground"
                                            />
                                            <span>Max {attachment.selectionCap}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
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
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <Plus className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                            })}
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-border/60 px-4 py-2 sm:px-6">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                            {selectedQuantity} extra{selectedQuantity === 1 ? "" : "s"} · {formatCurrency(estimatedExtra)}
                        </span>
                        <span className="font-semibold text-foreground">
                            Total {formatCurrency(estimatedTotal)}
                        </span>
                    </div>
                </div>

                <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 rounded-b-2xl border-t border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-end sm:px-6">
                    <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                        <Button variant="outline" className="h-9 rounded-lg" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="h-9 rounded-lg"
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
