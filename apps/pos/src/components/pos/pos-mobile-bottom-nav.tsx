import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import { cn } from "@repo/ui/lib/utils";

import {
    isPosMoreDestinationActive,
    posPrimaryMobileDestinations,
    posWorkspaceDestinations,
} from "@/components/pos/pos-nav-items";
import { getPosPanelTabFromPath } from "@/pages/pos-route-context";

type PosMobileBottomNavProps = {
    billsCount?: number;
};

const PosMobileBottomNav = ({ billsCount = 0 }: PosMobileBottomNavProps) => {
    const location = useLocation();
    const [moreOpen, setMoreOpen] = useState(false);
    const activeTab = getPosPanelTabFromPath(location.pathname);
    const isAppearanceRoute = location.pathname === "/appearance" || location.pathname === "/settings";
    const isMoreActive = isPosMoreDestinationActive(location.pathname) || moreOpen;

    const navButtonClassName = (isActive: boolean) =>
        cn(
            "relative flex min-h-10 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-0.5 text-[10px] font-semibold transition-colors",
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        );

    return (
        <>
            <nav
                aria-label="POS mobile navigation"
                className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-2 pt-0.5 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl lg:hidden"
            >
                <div className="mx-auto flex max-w-lg items-stretch gap-0.5">
                    {posPrimaryMobileDestinations.map((destination) => {
                        const Icon = destination.icon;
                        const isActive = !isAppearanceRoute && destination.tab === activeTab;

                        return (
                            <Link
                                key={destination.id}
                                to={destination.path}
                                className={navButtonClassName(isActive)}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <Icon className={cn("size-5", isActive && "text-primary")} strokeWidth={isActive ? 2.25 : 2} />
                                <span className="truncate">{destination.mobileLabel ?? destination.label}</span>
                                {destination.id === "bills" && billsCount > 0 ? (
                                    <span className="absolute top-0.5 right-[calc(50%-1.25rem)] flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
                                        {billsCount > 9 ? "9+" : billsCount}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setMoreOpen(true)}
                        className={navButtonClassName(isMoreActive)}
                        aria-expanded={moreOpen}
                        aria-haspopup="dialog"
                    >
                        <MoreHorizontal className={cn("size-5", isMoreActive && "text-primary")} strokeWidth={isMoreActive ? 2.25 : 2} />
                        <span>More</span>
                    </button>
                </div>
            </nav>

            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3">
                    <SheetHeader className="px-0 pb-2 pt-0 text-left">
                        <SheetTitle className="font-display text-lg">All pages</SheetTitle>
                    </SheetHeader>

                    <div className="grid grid-cols-3 gap-3">
                        {posWorkspaceDestinations.map((destination) => {
                            const Icon = destination.icon;
                            const isActive =
                                destination.path === "/appearance"
                                    ? isAppearanceRoute
                                    : destination.tab === activeTab;

                            return (
                                <Link
                                    key={destination.id}
                                    to={destination.path}
                                    onClick={() => setMoreOpen(false)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition-colors",
                                        isActive
                                            ? "border-primary/40 bg-primary/10 text-primary"
                                            : "border-border/60 bg-card/70 text-foreground hover:bg-muted/50",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "flex size-11 items-center justify-center rounded-xl",
                                            isActive ? "bg-primary text-primary-foreground" : "bg-muted/70 text-muted-foreground",
                                        )}
                                    >
                                        <Icon className="size-5" strokeWidth={isActive ? 2.25 : 2} />
                                    </span>
                                    <span className="text-xs font-semibold">{destination.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
};

export default PosMobileBottomNav;
