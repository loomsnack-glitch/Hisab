import { useCallback, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu } from "lucide-react";
import { userLogout } from "@repo/services";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Sheet, SheetContent } from "@repo/ui/components/sheet";
import { cn } from "@repo/ui/lib/utils";
import { toast } from "sonner";

import AppSidebar, { persistSidebarCollapsed, readSidebarCollapsed } from "@/components/dashboard/app-sidebar";
import ThemeToggle from "@/components/dashboard/theme-toggle";
import { authKeys } from "@/lib/query-keys";
import { useAuthActions, useAuthUser } from "@/store/auth.store";

const getPageMeta = (pathname: string) => {
    if (pathname.startsWith("/organizations/")) {
        return {
            title: "Organization workspace",
            description: "Manage stores, reveal device secrets, and keep deployment details tidy.",
        };
    }

    if (pathname.startsWith("/organizations")) {
        return {
            title: "Organizations",
            description: "Build the structure of your retail operation and keep every branch organized.",
        };
    }

    return {
        title: "Dashboard",
        description: "Track setup progress and jump straight into the next operational task.",
    };
};

const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "HS";
};

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const authUser = useAuthUser();
    const { clearUser } = useAuthActions();
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readSidebarCollapsed);

    const pageMeta = useMemo(() => getPageMeta(location.pathname), [location.pathname]);
    const isOrganizationsSection = location.pathname.startsWith("/organizations");

    const toggleSidebar = useCallback(() => {
        setIsSidebarCollapsed((previous) => {
            const next = !previous;
            persistSidebarCollapsed(next);
            return next;
        });
    }, []);

    const logoutMutation = useMutation({
        mutationFn: userLogout,
        onSuccess: () => {
            clearUser();
            queryClient.removeQueries({ queryKey: authKeys.me });
            toast.success("Logged out successfully");
            navigate("/login", { replace: true });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to logout");
        },
    });

    const handleLogout = () => logoutMutation.mutate();

    const sidebarProps = {
        isCollapsed: isSidebarCollapsed,
        onToggle: toggleSidebar,
        onNavigate: () => setIsMobileNavOpen(false),
        user: authUser ?? undefined,
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
                        isSidebarCollapsed
                            ? "w-[68px]"
                            : isOrganizationsSection
                              ? "w-[460px]"
                              : "w-[220px]",
                    )}
                >
                    <div className="sticky top-0 h-screen overflow-visible">
                        <AppSidebar {...sidebarProps} />
                    </div>
                </aside>

                <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
                    <SheetContent side="left" className="w-[92vw] max-w-[320px] border-r border-border/60 p-0 sm:max-w-[320px]">
                        <AppSidebar {...sidebarProps} isMobile />
                    </SheetContent>
                </Sheet>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                            <div className="flex min-w-0 items-start gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
                                    className="mt-0.5 rounded-xl lg:hidden"
                                    onClick={() => setIsMobileNavOpen(true)}
                                >
                                    <Menu className="size-4" />
                                </Button>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="hidden rounded-full sm:inline-flex">
                                            SaaS workspace
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="rounded-full border-primary/20 bg-primary/10 text-primary"
                                        >
                                            Live
                                        </Badge>
                                    </div>
                                    <h1 className="mt-2 truncate font-display text-2xl font-semibold tracking-tight text-foreground">
                                        {pageMeta.title}
                                    </h1>
                                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{pageMeta.description}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <ThemeToggle />

                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={
                                            <Button variant="outline" className="h-auto rounded-full border-border/70 px-2 py-1.5">
                                                <Avatar size="sm">
                                                    <AvatarFallback>
                                                        {getInitials(authUser?.firstName, authUser?.lastName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="hidden text-left sm:block">
                                                    <p className="max-w-40 truncate text-sm font-medium">
                                                        {authUser?.firstName} {authUser?.lastName}
                                                    </p>
                                                    <p className="max-w-40 truncate text-xs text-muted-foreground">{authUser?.phone}</p>
                                                </div>
                                            </Button>
                                        }
                                    />
                                    <DropdownMenuContent align="end" className="w-64">
                                        <DropdownMenuLabel>Signed in account</DropdownMenuLabel>
                                        <div className="px-2 py-2 text-sm">
                                            <p className="font-medium text-foreground">
                                                {authUser?.salutation} {authUser?.firstName} {authUser?.lastName}
                                            </p>
                                            <p className="text-muted-foreground">{authUser?.phone}</p>
                                        </div>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleLogout}>
                                            <LogOut className="size-4" />
                                            {logoutMutation.isPending ? "Logging out..." : "Logout"}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                        <div className="mx-auto max-w-7xl">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
