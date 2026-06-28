import { useCallback, useMemo, useState } from "react";
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
import { ChevronDown, Check, Plus, User, LogOut, Phone, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";

import AppSidebar, { persistSidebarCollapsed, readSidebarCollapsed } from "@/components/dashboard/app-sidebar";
import ThemeToggle from "@/components/dashboard/theme-toggle";
import CreateOrganizationDialog from "@/components/organizations/create-organization-dialog";
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

    const currentOrg = useMemo(
        () => organizations.find((org) => org.id === organizationId),
        [organizations, organizationId],
    );

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
                                            className="h-9 gap-2 rounded-xl border-border/70 bg-background/50 px-3 py-1.5 text-sm font-medium hover:bg-muted/50"
                                        >
                                            <span className="truncate max-w-[160px]">
                                                {currentOrg ? currentOrg.name : "Select organization"}
                                            </span>
                                            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                                        </Button>
                                    }
                                />
                                <DropdownMenuContent align="start" className="w-56 rounded-xl border border-border/60 bg-popover/95 p-1 shadow-lg backdrop-blur-xl z-50">
                                    {organizations.length === 0 ? (
                                        <div className="px-2.5 py-2 text-xs text-muted-foreground">
                                            No organizations
                                        </div>
                                    ) : (
                                        organizations.map((org) => (
                                            <DropdownMenuItem
                                                key={org.id}
                                                onClick={() =>
                                                    navigate(
                                                        location.pathname.includes("/billing")
                                                            ? `/organizations/${org.id}/billing`
                                                            : `/organizations/${org.id}`,
                                                    )
                                                }
                                                className={cn(
                                                    "flex items-center justify-between rounded-lg px-2.5 py-2 text-sm cursor-pointer",
                                                    org.id === organizationId
                                                        ? "bg-primary/10 text-primary font-medium focus:bg-primary/15 focus:text-primary"
                                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                                )}
                                            >
                                                <span className="truncate">{org.name}</span>
                                                {org.id === organizationId && (
                                                    <Check className="size-4 text-primary shrink-0" />
                                                )}
                                            </DropdownMenuItem>
                                        ))
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
                                render={<Link to="/pos/login" />}
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
