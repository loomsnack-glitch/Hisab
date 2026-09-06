import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrganizations, userLogout } from "@repo/services";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/button";
import { MonitorSmartphone } from "lucide-react";
import { Spinner } from "@repo/ui/components/spinner";
import { toast } from "sonner";

import AdminAccountMenu from "@/components/dashboard/admin-account-menu";
import AppSidebar, { persistSidebarCollapsed, readSidebarCollapsed } from "@/components/dashboard/app-sidebar";
import AdminMobileBottomNav from "@/components/dashboard/admin-mobile-bottom-nav";
import { AdminWorkspaceSwitcherFromRoute } from "@/components/dashboard/admin-workspace-switcher";
import WorkspaceBrand from "@/components/workspace/workspace-brand";
import { getAuthenticatedHomePath, isOrganizationPickerPath } from "@/lib/default-org-path";
import { shouldRedirectUnknownOrganization } from "@/lib/organization-scope";
import { getPosLoginUrl } from "@/lib/pos-origin";
import { useAuthActions, useAuthUser } from "@/store/auth.store";
import { authKeys, organizationKeys } from "@/lib/query-keys";

const DashboardLayout = () => {
    const location = useLocation();
    const authUser = useAuthUser();
    const { clearUser } = useAuthActions();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { organizationId } = useParams();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readSidebarCollapsed);
    const isPickerPage = isOrganizationPickerPath(location.pathname);

    const organizationsQuery = useQuery({
        queryKey: organizationKeys.list(),
        queryFn: getOrganizations,
    });

    const organizations = useMemo(
        () => (organizationsQuery.data?.status === "success" ? organizationsQuery.data.data?.organizations ?? [] : []),
        [organizationsQuery.data],
    );

    const selectedOrganization = useMemo(() => {
        if (!organizationId) {
            return null;
        }
        return organizations.find((org) => org.id === organizationId) ?? null;
    }, [organizations, organizationId]);

    const selectedOrganizationName = useMemo(() => {
        if (selectedOrganization) {
            return selectedOrganization.name;
        }
        if (organizationId && localStorage.getItem("hisab_recent_org_id") === organizationId) {
            return localStorage.getItem("hisab_recent_org_name") || "";
        }
        return "";
    }, [selectedOrganization, organizationId]);

    useEffect(() => {
        if (organizationId) {
            localStorage.setItem("hisab_recent_org_id", organizationId);
            const org = organizations.find((o) => o.id === organizationId);
            if (org) {
                localStorage.setItem("hisab_recent_org_name", org.name);
            }
        }
    }, [organizationId, organizations]);

    const shouldLeaveUnknownOrganization = shouldRedirectUnknownOrganization({
        organizationId,
        isOrganizationsPending: organizationsQuery.isPending,
        organizations,
        isPickerPage,
    });

    useEffect(() => {
        if (shouldLeaveUnknownOrganization) {
            navigate("/organizations", { replace: true });
        }
    }, [shouldLeaveUnknownOrganization, navigate]);

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

    const isWhatsAppMessageHistory = location.pathname.includes("/whatsapp/message-history");
    const accountOrganization = organizationId && selectedOrganization
        ? { id: organizationId, name: selectedOrganization.name }
        : null;

    if (shouldLeaveUnknownOrganization) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen bg-background text-foreground [--pos-mobile-nav-height:calc(3.375rem+env(safe-area-inset-bottom,0px))] lg:[--pos-mobile-nav-height:0px]",
            isPickerPage && "[--pos-mobile-nav-height:0px]",
            isWhatsAppMessageHistory && "h-screen overflow-hidden",
        )}>
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),_transparent_30%)]" />
            </div>

            <div className={cn("flex min-h-screen", isWhatsAppMessageHistory && "h-full min-h-0")}>
                {isPickerPage ? null : (
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
                )}

                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 flex min-h-[calc(3.5rem+env(safe-area-inset-top,0px))] shrink-0 items-center justify-between border-b border-border/50 bg-background/90 px-3 pt-[env(safe-area-inset-top,0px)] sm:px-6 lg:px-8 backdrop-blur-xl">
                        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                            <Link
                                to={isPickerPage ? "/organizations" : getAuthenticatedHomePath(organizations)}
                                className={cn(
                                    "flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90",
                                    !isPickerPage && "lg:hidden",
                                )}
                            >
                                <WorkspaceBrand workspace="admin" />
                            </Link>
                            {isPickerPage ? null : (
                                <div className="lg:hidden">
                                    <AdminWorkspaceSwitcherFromRoute />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                            {isPickerPage ? null : (
                                <Button
                                    variant="outline"
                                    className="hidden rounded-xl border-amber-500/25 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 sm:flex"
                                    render={<a href={getPosLoginUrl()} target="_blank" rel="noopener noreferrer" />}
                                >
                                    <MonitorSmartphone className="size-4" />
                                    Login as device
                                </Button>
                            )}
                            {authUser ? (
                                <AdminAccountMenu
                                    user={authUser}
                                    organization={isPickerPage ? null : accountOrganization}
                                    onLogout={handleLogout}
                                />
                            ) : null}
                        </div>
                    </header>

                    <main className={cn(
                        "flex-1 min-w-0 w-full",
                        isWhatsAppMessageHistory && "min-h-0 overflow-hidden",
                        isPickerPage || location.pathname.includes("/billing")
                            ? "p-0"
                            : "px-3.5 py-4 sm:px-6 lg:px-8 lg:py-8",
                        !isPickerPage && "max-lg:pb-[var(--pos-mobile-nav-height)]",
                    )}>
                        <div className={cn(
                            "mx-auto w-full min-w-0",
                            isPickerPage || location.pathname.includes("/billing") ? "max-w-none" : "max-w-7xl",
                            isWhatsAppMessageHistory && "h-full min-h-0",
                        )}>
                            <Outlet />
                        </div>
                    </main>
                    {isPickerPage ? null : (
                        <AdminMobileBottomNav
                            organizationId={organizationId || ""}
                            hasOrganization={Boolean(organizationId)}
                            activeOrgName={selectedOrganizationName}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
