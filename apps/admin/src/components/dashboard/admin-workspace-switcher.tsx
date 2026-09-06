import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationDetails } from "@repo/services";
import { Building2, Check, ChevronsUpDown, Store } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";

import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { organizationKeys } from "@/lib/query-keys";
import { getStoreWorkspacePath, parseStoreWorkspacePath } from "@/lib/store-workspace-routes";

type WorkspaceStoreRef = {
    id: string;
    name: string;
};

type AdminWorkspaceSwitcherPanelProps = {
    organizationId: string;
    organizationName: string;
    stores: WorkspaceStoreRef[];
    selectedStoreId?: string | null;
};

export const AdminWorkspaceSwitcherPanel = ({
    organizationId,
    organizationName,
    stores,
    selectedStoreId = null,
}: AdminWorkspaceSwitcherPanelProps) => {
    const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null;
    const organizationWorkspacePath = getOrganizationWorkspacePath(organizationId);

    return (
        <div className="flex flex-col gap-2 text-sm" data-admin-workspace={selectedStore ? "store" : "organization"}>
            <div className="px-1 py-1">
                {selectedStore ? (
                    <>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Store workspace</p>
                        <p className="mt-1 font-semibold text-foreground">{selectedStore.name}</p>
                        <p className="text-xs text-muted-foreground">{organizationName}</p>
                    </>
                ) : (
                    <>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Organization workspace</p>
                        <p className="mt-1 font-semibold text-foreground">{organizationName}</p>
                    </>
                )}
            </div>

            <div className="h-px bg-border/60 -mx-3" />

            <Link
                to={organizationWorkspacePath}
                aria-current={selectedStore ? undefined : "page"}
                className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors text-left",
                    selectedStore
                        ? "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        : "bg-primary/10 text-primary",
                )}
            >
                <Building2 className="size-4" />
                <span className="min-w-0 flex-1 truncate">Organization workspace</span>
                {selectedStore ? null : <Check className="size-4 shrink-0" />}
            </Link>

            {stores.length > 0 ? (
                <div className="flex flex-col gap-1">
                    <p className="px-2.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Store workspaces
                    </p>
                    {stores.map((store) => {
                        const active = store.id === selectedStoreId;
                        return (
                            <Link
                                key={store.id}
                                to={getStoreWorkspacePath(organizationId, store.id)}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors text-left",
                                    active
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                                )}
                            >
                                <Store className="size-4" />
                                <span className="min-w-0 flex-1 truncate">{store.name}</span>
                                {active ? <Check className="size-4 shrink-0" /> : null}
                            </Link>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
};

type AdminWorkspaceSwitcherProps = AdminWorkspaceSwitcherPanelProps;

export const AdminWorkspaceSwitcher = ({
    organizationId,
    organizationName,
    stores,
    selectedStoreId = null,
}: AdminWorkspaceSwitcherProps) => {
    const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null;
    const triggerLabel = selectedStore
        ? `${selectedStore.name} store workspace`
        : `${organizationName} organization workspace`;

    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Button
                        variant="outline"
                        className="h-9 max-w-[16rem] gap-2 rounded-xl border-border/70 bg-background/80 px-3 text-left font-medium"
                        aria-label={triggerLabel}
                    >
                        {selectedStore ? <Store className="size-4 shrink-0 text-primary" /> : <Building2 className="size-4 shrink-0 text-primary" />}
                        <span className="min-w-0 flex-1 truncate">
                            {selectedStore ? selectedStore.name : organizationName}
                        </span>
                        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                    </Button>
                }
            />
            <PopoverContent
                align="start"
                className="w-72 rounded-xl border border-border/60 bg-popover/95 p-3 shadow-xl backdrop-blur-xl z-50"
            >
                <AdminWorkspaceSwitcherPanel
                    organizationId={organizationId}
                    organizationName={organizationName}
                    stores={stores}
                    selectedStoreId={selectedStoreId}
                />
            </PopoverContent>
        </Popover>
    );
};

export default AdminWorkspaceSwitcher;

export const AdminWorkspaceSwitcherFromRoute = () => {
    const { organizationId = "" } = useParams();
    const location = useLocation();
    const workspace = parseStoreWorkspacePath(location.pathname);

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;

    if (!organizationId || !organization) {
        return null;
    }

    return (
        <AdminWorkspaceSwitcher
            organizationId={organization.id}
            organizationName={organization.name}
            stores={organization.stores}
            selectedStoreId={workspace?.storeId ?? null}
        />
    );
};

