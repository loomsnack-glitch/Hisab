import { Link, useLocation } from "react-router-dom";
import { Layers3, Package2, Puzzle } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

type StoreCatalogTabsProps = {
    organizationId: string;
    storeId: string;
};

const tabs = [
    { label: "Products", path: "products", icon: Package2 },
    { label: "Categories", path: "categories", icon: Layers3 },
    { label: "Add-Ons", path: "add-ons", icon: Puzzle },
] as const;

export const StoreCatalogTabs = ({ organizationId, storeId }: StoreCatalogTabsProps) => {
    const location = useLocation();
    const basePath = `/organizations/${organizationId}/workspaces/${storeId}`;

    return (
        <div className="border-b border-border/60 pb-px">
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none" aria-label="Store catalog navigation tabs">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const tabUrl = `${basePath}/${tab.path}`;
                    const isActive = location.pathname === tabUrl || location.pathname.startsWith(`${tabUrl}/`);

                    return (
                        <Link
                            key={tab.path}
                            to={tabUrl}
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
    );
};

export default StoreCatalogTabs;
