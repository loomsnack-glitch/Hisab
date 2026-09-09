import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationDetails } from "@repo/services";
import { Building2, Check, ChevronsUpDown, Plus, Store } from "lucide-react";
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
import CreateStoreDialog from "@/components/organizations/create-store-dialog";

type WorkspaceStoreRef = {
    id: string;
    name: string;
};

type AdminWorkspaceSwitcherPanelProps = {
    organizationId: string;
    organizationName: string;
    stores: WorkspaceStoreRef[];
    selectedStoreId?: string | null;
    onAddStore?: () => void;
};

export const AdminWorkspaceSwitcherPanel = ({
    organizationId,
    organizationName,
    stores,
    selectedStoreId = null,
    onAddStore,
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
                <button
                    type="button"
                    onClick={onAddStore}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors text-left text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                >
                    <Plus className="size-4" />
                    <span className="min-w-0 flex-1 truncate">Add store</span>
                </button>
            </div>
        </div>
    );
};

type AdminWorkspaceSwitcherProps = Omit<AdminWorkspaceSwitcherPanelProps, "onAddStore"> & {
    collapsed?: boolean;
    variant?: "header" | "sidebar";
};

export const AdminWorkspaceSwitcher = ({
    organizationId,
    organizationName,
    stores,
    selectedStoreId = null,
    collapsed = false,
    variant = "header",
}: AdminWorkspaceSwitcherProps) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [createStoreOpen, setCreateStoreOpen] = useState(false);
    const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null;
    const triggerLabel = selectedStore
        ? `${selectedStore.name} store workspace`
        : `${organizationName} organization workspace`;
    const workspaceKindLabel = selectedStore ? "Store workspace" : "Organization workspace";
    const workspaceName = selectedStore ? selectedStore.name : organizationName;
    const WorkspaceIcon = selectedStore ? Store : Building2;

    const openCreateStore = () => {
        setPopoverOpen(false);
        setCreateStoreOpen(true);
    };

    const panel = (
        <AdminWorkspaceSwitcherPanel
            organizationId={organizationId}
            organizationName={organizationName}
            stores={stores}
            selectedStoreId={selectedStoreId}
            onAddStore={openCreateStore}
        />
    );

    const createStoreDialog = (
        <CreateStoreDialog
            organizationId={organizationId}
            open={createStoreOpen}
            onOpenChange={setCreateStoreOpen}
            trigger={null}
        />
    );

    if (variant === "sidebar") {
        const trigger = (
            <button
                type="button"
                aria-label={triggerLabel}
                className={cn(
                    "sidebar-nav-link group flex w-full cursor-pointer appearance-none items-center rounded-xl border-0 bg-transparent text-sm font-medium transition-all duration-200",
                    collapsed
                        ? "relative mx-auto h-10 w-10 justify-center text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        : "h-11 gap-2.5 px-2.5 text-left text-foreground hover:bg-muted/70",
                )}
            >
                <WorkspaceIcon
                    className={cn("size-[18px] shrink-0", selectedStore ? "text-primary" : "text-muted-foreground")}
                    strokeWidth={selectedStore ? 2.25 : 2}
                />
                {collapsed ? null : (
                    <>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                {workspaceKindLabel}
                            </span>
                            <span className="block truncate font-semibold leading-tight">{workspaceName}</span>
                        </span>
                        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                    </>
                )}
            </button>
        );

        return (
            <>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger render={trigger} />
                    <PopoverContent
                        align="start"
                        side={collapsed ? "right" : "top"}
                        sideOffset={8}
                        className="w-72 rounded-xl border border-border/60 bg-popover/95 p-3 shadow-xl backdrop-blur-xl z-50"
                    >
                        {panel}
                    </PopoverContent>
                </Popover>
                {createStoreDialog}
            </>
        );
    }

    return (
        <>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger
                    render={
                        <Button
                            variant="outline"
                            className="h-9 max-w-[16rem] gap-2 rounded-xl border-border/70 bg-background/80 px-3 text-left font-medium"
                            aria-label={triggerLabel}
                        >
                            <WorkspaceIcon className="size-4 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1 truncate">{workspaceName}</span>
                            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                        </Button>
                    }
                />
                <PopoverContent
                    align="start"
                    className="w-72 rounded-xl border border-border/60 bg-popover/95 p-3 shadow-xl backdrop-blur-xl z-50"
                >
                    {panel}
                </PopoverContent>
            </Popover>
            {createStoreDialog}
        </>
    );
};

export default AdminWorkspaceSwitcher;

type AdminWorkspaceSwitcherFromRouteProps = {
    collapsed?: boolean;
    variant?: "header" | "sidebar";
};

export const AdminWorkspaceSwitcherFromRoute = ({
    collapsed = false,
    variant = "header",
}: AdminWorkspaceSwitcherFromRouteProps) => {
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
            collapsed={collapsed}
            variant={variant}
        />
    );
};


