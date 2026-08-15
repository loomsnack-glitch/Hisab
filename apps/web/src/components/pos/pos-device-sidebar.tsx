import { Link } from "react-router-dom";
import { BarChart3, LayoutGrid, ReceiptText, Settings2, ShoppingBag, Users } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

import { getPosPanelPath, type PosPanelTab } from "@/pages/pos-route-context";

type PosDeviceSidebarNavItem = {
    tab: PosPanelTab;
    label: string;
    icon: typeof LayoutGrid;
};

const navItems: PosDeviceSidebarNavItem[] = [
    { tab: "products", label: "Products shelf", icon: LayoutGrid },
    { tab: "bills", label: "Recent bills and drafts", icon: ReceiptText },
    { tab: "reports", label: "Product sales reports", icon: BarChart3 },
    { tab: "customers", label: "Customers", icon: Users },
    { tab: "purchases", label: "Purchases", icon: ShoppingBag },
];

type PosDeviceSidebarProps = {
    activePanelTab?: PosPanelTab;
    activeSettings?: boolean;
    billsCount?: number;
    onPanelTabChange?: (tab: PosPanelTab) => void;
    className?: string;
};

const PosDeviceSidebar = ({
    activePanelTab,
    activeSettings = false,
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

    return (
        <nav
            aria-label="POS workspace navigation"
            className={cn(
                "hidden w-14 shrink-0 flex-col items-center gap-1.5 border-r border-border/40 bg-card/40 py-3 lg:flex lg:h-full lg:self-stretch",
                className,
            )}
        >
            <div className="flex flex-col items-center gap-1.5">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = !activeSettings && activePanelTab === item.tab;

                    if (onPanelTabChange) {
                        return (
                            <button
                                key={item.tab}
                                type="button"
                                onClick={() => onPanelTabChange(item.tab)}
                                className={navButtonClassName(isActive)}
                                aria-label={item.label}
                                title={item.label}
                            >
                                <Icon className="size-4" />
                                {item.tab === "bills" && billsCount > 0 ? (
                                    <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
                                        {billsCount > 9 ? "9+" : billsCount}
                                    </span>
                                ) : null}
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.tab}
                            to={getPosPanelPath(item.tab)}
                            className={navButtonClassName(isActive)}
                            aria-label={item.label}
                            title={item.label}
                        >
                            <Icon className="size-4" />
                        </Link>
                    );
                })}
            </div>

            <Link
                to="/pos/settings"
                className={cn(
                    "mt-auto flex size-10 items-center justify-center rounded-xl transition-all",
                    activeSettings
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-label="Settings"
                title="Settings"
            >
                <Settings2 className="size-4" />
            </Link>
        </nav>
    );
};

export default PosDeviceSidebar;
