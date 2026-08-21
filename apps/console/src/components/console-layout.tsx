import { useCallback, useState, type ReactNode } from "react";
import { LogOut, Menu, Phone, ShieldCheck } from "lucide-react";
import type { OwnerUserDTO } from "@repo/types";
import { formatPhoneDisplay } from "@repo/types";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@repo/ui/components/sheet";
import { cn } from "@repo/ui/lib/utils";

import ConsoleSidebar, { persistSidebarCollapsed, readSidebarCollapsed } from "@/components/console-sidebar";
import { consoleNavItems, type ConsoleDestination } from "@/components/console-nav-items";
import ThemeToggle from "@/components/theme-toggle";

const getInitials = (firstName?: string, lastName?: string) =>
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "OU";

type ConsoleLayoutProps = {
    ownerUser: OwnerUserDTO;
    activeDestination: ConsoleDestination;
    onNavigate: (destination: ConsoleDestination) => void;
    onLogout: () => Promise<void>;
    fullWidth?: boolean;
    children: ReactNode;
};

const ConsoleLayout = ({
    ownerUser,
    activeDestination,
    onNavigate,
    onLogout,
    fullWidth = false,
    children,
}: ConsoleLayoutProps) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readSidebarCollapsed);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const toggleSidebar = useCallback(() => {
        setIsSidebarCollapsed((previous) => {
            const next = !previous;
            persistSidebarCollapsed(next);
            return next;
        });
    }, []);

    const handleNavigate = (destination: ConsoleDestination) => {
        onNavigate(destination);
        setIsMobileOpen(false);
    };

    const activeLabel = consoleNavItems.find((item) => item.id === activeDestination)?.label ?? "Overview";

    const sidebarProps = {
        activeDestination,
        isCollapsed: isSidebarCollapsed,
        onToggle: toggleSidebar,
        onNavigate: handleNavigate,
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
                        <ConsoleSidebar {...sidebarProps} />
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-background/90 px-3 sm:px-6 lg:px-8 backdrop-blur-xl">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                                <SheetTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="h-9 w-9 rounded-xl lg:hidden hover:bg-muted/70 shrink-0"
                                            aria-label="Open navigation menu"
                                        >
                                            <Menu className="size-5 text-muted-foreground hover:text-foreground" />
                                        </Button>
                                    }
                                />
                                <SheetContent side="left" className="p-0 data-[side=left]:w-[220px] data-[side=left]:sm:max-w-[220px] border-r-0">
                                    <div className="sr-only">
                                        <SheetTitle>Navigation Menu</SheetTitle>
                                    </div>
                                    <ConsoleSidebar
                                        {...sidebarProps}
                                        isMobile
                                        isCollapsed={false}
                                    />
                                </SheetContent>
                            </Sheet>

                            <Badge variant="outline" className="hidden rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary sm:inline-flex">
                                Platform operations
                            </Badge>
                            <p className="truncate text-sm font-medium text-foreground lg:hidden">{activeLabel}</p>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                            <ThemeToggle />
                            <Popover>
                                <PopoverTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            className="h-9 w-9 rounded-full p-0 ring-1 ring-border/60 hover:bg-transparent shrink-0"
                                        >
                                            <Avatar size="sm" className="h-8 w-8">
                                                <AvatarFallback className="text-[10px]">
                                                    {getInitials(ownerUser.firstName, ownerUser.lastName)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    }
                                />
                                <PopoverContent align="end" className="w-72 rounded-xl border border-border/60 bg-popover/95 p-3 shadow-xl backdrop-blur-xl z-50 flex flex-col gap-2.5 text-sm">
                                    <div className="flex flex-col gap-1.5 px-1 py-1">
                                        <p className="font-semibold text-foreground text-sm">
                                            {ownerUser.firstName} {ownerUser.lastName}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Phone className="size-3.5" />
                                            <span>{formatPhoneDisplay(ownerUser.phone)}</span>
                                            <Badge variant="outline" className="ml-1 border-border/80 bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold text-foreground rounded uppercase tracking-wider">
                                                Owner
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="h-px bg-border/60 -mx-3 my-0.5" />

                                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground">
                                        <ShieldCheck className="size-4 text-emerald-500" />
                                        Active status verified on every request
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => void onLogout()}
                                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 transition-colors text-left"
                                    >
                                        <LogOut className="size-4" />
                                        Sign out
                                    </button>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </header>

                    <main className="flex-1 min-w-0 w-full px-3.5 py-4 sm:px-6 lg:px-8 lg:py-8">
                        <div className={cn("mx-auto w-full min-w-0", !fullWidth && "max-w-7xl")}>{children}</div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default ConsoleLayout;
