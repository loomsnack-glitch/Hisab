import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { CategoryDTO, ProductResponseDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@repo/ui/components/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui/components/dialog";
import { cn } from "@repo/ui/lib/utils";

type ComboProductPickerDialogProps = {
    categories: CategoryDTO[];
    products: ProductResponseDTO[];
    values: string[];
    onChange: (productIds: string[]) => void;
};

type ProductGroup = {
    categoryId: string;
    categoryName: string;
    products: ProductResponseDTO[];
};

const ComboProductPickerDialog = ({ categories, products, values, onChange }: ComboProductPickerDialogProps) => {
    const [open, setOpen] = useState(false);
    const selectedProductIds = useMemo(() => new Set(values), [values]);
    const selectedProducts = products.filter((product) => selectedProductIds.has(product.id));

    const productGroups = useMemo(() => {
        const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
        const groupedProducts = new Map<string, ProductGroup>();

        for (const category of categories) {
            groupedProducts.set(category.id, {
                categoryId: category.id,
                categoryName: category.name,
                products: [],
            });
        }

        for (const product of products) {
            const categoryId = product.categoryId || "uncategorized";
            const group = groupedProducts.get(categoryId) ?? {
                categoryId,
                categoryName: categoryNames.get(categoryId) ?? "Uncategorized",
                products: [],
            };
            group.products.push(product);
            groupedProducts.set(categoryId, group);
        }

        return [...groupedProducts.values()].filter((group) => group.products.length > 0);
    }, [categories, products]);

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        aria-label={values.length > 0 ? `${values.length} products selected` : "Select products"}
                        className="h-9 w-full min-w-0 justify-between rounded-lg px-3 font-normal"
                    >
                        <span className={cn("truncate", values.length === 0 && "text-muted-foreground")}>
                            {values.length === 0
                                ? "Select products"
                                : values.length === 1
                                  ? selectedProducts[0]?.name ?? "1 product selected"
                                  : `${values.length} products selected`}
                        </span>
                        <ChevronDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
                    </Button>
                }
            />
            <DialogContent className="flex h-[min(80dvh,42rem)] max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
                <DialogHeader className="border-b border-border/60 px-5 py-4 pr-12">
                    <DialogTitle>Select combo product</DialogTitle>
                    <DialogDescription className="sr-only">Search and select an active product grouped by category.</DialogDescription>
                </DialogHeader>
                <Command className="!h-auto min-h-0 flex-1 rounded-none">
                    <CommandInput placeholder="Search products or categories..." />
                    <CommandList className="!max-h-none min-h-0 flex-1 p-2">
                        <CommandEmpty>No matching products found.</CommandEmpty>
                        {productGroups.map((group) => (
                            <CommandGroup key={group.categoryId} heading={group.categoryName}>
                                {group.products.map((product) => {
                                    const isSelected = selectedProductIds.has(product.id);

                                    return (
                                        <CommandItem
                                            key={product.id}
                                            value={`${product.name} ${group.categoryName}`}
                                            onSelect={() => {
                                                onChange(
                                                    isSelected
                                                        ? values.filter((productId) => productId !== product.id)
                                                        : [...values, product.id],
                                                );
                                            }}
                                            className="cursor-pointer rounded-lg px-3 py-2.5"
                                        >
                                            <span className="min-w-0 flex-1 truncate">{product.name}</span>
                                            {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
                <DialogFooter className="border-t border-border/60 px-5 pb-6 pt-3">
                    <Button type="button" onClick={() => setOpen(false)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ComboProductPickerDialog;
