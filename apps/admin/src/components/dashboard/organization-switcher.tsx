import { useState } from "react";
import { Check, ChevronDown, Star } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";

import { getOrgBgColor, getOrgInitials } from "@/lib/organization-avatar";

type OrganizationOption = {
    id: string;
    name: string;
};

type OrganizationSwitcherProps = {
    organizations: OrganizationOption[];
    activeOrgId: string;
    activeOrgName: string;
    starredOrgId: string;
    onToggleStar: (organizationId: string) => void;
    onSelect: (organizationId: string) => void;
    variant?: "default" | "drawer";
    className?: string;
    triggerClassName?: string;
    contentClassName?: string;
};

const OrganizationSwitcher = ({
    organizations,
    activeOrgId,
    activeOrgName,
    starredOrgId,
    onToggleStar,
    onSelect,
    variant = "default",
    className,
    triggerClassName,
    contentClassName,
}: OrganizationSwitcherProps) => {
    const [open, setOpen] = useState(false);
    const isDrawer = variant === "drawer";

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        className={cn(
                            "min-w-0 gap-2 rounded-xl border text-sm font-medium transition-colors duration-200 hover:border-amber-500/50 hover:bg-muted/30",
                            isDrawer
                                ? "h-11 w-full justify-between border-border/60 bg-card/70 px-3 py-2 shadow-none"
                                : "h-9 gap-1.5 border-border/70 bg-background/50 px-2 py-1.5 text-xs shadow-none sm:gap-2.5 sm:px-3 sm:text-sm",
                            activeOrgId && !isDrawer && "pl-2 sm:pl-2.5 pr-2 sm:pr-3",
                            triggerClassName,
                        )}
                        aria-expanded={open}
                    >
                        <span className="flex min-w-0 items-center gap-2.5">
                            {activeOrgId ? (
                                <div
                                    className={cn(
                                        "flex shrink-0 items-center justify-center rounded-full border font-bold",
                                        isDrawer ? "size-7 text-[11px]" : "size-5 text-[9px] sm:size-6 sm:text-[10px]",
                                        getOrgBgColor(activeOrgId),
                                    )}
                                >
                                    {getOrgInitials(activeOrgName)}
                                </div>
                            ) : null}
                            <span className="truncate text-left text-foreground">
                                {activeOrgName || "Select organization"}
                            </span>
                        </span>
                        <ChevronDown
                            className={cn(
                                "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                open && "rotate-180",
                            )}
                        />
                    </Button>
                }
            />
            <DropdownMenuContent
                align="start"
                sideOffset={isDrawer ? 6 : 4}
                className={cn(
                    "rounded-xl border border-border/60 bg-popover/95 p-1.5 shadow-md backdrop-blur-xl space-y-0.5",
                    isDrawer ? "z-[100] max-h-48" : "z-50 w-64",
                    className,
                    contentClassName,
                )}
            >
                {organizations.length === 0 ? (
                    <div className="px-2.5 py-2 text-xs text-muted-foreground">
                        No organizations
                    </div>
                ) : (
                    organizations.map((org) => {
                        const isOrgStarred = starredOrgId === org.id;
                        const isOrgActive = activeOrgId === org.id;

                        return (
                            <DropdownMenuItem
                                key={org.id}
                                onClick={() => {
                                    onSelect(org.id);
                                    setOpen(false);
                                }}
                                className={cn(
                                    "flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150",
                                    isOrgActive
                                        ? "bg-primary/10 font-medium text-primary focus:bg-primary/15"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                )}
                            >
                                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onToggleStar(org.id);
                                        }}
                                        className="shrink-0 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted/70 hover:text-amber-500"
                                        title={isOrgStarred ? "Unstar organization" : "Star organization"}
                                    >
                                        <Star
                                            className={cn(
                                                "size-4 transition-all hover:scale-110",
                                                isOrgStarred
                                                    ? "fill-amber-500 text-amber-500"
                                                    : "text-muted-foreground/45 hover:text-amber-500",
                                            )}
                                        />
                                    </button>

                                    <div
                                        className={cn(
                                            "flex shrink-0 items-center justify-center rounded-full border font-bold",
                                            isDrawer ? "size-7 text-[10px]" : "size-6 text-[10px]",
                                            getOrgBgColor(org.id),
                                        )}
                                    >
                                        {getOrgInitials(org.name)}
                                    </div>

                                    <span className="truncate font-medium text-foreground">{org.name}</span>
                                </div>

                                {isOrgActive ? <Check className="size-4 shrink-0 font-bold text-amber-500" /> : null}
                            </DropdownMenuItem>
                        );
                    })
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default OrganizationSwitcher;
