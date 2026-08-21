import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";

import ConsoleBrand from "@/components/console-brand";
import { consoleNavItems, type ConsoleDestination } from "@/components/console-nav-items";

const SIDEBAR_STORAGE_KEY = "ganatri_console_sidebar_collapsed";

export const readSidebarCollapsed = () => {
    if (typeof window === "undefined") {
        return false;
    }
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
};

export const persistSidebarCollapsed = (collapsed: boolean) => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
};

type ConsoleSidebarProps = {
    activeDestination: ConsoleDestination;
    isMobile?: boolean;
    isCollapsed: boolean;
    onToggle: () => void;
    onNavigate: (destination: ConsoleDestination) => void;
};

const expandedNavRowClass = "grid h-10 w-full grid-cols-[18px_minmax(0,1fr)] items-center gap-3 px-3";
const collapsedNavRowClass = "relative mx-auto flex h-10 w-10 items-center justify-center";

const ConsoleSidebar = ({
    activeDestination,
    isMobile = false,
    isCollapsed,
    onToggle,
    onNavigate,
}: ConsoleSidebarProps) => {
    const renderNavItem = (item: (typeof consoleNavItems)[number]) => {
        const Icon = item.icon;
        const collapsed = !isMobile && isCollapsed;
        const active = activeDestination === item.id;

        const link = (
            <button
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                    "sidebar-nav-link group cursor-pointer appearance-none rounded-xl border-0 bg-transparent text-sm font-medium transition-all duration-200",
                    collapsed ? collapsedNavRowClass : expandedNavRowClass,
                    active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    collapsed && "sidebar-nav-link--collapsed",
                )}
            >
                {collapsed && active ? <span className="sidebar-active-rail" aria-hidden /> : null}
                <Icon
                    className={cn(
                        "size-[18px] transition-colors duration-200",
                        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                    strokeWidth={active ? 2.25 : 2}
                />
                {!collapsed ? <span className="sidebar-label truncate text-left">{item.label}</span> : null}
            </button>
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
                    <button
                        type="button"
                        onClick={() => onNavigate("home")}
                        className={cn(
                            "flex min-w-0 cursor-pointer items-center appearance-none border-0 bg-transparent p-0 transition-opacity hover:opacity-90",
                            isCollapsed && !isMobile ? "justify-center" : "gap-2.5",
                        )}
                    >
                        <ConsoleBrand showLabel={!isCollapsed || isMobile} />
                    </button>

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
                    {consoleNavItems.map((item) => (
                        <div key={item.id}>{renderNavItem(item)}</div>
                    ))}
                </nav>
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
        </div>
    );
};

export default ConsoleSidebar;
