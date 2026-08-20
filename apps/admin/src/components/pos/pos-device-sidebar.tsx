import { Link } from "react-router-dom";
import { Settings2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

import { posWorkspaceDestinations } from "@/components/pos/pos-nav-items";
import type { PosPanelTab } from "@/pages/pos-route-context";

type PosDeviceSidebarProps = {
    activePanelTab?: PosPanelTab;
    activeAppearance?: boolean;
    billsCount?: number;
    onPanelTabChange?: (tab: Exclude<PosPanelTab, "tables" | "whatsapp">) => void;
    className?: string;
};

const PosDeviceSidebar = ({
    activePanelTab,
    activeAppearance = false,
    billsCount = 0,
    onPanelTabChange,
    className,
}: PosDeviceSidebarProps) => {
    const navButtonClassName = (isActive: boolean) =>
        cn(
            "relative flex size-10 items-center justify-center rounded-xl transition-all",
            isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
        );

    const mainDestinations = posWorkspaceDestinations.filter((destination) => destination.id !== "appearance");

    return (
        <nav
            aria-label="POS workspace navigation"
            className={cn(
                "hidden w-14 shrink-0 flex-col items-center gap-1.5 border-r border-border/40 bg-card/40 py-3 lg:flex lg:h-full lg:self-stretch lg:py-2",
                className,
            )}
        >
            <div className="flex flex-col items-center gap-1.5">
                {mainDestinations.map((destination) => {
                    const Icon = destination.icon;
                    const isActive = !activeAppearance && activePanelTab === destination.tab;

                    if (onPanelTabChange && destination.tab && destination.tab !== "tables" && destination.tab !== "whatsapp") {
                        return (
                            <button
                                key={destination.id}
                                type="button"
                                onClick={() => onPanelTabChange(destination.tab as Exclude<PosPanelTab, "tables" | "whatsapp">)}
                                className={navButtonClassName(isActive)}
                                aria-label={destination.label}
                                title={destination.label}
                            >
                                <Icon className="size-4" />
                                {destination.id === "bills" && billsCount > 0 ? (
                                    <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
                                        {billsCount > 9 ? "9+" : billsCount}
                                    </span>
                                ) : null}
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={destination.id}
                            to={destination.path}
                            className={navButtonClassName(isActive)}
                            aria-label={destination.label}
                            title={destination.label}
                        >
                            <Icon className="size-4" />
                        </Link>
                    );
                })}
            </div>

            <Link
                to="/pos/appearance"
                className={cn(
                    "mt-auto flex size-10 items-center justify-center rounded-xl transition-all",
                    activeAppearance
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-label="Appearance"
                title="Appearance"
            >
                <Settings2 className="size-4" />
            </Link>
        </nav>
    );
};

export default PosDeviceSidebar;
