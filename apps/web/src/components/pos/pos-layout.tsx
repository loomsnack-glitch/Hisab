import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { deviceLogout } from "@repo/services";
import type { DeviceSessionDTO } from "@repo/types";
import logo from "@repo/assets/logo.png";
import { Button } from "@repo/ui/components/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import ThemeToggle from "@/components/dashboard/theme-toggle";
import { formatLongDate } from "@/lib/format";
import { deviceAuthKeys } from "@/lib/query-keys";

type PosLayoutProps = {
    children: ReactNode;
    session: DeviceSessionDTO;
};

const PosLayout = ({ children, session }: PosLayoutProps) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const handleLogout = async () => {
        try {
            const response = await deviceLogout();
            if (response.status !== "success") {
                toast.error(response.message || "Failed to logout from POS");
                return;
            }

            queryClient.removeQueries({ queryKey: deviceAuthKeys.me });
            toast.success("POS session closed");
            navigate("/pos/login", { replace: true });
        } catch (error) {
            toast.error((error as { message?: string })?.message || "Failed to logout from POS");
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_28%)]" />
            </div>

            <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-background/90 px-4 backdrop-blur-xl sm:px-6">
                <Link
                    to="/pos"
                    className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90"
                >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm shadow-primary/20">
                        <img src={logo} alt="Ganatri" className="h-5 w-5 object-contain brightness-0 invert" />
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                        <p className="truncate text-[9px] font-bold uppercase tracking-[0.25em] text-primary leading-tight">
                            Loomsnack
                        </p>
                        <p className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground leading-tight mt-0.5">
                            Ganatri
                        </p>
                    </div>
                </Link>

                <div className="flex items-center gap-3">
                    <div className="hidden min-w-0 max-w-[min(100vw-12rem,280px)] text-right sm:block">
                        <p className="truncate text-sm font-medium text-foreground">
                            {session.organization.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {session.store.name} · {formatLongDate()}
                        </p>
                    </div>

                    <ThemeToggle />

                    <Button variant="outline" className="rounded-full" onClick={handleLogout}>
                        <LogOut className="mr-2 size-4" />
                        Logout
                    </Button>
                </div>
            </header>

            <main className="w-full px-0">{children}</main>
        </div>
    );
};

export default PosLayout;
