import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Star } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import type { OrganizationDTO } from "@repo/types";

import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { getOrgInitials, getOrgTileClass } from "@/lib/organization-avatar";

type OrganizationPickerViewProps = {
    organizations: OrganizationDTO[];
    starredOrgId: string;
    isManaging: boolean;
    isLoading?: boolean;
    errorMessage?: string | null;
    addOrganization: ReactNode;
    renderOrganizationAction: (organization: OrganizationDTO, tile: ReactElement) => ReactNode;
    onToggleStar: (organizationId: string) => void;
    onToggleManaging: () => void;
    onRetry?: () => void;
};

const tileFrameClassName =
    "flex size-28 items-center justify-center rounded-md sm:size-32 md:size-36";

const OrganizationTileFace = ({
    organization,
    isManaging,
}: {
    organization: OrganizationDTO;
    isManaging: boolean;
}) => (
    <div
        className={cn(
            tileFrameClassName,
            "relative overflow-hidden font-display text-3xl font-semibold tracking-tight sm:text-4xl",
            getOrgTileClass(organization.id),
        )}
    >
        {getOrgInitials(organization.name)}
        {isManaging ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                <Pencil className="size-8 text-white" strokeWidth={1.75} />
            </span>
        ) : null}
    </div>
);

export const OrganizationPickerView = ({
    organizations,
    starredOrgId,
    isManaging,
    isLoading = false,
    errorMessage = null,
    addOrganization,
    renderOrganizationAction,
    onToggleStar,
    onToggleManaging,
    onRetry,
}: OrganizationPickerViewProps) => {
    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-5.5rem)] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="flex min-h-[calc(100vh-5.5rem)] items-center justify-center px-4">
                <Empty className="max-w-md rounded-2xl border border-dashed border-red-300/50 bg-red-500/5">
                    <EmptyHeader>
                        <EmptyTitle>Failed to load organizations</EmptyTitle>
                        <EmptyDescription>{errorMessage}</EmptyDescription>
                    </EmptyHeader>
                    {onRetry ? (
                        <EmptyContent>
                            <Button variant="outline" className="rounded-full" onClick={onRetry}>
                                Try again
                            </Button>
                        </EmptyContent>
                    ) : null}
                </Empty>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-5.5rem)] flex-col items-center justify-center px-4 py-10">
            <h1 className="font-display text-center text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {isManaging
                    ? "Manage organizations"
                    : organizations.length === 0
                      ? "Create an organization"
                      : "Choose an organization"}
            </h1>

            <ul className="mt-12 flex flex-wrap items-start justify-center gap-6 sm:gap-8">
                {organizations.map((organization) => {
                    const isStarred = starredOrgId === organization.id;
                    const tile = (
                        <OrganizationTileFace organization={organization} isManaging={isManaging} />
                    );

                    return (
                        <li key={organization.id} className="group w-28 sm:w-32 md:w-36">
                            <div className="relative">
                                {isManaging ? (
                                    renderOrganizationAction(
                                        organization,
                                        <button
                                            type="button"
                                            className="block w-full cursor-pointer rounded-md border-0 bg-transparent p-0 outline-none ring-offset-background transition duration-200 group-hover:ring-4 group-hover:ring-foreground/90"
                                            aria-label={`Edit ${organization.name}`}
                                        >
                                            {tile}
                                        </button>,
                                    )
                                ) : (
                                    <Link
                                        to={getOrganizationWorkspacePath(organization.id)}
                                        aria-label={`Open ${organization.name}`}
                                        className="block rounded-md outline-none ring-offset-background transition duration-200 hover:ring-4 hover:ring-foreground/90"
                                    >
                                        {tile}
                                    </Link>
                                )}

                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        onToggleStar(organization.id);
                                    }}
                                    className="absolute -right-2 -top-2 z-10 rounded-full border border-border/70 bg-background/95 p-1.5 text-muted-foreground shadow-sm transition-colors hover:text-amber-500"
                                    title={isStarred ? "Default organization" : "Star to open by default"}
                                    aria-pressed={isStarred}
                                    aria-label={
                                        isStarred
                                            ? `Unstar ${organization.name}`
                                            : `Star ${organization.name} to open by default`
                                    }
                                >
                                    <Star
                                        className={cn(
                                            "size-4",
                                            isStarred ? "fill-amber-500 text-amber-500" : "text-muted-foreground/70",
                                        )}
                                    />
                                </button>
                            </div>

                            <p
                                className={cn(
                                    "mt-3 truncate text-center text-sm font-medium sm:text-base",
                                    isStarred ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                                )}
                            >
                                {organization.name}
                            </p>
                        </li>
                    );
                })}

                <li className="group w-28 sm:w-32 md:w-36">
                    <div
                        className={cn(
                            tileFrameClassName,
                            "rounded-md text-muted-foreground transition duration-200 group-hover:ring-4 group-hover:ring-foreground/90",
                        )}
                    >
                        {addOrganization}
                    </div>
                    <p className="mt-3 text-center text-sm font-medium text-muted-foreground group-hover:text-foreground sm:text-base">
                        Add organization
                    </p>
                </li>
            </ul>

            {organizations.length > 0 ? (
                <Button
                    type="button"
                    variant="outline"
                    className="mt-14 h-11 rounded-none border-foreground/70 bg-transparent px-8 text-sm font-medium tracking-[0.18em] uppercase text-foreground hover:bg-foreground hover:text-background"
                    onClick={onToggleManaging}
                >
                    {isManaging ? "Done" : "Manage organizations"}
                </Button>
            ) : null}
        </div>
    );
};

export const organizationPickerAddTrigger = (
    <span className="flex size-full items-center justify-center bg-transparent">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground sm:size-20">
            <Plus className="size-10" strokeWidth={1.5} />
        </span>
    </span>
);

export default OrganizationPickerView;
