import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrganizations, userLogout } from "@repo/services";
import { cn } from "@repo/ui/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@repo/ui/components/popover";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { ChevronDown, Check, Plus, User, LogOut, Phone, MonitorSmartphone, Star } from "lucide-react";
import { toast } from "sonner";

import AppSidebar, { persistSidebarCollapsed, readSidebarCollapsed } from "@/components/dashboard/app-sidebar";
import ThemeToggle from "@/components/dashboard/theme-toggle";
import CreateOrganizationDialog from "@/components/organizations/create-organization-dialog";
import { getAuthenticatedHomePath, resolveDefaultOrgId } from "@/lib/default-org-path";
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

const getOrgInitials = (name?: string) => {
    if (!name) return "OR";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

const getOrgBgColor = (id?: string) => {
    if (!id) return "bg-primary/10 text-primary border-primary/20";
    const colors = [
        "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

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

    const isStarredActive = starredOrgId && activeOrg && starredOrgId === activeOrg.id;

    return (
        <div className="min-h-screen bg-background text-foreground">
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
                    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
                        {/* Left side: Organization selector and Create button */}
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "h-9 gap-2.5 rounded-xl border border-border/70 bg-background/50 px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:bg-muted/30 hover:border-amber-500/50 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60",
                                                activeOrg && "pl-2.5 pr-3"
                                            )}
                                        >
                                            {activeOrg && (
                                                <Star className={cn("size-4 shrink-0 transition-transform", isStarredActive ? "text-amber-500 fill-amber-500 scale-105" : "text-muted-foreground/50")} />
                                            )}
                                            {activeOrg && (
                                                <div className={cn("size-6 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0", getOrgBgColor(activeOrg.id))}>
                                                    {getOrgInitials(activeOrgName)}
                                                </div>
                                            )}
                                            <span className="truncate max-w-[140px] text-foreground">
                                                {activeOrgName || "Select organization"}
                                            </span>
                                            {activeOrg && (
                                                <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />
                                            )}
                                            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                                        </Button>
                                    }
                                />
                                <DropdownMenuContent align="start" className="w-64 rounded-xl border border-border/60 bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl z-50 space-y-0.5">
                                    {organizations.length === 0 ? (
                                        <div className="px-2.5 py-2 text-xs text-muted-foreground">
                                            No organizations
                                        </div>
                                    ) : (
                                        organizations.map((org) => {
                                            const isOrgStarred = starredOrgId === org.id;
                                            const isOrgActive = activeOrgId === org.id || organizationId === org.id;

                                            return (
                                                <DropdownMenuItem
                                                    key={org.id}
                                                    onClick={() =>
                                                        navigate(
                                                            location.pathname.includes("/billing")
                                                                ? `/organizations/${org.id}/billing`
                                                                : `/organizations/${org.id}/stores`,
                                                        )
                                                    }
                                                    className={cn(
                                                        "flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-colors duration-150",
                                                        isOrgActive
                                                            ? "bg-primary/10 text-primary font-medium focus:bg-primary/15"
                                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleStar(org.id);
                                                            }}
                                                            className="p-1 hover:bg-muted/70 rounded-md transition-colors text-muted-foreground/60 hover:text-amber-500 shrink-0"
                                                            title={isOrgStarred ? "Unstar organization" : "Star organization"}
                                                        >
                                                            <Star
                                                                className={cn(
                                                                    "size-4 transition-all hover:scale-110",
                                                                    isOrgStarred ? "text-amber-500 fill-amber-500" : "text-muted-foreground/45 hover:text-amber-500"
                                                                )}
                                                            />
                                                        </button>

                                                        <div className={cn("size-6 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0", getOrgBgColor(org.id))}>
                                                            {getOrgInitials(org.name)}
                                                        </div>

                                                        <span className="truncate font-medium text-foreground">{org.name}</span>
                                                    </div>

                                                    {isOrgActive && (
                                                        <Check className="size-4 text-amber-500 shrink-0 font-bold" />
                                                    )}
                                                </DropdownMenuItem>
                                            );
                                        })
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <CreateOrganizationDialog
                                trigger={
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        className="h-9 w-9 rounded-xl border-border/70 bg-background/50 hover:bg-muted/50"
                                        aria-label="Create organization"
                                    >
                                        <Plus className="size-4 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                }
                            />
                        </div>

                        {/* Right side: Theme Toggle & User Profile Popover */}
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="hidden rounded-xl border-amber-500/25 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 sm:flex"
                                render={<Link to="/pos/login" target="_blank" />}
                            >
                                <MonitorSmartphone className="mr-2 size-4" />
                                Login as device
                            </Button>
                            <ThemeToggle />
                            {authUser && (
                                <Popover>
                                    <PopoverTrigger
                                        render={
                                            <Button
                                                variant="ghost"
                                                className="h-9 w-9 rounded-full p-0 ring-1 ring-border/60 hover:bg-transparent"
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

                                        <Link
                                            to="/pos/login"
                                            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors text-left"
                                        >
                                            <MonitorSmartphone className="size-4" />
                                            Login as device
                                        </Link>
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
                        "flex-1",
                        location.pathname.includes("/billing")
                            ? "p-0"
                            : "px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
                    )}>
                        <div className={cn(
                            "mx-auto",
                            location.pathname.includes("/billing") ? "max-w-none" : "max-w-7xl",
                        )}>
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
