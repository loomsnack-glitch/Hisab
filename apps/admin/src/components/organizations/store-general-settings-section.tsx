import type { StoreDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import CopyToClipboard from "@repo/ui/components/copy-to-clipboard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { ExternalLink, Link2, MapPin, Pencil, Share2, Star, Store } from "lucide-react";

import EditStoreDialog from "@/components/organizations/edit-store-dialog";
import EditStorePresenceDialog from "@/components/organizations/edit-store-presence-dialog";

type StoreGeneralSettingsSectionProps = {
    organizationId: string;
    store: StoreDTO;
};

type PresenceRowProps = {
    icon: typeof Star;
    iconClassName: string;
    label: string;
    name: string | null;
    href: string | null;
};

const PresenceRow = ({ icon: Icon, iconClassName, label, name, href }: PresenceRowProps) => {
    const isConfigured = Boolean(name && href);

    return (
        <div
            className={cn(
                "rounded-xl border p-3.5 transition-colors",
                isConfigured ? "border-border/60 bg-muted/15" : "border-dashed border-border/50 bg-muted/5",
            )}
        >
            <div className="flex items-start gap-3">
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", iconClassName)}>
                    <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    {isConfigured ? (
                        <>
                            <p className="font-medium text-foreground truncate">{name}</p>
                            <div className="flex items-center gap-1">
                                <a
                                    href={href!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-w-0 flex-1 truncate text-sm text-primary hover:underline"
                                >
                                    {href}
                                </a>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                                    render={
                                        <a href={href!} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label}`} />
                                    }
                                >
                                    <ExternalLink className="size-3.5" />
                                </Button>
                                <CopyToClipboard
                                    getValue={() => href!}
                                    tooltip="Copy link"
                                    showTooltip={false}
                                    variant="ghost"
                                    size="icon-sm"
                                    className="shrink-0 rounded-lg"
                                />
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">Not configured</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const StoreGeneralSettingsSection = ({ organizationId, store }: StoreGeneralSettingsSectionProps) => {
    const hasAddress = Boolean(store.address?.trim());
    const presenceCount = [store.reviewPlatform && store.reviewLink, store.socialMediaName && store.socialMediaLink].filter(
        Boolean,
    ).length;

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <Card className="group overflow-hidden rounded-2xl border-border/60 bg-card/80 shadow-2xs transition-all duration-200 hover:border-primary/20 hover:shadow-md">
                <CardContent className="p-0">
                    <div className="relative overflow-hidden border-b border-border/50 px-5 py-5 sm:px-6">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_55%)]" />
                        <div className="relative flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
                                    <Store className="size-5" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Store details</p>
                                    <h3 className="font-display text-xl font-semibold tracking-tight text-foreground truncate sm:text-2xl">
                                        {store.name}
                                    </h3>
                                </div>
                            </div>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "rounded-full shrink-0",
                                    hasAddress
                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                                )}
                            >
                                {hasAddress ? "Complete" : "Address missing"}
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-3 px-5 py-4 sm:px-6">
                        <div className="rounded-xl border border-border/60 bg-muted/15 p-3.5">
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background/80 text-muted-foreground">
                                    <MapPin className="size-4" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Address</p>
                                    <p className="text-sm font-medium text-foreground break-words">
                                        {hasAddress ? store.address : "Not added yet"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end border-t border-border/40 px-5 py-3 sm:px-6">
                        <Tooltip>
                            <TooltipTrigger render={<span className="inline-flex" />}>
                                <EditStoreDialog
                                    organizationId={organizationId}
                                    store={store}
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Edit store details"
                                            className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                    }
                                />
                            </TooltipTrigger>
                            <TooltipContent>Edit store details</TooltipContent>
                        </Tooltip>
                    </div>
                </CardContent>
            </Card>

            <Card className="group overflow-hidden rounded-2xl border-border/60 bg-card/80 shadow-2xs transition-all duration-200 hover:border-primary/20 hover:shadow-md">
                <CardContent className="p-0">
                    <div className="relative overflow-hidden border-b border-border/50 px-5 py-5 sm:px-6">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.10),_transparent_55%)]" />
                        <div className="relative flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
                                    <Share2 className="size-5" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer links</p>
                                    <h3 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                        Reviews and social
                                    </h3>
                                </div>
                            </div>
                            <Badge variant="outline" className="rounded-full shrink-0">
                                {presenceCount}/2 set
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-3 px-5 py-4 sm:px-6">
                        <PresenceRow
                            icon={Star}
                            iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            label="Google review"
                            name={store.reviewPlatform}
                            href={store.reviewLink}
                        />
                        <PresenceRow
                            icon={Link2}
                            iconClassName="bg-sky-500/10 text-sky-600 dark:text-sky-400"
                            label="Social profile"
                            name={store.socialMediaName}
                            href={store.socialMediaLink}
                        />
                    </div>

                    <div className="flex items-center justify-end border-t border-border/40 px-5 py-3 sm:px-6">
                        <Tooltip>
                            <TooltipTrigger render={<span className="inline-flex" />}>
                                <EditStorePresenceDialog
                                    organizationId={organizationId}
                                    store={store}
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Edit reviews and social"
                                            className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                    }
                                />
                            </TooltipTrigger>
                            <TooltipContent>Edit reviews and social</TooltipContent>
                        </Tooltip>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default StoreGeneralSettingsSection;
