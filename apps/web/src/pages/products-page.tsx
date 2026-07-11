import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationDetails } from "@repo/services";
import { Spinner } from "@repo/ui/components/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Package2 } from "lucide-react";

import CatalogSection from "@/components/catalog/catalog-section";
import { organizationKeys } from "@/lib/query-keys";

const ProductsPage = () => {
    const { organizationId = "" } = useParams();

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;

    if (organizationQuery.isPending) {
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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Package2 className="size-4" />
                </div>
                <div>
                    <h3 className="font-display text-xl font-semibold text-foreground">
                        Products
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Manage your categories and product menu.
                    </p>
                </div>
            </div>
            <CatalogSection organizationId={organization.id} />
        </div>
    );
};

export default ProductsPage;
