import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
    createProductAddOnAttachment,
    getAddOns,
    getCategories,
    getProducts,
    reorderProducts,
    updateProduct,
} from "@repo/services";
import { Button } from "@repo/ui/components/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Card, CardContent } from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import {
    Barcode,
    Boxes,
    Check,
    CheckCircle2,
    ChevronDown,
    Eye,
    EyeOff,
    Filter,
    FolderSync,
    Layers3,
    Link2,
    ListChecks,
    ListOrdered,
    Package2,
    Pencil,
    Plus,
    PlusCircle,
    RefreshCw,
    Search,
    SquareMousePointer,
    X,
} from "lucide-react";
import { toast } from "sonner";

import ToggleProductStatusButton from "@/components/catalog/toggle-product-status-button";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import ProductTypeBadge from "@/components/catalog/product-type-badge";
import UpsertComboProductDialog from "@/components/catalog/upsert-combo-product-dialog";
import UpsertProductDialog from "@/components/catalog/upsert-product-dialog";
import ManageProductAddOnsDialog from "@/components/catalog/manage-product-add-ons-dialog";
import InternalProductLabelDialog from "@/components/catalog/internal-product-label-dialog";
import ProductPriceDisplay from "@/components/catalog/product-price-display";
import {
    bulkCatalogProductStatusChangedMessage,
    markCatalogProductStatusLabel,
    markCatalogProductStatusProgress,
} from "@/lib/catalog-product-status-copy";
import { catalogKeys } from "@/lib/query-keys";
import { catalogSellingQuantityLabel } from "@repo/types";
import { canOfferProductLabelPrint } from "@/lib/internal-label-printing";
import ReorderListDialog from "@/components/catalog/reorder-list-dialog";

const EMPTY_CATALOG_ITEMS: never[] = [];

const STATUS_FILTER_OPTIONS = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
] as const;

const ADDONS_FILTER_OPTIONS = [
    { label: "With add-ons", value: "with_addons" },
    { label: "No add-ons", value: "without_addons" },
] as const;

type ProductFilterOptionsProps = {
    title: string;
    options: ReadonlyArray<{ label: string; value: string }>;
    selectedValues: string[];
    onChange: (value: string) => void;
    onClear: () => void;
    variant?: "popover" | "sheet";
};

const ProductFilterOptions = ({
    title,
    options,
    selectedValues,
    onChange,
    onClear,
    variant = "popover",
}: ProductFilterOptionsProps) => {
    const isSheet = variant === "sheet";

    return (
        <div className={cn("space-y-1", isSheet && "space-y-2")}>
            <div className={cn("flex items-center justify-between gap-3", isSheet ? "px-1 py-1" : "px-2 py-1")}>
                <p
                    className={cn(
                        "font-bold text-muted-foreground uppercase tracking-wider",
                        isSheet ? "text-xs" : "text-[10px]",
                    )}
                >
                    {title}
                </p>
                {selectedValues.length > 0 ? (
                    <button
                        type="button"
                        onClick={onClear}
                        className={cn(
                            "shrink-0 font-semibold text-primary hover:underline cursor-pointer",
                            isSheet ? "text-sm" : "text-[10px]",
                        )}
                    >
                        Clear
                    </button>
                ) : (
                    <span className={cn("invisible shrink-0 font-semibold", isSheet ? "text-sm" : "text-[10px]")}>
                        Clear
                    </span>
                )}
            </div>
            {options.map((opt) => {
                const isChecked = selectedValues.includes(opt.value);
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-lg text-left font-medium hover:bg-muted/50 cursor-pointer",
                            isSheet ? "px-2 py-2.5 text-sm" : "gap-2 px-2 py-1.5 text-xs",
                        )}
                    >
                        <div
                            className={cn(
                                "flex items-center justify-center rounded-full border border-muted-foreground/35 transition-colors",
                                isChecked ? "bg-primary text-primary-foreground border-primary" : "bg-transparent",
                                isSheet ? "size-5" : "size-4",
                            )}
                        >
                            {isChecked ? <Check className={cn("stroke-[3]", isSheet ? "size-3.5" : "size-3")} /> : null}
                        </div>
                        <span className="truncate">{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

const ProductsListPage = () => {
    const { organizationId = "" } = useParams();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
    const [statusFilters, setStatusFilters] = useState<string[]>([]);
    const [addOnsFilters, setAddOnsFilters] = useState<string[]>([]);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
    const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
    const [addComboDialogOpen, setAddComboDialogOpen] = useState(false);
    const [draftStatusFilters, setDraftStatusFilters] = useState<string[]>([]);
    const [draftAddOnsFilters, setDraftAddOnsFilters] = useState<string[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [bulkActionConfirm, setBulkActionConfirm] = useState<
        | { type: "activate"; count: number }
        | { type: "deactivate"; count: number }
        | { type: "category"; count: number; categoryId: string; categoryName: string }
        | { type: "attach_addon"; count: number; addOnId: string; addOnName: string }
        | null
    >(null);
    const [bulkSelectionCap, setBulkSelectionCap] = useState<number>(1);

    const categoriesQuery = useQuery({
        queryKey: catalogKeys.categories(organizationId),
        queryFn: () => getCategories(organizationId),
        enabled: Boolean(organizationId),
    });

    const productsQuery = useQuery({
        queryKey: catalogKeys.products(organizationId),
        queryFn: () => getProducts(organizationId),
        enabled: Boolean(organizationId),
    });

    const addOnsQuery = useQuery({
        queryKey: catalogKeys.addOns(organizationId),
        queryFn: () => getAddOns(organizationId),
        enabled: Boolean(organizationId),
    });

    const categories = categoriesQuery.data?.status === "success" ? categoriesQuery.data.data?.categories ?? EMPTY_CATALOG_ITEMS : EMPTY_CATALOG_ITEMS;
    const products = productsQuery.data?.status === "success" ? productsQuery.data.data?.products ?? EMPTY_CATALOG_ITEMS : EMPTY_CATALOG_ITEMS;
    const addOns = addOnsQuery.data?.status === "success" ? addOnsQuery.data.data?.addOns ?? EMPTY_CATALOG_ITEMS : EMPTY_CATALOG_ITEMS;

    const categoryMap = useMemo(
        () => new Map(categories.map((category) => [category.id, category])),
        [categories],
    );

    const defaultCategoryIdForNewProduct =
        selectedCategoryFilter !== "all" ? selectedCategoryFilter : undefined;

    const activeFilterCount = statusFilters.length + addOnsFilters.length;
    const draftFilterCount = draftStatusFilters.length + draftAddOnsFilters.length;

    const toggleStatusFilter = (value: string) => {
        setStatusFilters((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        );
    };

    const toggleAddOnsFilter = (value: string) => {
        setAddOnsFilters((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        );
    };

    const toggleDraftStatusFilter = (value: string) => {
        setDraftStatusFilters((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        );
    };

    const toggleDraftAddOnsFilter = (value: string) => {
        setDraftAddOnsFilters((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        );
    };

    const clearAllFilters = () => {
        setStatusFilters([]);
        setAddOnsFilters([]);
    };

    const clearDraftFilters = () => {
        setDraftStatusFilters([]);
        setDraftAddOnsFilters([]);
    };

    const handleMobileFiltersOpenChange = (open: boolean) => {
        if (open) {
            setDraftStatusFilters(statusFilters);
            setDraftAddOnsFilters(addOnsFilters);
        }
        setMobileFiltersOpen(open);
    };

    const applyMobileFilters = () => {
        setStatusFilters(draftStatusFilters);
        setAddOnsFilters(draftAddOnsFilters);
        setMobileFiltersOpen(false);
    };

    const handleMobileAddProduct = () => {
        setMobileActionsOpen(false);
        setAddProductDialogOpen(true);
    };

    const handleMobileAddCombo = () => {
        setMobileActionsOpen(false);
        setAddComboDialogOpen(true);
    };

    const handleMobileSelectProducts = () => {
        setMobileActionsOpen(false);
        if (!isSelectMode) {
            setIsSelectMode(true);
        }
    };

    const categoryPillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Auto-scroll the active category pill into center view whenever selectedCategoryFilter changes
    useEffect(() => {
        const el = categoryPillRefs.current[selectedCategoryFilter];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
    }, [selectedCategoryFilter]);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            if (selectedCategoryFilter !== "all" && product.categoryId !== selectedCategoryFilter) {
                return false;
            }
            if (statusFilters.length > 0 && !statusFilters.includes(product.status)) {
                return false;
            }
            if (addOnsFilters.length > 0) {
                const hasAddons = Boolean(product.activeAddOnCount && product.activeAddOnCount > 0);
                const matchesWith = addOnsFilters.includes("with_addons") && hasAddons;
                const matchesWithout = addOnsFilters.includes("without_addons") && !hasAddons;
                if (!matchesWith && !matchesWithout) {
                    return false;
                }
            }
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const productName = product.name.toLowerCase();
                const categoryName = categoryMap.get(product.categoryId)?.name.toLowerCase() ?? "";
                return productName.includes(query) || categoryName.includes(query);
            }
            return true;
        });
    }, [products, selectedCategoryFilter, statusFilters, addOnsFilters, searchQuery, categoryMap]);

    const reorderCategoryId = selectedCategoryFilter !== "all" ? selectedCategoryFilter : null;

    const reorderCategoryProducts = useMemo(() => {
        if (!reorderCategoryId) {
            return [];
        }

        return products.filter((product) => product.categoryId === reorderCategoryId);
    }, [products, reorderCategoryId]);

    const isAllSelected = useMemo(() => {
        if (filteredProducts.length === 0) return false;
        return filteredProducts.every((product) => selectedProductIds.has(product.id));
    }, [filteredProducts, selectedProductIds]);

    const isSomeSelected = useMemo(() => {
        if (filteredProducts.length === 0) return false;
        const count = filteredProducts.filter((product) => selectedProductIds.has(product.id)).length;
        return count > 0 && count < filteredProducts.length;
    }, [filteredProducts, selectedProductIds]);

    const selectedActiveCount = useMemo(() => {
        return products.filter((p) => selectedProductIds.has(p.id) && p.status === "active").length;
    }, [products, selectedProductIds]);

    const selectedInactiveCount = useMemo(() => {
        return products.filter((p) => selectedProductIds.has(p.id) && p.status === "inactive").length;
    }, [products, selectedProductIds]);

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedProductIds((prev) => {
                const next = new Set(prev);
                filteredProducts.forEach((p) => next.delete(p.id));
                return next;
            });
        } else {
            setSelectedProductIds((prev) => {
                const next = new Set(prev);
                filteredProducts.forEach((p) => next.add(p.id));
                return next;
            });
        }
    };

    const toggleSelectProduct = (productId: string) => {
        setSelectedProductIds((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    };

    const toggleSelectMode = () => {
        setIsSelectMode((prev) => {
            const next = !prev;
            if (!next) {
                setSelectedProductIds(new Set());
            }
            return next;
        });
    };

    const clearSelection = () => {
        setSelectedProductIds(new Set());
    };

    const exitSelectMode = () => {
        setIsSelectMode(false);
        setSelectedProductIds(new Set());
    };

    const handleClearChecklist = () => {
        if (selectedProductIds.size > 0) {
            clearSelection();
            return;
        }
        exitSelectMode();
    };

    const handleBulkChangeCategory = async (newCategoryId: string, categoryName: string) => {
        if (selectedProductIds.size === 0) return;
        setIsBulkUpdating(true);
        const targetIds = Array.from(selectedProductIds);
        let successCount = 0;
        const failedIds: string[] = [];

        await Promise.all(
            targetIds.map(async (productId) => {
                const res = await updateProduct(organizationId, productId, { categoryId: newCategoryId });
                if (res.status === "success") {
                    successCount++;
                } else {
                    failedIds.push(productId);
                }
            })
        );

        await queryClient.invalidateQueries({ queryKey: catalogKeys.products(organizationId) });
        await queryClient.invalidateQueries({ queryKey: catalogKeys.categories(organizationId) });
        setIsBulkUpdating(false);

        if (failedIds.length === 0) {
            toast.success(`${successCount} product${successCount === 1 ? "" : "s"} moved to ${categoryName}`);
            setSelectedProductIds(new Set());
        } else {
            toast.error(`${successCount} of ${targetIds.length} products updated. ${failedIds.length} could not be updated.`);
            setSelectedProductIds(new Set(failedIds));
        }
    };

    const handleBulkActivate = async () => {
        if (selectedProductIds.size === 0) return;
        const targetIds = products
            .filter((p) => selectedProductIds.has(p.id) && p.status === "inactive")
            .map((p) => p.id);
        if (targetIds.length === 0) return;

        setIsBulkUpdating(true);
        let successCount = 0;
        const failedIds: string[] = [];

        await Promise.all(
            targetIds.map(async (productId) => {
                const res = await updateProduct(organizationId, productId, { status: "active" });
                if (res.status === "success") {
                    successCount++;
                } else {
                    failedIds.push(productId);
                }
            })
        );

        await queryClient.invalidateQueries({ queryKey: catalogKeys.products(organizationId) });
        await queryClient.invalidateQueries({ queryKey: catalogKeys.storeProductOfferingOverrideSummary(organizationId) });
        setIsBulkUpdating(false);

        if (failedIds.length === 0) {
            toast.success(bulkCatalogProductStatusChangedMessage(successCount, "active"));
            setSelectedProductIds(new Set());
        } else {
            toast.error(`${successCount} of ${targetIds.length} products updated. ${failedIds.length} could not be updated.`);
            setSelectedProductIds(new Set(failedIds));
        }
    };

    const handleBulkDeactivate = async () => {
        if (selectedProductIds.size === 0) return;
        const targetIds = products
            .filter((p) => selectedProductIds.has(p.id) && p.status === "active")
            .map((p) => p.id);
        if (targetIds.length === 0) return;

        setIsBulkUpdating(true);
        let successCount = 0;
        const failedIds: string[] = [];

        await Promise.all(
            targetIds.map(async (productId) => {
                const res = await updateProduct(organizationId, productId, { status: "inactive" });
                if (res.status === "success") {
                    successCount++;
                } else {
                    failedIds.push(productId);
                }
            })
        );

        await queryClient.invalidateQueries({ queryKey: catalogKeys.products(organizationId) });
        await queryClient.invalidateQueries({ queryKey: catalogKeys.storeProductOfferingOverrideSummary(organizationId) });
        setIsBulkUpdating(false);

        if (failedIds.length === 0) {
            toast.success(bulkCatalogProductStatusChangedMessage(successCount, "inactive"));
            setSelectedProductIds(new Set());
        } else {
            toast.error(`${successCount} of ${targetIds.length} products updated. ${failedIds.length} could not be updated.`);
            setSelectedProductIds(new Set(failedIds));
        }
    };

    const handleBulkAttachAddOn = async (addOnId: string, addOnName: string, selectionCap: number) => {
        if (selectedProductIds.size === 0) return;
        setIsBulkUpdating(true);
        const singleProducts = products.filter(
            (p) => selectedProductIds.has(p.id) && p.productType === "single"
        );

        if (singleProducts.length === 0) {
            toast.error("Add-ons can only be attached to standard (single) products.");
            setIsBulkUpdating(false);
            setBulkActionConfirm(null);
            return;
        }

        let successCount = 0;
        let alreadyAttachedCount = 0;
        const failedIds: string[] = [];

        await Promise.all(
            singleProducts.map(async (product) => {
                const res = await createProductAddOnAttachment(organizationId, product.id, {
                    addOnId,
                    selectionCap,
                });
                if (res.status === "success") {
                    successCount++;
                } else if (
                    res.message?.toLowerCase().includes("already") ||
                    res.message?.toLowerCase().includes("conflict")
                ) {
                    alreadyAttachedCount++;
                } else {
                    failedIds.push(product.id);
                }
            })
        );

        await queryClient.invalidateQueries({ queryKey: catalogKeys.products(organizationId) });
        setIsBulkUpdating(false);
        setBulkActionConfirm(null);

        if (successCount > 0) {
            toast.success(
                `"${addOnName}" attached to ${successCount} product${successCount === 1 ? "" : "s"}${
                    alreadyAttachedCount > 0 ? ` (${alreadyAttachedCount} already attached)` : ""
                }`
            );
            setSelectedProductIds(new Set());
        } else if (alreadyAttachedCount > 0) {
            toast.info(`Selected product${singleProducts.length === 1 ? "" : "s"} already had "${addOnName}" attached.`);
            setSelectedProductIds(new Set());
        } else {
            toast.error(`Could not attach "${addOnName}" to selected products.`);
        }
    };

    const productOrderItems = useMemo(
        () => reorderCategoryProducts.map((product) => ({
            id: product.id,
            name: product.name,
            description: categoryMap.get(product.categoryId)?.name,
            leading: <Package2 className="size-4 shrink-0 text-primary" />,
        })),
        [categoryMap, reorderCategoryProducts],
    );

    const saveProductOrder = async (productIds: string[]) => {
        if (!reorderCategoryId) {
            return {
                status: "error" as const,
                message: "Select a category before reordering",
            };
        }

        const response = await reorderProducts(organizationId, {
            categoryId: reorderCategoryId,
            productIds,
        });
        if (response.status === "success") {
            await queryClient.invalidateQueries({ queryKey: catalogKeys.products(organizationId) });
        }
        return response;
    };

    const productReorderDisabledReason = selectedCategoryFilter === "all"
        ? "Select a category to reorder."
        : reorderCategoryProducts.length < 2
            ? "This category needs at least two products to reorder."
            : null;

    if (categoriesQuery.isPending || productsQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (
        categoriesQuery.isError
        || productsQuery.isError
        || categoriesQuery.data?.status === "error"
        || productsQuery.data?.status === "error"
    ) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load catalog</EmptyTitle>
                            <EmptyDescription>
                                {(categoriesQuery.error as { message?: string })?.message
                                    ?? (productsQuery.error as { message?: string })?.message
                                    ?? categoriesQuery.data?.message
                                    ?? productsQuery.data?.message
                                    ?? "The category and product workspace could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => {
                                    categoriesQuery.refetch();
                                    productsQuery.refetch();
                                }}
                            >
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    const renderCardActions = (product: (typeof filteredProducts)[number]) => (
        <>
            {product.productType === "single" ? (
                <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                        <ManageProductAddOnsDialog
                            organizationId={organizationId}
                            product={product}
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Manage add-ons for ${product.name}`}
                                    className={cn(
                                        "relative h-8 w-8 rounded-lg cursor-pointer touch-manipulation focus-visible:ring-2",
                                        product.activeAddOnCount
                                            ? "text-primary hover:bg-primary/15 hover:text-primary focus-visible:ring-primary/40"
                                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-primary/40",
                                    )}
                                >
                                    <Link2 className="size-3.5" />
                                    {product.activeAddOnCount ? (
                                        <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-primary-foreground shadow-xs">
                                            {product.activeAddOnCount}
                                        </span>
                                    ) : null}
                                </Button>
                            }
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        {product.activeAddOnCount
                            ? `Manage add-ons (${product.activeAddOnCount} active)`
                            : "Manage add-ons"}
                    </TooltipContent>
                </Tooltip>
            ) : null}

            {canOfferProductLabelPrint({
                barcodeScanningEnabled: false,
                productCode: product.productCode,
            }) ? (
                <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                        <InternalProductLabelDialog
                            organizationId={organizationId}
                            product={product}
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Preview and print labels for ${product.name}`}
                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    <Barcode className="size-3.5" />
                                </Button>
                            }
                        />
                    </TooltipTrigger>
                    <TooltipContent>Print labels</TooltipContent>
                </Tooltip>
            ) : null}

            {product.productType === "combo" ? (
                <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                        <UpsertComboProductDialog
                            organizationId={organizationId}
                            categories={categories}
                            products={products}
                            product={product}
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Edit ${product.name}`}
                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    <Pencil className="size-3.5" />
                                </Button>
                            }
                        />
                    </TooltipTrigger>
                    <TooltipContent>Edit combo</TooltipContent>
                </Tooltip>
            ) : product.productType === "single" ? (
                <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                        <UpsertProductDialog
                            organizationId={organizationId}
                            categories={categories}
                            product={product}
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Edit ${product.name}`}
                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    <Pencil className="size-3.5" />
                                </Button>
                            }
                        />
                    </TooltipTrigger>
                    <TooltipContent>Edit product</TooltipContent>
                </Tooltip>
            ) : null}

            <ToggleProductStatusButton
                organizationId={organizationId}
                product={product}
            />
        </>
    );

    return (
        <div className="space-y-3">

            {/* Search, Filters, View Switcher & Actions bar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleMobileFiltersOpenChange(true)}
                        aria-label="Filter products"
                        className={cn(
                            "relative h-10 w-10 shrink-0 rounded-full border-border/60 bg-card/60 p-0 shadow-2xs sm:hidden",
                            activeFilterCount > 0
                                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                : "text-muted-foreground",
                        )}
                    >
                        <Filter className="size-4" />
                        {activeFilterCount > 0 ? (
                            <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold leading-none text-primary-foreground ring-2 ring-card">
                                {activeFilterCount}
                            </span>
                        ) : null}
                    </Button>

                    <div className="relative min-w-0 flex-1 sm:max-w-sm sm:flex-none group/search">
                        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                        <Input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/70 transition-all duration-200 text-sm w-full shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                aria-label="Clear search"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>

                    <Button
                        type="button"
                        onClick={() => setMobileActionsOpen(true)}
                        aria-label="Product actions"
                        className="h-10 w-10 shrink-0 rounded-full bg-primary p-0 text-primary-foreground shadow-xs shadow-primary/20 hover:bg-primary/90 sm:hidden"
                    >
                        <Plus className="size-4" />
                    </Button>

                    {/* Status Filter Popover (PremiumTable pattern) */}
                    <Popover>
                        <PopoverTrigger
                            render={
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "hidden sm:flex h-9 rounded-full bg-card border-border/50 hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 shadow-2xs items-center gap-1.5 px-3.5 text-xs font-semibold shrink-0 cursor-pointer transition-all duration-200",
                                        statusFilters.length > 0
                                            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    <Filter className={cn(
                                        "size-3.5 transition-colors",
                                        statusFilters.length > 0
                                            ? "text-primary stroke-[2.5]"
                                            : "text-muted-foreground/70"
                                    )} />
                                    <span>Status</span>
                                    {statusFilters.length > 0 && (
                                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground animate-in zoom-in duration-200">
                                            {statusFilters.length}
                                        </span>
                                    )}
                                </Button>
                            }
                        />
                        <PopoverContent align="start" className="w-[180px] p-2 bg-card border-border/50 rounded-xl shadow-md z-50">
                            <ProductFilterOptions
                                title="Filter Status"
                                options={STATUS_FILTER_OPTIONS}
                                selectedValues={statusFilters}
                                onChange={toggleStatusFilter}
                                onClear={() => setStatusFilters([])}
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Add-ons Filter Popover (PremiumTable pattern) */}
                    <Popover>
                        <PopoverTrigger
                            render={
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "hidden sm:flex h-9 rounded-full bg-card border-border/50 hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 shadow-2xs items-center gap-1.5 px-3.5 text-xs font-semibold shrink-0 cursor-pointer transition-all duration-200",
                                        addOnsFilters.length > 0
                                            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    <Filter className={cn(
                                        "size-3.5 transition-colors",
                                        addOnsFilters.length > 0
                                            ? "text-primary stroke-[2.5]"
                                            : "text-muted-foreground/70"
                                    )} />
                                    <span>Add-ons</span>
                                    {addOnsFilters.length > 0 && (
                                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground animate-in zoom-in duration-200">
                                            {addOnsFilters.length}
                                        </span>
                                    )}
                                </Button>
                            }
                        />
                        <PopoverContent align="start" className="w-[180px] p-2 bg-card border-border/50 rounded-xl shadow-md z-50">
                            <ProductFilterOptions
                                title="Filter Add-ons"
                                options={ADDONS_FILTER_OPTIONS}
                                selectedValues={addOnsFilters}
                                onChange={toggleAddOnsFilter}
                                onClear={() => setAddOnsFilters([])}
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Clear All Filters Button (PremiumTable pattern) */}
                    {(statusFilters.length > 0 || addOnsFilters.length > 0) && (
                        <Button
                            variant="ghost"
                            onClick={clearAllFilters}
                            className="hidden sm:flex h-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-semibold gap-1.5 px-3 shrink-0 cursor-pointer animate-in fade-in slide-in-from-left-2 duration-200"
                        >
                            <X className="size-3.5" />
                            <span>Clear Filters</span>
                        </Button>
                    )}

                </div>

                <div className="hidden sm:flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 sm:px-5 text-xs sm:text-sm font-medium shadow-xs shadow-primary/20 transition-all cursor-pointer"
                        disabled={categories.length === 0}
                        onClick={() => setAddProductDialogOpen(true)}
                    >
                        <PlusCircle className="size-4" />
                        Add product
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-border/60 bg-card/50 hover:bg-card hover:border-border/80 h-10 px-4 sm:px-5 text-xs sm:text-sm font-medium text-foreground/90 transition-all cursor-pointer"
                        disabled={categories.length === 0}
                        onClick={() => setAddComboDialogOpen(true)}
                    >
                        <Boxes className="size-4" />
                        Add Combo
                    </Button>

                    <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex" />}>
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn(
                                    "rounded-full border-border/60 h-10 w-10 transition-all cursor-pointer",
                                    isSelectMode
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground"
                                        : "bg-card/50 text-foreground/90 hover:bg-card hover:border-border/80",
                                )}
                                onClick={toggleSelectMode}
                                aria-label={isSelectMode ? "Exit select mode" : "Select mode"}
                            >
                                <SquareMousePointer className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {isSelectMode ? "Exit select mode" : "Select products"}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* Category filter pills - Horizontally scrollable on mobile */}
            {categories.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto py-0 scrollbar-none -mx-1 px-1 sm:flex-wrap sm:overflow-visible">
                    <Button
                        ref={(el) => { categoryPillRefs.current["all"] = el; }}
                        variant={selectedCategoryFilter === "all" ? "default" : "outline"}
                        className={`rounded-full px-4 h-8.5 font-medium text-xs transition-all cursor-pointer shrink-0 ${
                            selectedCategoryFilter === "all"
                                ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20 border-primary"
                                : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card hover:border-border/80"
                        }`}
                        onClick={() => setSelectedCategoryFilter("all")}
                    >
                        All
                    </Button>
                    {categories.map((category) => {
                        const isSelected = selectedCategoryFilter === category.id;
                        return (
                            <Button
                                key={category.id}
                                ref={(el) => { categoryPillRefs.current[category.id] = el; }}
                                variant={isSelected ? "default" : "outline"}
                                className={`rounded-full px-4 h-8.5 font-medium text-xs transition-all cursor-pointer shrink-0 ${
                                    isSelected
                                        ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20 border-primary"
                                        : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card hover:border-border/80"
                                }`}
                                onClick={() => setSelectedCategoryFilter(category.id)}
                            >
                                {category.name}
                            </Button>
                        );
                    })}
                </div>
            )}

            {/* Checklist bulk action bar */}
            {isSelectMode && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                        <CheckCircle2 className="size-4 text-primary" />
                        <span>
                            {selectedProductIds.size > 0 ? (
                                <>
                                    <strong className="font-semibold">{selectedProductIds.size}</strong> product{selectedProductIds.size === 1 ? "" : "s"} selected
                                </>
                            ) : (
                                "Select products"
                            )}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Change Category Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full h-8 px-3 text-xs bg-card/80 border-border/70 hover:bg-card text-foreground cursor-pointer"
                                        disabled={isBulkUpdating || selectedProductIds.size === 0}
                                    >
                                        <FolderSync className="size-3.5" />
                                        Change category
                                        <ChevronDown className="size-3 text-muted-foreground" />
                                    </Button>
                                }
                            />
                            <DropdownMenuContent align="end" className="w-48 max-h-60 overflow-y-auto">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Move to category</DropdownMenuLabel>
                                    {categories.map((cat) => (
                                        <DropdownMenuItem
                                            key={cat.id}
                                            onClick={() =>
                                                setBulkActionConfirm({
                                                    type: "category",
                                                    count: selectedProductIds.size,
                                                    categoryId: cat.id,
                                                    categoryName: cat.name,
                                                })
                                            }
                                            className="cursor-pointer text-xs"
                                        >
                                            {cat.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Attach Add-on Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full h-8 px-3 text-xs bg-card/80 border-border/70 hover:bg-card text-foreground cursor-pointer"
                                        disabled={isBulkUpdating || addOns.length === 0 || selectedProductIds.size === 0}
                                    >
                                        <Link2 className="size-3.5" />
                                        Add-ons
                                        <ChevronDown className="size-3 text-muted-foreground" />
                                    </Button>
                                }
                            />
                            <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Attach add-on to selected</DropdownMenuLabel>
                                    {addOns.map((addOn) => (
                                        <DropdownMenuItem
                                            key={addOn.id}
                                            onClick={() => {
                                                const singleCount = products.filter(
                                                    (p) => selectedProductIds.has(p.id) && p.productType === "single"
                                                ).length;
                                                setBulkSelectionCap(1);
                                                setBulkActionConfirm({
                                                    type: "attach_addon",
                                                    count: singleCount,
                                                    addOnId: addOn.id,
                                                    addOnName: addOn.name,
                                                });
                                            }}
                                            className="cursor-pointer text-xs flex items-center justify-between"
                                        >
                                            <span className="truncate">{addOn.name}</span>
                                            {addOn.status === "inactive" ? (
                                                <span className="text-[10px] text-muted-foreground ml-1.5">(inactive)</span>
                                            ) : null}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {productReorderDisabledReason ? (
                            <Tooltip>
                                <TooltipTrigger render={<span className="inline-flex" />}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full h-8 px-3 text-xs bg-card/80 border-border/70 text-muted-foreground/60 cursor-not-allowed"
                                        disabled
                                    >
                                        <ListOrdered className="size-3.5" />
                                        Reorder
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{productReorderDisabledReason}</TooltipContent>
                            </Tooltip>
                        ) : (
                            <ReorderListDialog
                                title="Reorder products"
                                description="Reorder every product in the selected category."
                                items={productOrderItems}
                                onSave={saveProductOrder}
                                trigger={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full h-8 px-3 text-xs bg-card/80 border-border/70 hover:bg-card text-foreground cursor-pointer"
                                        disabled={isBulkUpdating}
                                    >
                                        <ListOrdered className="size-3.5" />
                                        Reorder
                                    </Button>
                                }
                            />
                        )}

                        {/* Activate (shown only when inactive products are selected) */}
                        {selectedInactiveCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full h-8 px-3 text-xs bg-card/80 border-border/70 hover:bg-card text-foreground cursor-pointer"
                                onClick={() =>
                                    setBulkActionConfirm({
                                        type: "activate",
                                        count: selectedInactiveCount,
                                    })
                                }
                                disabled={isBulkUpdating}
                            >
                                {isBulkUpdating ? <Spinner className="size-3" /> : <Eye className="size-3.5 text-emerald-500" />}
                                {markCatalogProductStatusLabel("active")}
                            </Button>
                        )}

                        {/* Mark inactive (shown only when active products are selected) */}
                        {selectedActiveCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full h-8 px-3 text-xs bg-card/80 border-border/70 hover:bg-card text-foreground cursor-pointer"
                                onClick={() =>
                                    setBulkActionConfirm({
                                        type: "deactivate",
                                        count: selectedActiveCount,
                                    })
                                }
                                disabled={isBulkUpdating}
                            >
                                {isBulkUpdating ? <Spinner className="size-3" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
                                {markCatalogProductStatusLabel("inactive")}
                            </Button>
                        )}

                        {/* Clear */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={handleClearChecklist}
                            disabled={isBulkUpdating}
                        >
                            <X className="size-3.5 mr-1" />
                            {selectedProductIds.size > 0 ? "Clear" : "Exit"}
                        </Button>
                    </div>
                </div>
            )}

            {filteredProducts.length > 0 && (
                <div className="flex items-center justify-between px-1 pt-0 pb-0.5">
                    {/* {isSelectMode ? (
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none animate-in fade-in duration-150">
                            <Checkbox
                                checked={isAllSelected}
                                indeterminate={isSomeSelected}
                                onCheckedChange={toggleSelectAll}
                                aria-label="Select all products"
                            />
                            <span>Select all ({filteredProducts.length})</span>
                        </label>
                    ) : (
                        <div />
                    )} */}
                    <span className="text-xs text-muted-foreground/70">
                        Showing {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}
                    </span>
                </div>
            )}

            {categories.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Layers3 />
                                </EmptyMedia>
                                <EmptyTitle>Create a category first</EmptyTitle>
                                <EmptyDescription>
                                    Products need a category. Head to the Categories tab to create one first.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button
                                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5"
                                >
                                    <Layers3 className="size-4" />
                                    Go to categories
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : filteredProducts.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Package2 />
                                </EmptyMedia>
                                <EmptyTitle>No products found</EmptyTitle>
                                <EmptyDescription>
                                    {searchQuery || selectedCategoryFilter !== "all" || statusFilters.length > 0 || addOnsFilters.length > 0
                                        ? "Try adjusting your search query, category, status, or add-on filters."
                                        : "Add your first product to start building the catalog."}
                                </EmptyDescription>
                            </EmptyHeader>
                            {searchQuery || selectedCategoryFilter !== "all" || statusFilters.length > 0 || addOnsFilters.length > 0 ? (
                                <EmptyContent>
                                    <Button
                                        variant="outline"
                                        className="rounded-full"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setSelectedCategoryFilter("all");
                                            setStatusFilters([]);
                                            setAddOnsFilters([]);
                                        }}
                                    >
                                        Clear all filters
                                    </Button>
                                </EmptyContent>
                            ) : (
                                <EmptyContent>
                                    <UpsertProductDialog
                                        organizationId={organizationId}
                                        categories={categories}
                                        defaultCategoryId={defaultCategoryIdForNewProduct}
                                    />
                                </EmptyContent>
                            )}
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <div
                    key={selectedCategoryFilter}
                    className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 transition-all duration-300 ease-out animate-in fade-in-40 slide-in-from-bottom-2"
                >
                    {filteredProducts.map((product) => {
                        const isSelected = selectedProductIds.has(product.id);
                        const categoryName = categoryMap.get(product.categoryId)?.name ?? "Unknown";

                        return (
                            <Card
                                key={product.id}
                                role={isSelectMode ? "button" : undefined}
                                tabIndex={isSelectMode ? 0 : undefined}
                                aria-pressed={isSelectMode ? isSelected : undefined}
                                aria-label={isSelectMode ? `${isSelected ? "Deselect" : "Select"} ${product.name}` : undefined}
                                onClick={isSelectMode ? () => toggleSelectProduct(product.id) : undefined}
                                onKeyDown={
                                    isSelectMode
                                        ? (event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                toggleSelectProduct(product.id);
                                            }
                                        }
                                        : undefined
                                }
                                className={cn(
                                    "group relative flex flex-col justify-between rounded-2xl border p-3 sm:p-3.5 shadow-2xs transition-all duration-200 min-w-0 hover:shadow-md",
                                    product.status === "inactive" && "opacity-[0.82] hover:opacity-100",
                                    isSelectMode && "cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                    isSelected
                                        ? "border-primary/60 bg-primary/[0.08] ring-1 ring-primary/30 shadow-primary/5"
                                        : product.status === "inactive"
                                            ? "border-border/50 bg-muted/20"
                                            : "border-border/60 bg-card/70 hover:border-primary/30 hover:bg-card/95",
                                )}
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    {isSelectMode ? (
                                        <div
                                            className={cn(
                                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors mt-0.5",
                                                isSelected
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : "border-border/70 bg-background/80 text-transparent",
                                            )}
                                            aria-hidden="true"
                                        >
                                            <Check className="size-3 stroke-[3]" />
                                        </div>
                                    ) : null}

                                    {/* Thumbnail */}
                                    <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-muted/25 ring-1 ring-black/5 dark:ring-white/5 transition-transform duration-200 group-hover:scale-[1.02]">
                                        {product.imageSignedUrl ? (
                                            <img
                                                src={product.imageSignedUrl}
                                                alt={product.name}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <Package2 className="size-6 sm:size-7 text-muted-foreground/50" />
                                        )}
                                    </div>

                                    {/* Full Product Name & Category with ample width */}
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <Tooltip>
                                            <TooltipTrigger render={<div className="min-w-0" />}>
                                                <h4 className="font-display text-sm sm:text-[15px] font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary line-clamp-2 break-words">
                                                    {product.name}
                                                </h4>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs text-xs">{product.name}</TooltipContent>
                                        </Tooltip>

                                        <div className="flex min-w-0 flex-wrap items-center gap-1.5 pt-0.5">
                                            <span className="text-[11px] sm:text-xs font-medium capitalize text-muted-foreground">
                                                {categoryName}
                                            </span>
                                            <ProductTypeBadge productType={product.productType} />
                                            {product.status === "inactive" ? (
                                                <ProductStatusBadge status={product.status} />
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={cn(
                                        "flex items-end gap-2 pt-2.5 mt-2.5 border-t border-border/40 min-w-0",
                                        isSelectMode ? "justify-start" : "justify-between",
                                    )}
                                >
                                    <div className="flex flex-col items-start gap-0.5 min-w-0">
                                        <ProductPriceDisplay
                                            price={product.price}
                                            discount={product.discount}
                                            size="sm"
                                            align="left"
                                            singleTone="foreground"
                                            compact
                                        />
                                        <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground/80">
                                            {catalogSellingQuantityLabel(product)}
                                        </span>
                                    </div>

                                    {!isSelectMode ? (
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            {renderCardActions(product)}
                                        </div>
                                    ) : null}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Bulk Action Confirmation Alert Dialog */}
            <AlertDialog
                open={bulkActionConfirm !== null}
                onOpenChange={(open) => {
                    if (!open && !isBulkUpdating) {
                        setBulkActionConfirm(null);
                    }
                }}
            >
                <AlertDialogContent>
                    {bulkActionConfirm?.type === "activate" && (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogMedia className="bg-emerald-500/15 text-emerald-500">
                                    <Eye />
                                </AlertDialogMedia>
                                <AlertDialogTitle>
                                    {markCatalogProductStatusLabel("active")} {bulkActionConfirm.count} product{bulkActionConfirm.count === 1 ? "" : "s"}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    Selected product{bulkActionConfirm.count === 1 ? "" : "s"} will be marked active at the organization level. Stores inheriting organization defaults will offer {bulkActionConfirm.count === 1 ? "it" : "them"} to customers.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isBulkUpdating} className="rounded-xl">
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    className="rounded-xl shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                                    isLoading={isBulkUpdating}
                                    loadingText={markCatalogProductStatusProgress("active")}
                                    onClick={async () => {
                                        await handleBulkActivate();
                                        setBulkActionConfirm(null);
                                    }}
                                >
                                    {markCatalogProductStatusLabel("active")} {bulkActionConfirm.count} product{bulkActionConfirm.count === 1 ? "" : "s"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    )}

                    {bulkActionConfirm?.type === "deactivate" && (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogMedia className="bg-muted/80 text-muted-foreground">
                                    <EyeOff />
                                </AlertDialogMedia>
                                <AlertDialogTitle>
                                    {markCatalogProductStatusLabel("inactive")} {bulkActionConfirm.count} product{bulkActionConfirm.count === 1 ? "" : "s"}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    Selected product{bulkActionConfirm.count === 1 ? "" : "s"} will be marked inactive at the organization level. Stores inheriting organization defaults will no longer offer {bulkActionConfirm.count === 1 ? "it" : "them"} to customers.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isBulkUpdating} className="rounded-xl">
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    className="rounded-xl shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                                    isLoading={isBulkUpdating}
                                    loadingText={markCatalogProductStatusProgress("inactive")}
                                    onClick={async () => {
                                        await handleBulkDeactivate();
                                        setBulkActionConfirm(null);
                                    }}
                                >
                                    {markCatalogProductStatusLabel("inactive")} {bulkActionConfirm.count} product{bulkActionConfirm.count === 1 ? "" : "s"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    )}

                    {bulkActionConfirm?.type === "category" && (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogMedia className="bg-primary/10 text-primary">
                                    <FolderSync />
                                </AlertDialogMedia>
                                <AlertDialogTitle>
                                    Move {bulkActionConfirm.count} product{bulkActionConfirm.count === 1 ? "" : "s"} to "{bulkActionConfirm.categoryName}"?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to change the category of {bulkActionConfirm.count} selected product{bulkActionConfirm.count === 1 ? "" : "s"} to "{bulkActionConfirm.categoryName}"?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isBulkUpdating} className="rounded-xl">
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    className="rounded-xl shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                                    isLoading={isBulkUpdating}
                                    loadingText="Moving..."
                                    onClick={async () => {
                                        await handleBulkChangeCategory(
                                            bulkActionConfirm.categoryId,
                                            bulkActionConfirm.categoryName,
                                        );
                                        setBulkActionConfirm(null);
                                    }}
                                >
                                    Move products
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    )}

                    {bulkActionConfirm?.type === "attach_addon" && (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogMedia className="bg-primary/10 text-primary">
                                    <Link2 />
                                </AlertDialogMedia>
                                <AlertDialogTitle>
                                    Attach "{bulkActionConfirm.addOnName}" to {bulkActionConfirm.count} product{bulkActionConfirm.count === 1 ? "" : "s"}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to link "{bulkActionConfirm.addOnName}" as an available add-on to {bulkActionConfirm.count} selected product{bulkActionConfirm.count === 1 ? "" : "s"}?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="px-6 py-2 space-y-1.5">
                                <label className="text-xs font-medium text-foreground block">
                                    Max selection cap per item
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={bulkSelectionCap}
                                    onChange={(e) => setBulkSelectionCap(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="h-9 w-24 text-sm rounded-lg"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Maximum quantity of this add-on a customer can select per product.
                                </p>
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isBulkUpdating} className="rounded-xl">
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    className="rounded-xl shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                                    isLoading={isBulkUpdating}
                                    loadingText="Attaching..."
                                    onClick={async () => {
                                        await handleBulkAttachAddOn(
                                            bulkActionConfirm.addOnId,
                                            bulkActionConfirm.addOnName,
                                            bulkSelectionCap,
                                        );
                                    }}
                                >
                                    Attach add-on
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    )}
                </AlertDialogContent>
            </AlertDialog>

            <UpsertProductDialog
                organizationId={organizationId}
                categories={categories}
                defaultCategoryId={defaultCategoryIdForNewProduct}
                open={addProductDialogOpen}
                onOpenChange={setAddProductDialogOpen}
                trigger={null}
            />

            <UpsertComboProductDialog
                organizationId={organizationId}
                categories={categories}
                products={products}
                defaultCategoryId={defaultCategoryIdForNewProduct}
                open={addComboDialogOpen}
                onOpenChange={setAddComboDialogOpen}
                trigger={null}
            />

            <Sheet open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
                <SheetContent
                    side="bottom"
                    showCloseButton={false}
                    className="gap-0 overflow-visible border-0 bg-transparent px-4 pt-2 shadow-none data-[side=bottom]:bottom-[var(--pos-mobile-nav-height,0px)] data-[side=bottom]:border-0 data-[side=bottom]:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:hidden"
                >
                    <div className="space-y-2 pb-2">
                        <button
                            type="button"
                            disabled={categories.length === 0}
                            onClick={handleMobileAddProduct}
                            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-card/95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <PlusCircle className="size-5" />
                            </span>
                            Add product
                        </button>
                        <button
                            type="button"
                            disabled={categories.length === 0}
                            onClick={handleMobileAddCombo}
                            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-card/95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="flex size-10 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground">
                                <Boxes className="size-5" />
                            </span>
                            Add combo
                        </button>
                        <button
                            type="button"
                            onClick={handleMobileSelectProducts}
                            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-card/95"
                        >
                            <span className="flex size-10 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground">
                                <SquareMousePointer className="size-5" />
                            </span>
                            Select products
                        </button>
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={mobileFiltersOpen} onOpenChange={handleMobileFiltersOpenChange}>
                <SheetContent
                    side="bottom"
                    className="max-h-[85dvh] gap-0 overflow-hidden rounded-t-2xl px-0 pb-0 pt-4 sm:hidden"
                >
                    <SheetHeader className="shrink-0 space-y-0 px-6 pb-4 pt-0 pr-14 text-left">
                        <div className="flex items-center justify-between gap-3">
                            <SheetTitle className="text-lg">Filter products</SheetTitle>
                            {draftFilterCount > 0 ? (
                                <button
                                    type="button"
                                    onClick={clearDraftFilters}
                                    className="shrink-0 text-sm font-semibold text-primary hover:underline"
                                >
                                    Clear all
                                </button>
                            ) : (
                                <span className="invisible shrink-0 text-sm font-semibold">Clear all</span>
                            )}
                        </div>
                    </SheetHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border/50 px-6 py-4">
                        <div className="space-y-6">
                            <ProductFilterOptions
                                variant="sheet"
                                title="Filter Status"
                                options={STATUS_FILTER_OPTIONS}
                                selectedValues={draftStatusFilters}
                                onChange={toggleDraftStatusFilter}
                                onClear={() => setDraftStatusFilters([])}
                            />
                            <ProductFilterOptions
                                variant="sheet"
                                title="Filter Add-ons"
                                options={ADDONS_FILTER_OPTIONS}
                                selectedValues={draftAddOnsFilters}
                                onChange={toggleDraftAddOnsFilter}
                                onClear={() => setDraftAddOnsFilters([])}
                            />
                        </div>
                    </div>

                    <SheetFooter className="shrink-0 border-t border-border/50 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                        <Button
                            type="button"
                            onClick={applyMobileFilters}
                            className="w-full rounded-xl"
                        >
                            Apply filters
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default ProductsListPage;
