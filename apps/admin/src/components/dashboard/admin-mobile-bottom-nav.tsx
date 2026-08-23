import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import { cn } from "@repo/ui/lib/utils";

import {
    getVisibleAdminPrimaryMobileDestinations,
    getVisibleAdminWorkspaceDestinations,
    isAdminMoreDestinationActive,
    type VisibleAdminNavArgs,
} from "@/components/dashboard/admin-nav-items";
import OrganizationSwitcher from "@/components/dashboard/organization-switcher";
import CreateOrganizationDialog from "@/components/organizations/create-organization-dialog";
import { getOrgBgColor, getOrgInitials } from "@/lib/organization-avatar";

type OrganizationOption = {
    id: string;
    name: string;
};

type AdminMobileBottomNavProps = VisibleAdminNavArgs & {
    organizations?: OrganizationOption[];
    activeOrgName?: string;
    starredOrgId?: string;
    onToggleStar?: (organizationId: string) => void;
    onSelectOrganization?: (organizationId: string) => void;
};

const AdminMobileBottomNav = ({
    organizationId = "",
    hasOrganization,
    organizations = [],
    activeOrgName = "",
    starredOrgId = "",
    onToggleStar,
    onSelectOrganization,
}: AdminMobileBottomNavProps) => {
    const location = useLocation();
    const [moreOpen, setMoreOpen] = useState(false);
    const navArgs = { organizationId, hasOrganization };
    const isMoreActive = isAdminMoreDestinationActive(location.pathname, navArgs) || moreOpen;
    const primaryDestinations = getVisibleAdminPrimaryMobileDestinations(navArgs);
    const workspaceDestinations = getVisibleAdminWorkspaceDestinations(navArgs);
    const orgInitials = getOrgInitials(activeOrgName);

    const navButtonClassName = (isActive: boolean) =>
        cn(
            "relative flex min-h-10 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-0.5 text-[10px] font-semibold transition-colors",
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        );

    return (
        <>
            <nav
                aria-label="Admin mobile navigation"
                className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-2 pt-0.5 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl lg:hidden"
            >
                <div className="mx-auto flex max-w-lg items-stretch gap-0.5">
                    {primaryDestinations.map((destination) => {
                        const Icon = destination.icon;
                        const isActive = destination.isActive(location.pathname);

                        return (
                            <Link
                                key={destination.id}
                                to={destination.path}
                                className={navButtonClassName(isActive)}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <Icon className={cn("size-5", isActive && "text-primary")} strokeWidth={isActive ? 2.25 : 2} />
                                <span className="truncate">{destination.mobileLabel ?? destination.label}</span>
                            </Link>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setMoreOpen(true)}
                        className={cn(navButtonClassName(isMoreActive), "!gap-0")}
                        aria-label={`${activeOrgName || "Organization"} and more pages`}
                        aria-expanded={moreOpen}
                        aria-haspopup="dialog"
                    >
                        <span
                            className={cn(
                                "flex size-8 items-center justify-center rounded-full border text-[10px] font-bold",
                                getOrgBgColor(organizationId),
                                isMoreActive && "ring-2 ring-primary/40",
                            )}
                        >
                            {orgInitials}
                        </span>
                    </button>
                </div>
            </nav>

            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetContent
                    side="bottom"
                    className="gap-0 rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4"
                >
                    <SheetHeader className="space-y-0 px-0 pb-4 pt-0 pr-10 text-left">
                        <SheetTitle className="sr-only">Pages and organization</SheetTitle>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Organization
                        </p>
                        <div className="flex min-w-0 items-center gap-2">
                            <div className="min-w-0 flex-1">
                                <OrganizationSwitcher
                                    variant="drawer"
                                    organizations={organizations}
                                    activeOrgId={organizationId}
                                    activeOrgName={activeOrgName}
                                    starredOrgId={starredOrgId}
                                    onToggleStar={onToggleStar ?? (() => {})}
                                    onSelect={(orgId) => {
                                        onSelectOrganization?.(orgId);
                                        setMoreOpen(false);
                                    }}
                                />
                            </div>
                            <CreateOrganizationDialog
                                trigger={
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        className="size-11 shrink-0 rounded-xl border-border/60 bg-card/70 shadow-none hover:bg-muted/50"
                                        aria-label="Create organization"
                                    >
                                        <Plus className="size-4 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                }
                            />
                        </div>
                    </SheetHeader>

                    <div className="grid grid-cols-3 gap-3 border-t border-border/50 pt-4">
                        {workspaceDestinations.map((destination) => {
                            const Icon = destination.icon;
                            const isActive = destination.isActive(location.pathname);

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

export default AdminMobileBottomNav;
