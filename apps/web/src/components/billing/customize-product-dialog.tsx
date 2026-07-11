import { useEffect, useMemo, useState } from "react";
import type { ProductAddOnAttachmentResponseDTO, ProductResponseDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@repo/ui/components/dialog";
import { Minus, Plus, SlidersHorizontal } from "lucide-react";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import { formatCurrency } from "@/lib/format";

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg rounded-[28px] border-border/70 bg-background/95 p-0 shadow-2xl">
                <DialogHeader className="space-y-2 border-b border-border/60 px-6 py-5">
                    <div className="flex items-center gap-2 text-primary">
                        <SlidersHorizontal className="size-4" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em]">Customize</span>
                    </div>
                    <DialogTitle className="font-display text-2xl font-semibold tracking-tight">
                        {product.name}
                    </DialogTitle>
                    <DialogDescription>
                        Add-ons start at quantity 0. Increase only the extras you want on this line.
                    </DialogDescription>
                    <ProductPriceDisplay
                        className="pt-1"
                        price={product.price}
                        discount={product.discount}
                        size="md"
                        align="left"
                    />
                </DialogHeader>

                <div className="max-h-[50vh] space-y-2 overflow-y-auto px-6 py-4">
                    {attachments.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                            No add-ons are attached to this product yet.
                        </div>
                    ) : (
                        attachments.map((attachment) => {
                            const quantity = quantities[attachment.addOnId] ?? 0;
                            return (
                                <div
                                    key={attachment.id}
                                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card/60 px-4 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {attachment.addOn.name}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                            <ProductPriceDisplay
                                                price={attachment.addOn.price}
                                                discount={attachment.addOn.discount}
                                                size="sm"
                                                align="left"
                                                singleTone="foreground"
                                            />
                                            <span>Cap {attachment.selectionCap}</span>
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
                                            disabled={quantity >= attachment.selectionCap}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <Plus className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <DialogFooter className="gap-3 border-t border-border/60 px-6 py-4 sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                        Extras {formatCurrency(estimatedExtra)}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="rounded-xl"
                            onClick={() => {
                                onConfirm(product, selectedAddOns);
                                onOpenChange(false);
                            }}
                        >
                            {selectedAddOns.length > 0 ? "Add configured product" : "Add plain product"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CustomizeProductDialog;
