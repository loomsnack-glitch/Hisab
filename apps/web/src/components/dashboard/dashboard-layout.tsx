import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowRight,
    Building2,
    LayoutDashboard,
    LogOut,
    Menu,
    PanelLeftClose,
    Sparkles,
} from "lucide-react";
import logo from "@repo/assets/logo.png";
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

import ThemeToggle from "@/components/dashboard/theme-toggle";
import { authKeys } from "@/lib/query-keys";
import { useAuthActions, useAuthUser } from "@/store/auth.store";

const navItems = [
    {
        to: "/dashboard",
        label: "Dashboard",
        description: "Overview and setup momentum",
        icon: LayoutDashboard,
    },
    {
        to: "/organizations",
        label: "Organizations",
        description: "Stores, devices, and rollout",
        icon: Building2,
    },
] as const;

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

    const pageMeta = useMemo(() => getPageMeta(location.pathname), [location.pathname]);

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

    const renderNavigation = (isMobile = false) => (
        <div className="flex h-full flex-col">
            <div className={cn("px-4", isMobile ? "pt-6" : "pt-5")}>
                <Link to="/dashboard" className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-amber-400 to-orange-500 shadow-lg shadow-primary/20">
                        <img src={logo} alt="Hisab" className="h-7 w-7 object-contain brightness-0 invert" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                            Loomsnack
                        </p>
                        <p className="font-display text-2xl font-semibold tracking-tight text-foreground">Hisab</p>
                    </div>
                </Link>
            </div>

            <div className="px-4 pt-6">
                <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="size-4" />
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]">Modern operations</p>
                    </div>
                    <p className="mt-3 text-sm font-medium text-foreground">
                        Build a clean retail workspace with organizations, stores, and device-level control.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="rounded-full bg-background/70">
                            UI/UX mode
                        </Badge>
                        <span>Active for this session</span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 py-6">
                <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Workspace
                </p>
                <div className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setIsMobileNavOpen(false)}
                                className={({ isActive }) =>
                                    cn(
                                        "group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all",
                                        isActive
                                            ? "border-primary/20 bg-primary/10 text-foreground shadow-sm"
                                            : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/60 hover:text-foreground",
                                    )
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <div
                                            className={cn(
                                                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                                                isActive
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground",
                                            )}
                                        >
                                            <Icon className="size-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium">{item.label}</p>
                                            <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                                        </div>
                                        <ArrowRight
                                            className={cn(
                                                "size-4 transition-transform",
                                                isActive ? "text-primary" : "text-muted-foreground group-hover:translate-x-0.5",
                                            )}
                                        />
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
            </nav>

            <div className="px-4 pb-5">
                <div className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Avatar size="lg">
                            <AvatarFallback>{getInitials(authUser?.firstName, authUser?.lastName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                                {authUser?.firstName} {authUser?.lastName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{authUser?.phone}</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        className="mt-4 w-full rounded-2xl"
                        onClick={handleLogout}
                        disabled={logoutMutation.isPending}
                    >
                        <LogOut className="mr-2 size-4" />
                        {logoutMutation.isPending ? "Logging out..." : "Logout"}
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(180deg,_transparent,_rgba(148,163,184,0.06))]" />
                <div className="grid-bg absolute inset-0 opacity-40 dark:opacity-20" />
            </div>

            <div className="flex min-h-screen">
                <aside className="hidden w-[300px] shrink-0 border-r border-border/60 bg-background/80 backdrop-blur-xl lg:block">
                    <div className="sticky top-0 h-screen">{renderNavigation()}</div>
                </aside>

                <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
                    <SheetContent side="left" className="w-[92vw] max-w-[320px] border-r border-border/60 p-0 sm:max-w-[320px]">
                        {renderNavigation(true)}
                    </SheetContent>
                </Sheet>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                            <div className="flex min-w-0 items-start gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
                                    className="mt-0.5 rounded-full lg:hidden"
                                    onClick={() => setIsMobileNavOpen(true)}
                                >
                                    <Menu className="size-4" />
                                </Button>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="hidden rounded-full sm:inline-flex">
                                            SaaS workspace
                                        </Badge>
                                        <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
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

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
                                    className="hidden rounded-full lg:inline-flex"
                                    onClick={() => navigate("/organizations")}
                                >
                                    <PanelLeftClose className="size-4" />
                                </Button>

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
