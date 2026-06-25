import { useState } from "react";
import type { CategoryDTO, ProductDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Layers3, Tags, PlusCircle, Pencil } from "lucide-react";

import DeleteCategoryButton from "@/components/catalog/delete-category-button";
import CategoryStatusBadge from "@/components/catalog/category-status-badge";
import UpsertCategoryDialog from "@/components/catalog/upsert-category-dialog";
import { formatDateTime } from "@/lib/format";

type ManageCategoriesDialogProps = {
    organizationId: string;
    categories: CategoryDTO[];
    productsByCategoryId: Map<string, ProductDTO[]>;
    trigger?: React.ReactElement;
};

const ManageCategoriesDialog = ({
    organizationId,
    categories,
    productsByCategoryId,
    trigger,
}: ManageCategoriesDialogProps) => {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant="outline" className="rounded-full">
                            <Layers3 className="mr-2 size-4" />
                            Manage categories
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Tags className="size-5" />
                            </div>
                            <div className="text-left">
                                <DialogTitle className="font-display text-xl font-semibold">
                                    Manage Categories
                                </DialogTitle>
                                <DialogDescription className="text-xs mt-0.5">
                                    Create, edit, and delete product categories.
                                </DialogDescription>
                            </div>
                        </div>
                        {categories.length > 0 && (
                            <UpsertCategoryDialog
                                organizationId={organizationId}
                                trigger={
                                    <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs">
                                        <PlusCircle className="mr-2 size-3.5" />
                                        Add category
                                    </Button>
                                }
                            />
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                    {categories.length === 0 ? (
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Tags />
                                </EmptyMedia>
                                <EmptyTitle>No categories yet</EmptyTitle>
                                <EmptyDescription>
                                    Start by creating a category like "Beverages" or "Snacks" to organize your product catalog.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <UpsertCategoryDialog organizationId={organizationId} />
                            </EmptyContent>
                        </Empty>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/30">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/50 bg-muted/20 text-left text-muted-foreground sticky top-0 backdrop-blur-md z-10">
                                        <th className="px-4 py-3 font-medium">Category name</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Products</th>
                                        <th className="px-4 py-3 font-medium">Created</th>
                                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {categories.map((category, index) => {
                                        const categoryProducts = productsByCategoryId.get(category.id) ?? [];
                                        return (
                                            <tr
                                                key={category.id}
                                                className={`transition-colors duration-150 hover:bg-muted/30 ${index % 2 !== 0 ? "bg-muted/10" : ""}`}
                                            >
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                            <Tags className="size-3.5" />
                                                        </div>
                                                        <span className="font-medium text-foreground">{category.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <CategoryStatusBadge status={category.status} />
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <Badge variant="outline" className="rounded-full text-xs">
                                                        {categoryProducts.length} product{categoryProducts.length === 1 ? "" : "s"}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3.5 text-muted-foreground">
                                                    {formatDateTime(category.createdAt)}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <UpsertCategoryDialog
                                                            organizationId={organizationId}
                                                            category={category}
                                                            trigger={
                                                                <Button variant="outline" size="sm" className="rounded-full">
                                                                    <Pencil className="mr-1.5 size-3" />
                                                                    Edit
                                                                </Button>
                                                            }
                                                        />
                                                        <DeleteCategoryButton organizationId={organizationId} category={category} />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ManageCategoriesDialog;
