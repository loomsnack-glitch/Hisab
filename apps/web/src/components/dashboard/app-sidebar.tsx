import { useMemo } from "react";
import { Link, NavLink, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Bell,
    Building2,
    ChevronLeft,
    ChevronRight,
    HelpCircle,
    ReceiptText,
    Settings2,
    Store,
    Package2,
} from "lucide-react";
import logo from "@repo/assets/logo.png";
import { getOrganizations } from "@repo/services";
import { Button } from "@repo/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";

import { getAuthenticatedHomePath, resolveDefaultOrgId } from "@/lib/default-org-path";
import { organizationKeys } from "@/lib/query-keys";

const SIDEBAR_STORAGE_KEY = "hisab_sidebar_collapsed";

const secondaryNavItems = [
    { label: "Notifications", icon: Bell, disabled: true },
    { label: "Settings", icon: Settings2, disabled: true },
    { label: "Help", icon: HelpCircle, disabled: true },
] as const;

type AppSidebarProps = {
    isMobile?: boolean;
    isCollapsed: boolean;
    onToggle: () => void;
    onNavigate?: () => void;
    user?: {
        firstName?: string;
        lastName?: string;
        phone?: string;
    };
};

export const readSidebarCollapsed = () => {
    if (typeof window === "undefined") {
        return false;
    }

    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
};

export const persistSidebarCollapsed = (collapsed: boolean) => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
};

const AppSidebar = ({
    isMobile = false,
    isCollapsed,
    onToggle,
    onNavigate,
}: AppSidebarProps) => {
    const location = useLocation();
    const { organizationId } = useParams();

    const organizationsQuery = useQuery({
        queryKey: organizationKeys.list(),
        queryFn: getOrganizations,
    });

    const organizations = useMemo(
        () => (organizationsQuery.data?.status === "success" ? organizationsQuery.data.data?.organizations ?? [] : []),
        [organizationsQuery.data],
    );

    const effectiveOrgId = organizationId || resolveDefaultOrgId(organizations) || "";
    const homePath = getAuthenticatedHomePath(organizations);

    const expandedNavRowClass = "grid h-10 w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 px-3";
    const expandedNavRowClassNoTrail = "grid h-10 w-full grid-cols-[18px_minmax(0,1fr)] items-center gap-3 px-3";
    const collapsedNavRowClass = "relative mx-auto flex h-10 w-10 items-center justify-center";

    const mainNavItems = useMemo(() => {
        const items: Array<{
            to: string;
            label: string;
            icon: typeof Building2;
            isActive: boolean;
        }> = [
            {
                to: "/organizations",
                label: "Organizations",
                icon: Building2,
                isActive: location.pathname === "/organizations",
            },
        ];

        if (organizations.length > 0 && effectiveOrgId) {
            items.push(
                {
                    to: `/organizations/${effectiveOrgId}/stores`,
                    label: "Stores",
                    icon: Store,
                    isActive: /\/organizations\/[^/]+\/stores\/?$/.test(location.pathname),
                },
                {
                    to: `/organizations/${effectiveOrgId}/products`,
                    label: "Product",
                    icon: Package2,
                    isActive: /\/organizations\/[^/]+\/products(\/|$)/.test(location.pathname),
                },
                {
                    to: `/organizations/${effectiveOrgId}/billing`,
                    label: "Billing",
                    icon: ReceiptText,
                    isActive: /\/organizations\/[^/]+\/billing/.test(location.pathname),
                },
            );
        }

        return items;
    }, [location.pathname, organizations.length, effectiveOrgId]);

    const renderNavItem = (item: (typeof mainNavItems)[number], badge?: number) => {
        const Icon = item.icon;
        const collapsed = !isMobile && isCollapsed;

        const link = (
            <NavLink
                to={item.to}
                onClick={onNavigate}
                className={() => {
                    const active = item.isActive;
                    return cn(
                        "sidebar-nav-link group rounded-xl text-sm font-medium transition-all duration-200",
                        collapsed
                            ? collapsedNavRowClass
                            : badge !== undefined && badge > 0
                              ? expandedNavRowClass
                              : expandedNavRowClassNoTrail,
                        active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        collapsed && "sidebar-nav-link--collapsed",
                    );
                }}
            >
                {() => {
                    const active = item.isActive;
                    return (
                        <>
                            {collapsed && active ? <span className="sidebar-active-rail" aria-hidden /> : null}
                            <Icon
                                className={cn(
                                    "size-[18px] transition-colors duration-200",
                                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                                )}
                                strokeWidth={active ? 2.25 : 2}
                            />
                            {!collapsed ? (
                                <>
                                    <span className="sidebar-label truncate text-left">{item.label}</span>
                                    {badge !== undefined && badge > 0 ? (
                                        <span className="flex h-5 min-w-5 items-center justify-center justify-self-end rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">
                                            {badge}
                                        </span>
                                    ) : null}
                                </>
                            ) : null}
                            {collapsed && badge !== undefined && badge > 0 ? (
                                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-white">
                                    {badge}
                                </span>
                            ) : null}
                        </>
                    );
                }}
            </NavLink>
        );

        if (!collapsed) {
            return link;
        }

        return (
            <Tooltip>
                <TooltipTrigger render={link} />
                <TooltipContent side="right" className="border border-border bg-popover text-popover-foreground">
                    {item.label}
                </TooltipContent>
            </Tooltip>
        );
    };

    const renderSecondaryItem = (item: (typeof secondaryNavItems)[number]) => {
        const Icon = item.icon;
        const collapsed = !isMobile && isCollapsed;

        const button = (
            <button
                type="button"
                disabled={item.disabled}
                className={cn(
                    "group rounded-xl text-sm font-medium text-muted-foreground transition-all duration-200",
                    collapsed ? collapsedNavRowClass : expandedNavRowClassNoTrail,
                    item.disabled
                        ? "cursor-not-allowed opacity-45"
                        : "hover:bg-muted/70 hover:text-foreground",
                )}
            >
                <Icon className="size-[18px]" strokeWidth={2} />
                {!collapsed ? <span className="sidebar-label truncate text-left">{item.label}</span> : null}
            </button>
        );

        if (!collapsed) {
            return button;
        }

        return (
            <Tooltip>
                <TooltipTrigger render={button} />
                <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
        );
    };

    return (
        <div className="relative flex h-full">
            <div
                className={cn(
                    "sidebar-rail relative flex h-full shrink-0 flex-col border-r border-border/60 bg-card/95 backdrop-blur-xl",
                    isCollapsed && !isMobile ? "w-[68px] overflow-visible" : "w-[220px]",
                )}
            >
                <div
                    className={cn(
                        "relative flex h-14 shrink-0 items-center border-b border-border/50",
                        isCollapsed && !isMobile ? "justify-center px-2" : "justify-between px-3",
                    )}
                >
                    <Link
                        to={homePath}
                        onClick={onNavigate}
                        className={cn(
                            "flex min-w-0 items-center transition-opacity hover:opacity-90",
                            isCollapsed && !isMobile ? "justify-center" : "gap-2.5",
                        )}
                    >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm shadow-primary/20">
                            <img src={logo} alt="Ganatri" className="h-5 w-5 object-contain brightness-0 invert" />
                        </div>
                        {!isCollapsed || isMobile ? (
                            <div className="min-w-0 flex flex-col justify-center">
                                <p className="truncate text-[9px] font-bold uppercase tracking-[0.25em] text-primary leading-tight">
                                    Loomsnack
                                </p>
                                <p className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground leading-tight mt-0.5">
                                    Ganatri
                                </p>
                            </div>
                        ) : null}
                    </Link>

                    {!isMobile && !isCollapsed ? (
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

                <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
                    {mainNavItems.map((item) =>
                        renderNavItem(item, item.to === "/organizations" ? organizations.length : undefined),
                    )}

                    <div className="my-3 h-px bg-border/60" />

                    {secondaryNavItems.map((item) => (
                        <div key={item.label}>{renderSecondaryItem(item)}</div>
                    ))}
                </nav>

            </div>

            {!isMobile && isCollapsed ? (
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

export default AppSidebar;
