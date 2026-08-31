import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrganizations, userLogout } from "@repo/services";
import { cn } from "@repo/ui/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@repo/ui/components/popover";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Plus, User, LogOut, Phone, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";

import AppSidebar, { persistSidebarCollapsed, readSidebarCollapsed } from "@/components/dashboard/app-sidebar";
import AdminMobileBottomNav from "@/components/dashboard/admin-mobile-bottom-nav";
import OrganizationSwitcher from "@/components/dashboard/organization-switcher";
import CreateOrganizationDialog from "@/components/organizations/create-organization-dialog";
import WorkspaceBrand from "@/components/workspace/workspace-brand";
import { getAuthenticatedHomePath, resolveDefaultOrgId } from "@/lib/default-org-path";
import { getPosLoginUrl } from "@/lib/pos-origin";
import { useAuthActions, useAuthUser } from "@/store/auth.store";
import { authKeys, organizationKeys } from "@/lib/query-keys";

const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "HS";
};

const getUserFullName = (user: any) => {
    const salutationMap: Record<string, string> = {
        "mr.": "Mr.",
        "mrs.": "Mrs.",
        "ms.": "Ms.",
    };
    const salutation = user?.salutation ? (salutationMap[user.salutation.toLowerCase()] || user.salutation) : "";
    return [salutation, user?.firstName, user?.lastName].filter(Boolean).join(" ");
};

const getOrganizationSwitchPath = (pathname: string, organizationId: string) => {
    if (pathname.includes("/billing")) {
        return `/organizations/${organizationId}/billing`;
    }
    if (pathname.includes("/products")) {
        return `/organizations/${organizationId}/products`;
    }
    if (pathname.includes("/vendors")) {
        return `/organizations/${organizationId}/vendors`;
    }
    if (pathname.includes("/units")) {
        return `/organizations/${organizationId}/units`;
    }
    if (pathname.includes("/expense-categories")) {
        return `/organizations/${organizationId}/expense-categories`;
    }
    if (pathname.includes("/money-accounts")) {
        return `/organizations/${organizationId}/money-accounts`;
    }
    if (pathname.includes("/whatsapp")) {
        return `/organizations/${organizationId}/whatsapp/accounts`;
    }
    if (pathname.includes("/reports")) {
        return `/organizations/${organizationId}/reports`;
    }
    if (pathname.includes("/tables")) {
        return `/organizations/${organizationId}/tables`;
    }
    if (pathname.includes("/customers")) {
        return `/organizations/${organizationId}/customers`;
    }
    if (pathname.includes("/google-contacts") || /\/organizations\/[^/]+\/settings(\/|$)/.test(pathname)) {
        return `/organizations/${organizationId}/settings`;
    }
    return `/organizations/${organizationId}/stores`;
};

const createOrganizationTrigger = (
    <Button
        variant="outline"
        size="icon-sm"
        className="h-9 w-9 shrink-0 rounded-xl border-border/70 bg-background/50 hover:bg-muted/50"
        aria-label="Create organization"
    >
        <Plus className="size-4 text-muted-foreground hover:text-foreground" />
    </Button>
);

const DashboardLayout = () => {
    const location = useLocation();
    const authUser = useAuthUser();
    const { clearUser } = useAuthActions();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { organizationId } = useParams();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readSidebarCollapsed);

    const organizationsQuery = useQuery({
        queryKey: organizationKeys.list(),
        queryFn: getOrganizations,
    });

    const organizations = useMemo(
        () => (organizationsQuery.data?.status === "success" ? organizationsQuery.data.data?.organizations ?? [] : []),
        [organizationsQuery.data],
    );

    const [starredOrgId, setStarredOrgId] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("hisab_starred_org_id") || "";
        }
        return "";
    });

    const handleToggleStar = (orgId: string) => {
        setStarredOrgId((prev) => {
            const next = prev === orgId ? "" : orgId;
            if (next) {
                localStorage.setItem("hisab_starred_org_id", next);
            } else {
                localStorage.removeItem("hisab_starred_org_id");
            }
            return next;
        });
    };

    const activeOrgId =
        organizationId ||
        resolveDefaultOrgId(organizations) ||
        localStorage.getItem("hisab_recent_org_id") ||
        "";

    const activeOrg = useMemo(() => {
        return organizations.find((org) => org.id === activeOrgId) || organizations.find((org) => org.id === organizationId);
    }, [organizations, activeOrgId, organizationId]);

    const activeOrgName = useMemo(() => {
        if (activeOrg) return activeOrg.name;
        // Fallback display name during reload/refresh while query is pending
        if (organizationId && localStorage.getItem("hisab_recent_org_id") === organizationId) {
            return localStorage.getItem("hisab_recent_org_name") || "";
        }
        return "";
    }, [activeOrg, organizationId]);

    useEffect(() => {
        if (organizationId) {
            localStorage.setItem("hisab_recent_org_id", organizationId);
            const org = organizations.find((o) => o.id === organizationId);
            if (org) {
                localStorage.setItem("hisab_recent_org_name", org.name);
            }
        }
    }, [organizationId, organizations]);

    const [hasAttemptedRedirect, setHasAttemptedRedirect] = useState(false);

    useEffect(() => {
        if (hasAttemptedRedirect || organizationsQuery.isPending) {
            return;
        }

        const wasRedirectedThisSession = sessionStorage.getItem("hisab_initial_org_redirected");
        const isLandingPath =
            location.pathname === "/" ||
            location.pathname === "/dashboard" ||
            location.pathname === "/organizations";

        if (!wasRedirectedThisSession && isLandingPath) {
            const homePath = getAuthenticatedHomePath(organizations);
            sessionStorage.setItem("hisab_initial_org_redirected", "true");
            setHasAttemptedRedirect(true);
            if (homePath !== location.pathname) {
                navigate(homePath, { replace: true });
            }
            return;
        }

        setHasAttemptedRedirect(true);
    }, [organizationsQuery.isPending, organizations, location.pathname, navigate, hasAttemptedRedirect]);

    const toggleSidebar = useCallback(() => {
        setIsSidebarCollapsed((previous) => {
            const next = !previous;
            persistSidebarCollapsed(next);
            return next;
        });
    }, []);

    const handleLogout = async () => {
        try {
            const res = await userLogout();
            if (res.status === "success") {
                clearUser();
                queryClient.removeQueries({ queryKey: authKeys.me });
                sessionStorage.removeItem("hisab_initial_org_redirected");
                toast.success("Logged out successfully");
                navigate("/login");
            } else {
                toast.error(res.message || "Failed to logout");
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred during logout");
        }
    };

    const sidebarProps = {
        isCollapsed: isSidebarCollapsed,
        onToggle: toggleSidebar,
    };

    const handleSelectOrganization = (orgId: string) => {
        navigate(getOrganizationSwitchPath(location.pathname, orgId));
    };

    return (
        <div className="min-h-screen bg-background text-foreground [--pos-mobile-nav-height:calc(3.375rem+env(safe-area-inset-bottom,0px))] lg:[--pos-mobile-nav-height:0px]">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),_transparent_30%)]" />
            </div>

            <div className="flex min-h-screen">
                <aside
                    className={cn(
                        "sidebar-shell relative z-30 hidden shrink-0 overflow-visible lg:block",
                        isSidebarCollapsed ? "w-[68px]" : "w-[220px]",
                    )}
                >
                    <div className="sticky top-0 h-screen overflow-visible">
                        <AppSidebar {...sidebarProps} />
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 flex min-h-[calc(3.5rem+env(safe-area-inset-top,0px))] shrink-0 items-center justify-between border-b border-border/50 bg-background/90 px-3 pt-[env(safe-area-inset-top,0px)] sm:px-6 lg:px-8 backdrop-blur-xl">
                        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                            <Link
                                to={getAuthenticatedHomePath(organizations)}
                                className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90 lg:hidden"
                            >
                                <WorkspaceBrand workspace="admin" />
                            </Link>
                            <div className="hidden min-w-0 items-center gap-1.5 sm:gap-2 lg:flex">
                                <OrganizationSwitcher
                                    organizations={organizations}
                                    activeOrgId={activeOrgId}
                                    activeOrgName={activeOrgName}
                                    starredOrgId={starredOrgId}
                                    onToggleStar={handleToggleStar}
                                    onSelect={handleSelectOrganization}
                                    triggerClassName="max-w-[220px]"
                                />
                                <CreateOrganizationDialog trigger={createOrganizationTrigger} />
                            </div>
                        </div>

                        {/* Right side: Theme Toggle & User Profile Popover */}
                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                            <Button
                                variant="outline"
                                className="hidden rounded-xl border-amber-500/25 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 sm:flex"
                                render={<a href={getPosLoginUrl()} target="_blank" rel="noopener noreferrer" />}
                            >
                                <MonitorSmartphone className="size-4" />
                                Login as device
                            </Button>
                            {authUser && (
                                <Popover>
                                    <PopoverTrigger
                                        render={
                                            <Button
                                                variant="ghost"
                                                className="h-9 w-9 rounded-full p-0 ring-1 ring-border/60 hover:bg-transparent shrink-0"
                                            >
                                                <Avatar size="sm" className="h-8 w-8">
                                                    <AvatarFallback className="text-[10px]">
                                                        {getInitials(authUser.firstName, authUser.lastName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </Button>
                                        }
                                    />
                                    <PopoverContent align="end" className="w-72 rounded-xl border border-border/60 bg-popover/95 p-3 shadow-xl backdrop-blur-xl z-50 flex flex-col gap-2.5 text-sm">
                                        <div className="flex flex-col gap-1.5 px-1 py-1">
                                            <p className="font-semibold text-foreground text-sm">
                                                {getUserFullName(authUser)}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Phone className="size-3.5" />
                                                <span>{authUser.phone}</span>
                                                <Badge variant="outline" className="ml-1 border-border/80 bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold text-foreground rounded uppercase tracking-wider">
                                                    ADMIN
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="h-px bg-border/60 -mx-3 my-0.5" />

                                        <a
                                            href={getPosLoginUrl()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors text-left"
                                        >
                                            <MonitorSmartphone className="size-4" />
                                            Login as device
                                        </a>
                                        <button className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors text-left">
                                            <User className="size-4" />
                                            My Profile
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 transition-colors text-left"
                                        >
                                            <LogOut className="size-4" />
                                            Logout
                                        </button>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                    </header>

                    <main className={cn(
                        "flex-1 min-w-0 w-full",
                        location.pathname.includes("/billing")
                            ? "p-0"
                            : "px-3.5 py-4 sm:px-6 lg:px-8 lg:py-8",
                        "max-lg:pb-[var(--pos-mobile-nav-height)]",
                    )}>
                        <div className={cn(
                            "mx-auto w-full min-w-0",
                            location.pathname.includes("/billing") ? "max-w-none" : "max-w-7xl",
                        )}>
                            <Outlet />
                        </div>
                    </main>
                    <AdminMobileBottomNav
                        organizationId={activeOrgId}
                        hasOrganization={Boolean(activeOrgId)}
                        organizations={organizations}
                        activeOrgName={activeOrgName}
                        starredOrgId={starredOrgId}
                        onToggleStar={handleToggleStar}
                        onSelectOrganization={handleSelectOrganization}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
