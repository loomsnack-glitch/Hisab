import { useMemo, useState } from "react";
import type { ComboProductResponse, ProductAddOnAttachmentResponseDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Spinner } from "@repo/ui/components/spinner";
import { Check, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import ProductPriceDisplay from "@/components/catalog/product-price-display";
import { formatCurrency } from "@/lib/format";

export type ComboDialogSelection = {
    groupId: string;
    optionProductId: string;
    optionName: string;
    quantity: number;
    priceAdjustment: number;
    addOns: Array<{ addOnId: string; name: string; quantity: number; unitPrice: number; unitDiscount: number }>;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    combo: ComboProductResponse | null;
    attachmentsByProductId: Map<string, ProductAddOnAttachmentResponseDTO[]>;
    onConfirm: (combo: ComboProductResponse, selections: ComboDialogSelection[]) => void;
};

const ConfigureComboDialog = ({ open, onOpenChange, combo, attachmentsByProductId, onConfirm }: Props) => {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [addOnQuantities, setAddOnQuantities] = useState<Record<string, number>>({});

    const selections = useMemo<ComboDialogSelection[]>(() => combo?.choiceGroups.flatMap((group) => group.options.flatMap((option) => {
        const quantity = quantities[`${group.id}:${option.optionProductId}`] ?? 0;
        if (quantity === 0) return [];
        const attachments = attachmentsByProductId.get(option.optionProductId) ?? [];
        return [{
            groupId: group.id,
            optionProductId: option.optionProductId,
            optionName: option.product.name,
            quantity,
            priceAdjustment: Number(option.priceAdjustment ?? 0),
            addOns: attachments.flatMap((attachment) => {
                const addOnQuantity = addOnQuantities[`${group.id}:${option.optionProductId}:${attachment.addOnId}`] ?? 0;
                return addOnQuantity > 0 ? [{ addOnId: attachment.addOnId, name: attachment.addOn.name, quantity: addOnQuantity, unitPrice: Number(attachment.addOn.price), unitDiscount: Number(attachment.addOn.discount ?? 0) }] : [];
            }),
        }];
    })) ?? [], [combo, quantities, addOnQuantities, attachmentsByProductId]);

    const selectedCountByGroup = useMemo(() => new Map((combo?.choiceGroups ?? []).map((group) => [group.id, group.options.reduce((total, option) => total + (quantities[`${group.id}:${option.optionProductId}`] ?? 0), 0)])), [combo, quantities]);
    const extraTotal = selections.reduce((total, selection) => {
        return total + selection.addOns.reduce((sum, addOn) => sum + Math.max(addOn.unitPrice - addOn.unitDiscount, 0) * addOn.quantity, 0) + (selection.priceAdjustment * selection.quantity);
    }, 0);
    const baseTotal = combo ? Number(combo.product.price) - Number(combo.product.discount ?? 0) : 0;
    const canConfirm = (combo?.choiceGroups ?? []).every((group) => {
        const count = selectedCountByGroup.get(group.id) ?? 0;
        return count >= group.minSelections && count <= group.maxSelections;
    });

    if (!combo) {
        return <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex min-h-48 items-center justify-center rounded-2xl">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    Loading Combo...
                </div>
            </DialogContent>
        </Dialog>;
    }

    const updateOption = (groupId: string, optionProductId: string, maxQuantity: number, delta: number) => {
        const key = `${groupId}:${optionProductId}`;
        const group = combo.choiceGroups.find((item) => item.id === groupId);
        const current = quantities[key] ?? 0;
        const groupCount = selectedCountByGroup.get(groupId) ?? 0;
        const next = Math.max(0, Math.min(maxQuantity, current + delta, current + Math.max(0, (group?.maxSelections ?? 100) - groupCount)));
        setQuantities((state) => ({ ...state, [key]: next }));
        if (next === 0) setAddOnQuantities((state) => Object.fromEntries(Object.entries(state).filter(([entryKey]) => !entryKey.startsWith(`${groupId}:${optionProductId}:`))));
    };

    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0">
            <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4"><div className="flex items-center gap-2 text-primary"><SlidersHorizontal className="size-4" /><span className="text-xs font-semibold uppercase tracking-[0.16em]">Configure Combo</span></div><DialogTitle className="text-left text-xl">{combo.product.name}</DialogTitle><div className="flex items-center justify-between text-sm text-muted-foreground"><span>Base price</span><ProductPriceDisplay price={combo.product.price} discount={combo.product.discount} size="sm" align="right" /></div></DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-4">
                {combo.choiceGroups.map((group) => <section key={group.id} className="space-y-2"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">{group.name}</h3><p className="text-xs text-muted-foreground">Choose {group.minSelections === group.maxSelections ? group.minSelections : `${group.minSelections}-${group.maxSelections}`}</p></div><span className={cn("text-xs font-medium", (selectedCountByGroup.get(group.id) ?? 0) >= group.minSelections ? "text-primary" : "text-muted-foreground")}>{selectedCountByGroup.get(group.id) ?? 0}/{group.maxSelections}</span></div><div className="grid grid-cols-1 gap-2">
                    {group.options.map((option) => { const quantity = quantities[`${group.id}:${option.optionProductId}`] ?? 0; const attachments = attachmentsByProductId.get(option.optionProductId) ?? []; return <div key={option.id} className={cn("min-w-0 rounded-xl border p-2.5", quantity > 0 ? "border-primary/40 bg-primary/5" : "border-border/60")}><div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><p className="flex items-start gap-1 text-sm font-medium leading-tight">{quantity > 0 && <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />}<span className="line-clamp-2 break-words">{option.product.name}</span></p><p className="mt-1 text-xs text-muted-foreground">{option.priceAdjustment ? `${option.priceAdjustment > 0 ? "+" : ""}${formatCurrency(option.priceAdjustment)}` : "Included"} · Max {option.maxQuantity}</p></div><div className="flex shrink-0 items-center gap-1"><Button type="button" variant="outline" size="icon" className="size-7 rounded-lg" disabled={quantity === 0} onClick={() => updateOption(group.id, option.optionProductId, option.maxQuantity, -1)}><Minus className="size-3" /></Button><span className="w-4 text-center text-sm font-semibold">{quantity}</span><Button type="button" size="icon" className="size-7 rounded-lg" disabled={quantity >= option.maxQuantity || (selectedCountByGroup.get(group.id) ?? 0) >= group.maxSelections} onClick={() => updateOption(group.id, option.optionProductId, option.maxQuantity, 1)}><Plus className="size-3" /></Button></div></div>{quantity > 0 && attachments.length > 0 && <div className="mt-2 space-y-1 border-t border-border/50 pt-2">{attachments.map((attachment) => { const key = `${group.id}:${option.optionProductId}:${attachment.addOnId}`; const addOnQuantity = addOnQuantities[key] ?? 0; return <div key={attachment.id} className="flex items-center justify-between gap-2 text-xs"><span className="min-w-0 truncate text-muted-foreground">+ {attachment.addOn.name} <span className="text-[10px]">(max {attachment.selectionCap})</span></span><div className="flex shrink-0 items-center gap-1"><Button type="button" variant="ghost" size="icon" className="size-6" disabled={addOnQuantity === 0} onClick={() => setAddOnQuantities((state) => ({ ...state, [key]: Math.max(0, addOnQuantity - 1) }))}><Minus className="size-3" /></Button><span className="w-4 text-center">{addOnQuantity}</span><Button type="button" variant="ghost" size="icon" className="size-6" disabled={addOnQuantity >= attachment.selectionCap} onClick={() => setAddOnQuantities((state) => ({ ...state, [key]: addOnQuantity + 1 }))}><Plus className="size-3" /></Button></div></div>; })}</div>}</div>; })}
                </div></section>)}
            </div>
            <div className="shrink-0 border-t border-border/60 px-5 py-3"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Estimated total</span><span className="font-semibold">{formatCurrency(baseTotal + extraTotal)}</span></div></div>
            <DialogFooter className="!mx-0 !mb-0 !flex-row items-center rounded-b-2xl border-t border-border/60 bg-muted/20 px-5 pb-4 pt-3"><Button type="button" variant="outline" className="min-w-0 flex-1" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="button" className="min-w-0 flex-1" disabled={!canConfirm} onClick={() => { onConfirm(combo, selections); onOpenChange(false); }}>Add to order</Button></DialogFooter>
        </DialogContent>
    </Dialog>;
};

export default ConfigureComboDialog;
