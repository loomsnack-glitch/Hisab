import { useParams, Link, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationDetails } from "@repo/services";
import { Spinner } from "@repo/ui/components/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Layers3, Package2, Puzzle, Sticker } from "lucide-react";

import { organizationKeys } from "@/lib/query-keys";

const tabs = [
    { label: "Products", path: "list", icon: Package2 },
    { label: "Categories", path: "categories", icon: Layers3 },
    { label: "Add-Ons", path: "add-ons", icon: Puzzle },
    { label: "Labels", path: "label-templates", icon: Sticker },
] as const;

const ProductsPage = () => {
    const { organizationId = "" } = useParams();
    const location = useLocation();

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;

    // Determine active tab from current path
    const basePath = `/organizations/${organizationId}/products`;
    const activeTab = tabs.find((tab) => location.pathname.includes(`${basePath}/${tab.path}`))?.path ?? "list";

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
            {/* Tab Navigation */}
            <div className="border-b border-border/60 pb-px">
                <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none" aria-label="Product catalog navigation tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.path;

                        return (
                            <Link
                                key={tab.path}
                                to={`${basePath}/${tab.path}`}
                                className={cn(
                                    "relative inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-150 rounded-lg whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                    isActive
                                        ? "text-primary font-semibold bg-primary/10 shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                                )}
                            >
                                <Icon className={cn("size-3.5 sm:size-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground/70")} />
                                <span>{tab.label}</span>
                                {isActive && (
                                    <span className="absolute -bottom-px left-2 right-2 h-0.5 bg-primary rounded-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <Outlet />
        </div>
    );
};

export default ProductsPage;
