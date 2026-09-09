import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getOrganizationDetails,
    getStore,
    getStoreCategoryPresentations,
    reorderStoreCategoryPresentations,
    updateStoreCategoryPresentation,
} from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Spinner } from "@repo/ui/components/spinner";
import { Switch } from "@repo/ui/components/switch";
import { ListOrdered, RefreshCw, Search, Tags, X } from "lucide-react";
import { toast } from "sonner";

import CategoryStatusBadge from "@/components/catalog/category-status-badge";
import ReorderListDialog from "@/components/catalog/reorder-list-dialog";
import StoreCatalogTabs from "@/components/catalog/store-catalog-tabs";
import { catalogKeys, organizationKeys } from "@/lib/query-keys";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { resolveNamedStoreInOrganization } from "@/lib/store-scope";

const StoreCategoryPresentationsPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });
    const storeQuery = useQuery({
        queryKey: organizationKeys.store(organizationId, storeId),
        queryFn: () => getStore(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });
    const presentationsQuery = useQuery({
        queryKey: catalogKeys.storeCategoryPresentations(organizationId, storeId),
        queryFn: () => getStoreCategoryPresentations(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;
    const storeFromApi = storeQuery.data?.status === "success" ? storeQuery.data.data?.store ?? null : null;
    const namedStore = resolveNamedStoreInOrganization(storeId, organization?.stores ?? []);
    const store = storeFromApi && namedStore && storeFromApi.id === namedStore.id ? storeFromApi : null;
    const presentations =
        presentationsQuery.data?.status === "success"
            ? presentationsQuery.data.data?.presentations ?? []
            : [];

    const reorderItems = useMemo(
        () =>
            presentations.map((presentation) => ({
                id: presentation.categoryId,
                name: presentation.category.name,
                description: presentation.visible ? "Visible in POS browse menu" : "Hidden from POS browse menu",
                leading: <Tags className="size-4 shrink-0 text-primary" />,
            })),
        [presentations],
    );

    const filteredPresentations = useMemo(() => {
        if (!searchQuery.trim()) {
            return presentations;
        }
        const query = searchQuery.toLowerCase().trim();
        return presentations.filter((presentation) =>
            presentation.category.name.toLowerCase().includes(query),
        );
    }, [presentations, searchQuery]);

    const visibilityMutation = useMutation({
        mutationFn: ({
            presentationId,
            visible,
        }: {
            presentationId: string;
            visible: boolean;
        }) => updateStoreCategoryPresentation(organizationId, storeId, presentationId, { visible }),
        onSuccess: (response) => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success(response.message);
            queryClient.invalidateQueries({
                queryKey: catalogKeys.storeCategoryPresentations(organizationId, storeId),
            });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to update this category");
        },
    });

    const saveCategoryOrder = async (categoryIds: string[]) => {
        const response = await reorderStoreCategoryPresentations(organizationId, storeId, { categoryIds });
        if (response.status === "success") {
            await queryClient.invalidateQueries({
                queryKey: catalogKeys.storeCategoryPresentations(organizationId, storeId),
            });
        }
        return response;
    };

    if (organizationQuery.isPending || storeQuery.isPending || presentationsQuery.isPending) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (organizationQuery.isError || organizationQuery.data?.status === "error" || !organization) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <CardTitle className="font-display text-2xl">Organization not found</CardTitle>
                    <CardDescription>
                        {(organizationQuery.error as { message?: string })?.message ??
                            organizationQuery.data?.message ??
                            "This workspace may have been removed or you may not have access to it."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="rounded-full" render={<Link to="/organizations" />}>
                        Return to organizations
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (storeQuery.data?.status === "error" || !store) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <CardTitle className="font-display text-2xl">Store not found</CardTitle>
                    <CardDescription>
                        {storeQuery.data?.status === "error"
                            ? storeQuery.data.message
                            : "This store may have been removed or you may not have access to it."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        className="rounded-full"
                        render={<Link to={getOrganizationWorkspacePath(organizationId)} />}
                    >
                        Organization workspace
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (presentationsQuery.isError || presentationsQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-md">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load categories</EmptyTitle>
                            <EmptyDescription>
                                {(presentationsQuery.error as { message?: string })?.message ??
                                    presentationsQuery.data?.message ??
                                    "Store categories could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button variant="outline" className="rounded-full" onClick={() => presentationsQuery.refetch()}>
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3" data-admin-workspace="store" data-testid="store-categories-page">
            {/* Store Catalog Navigation Tabs */}
            <StoreCatalogTabs organizationId={organizationId} storeId={storeId} />

            {presentations.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Tags />
                                </EmptyMedia>
                                <EmptyTitle>No Categories yet</EmptyTitle>
                                <EmptyDescription>
                                    Create Categories in the Organization workspace. They will appear here for {store.name} automatically.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button
                                    variant="outline"
                                    className="rounded-full"
                                    render={<Link to={`/organizations/${organizationId}/products/categories`} />}
                                >
                                    Organization categories
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1 max-w-md w-full group/search">
                            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                            <Input
                                type="text"
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all duration-200 text-sm w-full shadow-2xs"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                                    aria-label="Clear search"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                        {presentations.length > 1 ? (
                            <ReorderListDialog
                                title="Rearrange categories"
                                items={reorderItems}
                                onSave={saveCategoryOrder}
                                trigger={
                                    <Button
                                        variant="outline"
                                        className="h-10 w-full rounded-full px-4 text-xs font-medium sm:w-auto"
                                    >
                                        <ListOrdered className="size-3.5" />
                                        Rearrange
                                    </Button>
                                }
                            />
                        ) : null}
                    </div>

                    {filteredPresentations.length === 0 ? (
                        <Card className="border-border/60 bg-card/80 shadow-md">
                            <CardContent className="pt-6">
                                <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <Tags />
                                        </EmptyMedia>
                                        <EmptyTitle>No categories found</EmptyTitle>
                                        <EmptyDescription>Try adjusting your search query.</EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            </CardContent>
                        </Card>
                    ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredPresentations.map((presentation) => (
                        <Card
                            key={presentation.id}
                            className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                        >
                            <div className="flex items-start justify-between gap-2.5">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Tags className="size-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <h2 className="font-display text-sm font-semibold text-foreground">
                                                {presentation.category.name}
                                            </h2>
                                            <CategoryStatusBadge status={presentation.category.status} />
                                            {!presentation.visible ? (
                                                <Badge variant="outline" className="rounded-full text-[11px] px-2 py-0">
                                                    Hidden in POS menu
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
                                <Label
                                    htmlFor={`category-visible-${presentation.id}`}
                                    className="text-xs font-medium text-muted-foreground"
                                >
                                    Visible in POS menu
                                </Label>
                                <Switch
                                    id={`category-visible-${presentation.id}`}
                                    checked={presentation.visible}
                                    disabled={visibilityMutation.isPending}
                                    onCheckedChange={(checked) =>
                                        visibilityMutation.mutate({
                                            presentationId: presentation.id,
                                            visible: checked,
                                        })
                                    }
                                />
                            </div>
                        </Card>
                    ))}
                </div>
                    )}
                </>
            )}
        </div>
    );
};

export default StoreCategoryPresentationsPage;
