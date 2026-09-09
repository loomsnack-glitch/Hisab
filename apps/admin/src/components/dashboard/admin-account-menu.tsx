import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@repo/ui/components/popover";
import { Building2, LogOut, MonitorSmartphone, Phone, User } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

import { getPosLoginUrl } from "@/lib/pos-origin";

type AccountUser = {
    firstName?: string;
    lastName?: string;
    phone?: string;
    salutation?: string;
};

type AccountOrganization = {
    id: string;
    name: string;
};

type AdminAccountMenuProps = {
    user: AccountUser;
    organization?: AccountOrganization | null;
    onLogout: () => void;
};

const getUserInitials = (firstName?: string, lastName?: string) =>
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "HS";

const getUserFullName = (user: AccountUser) => {
    const salutationMap: Record<string, string> = {
        "mr.": "Mr.",
        "mrs.": "Mrs.",
        "ms.": "Ms.",
    };
    const salutation = user.salutation
        ? salutationMap[user.salutation.toLowerCase()] || user.salutation
        : "";
    return [salutation, user.firstName, user.lastName].filter(Boolean).join(" ");
};

export const AdminAccountMenuPanel = ({
    user,
    organization = null,
    onLogout,
}: AdminAccountMenuProps) => {
    const fullName = getUserFullName(user);

    return (
        <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex flex-col gap-1.5 px-1 py-1">
                {organization ? (
                    <p className="font-semibold text-foreground text-sm">{organization.name}</p>
                ) : null}
                <p className={cn("text-sm", organization ? "text-muted-foreground" : "font-semibold text-foreground")}>
                    {fullName}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3.5" />
                    <span>{user.phone}</span>
                    <Badge
                        variant="outline"
                        className="ml-1 border-border/80 bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold text-foreground rounded uppercase tracking-wider"
                    >
                        ADMIN
                    </Badge>
                </div>
            </div>

            <div className="h-px bg-border/60 -mx-3 my-0.5" />

            {organization ? (
                <Link
                    to="/organizations"
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors text-left"
                >
                    <Building2 className="size-4" />
                    Organizations
                </Link>
            ) : null}
            <a
                href={getPosLoginUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors text-left"
            >
                <MonitorSmartphone className="size-4" />
                Login as device
            </a>
            <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors text-left"
            >
                <User className="size-4" />
                My Profile
            </button>
            <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 transition-colors text-left"
            >
                <LogOut className="size-4" />
                Logout
            </button>
        </div>
    );
};

export const AdminAccountMenu = ({ user, organization = null, onLogout }: AdminAccountMenuProps) => {
    const fullName = getUserFullName(user);
    const triggerLabel = organization?.name || fullName;
    const initials = getUserInitials(user.firstName, user.lastName);

    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Button
                        variant="ghost"
                        className="h-9 w-9 rounded-full p-0 ring-1 ring-border/60 hover:bg-transparent shrink-0"
                        aria-label={triggerLabel}
                    >
                        <Avatar size="sm" className="h-8 w-8">
                            <AvatarFallback className="text-[10px] font-bold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                }
            />
            <PopoverContent
                align="end"
                className="w-72 rounded-xl border border-border/60 bg-popover/95 p-3 shadow-xl backdrop-blur-xl z-50"
            >
                <AdminAccountMenuPanel user={user} organization={organization} onLogout={onLogout} />
            </PopoverContent>
        </Popover>
    );
};

export default AdminAccountMenu;
