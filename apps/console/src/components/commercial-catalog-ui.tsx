import { useState, type ReactNode } from "react";
import type { CommercialCatalogRevisionStatus, CommercialCatalogTerm } from "@repo/types";
import { PLATFORM_REPORTING_TIMEZONE } from "@repo/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { DataTableFacetedFilter } from "@repo/ui/components/data-table-faceted-filter";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@repo/ui/components/sheet";
import { cn } from "@repo/ui/lib/utils";
import { ChevronLeft, History, Layers3, Package2, Puzzle, Search, Store, X } from "lucide-react";

import {
    commercialCatalogFeaturesListPath,
    commercialCatalogModulesListPath,
    commercialCatalogPlansListPath,
    commercialCatalogStorefrontPath,
} from "@/lib/commercial-catalog-url";

export const commercialCatalogStatusLabels: Record<CommercialCatalogRevisionStatus, string> = {
    draft: "Draft",
    active: "Active",
    retired: "Retired",
    discarded: "Discarded",
};

export const commercialCatalogStatusFilterOptions = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "retired", label: "Retired" },
    { value: "discarded", label: "Discarded" },
] as const;

export {
    commercialCatalogDefaultStatusSelection,
    commercialCatalogNormalizeStatusSelection,
    commercialCatalogResolveInitialStatusSelection,
    commercialCatalogStatusesFromSelection,
} from "@/lib/commercial-catalog-list-filters";

export const formatCommercialCatalogAuditTime = (value: string | Date | null) => {
    if (!value) return null;
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: PLATFORM_REPORTING_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
};

export const commercialCatalogActorName = (actor: { firstName: string; lastName: string } | null) =>
    actor ? `${actor.firstName} ${actor.lastName}` : null;

export const commercialCatalogStatusBadge = (status: CommercialCatalogRevisionStatus) => (
    <Badge variant={status === "active" ? "secondary" : "outline"}>{commercialCatalogStatusLabels[status]}</Badge>
);

export const formatCommercialCatalogInr = (value: number | null) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
    }).format(value);
};

export const formatCommercialCatalogTerm = (term: CommercialCatalogTerm | null) => {
    if (!term) return "—";
    const labels: Record<CommercialCatalogTerm["unit"], [string, string]> = {
        day: ["day", "days"],
        month: ["month", "months"],
        year: ["year", "years"],
    };
    const [singular, plural] = labels[term.unit];
    return `${term.count} ${term.count === 1 ? singular : plural}`;
};

export const commercialCatalogPlanTypeLabels: Record<"trial" | "paid", string> = {
    trial: "Trial",
    paid: "Paid",
};

export const commercialCatalogUnauthorizedCode = (error: unknown, response?: { status?: string; code?: number }) =>
    (error as { code?: number } | null)?.code
    ?? (response?.status === "error" ? response.code : undefined);

type CatalogSection = "features" | "modules" | "plans" | "storefront";

type CommercialCatalogSectionNavProps = {
    current: CatalogSection;
};

const catalogTabs = [
    { id: "plans", label: "Plans", path: () => commercialCatalogPlansListPath(), icon: Package2 },
    { id: "modules", label: "Modules", path: () => commercialCatalogModulesListPath(), icon: Puzzle },
    { id: "features", label: "Features", path: () => commercialCatalogFeaturesListPath(), icon: Layers3 },
    { id: "storefront", label: "Storefront", path: () => commercialCatalogStorefrontPath, icon: Store },
] as const;

export const pushCommercialCatalogPath = (path: string) => {
    if (`${window.location.pathname}${window.location.search}` !== path) {
        window.history.pushState(null, "", path);
        window.dispatchEvent(new Event("popstate"));
    }
};

export const CommercialCatalogSectionNav = ({ current }: CommercialCatalogSectionNavProps) => (
    <div className="border-b border-border/60">
        <nav className="grid w-full grid-cols-2 gap-1 sm:grid-cols-4 sm:flex sm:w-auto sm:justify-start" aria-label="Plans sections">
            {catalogTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = current === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => pushCommercialCatalogPath(tab.path())}
                        className={cn(
                            "relative flex items-center justify-center gap-1.5 whitespace-nowrap rounded-t-lg px-2 py-2.5 text-center text-xs font-medium transition-colors duration-200 sm:gap-2 sm:px-4 sm:text-sm",
                            isActive
                                ? "font-semibold text-primary"
                                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                        )}
                    >
                        <Icon className="size-3.5 shrink-0 sm:size-4" />
                        <span className="whitespace-nowrap">{tab.label}</span>
                        {isActive ? <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-primary" /> : null}
                    </button>
                );
            })}
        </nav>
    </div>
);

type CommercialCatalogListToolbarProps = {
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder: string;
    searchAriaLabel: string;
    statusSelection: Set<string>;
    onStatusSelectionChange: (values: Set<string>) => void;
    countLabel?: string;
    addButton: ReactNode;
};

export const CommercialCatalogListToolbar = ({
    search,
    onSearchChange,
    searchPlaceholder,
    searchAriaLabel,
    statusSelection,
    onStatusSelectionChange,
    countLabel,
    addButton,
}: CommercialCatalogListToolbarProps) => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="group/search relative w-full min-w-[16rem] max-w-md flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                <Input
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={searchAriaLabel}
                    className="h-10 w-full rounded-full border border-border/60 bg-card/60 pr-9 pl-10 text-sm shadow-2xs transition-all duration-200 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                {search ? (
                    <button
                        type="button"
                        onClick={() => onSearchChange("")}
                        className="absolute top-1/2 right-3 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-full p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        aria-label="Clear search"
                    >
                        <X className="size-3.5" />
                    </button>
                ) : null}
            </div>
            <DataTableFacetedFilter
                title="Status"
                options={commercialCatalogStatusFilterOptions}
                selectedValues={statusSelection}
                onSelectedValuesChange={onStatusSelectionChange}
            />
            {countLabel ? <p className="text-sm text-muted-foreground">{countLabel}</p> : null}
        </div>
        <div className="flex shrink-0 items-center justify-end">{addButton}</div>
    </div>
);

type CommercialCatalogEditorDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    icon: ReactNode;
    children: ReactNode;
    wide?: boolean;
};

export const CommercialCatalogEditorDialog = ({
    open,
    onOpenChange,
    title,
    icon,
    children,
    wide = false,
}: CommercialCatalogEditorDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
        <DialogContent className={wide ? "sm:max-w-xl" : "sm:max-w-lg"}>
            <DialogHeader icon={icon} title={title} />
            {open ? children : null}
        </DialogContent>
    </Dialog>
);

export { DialogFooter as CommercialCatalogDialogFooter };

type CatalogRevision = {
    id: string;
    revisionNumber: number;
    status: CommercialCatalogRevisionStatus;
    displayName: string;
    createdBy: { firstName: string; lastName: string } | null;
    createdAt: string | Date;
    publishedBy: { firstName: string; lastName: string } | null;
    publishedAt: string | Date | null;
    retiredBy: { firstName: string; lastName: string } | null;
    retiredAt: string | Date | null;
    discardedBy: { firstName: string; lastName: string } | null;
    discardedAt: string | Date | null;
};

export const CommercialCatalogRevisionHistoryList = ({ revisions }: { revisions: CatalogRevision[] }) => (
    <div className="space-y-3 px-4 pb-4">
        {revisions.map((revision) => {
            const created = `Created by ${commercialCatalogActorName(revision.createdBy)} on ${formatCommercialCatalogAuditTime(revision.createdAt)}`;
            const published = revision.publishedBy && revision.publishedAt
                ? `Published by ${commercialCatalogActorName(revision.publishedBy)} on ${formatCommercialCatalogAuditTime(revision.publishedAt)}`
                : null;
            const retired = revision.retiredBy && revision.retiredAt
                ? `Retired by ${commercialCatalogActorName(revision.retiredBy)} on ${formatCommercialCatalogAuditTime(revision.retiredAt)}`
                : null;
            const discarded = revision.discardedBy && revision.discardedAt
                ? `Discarded by ${commercialCatalogActorName(revision.discardedBy)} on ${formatCommercialCatalogAuditTime(revision.discardedAt)}`
                : null;
            return (
                <article key={revision.id} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-medium">Revision {revision.revisionNumber}</h3>
                        {commercialCatalogStatusBadge(revision.status)}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{revision.displayName}</p>
                    <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        <li>{created}</li>
                        {published ? <li>{published}</li> : null}
                        {retired ? <li>{retired}</li> : null}
                        {discarded ? <li>{discarded}</li> : null}
                    </ul>
                </article>
            );
        })}
    </div>
);

export const CommercialCatalogRevisionHistorySheet = ({ revisions }: { revisions: CatalogRevision[] }) => {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
                render={(
                    <Button type="button" variant="outline" className="rounded-full" aria-label="View revision history" />
                )}
            >
                <History className="size-3.5" />
                Revision history
                <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] font-medium tabular-nums">
                    {revisions.length}
                </Badge>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader className="border-b border-border/60 pb-4">
                    <SheetTitle>Revision history</SheetTitle>
                    <SheetDescription>
                        {revisions.length} revision{revisions.length === 1 ? "" : "s"} for this catalog item.
                    </SheetDescription>
                </SheetHeader>
                <CommercialCatalogRevisionHistoryList revisions={revisions} />
            </SheetContent>
        </Sheet>
    );
};

export type CommercialCatalogActionKind = "publish" | "retire" | "discard" | "successor";

const commercialCatalogActionConfirmCopy: Record<CommercialCatalogActionKind, { title: string; body: string; confirm: string }> = {
    publish: {
        title: "Publish this revision?",
        body: "This revision becomes Active and can no longer be edited.",
        confirm: "Publish revision",
    },
    retire: {
        title: "Retire this revision?",
        body: "This revision will no longer be available for new offerings.",
        confirm: "Retire revision",
    },
    discard: {
        title: "Discard this draft?",
        body: "This draft will be removed. Its key cannot be reused.",
        confirm: "Confirm discard",
    },
    successor: {
        title: "Create a successor draft revision?",
        body: "A new draft will be created from this revision.",
        confirm: "Confirm successor revision",
    },
};

type CommercialCatalogActionConfirmDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    action: CommercialCatalogActionKind | null;
    error: string | null;
    isPending: boolean;
    onConfirm: () => void;
    errorTitle?: string;
};

export const CommercialCatalogActionConfirmDialog = ({
    open,
    onOpenChange,
    action,
    error,
    isPending,
    onConfirm,
    errorTitle = "The revision was not updated",
}: CommercialCatalogActionConfirmDialogProps) => {
    const copy = action ? commercialCatalogActionConfirmCopy[action] : null;
    const isDestructive = action === "discard" || action === "retire";

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent size="default" className="sm:max-w-md">
                {copy ? (
                    <>
                        <AlertDialogHeader className="text-left">
                            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
                            <AlertDialogDescription>{copy.body}</AlertDialogDescription>
                        </AlertDialogHeader>
                        {error ? (
                            <Alert variant="destructive" role="alert">
                                <AlertTitle>{errorTitle}</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : null}
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl" disabled={isPending}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                variant={isDestructive ? "destructive" : "default"}
                                className="rounded-xl"
                                disabled={isPending}
                                onClick={onConfirm}
                            >
                                {isPending ? "Updating..." : copy.confirm}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </>
                ) : null}
            </AlertDialogContent>
        </AlertDialog>
    );
};

type CommercialCatalogDetailHeaderProps = {
    backLabel: string;
    onBack: () => void;
    title: string;
    catalogKey: string;
    revisionNumber: number;
    status: CommercialCatalogRevisionStatus;
    description?: string | null;
    actions?: ReactNode;
};

export const CommercialCatalogDetailHeader = ({
    backLabel,
    onBack,
    title,
    catalogKey,
    revisionNumber,
    status,
    description,
    actions,
}: CommercialCatalogDetailHeaderProps) => (
    <div className="space-y-4">
        <Button type="button" variant="ghost" className="-ml-2 h-8 px-2 text-muted-foreground" onClick={onBack}>
            <ChevronLeft className="size-4" /> {backLabel}
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    {commercialCatalogStatusBadge(status)}
                </div>
                <p className="text-sm text-muted-foreground">
                    <code className="rounded-md bg-muted/60 px-1.5 py-0.5 text-xs">{catalogKey}</code>
                    <span className="mx-1.5">·</span>
                    Rev {revisionNumber}
                </p>
                {description ? (
                    <p className="max-w-2xl text-sm leading-relaxed text-foreground/80">{description}</p>
                ) : null}
            </div>
            {actions ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    {actions}
                </div>
            ) : null}
        </div>
    </div>
);

type CommercialCatalogDetailRelationsProps = {
    sections: Array<{
        title: string;
        items: ChipItem[];
        empty: string;
    }>;
};

export const CommercialCatalogDetailRelations = ({ sections }: CommercialCatalogDetailRelationsProps) => (
    <div className={cn("grid gap-4", sections.length > 1 ? "md:grid-cols-2" : "grid-cols-1")}>
        {sections.map((section) => (
            <Card key={section.title} className="border-border/70 shadow-none">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <CommercialCatalogChipList items={section.items} empty={section.empty} />
                </CardContent>
            </Card>
        ))}
    </div>
);

type ChipItem = {
    id: string;
    label: string;
    hint?: string;
};

export const CommercialCatalogChipList = ({ items, empty }: { items: ChipItem[]; empty: string }) => {
    if (items.length === 0) {
        return <p className="text-sm text-muted-foreground">{empty}</p>;
    }
    return (
        <ul className="flex flex-wrap gap-2">
            {items.map((item) => (
                <li key={item.id} className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-sm">
                    <span className="font-medium">{item.label}</span>
                    {item.hint ? <code className="ml-1.5 text-muted-foreground">{item.hint}</code> : null}
                </li>
            ))}
        </ul>
    );
};

export const commercialCatalogAddButtonClass =
    "h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90 sm:h-11 sm:px-5 sm:text-sm";

export const commercialCatalogEditButtonClass = "rounded-full";
