import { useMemo, useState } from "react";
import { Link, NavLink, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Bell,
    Building2,
    ChevronLeft,
    ChevronRight,
    Circle,
    HelpCircle,
    LayoutDashboard,
    Search,
    Settings2,
    Square,
    Triangle,
} from "lucide-react";
import logo from "@repo/assets/logo.png";
import { getOrganizations } from "@repo/services";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";

import { organizationKeys } from "@/lib/query-keys";

const SIDEBAR_STORAGE_KEY = "hisab_sidebar_collapsed";

const orgMarkerStyles = [
    { icon: Star, className: "text-amber-500" },
    { icon: Circle, className: "text-violet-500" },
    { icon: Square, className: "text-pink-500" },
    { icon: Triangle, className: "text-emerald-500" },
] as const;

const mainNavItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/organizations", label: "Organizations", icon: Building2, end: false },
] as const;

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

const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "HS";
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
    user,
}: AppSidebarProps) => {
    const location = useLocation();
    const { organizationId } = useParams();
    const [orgSearch, setOrgSearch] = useState("");

    const organizationsQuery = useQuery({
        queryKey: organizationKeys.list(),
        queryFn: getOrganizations,
    });

    const organizations = useMemo(
        () => (organizationsQuery.data?.status === "success" ? organizationsQuery.data.data?.organizations ?? [] : []),
        [organizationsQuery.data],
    );

    const isOrganizationsSection = location.pathname.startsWith("/organizations");
    const showOrgPanel = isOrganizationsSection && !isCollapsed && !isMobile;


    const filteredOrganizations = useMemo(() => {
        const query = orgSearch.trim().toLowerCase();
        if (!query) {
            return organizations;
        }

        return organizations.filter((organization) => organization.name.toLowerCase().includes(query));
    }, [orgSearch, organizations]);

    const expandedNavRowClass = "grid h-10 w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 px-3";
    const expandedNavRowClassNoTrail = "grid h-10 w-full grid-cols-[18px_minmax(0,1fr)] items-center gap-3 px-3";
    const collapsedNavRowClass = "relative mx-auto flex h-10 w-10 items-center justify-center";

    const renderNavItem = (item: (typeof mainNavItems)[number], badge?: number) => {
        const Icon = item.icon;
        const collapsed = !isMobile && isCollapsed;

        const link = (
            <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                    cn(
                        "sidebar-nav-link group rounded-xl text-sm font-medium transition-all duration-200",
                        collapsed
                            ? collapsedNavRowClass
                            : badge !== undefined && badge > 0
                              ? expandedNavRowClass
                              : expandedNavRowClassNoTrail,
                        isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        collapsed && "sidebar-nav-link--collapsed",
                    )
                }
            >
                {({ isActive }) => (
                    <>
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
                )}
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
                        to="/dashboard"
                        onClick={onNavigate}
                        className={cn(
                            "flex min-w-0 items-center transition-opacity hover:opacity-90",
                            isCollapsed && !isMobile ? "justify-center" : "gap-2.5",
                        )}
                    >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-foreground shadow-sm">
                            <img src={logo} alt="Ganatri" className="h-5 w-5 object-contain brightness-0 invert" />
                        </div>
                        {!isCollapsed || isMobile ? (
                            <div className="min-w-0">
                                <p className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground">
                                    Ganatri
                                </p>
                                <p className="truncate text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                                    Loomsnack
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

                <div className={cn("border-t border-border/50 p-3", isCollapsed && !isMobile ? "px-2" : "")}>
                    <div
                        className={cn(
                            "flex items-center gap-2.5 rounded-xl bg-muted/40 p-2",
                            isCollapsed && !isMobile ? "justify-center" : "",
                        )}
                    >
                        <Avatar size="sm" className="ring-1 ring-border/60">
                            <AvatarFallback className="text-[10px]">
                                {getInitials(user?.firstName, user?.lastName)}
                            </AvatarFallback>
                        </Avatar>
                        {!isCollapsed || isMobile ? (
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-foreground">
                                    {user?.firstName} {user?.lastName}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground">{user?.phone}</p>
                            </div>
                        ) : null}
                    </div>
                </div>
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

            <div
                className={cn(
                    "sidebar-detail-panel flex h-full shrink-0 flex-col overflow-hidden border-r border-border/60 bg-background/95 backdrop-blur-xl",
                    showOrgPanel ? "sidebar-detail-panel--open w-[240px]" : "sidebar-detail-panel--closed w-0",
                )}
            >
                <div className="sidebar-detail-inner flex h-full w-[240px] flex-col">
                    <div className="border-b border-border/50 p-4">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={orgSearch}
                                onChange={(event) => setOrgSearch(event.target.value)}
                                placeholder="Search..."
                                className="h-9 rounded-xl border-border/70 bg-muted/30 pl-9 text-sm shadow-none"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 py-4">
                        <section>
                            <p className="px-2 pb-2 text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                                Organizations
                            </p>
                            {organizationsQuery.isPending ? (
                                <div className="space-y-2 px-2 py-1">
                                    {Array.from({ length: 4 }).map((_, index) => (
                                        <div key={index} className="h-8 animate-pulse rounded-lg bg-muted/60" />
                                    ))}
                                </div>
                            ) : filteredOrganizations.length === 0 ? (
                                <p className="px-2 text-xs text-muted-foreground">No organizations found.</p>
                            ) : (
                                <div className="space-y-0.5">
                                    {filteredOrganizations.map((organization, index) => {
                                        const marker = orgMarkerStyles[(index + 1) % orgMarkerStyles.length];
                                        const MarkerIcon = marker.icon;
                                        const isActive = organizationId === organization.id;

                                        return (
                                            <Link
                                                key={organization.id}
                                                to={`/organizations/${organization.id}`}
                                                onClick={onNavigate}
                                                className={cn(
                                                    "flex h-9 items-center gap-2.5 rounded-lg px-2 text-sm transition-colors duration-200",
                                                    isActive
                                                        ? "bg-primary/10 font-medium text-primary"
                                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                                )}
                                            >
                                                <MarkerIcon className={cn("size-3.5 shrink-0", marker.className)} />
                                                <span className="truncate">{organization.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </section>


                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppSidebar;
