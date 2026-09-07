import { useMemo } from "react";
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
import { Label } from "@repo/ui/components/label";
import { Spinner } from "@repo/ui/components/spinner";
import { Switch } from "@repo/ui/components/switch";
import { ListOrdered, RefreshCw, Tags } from "lucide-react";
import { toast } from "sonner";

import CategoryStatusBadge from "@/components/catalog/category-status-badge";
import ReorderListDialog from "@/components/catalog/reorder-list-dialog";
import { catalogKeys, organizationKeys } from "@/lib/query-keys";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { resolveNamedStoreInOrganization } from "@/lib/store-scope";

const StoreCategoryPresentationsPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const queryClient = useQueryClient();

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
        <div className="space-y-6" data-admin-workspace="store" data-testid="store-categories-page">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-primary">Store workspace</p>
                    <h1 className="font-display text-3xl font-semibold tracking-tight">Categories</h1>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        Choose which shared Categories appear in {store.name}&apos;s POS browse menu and set their local order. Hiding a Category does not change Product sellability, scanning, or Organization classification.
                    </p>
                </div>
                {presentations.length > 1 ? (
                    <ReorderListDialog
                        title="Reorder store categories"
                        description="Set the browse order for this Store's POS category menu."
                        items={reorderItems}
                        onSave={saveCategoryOrder}
                        trigger={
                            <Button variant="outline" className="rounded-full">
                                <ListOrdered className="size-4" />
                                Reorder
                            </Button>
                        }
                    />
                ) : null}
            </div>

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
                <div className="grid gap-4">
                    {presentations.map((presentation) => (
                        <Card key={presentation.id} className="border-border/60 bg-card/80 shadow-md">
                            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                        <Tags className="size-5" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="font-display text-lg font-semibold">{presentation.category.name}</h2>
                                            <CategoryStatusBadge status={presentation.category.status} />
                                            {!presentation.visible ? (
                                                <Badge variant="outline" className="rounded-full text-xs">
                                                    Hidden in POS menu
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Organization order {presentation.category.sortOrder + 1} · Store order {presentation.sortOrder + 1}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
                                    <Label htmlFor={`category-visible-${presentation.id}`} className="text-sm">
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
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StoreCategoryPresentationsPage;
