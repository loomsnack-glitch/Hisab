import type {
    CommercialHistoryEntryDTO,
    StoreCommercialStatusDTO,
    StoreLicenseBaseAccessDTO,
} from "@repo/types";

import { getEffectiveCommercialAccess } from "@/lib/commercial-access-summary";

export const LICENSE_WORKSPACE_TABS = [
    { id: "plans", label: "Plans" },
    { id: "history", label: "Plan history" },
    { id: "payments", label: "Payment history" },
] as const;

export type LicenseWorkspaceTab = (typeof LICENSE_WORKSPACE_TABS)[number]["id"];

export type PreviousPaidPlan = {
    planKey: string;
    planDisplayName: string;
    status: StoreLicenseBaseAccessDTO["status"] | string;
    startsAt: string | Date;
    endsAt: string | Date;
    availablePlan: StoreCommercialStatusDTO["availablePaidPlans"][number] | null;
};

export type AccessTimelineEntry = {
    id: string;
    title: string;
    detail: string;
    startsAt: string | Date;
    endsAt: string | Date;
    status: string;
};

export const parseLicenseWorkspaceTab = (value: string | null | undefined): LicenseWorkspaceTab => {
    if (value === "history" || value === "payments") return value;
    return "plans";
};

const paidLicenseFromHistory = (
    entry: CommercialHistoryEntryDTO,
    availablePaidPlans: StoreCommercialStatusDTO["availablePaidPlans"],
): PreviousPaidPlan | null => {
    if (entry.kind !== "license") return null;
    if (entry.status !== "expired" && entry.status !== "revoked") return null;
    const planKey = entry.detail.split(" · ").at(-1)?.trim() ?? "";
    if (!planKey) return null;
    return {
        planKey,
        planDisplayName: entry.title.split(" · ").at(-1)?.trim() || entry.title,
        status: entry.status,
        startsAt: entry.occurredAt,
        endsAt: entry.occurredAt,
        availablePlan: availablePaidPlans.find((plan) => plan.key === planKey) ?? null,
    };
};

export const resolvePreviousPaidPlan = (status: StoreCommercialStatusDTO): PreviousPaidPlan | null => {
    if (getEffectiveCommercialAccess(status)) return null;

    const latestPaidLicense = [...(status.storeLicenses ?? [])]
        .filter((license) => license.planType === "paid")
        .sort((left, right) => new Date(right.endsAt).getTime() - new Date(left.endsAt).getTime())[0];

    if (latestPaidLicense) {
        if (latestPaidLicense.status !== "expired" && latestPaidLicense.status !== "revoked") {
            return null;
        }
        return {
            planKey: latestPaidLicense.planKey,
            planDisplayName: latestPaidLicense.planDisplayName,
            status: latestPaidLicense.status,
            startsAt: latestPaidLicense.startsAt,
            endsAt: latestPaidLicense.endsAt,
            availablePlan: status.availablePaidPlans.find((plan) => plan.key === latestPaidLicense.planKey) ?? null,
        };
    }

    const historyLicense = status.commercialHistory.find((entry) => entry.kind === "license");
    return historyLicense
        ? paidLicenseFromHistory(historyLicense, status.availablePaidPlans)
        : null;
};

export const shouldIncludeTrialInCatalog = (status: StoreCommercialStatusDTO) => {
    if (!status.availableTrialPlan) return false;
    if (getEffectiveCommercialAccess(status)) return false;
    return resolvePreviousPaidPlan(status)?.availablePlan == null;
};

export const shouldShowPlanCatalogByDefault = (status: StoreCommercialStatusDTO) => {
    if (getEffectiveCommercialAccess(status)) return false;
    return resolvePreviousPaidPlan(status)?.availablePlan == null;
};

export const isLicensePlanCatalogOpen = (browse: string | null | undefined, status: StoreCommercialStatusDTO) =>
    browse === "1" || shouldShowPlanCatalogByDefault(status);

export const visiblePaidPlans = (status: StoreCommercialStatusDTO) => {
    if (!status.scheduledSuccessor) return status.availablePaidPlans;
    return status.availablePaidPlans.filter((plan) => plan.checkoutAction !== "renewal");
};

export const compareLicenseCatalogSequence = (
    left: { displaySequence?: number; displayName: string; key: string },
    right: { displaySequence?: number; displayName: string; key: string },
) => {
    const leftSequence = left.displaySequence ?? Number.MAX_SAFE_INTEGER;
    const rightSequence = right.displaySequence ?? Number.MAX_SAFE_INTEGER;
    if (leftSequence !== rightSequence) return leftSequence - rightSequence;
    return left.displayName.localeCompare(right.displayName) || left.key.localeCompare(right.key);
};

export type LicenseCatalogCard =
    | {
        kind: "trial";
        key: string;
        displayName: string;
        displaySequence: number;
        trial: NonNullable<StoreCommercialStatusDTO["availableTrialPlan"]>;
    }
    | {
        kind: "paid";
        key: string;
        displayName: string;
        displaySequence: number;
        plan: StoreCommercialStatusDTO["availablePaidPlans"][number];
    };

export const orderedLicenseCatalogCards = ({
    trialPlan,
    plans,
}: {
    trialPlan?: StoreCommercialStatusDTO["availableTrialPlan"] | null;
    plans: StoreCommercialStatusDTO["availablePaidPlans"];
}): LicenseCatalogCard[] => {
    const cards: LicenseCatalogCard[] = [];
    if (trialPlan) {
        cards.push({
            kind: "trial",
            key: trialPlan.key,
            displayName: trialPlan.displayName,
            displaySequence: trialPlan.displaySequence,
            trial: trialPlan,
        });
    }
    for (const plan of plans) {
        cards.push({
            kind: "paid",
            key: plan.key,
            displayName: plan.displayName,
            displaySequence: plan.displaySequence ?? Number.MAX_SAFE_INTEGER,
            plan,
        });
    }
    return cards.sort(compareLicenseCatalogSequence);
};

export const currentPlanAction = (status: StoreCommercialStatusDTO) => {
    if (!getEffectiveCommercialAccess(status)) return null;
    if (status.scheduledSuccessor) {
        return { kind: "scheduled" as const, label: "Next term already scheduled" };
    }
    if (visiblePaidPlans(status).length === 0) return null;
    if (status.baseAccess?.planType === "paid" && status.baseAccess.status === "active") {
        return { kind: "renew" as const, label: "Renew now" };
    }
    return { kind: "choose" as const, label: "Choose a plan" };
};

export const buildAccessTimelineEntries = (status: StoreCommercialStatusDTO): AccessTimelineEntry[] => {
    const entries = new Map<string, AccessTimelineEntry>();
    const add = (entry: AccessTimelineEntry) => {
        entries.set(entry.id, entry);
    };

    for (const license of status.storeLicenses ?? []) {
        add({
            id: license.id,
            title: license.planDisplayName,
            detail: license.status === "scheduled" ? "Scheduled Store License" : "Store License",
            startsAt: license.startsAt,
            endsAt: license.endsAt,
            status: license.status,
        });
    }

    if (!status.storeLicenses?.length && status.baseAccess) {
        add({
            id: status.baseAccess.id,
            title: status.baseAccess.planDisplayName,
            detail: "Store License",
            startsAt: status.baseAccess.startsAt,
            endsAt: status.baseAccess.endsAt,
            status: status.baseAccess.status,
        });
    }

    for (const grant of status.accessGrants) {
        add({
            id: grant.id,
            title: grant.selectionLabel,
            detail: grant.label,
            startsAt: grant.startsAt,
            endsAt: grant.endsAt,
            status: grant.status,
        });
    }

    if (status.scheduledSuccessor) {
        add({
            id: status.scheduledSuccessor.id,
            title: status.scheduledSuccessor.planDisplayName,
            detail: "Scheduled Store License",
            startsAt: status.scheduledSuccessor.startsAt,
            endsAt: status.scheduledSuccessor.endsAt,
            status: status.scheduledSuccessor.status,
        });
    }

    return [...entries.values()].sort(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    );
};

export const currentTermRange = (status: StoreCommercialStatusDTO) => {
    const access = getEffectiveCommercialAccess(status);
    if (!access) return null;
    if (access.sourceKind === "store_license" && status.baseAccess?.status === "active") {
        return { startsAt: status.baseAccess.startsAt, endsAt: status.baseAccess.endsAt };
    }
    const grant = status.accessGrants
        .filter((entry) => entry.status === "active")
        .sort((left, right) => new Date(right.endsAt).getTime() - new Date(left.endsAt).getTime())[0];
    return grant ? { startsAt: grant.startsAt, endsAt: grant.endsAt } : { startsAt: null, endsAt: access.endsAt };
};

export const remainingTermPercent = (
    range: { startsAt: string | Date | null; endsAt: string | Date },
    now: Date,
) => {
    if (!range.startsAt) return null;
    const start = new Date(range.startsAt).getTime();
    const end = new Date(range.endsAt).getTime();
    if (end <= start) return 0;
    const remaining = Math.min(1, Math.max(0, (end - now.getTime()) / (end - start)));
    return Math.round(remaining * 100);
};
