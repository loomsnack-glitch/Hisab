import { useCallback, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@repo/ui/lib/utils";

import AppSidebar, { persistSidebarCollapsed, readSidebarCollapsed } from "@/components/dashboard/app-sidebar";
import ThemeToggle from "@/components/dashboard/theme-toggle";
import { useAuthUser } from "@/store/auth.store";

const DashboardLayout = () => {
    const location = useLocation();
    const authUser = useAuthUser();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readSidebarCollapsed);

    const isOrganizationsSection = location.pathname.startsWith("/organizations");

    const toggleSidebar = useCallback(() => {
        setIsSidebarCollapsed((previous) => {
            const next = !previous;
            persistSidebarCollapsed(next);
            return next;
        });
    }, []);

    const sidebarProps = {
        isCollapsed: isSidebarCollapsed,
        onToggle: toggleSidebar,
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

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-end border-b border-border/50 bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
                        <ThemeToggle />
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
