import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";

import WorkspaceBrand from "@/components/workspace/workspace-brand";
import { getVisiblePosWorkspaceDestinations } from "@/components/pos/pos-nav-items";
import { getPosPanelTabFromPath } from "@/pages/pos-route-context";

const SIDEBAR_STORAGE_KEY = "ganatri_pos_sidebar_collapsed";

type PosSidebarProps = {
    isCollapsed: boolean;
    onToggle: () => void;
    billsCount?: number;
    tableManagementEnabled: boolean;
};

export const readPosSidebarCollapsed = () => {
    if (typeof window === "undefined") {
        return false;
    }

    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
};

export const persistPosSidebarCollapsed = (collapsed: boolean) => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
};

const PosSidebar = ({ isCollapsed, onToggle, billsCount = 0, tableManagementEnabled }: PosSidebarProps) => {
    const location = useLocation();
    const activePanelTab = getPosPanelTabFromPath(location.pathname);
    const isAppearanceRoute = location.pathname === "/appearance" || location.pathname === "/settings";
    const destinations = getVisiblePosWorkspaceDestinations({ tableManagementEnabled });

    const mainDestinations = destinations.filter((destination) => destination.id !== "appearance");
    const appearanceDestination = destinations.find((destination) => destination.id === "appearance");

    const expandedNavRowClass = "grid h-10 w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 px-3";
    const expandedNavRowClassNoTrail = "grid h-10 w-full grid-cols-[18px_minmax(0,1fr)] items-center gap-3 px-3";
    const collapsedNavRowClass = "relative mx-auto flex h-10 w-10 items-center justify-center";

    const renderNavItem = (destination: (typeof mainDestinations)[number]) => {
        const Icon = destination.icon;
        const collapsed = isCollapsed;
        const isActive = !isAppearanceRoute && destination.tab === activePanelTab;
        const badge = destination.id === "bills" && billsCount > 0 ? billsCount : undefined;

        const link = (
            <Link
                to={destination.path}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                    "sidebar-nav-link group rounded-xl text-sm font-medium transition-all duration-200",
                    collapsed
                        ? collapsedNavRowClass
                        : badge !== undefined
                          ? expandedNavRowClass
                          : expandedNavRowClassNoTrail,
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    collapsed && "sidebar-nav-link--collapsed",
                )}
            >
                {collapsed && isActive ? <span className="sidebar-active-rail" aria-hidden /> : null}
                <Icon
                    className={cn(
                        "size-[18px] transition-colors duration-200",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                    strokeWidth={isActive ? 2.25 : 2}
                />
                {!collapsed ? (
                    <>
                        <span className="sidebar-label truncate text-left">{destination.label}</span>
                        {badge !== undefined ? (
                            <span className="flex h-5 min-w-5 items-center justify-center justify-self-end rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">
                                {badge > 9 ? "9+" : badge}
                            </span>
                        ) : null}
                    </>
                ) : null}
                {collapsed && badge !== undefined ? (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-white">
                        {badge > 9 ? "9+" : badge}
                    </span>
                ) : null}
            </Link>
        );

        if (!collapsed) {
            return link;
        }

        return (
            <Tooltip>
                <TooltipTrigger render={link} />
                <TooltipContent side="right" className="border border-border bg-popover text-popover-foreground">
                    {destination.label}
                </TooltipContent>
            </Tooltip>
        );
    };

    const renderAppearanceItem = () => {
        if (!appearanceDestination) {
            return null;
        }

        const Icon = appearanceDestination.icon;
        const collapsed = isCollapsed;
        const isActive = isAppearanceRoute;

        const link = (
            <Link
                to={appearanceDestination.path}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                    "sidebar-nav-link group rounded-xl text-sm font-medium transition-all duration-200",
                    collapsed ? collapsedNavRowClass : expandedNavRowClassNoTrail,
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    collapsed && "sidebar-nav-link--collapsed",
                )}
            >
                {collapsed && isActive ? <span className="sidebar-active-rail" aria-hidden /> : null}
                <Icon
                    className={cn(
                        "size-[18px] transition-colors duration-200",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                    strokeWidth={isActive ? 2.25 : 2}
                />
                {!collapsed ? <span className="sidebar-label truncate text-left">{appearanceDestination.label}</span> : null}
            </Link>
        );

        if (!collapsed) {
            return link;
        }

        return (
            <Tooltip>
                <TooltipTrigger render={link} />
                <TooltipContent side="right" className="border border-border bg-popover text-popover-foreground">
                    {appearanceDestination.label}
                </TooltipContent>
            </Tooltip>
        );
    };

    return (
        <div className="relative flex h-full">
            <div
                className={cn(
                    "sidebar-rail relative flex h-full shrink-0 flex-col border-r border-border/60 bg-card/95 backdrop-blur-xl",
                    isCollapsed ? "w-[68px] overflow-visible" : "w-[220px]",
                )}
            >
                <div
                    className={cn(
                        "relative flex h-14 shrink-0 items-center border-b border-border/50",
                        isCollapsed ? "justify-center px-2" : "justify-between px-3",
                    )}
                >
                    <Link
                        to="/"
                        className={cn(
                            "flex min-w-0 items-center transition-opacity hover:opacity-90",
                            isCollapsed ? "justify-center" : "gap-2.5",
                        )}
                    >
                        <WorkspaceBrand workspace="pos" showLabel={!isCollapsed} />
                    </Link>

                    {!isCollapsed ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Collapse sidebar"
                            className="sidebar-edge-toggle shrink-0 rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                            onClick={onToggle}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                    ) : null}
                </div>

                <nav aria-label="POS workspace navigation" className="flex flex-1 flex-col overflow-y-auto px-2 py-4">
                    <div className="space-y-1">
                        {mainDestinations.map((destination) => (
                            <div key={destination.id}>{renderNavItem(destination)}</div>
                        ))}
                    </div>

                    <div className="mt-auto space-y-1 pt-4">
                        <div className="my-3 h-px bg-border/60" />
                        {renderAppearanceItem()}
                    </div>
                </nav>
            </div>

            {isCollapsed ? (
                <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Expand sidebar"
                    className="sidebar-edge-toggle pointer-events-auto absolute top-3.5 left-[68px] z-[60] ml-1.5 size-7 rounded-lg border-border/70 bg-card shadow-md"
                    onClick={onToggle}
                >
                    <ChevronRight className="size-3.5" />
                </Button>
            ) : null}
        </div>
    );
};

export default PosSidebar;
