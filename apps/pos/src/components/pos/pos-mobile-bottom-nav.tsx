import { Link, useLocation } from "react-router-dom";
import { cn } from "@repo/ui/lib/utils";

import { posPrimaryMobileDestinations } from "@/components/pos/pos-nav-items";
import { getPosPanelTabFromPath } from "@/pages/pos-route-context";

type PosMobileBottomNavProps = {
    billsCount?: number;
};

const PosMobileBottomNav = ({ billsCount = 0 }: PosMobileBottomNavProps) => {
    const location = useLocation();
    const activeTab = getPosPanelTabFromPath(location.pathname);
    const isAppearanceRoute = location.pathname === "/appearance";

    const navButtonClassName = (isActive: boolean) =>
        cn(
            "relative flex min-h-10 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-0.5 text-[10px] font-semibold transition-colors",
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        );

    return (
        <nav
            aria-label="POS mobile navigation"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-2 pt-0.5 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl lg:hidden"
        >
            <div className="mx-auto flex max-w-lg items-stretch gap-0.5">
                {posPrimaryMobileDestinations.map((destination) => {
                    const Icon = destination.icon;
                    const isActive = destination.id === "appearance"
                        ? isAppearanceRoute
                        : !isAppearanceRoute && destination.tab === activeTab;

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
            </div>
        </nav>
    );
};

export default PosMobileBottomNav;
