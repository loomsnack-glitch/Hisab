import type { CommercialCatalogRevisionStatus, CommercialFeatureListStatusFilter } from "@repo/types";

import { commercialCatalogRevisionStatuses } from "@/lib/commercial-catalog-url";

export const commercialCatalogDefaultStatusSelection = (): Set<CommercialCatalogRevisionStatus> => new Set(["active"]);

export const commercialCatalogStatusSelectionFromStatuses = (
    statuses?: readonly CommercialCatalogRevisionStatus[] | null,
): Set<CommercialCatalogRevisionStatus> => {
    if (!statuses?.length) return commercialCatalogDefaultStatusSelection();
    const valid = statuses.filter((status) => commercialCatalogRevisionStatuses.includes(status));
    return valid.length > 0 ? new Set(valid) : commercialCatalogDefaultStatusSelection();
};

export const commercialCatalogResolveInitialStatusSelection = ({
    initialStatus,
    initialStatuses,
    urlStatuses,
}: {
    initialStatus?: CommercialFeatureListStatusFilter;
    initialStatuses?: CommercialCatalogRevisionStatus[];
    urlStatuses?: CommercialCatalogRevisionStatus[];
}): Set<string> => {
    if (urlStatuses?.length) return commercialCatalogStatusSelectionFromStatuses(urlStatuses);
    if (initialStatuses?.length) return commercialCatalogStatusSelectionFromStatuses(initialStatuses);
    if (initialStatus === "all") return commercialCatalogStatusSelectionFromStatuses(commercialCatalogRevisionStatuses);
    if (initialStatus) return new Set([initialStatus]);
    return commercialCatalogDefaultStatusSelection();
};

export const commercialCatalogNormalizeStatusSelection = (selection: Set<string>): Set<CommercialCatalogRevisionStatus> =>
    commercialCatalogStatusSelectionFromStatuses(
        [...selection].filter((value): value is CommercialCatalogRevisionStatus =>
            commercialCatalogRevisionStatuses.includes(value as CommercialCatalogRevisionStatus)),
    );

export const commercialCatalogStatusesFromSelection = (selection: Set<string>): CommercialCatalogRevisionStatus[] =>
    [...commercialCatalogNormalizeStatusSelection(selection)];

export const commercialCatalogPrimaryListStatus = (
    selection: Set<string>,
): CommercialFeatureListStatusFilter => {
    const statuses = commercialCatalogStatusesFromSelection(selection);
    return statuses.length === 1 ? statuses[0]! : "all";
};

export const commercialCatalogNeedsDiscardedListFetch = (selection: Set<string>): boolean => {
    const statuses = commercialCatalogStatusesFromSelection(selection);
    return statuses.length > 1 && statuses.includes("discarded");
};

export const filterCommercialCatalogListItems = <T extends { status: CommercialCatalogRevisionStatus }>(
    items: T[],
    selection: Set<string>,
): T[] => {
    const statuses = commercialCatalogNormalizeStatusSelection(selection);
    return items.filter((item) => statuses.has(item.status));
};
