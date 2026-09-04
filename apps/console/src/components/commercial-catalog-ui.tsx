import type { CommercialCatalogRevisionStatus, CommercialCatalogTerm } from "@repo/types";
import { PLATFORM_REPORTING_TIMEZONE } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";

import {
    commercialCatalogListPath,
    commercialCatalogModulesListPath,
    commercialCatalogPlansListPath,
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

export const commercialCatalogKotTableNote =
    "KOT System can be offered on its own. Table Management is initially offered only through Restaurant Operations together with KOT System.";

export const commercialCatalogUnauthorizedCode = (error: unknown, response?: { status?: string; code?: number }) =>
    (error as { code?: number } | null)?.code
    ?? (response?.status === "error" ? response.code : undefined);

type CatalogSection = "features" | "modules" | "plans";

type CommercialCatalogSectionNavProps = {
    current: CatalogSection;
};

export const CommercialCatalogSectionNav = ({ current }: CommercialCatalogSectionNavProps) => {
    const go = (path: string) => {
        if (`${window.location.pathname}${window.location.search}` !== path) {
            window.history.pushState(null, "", path);
            window.dispatchEvent(new Event("popstate"));
        }
    };

    const tab = (id: CatalogSection, label: string, path: string) => (
        <Button
            type="button"
            variant={current === id ? "secondary" : "ghost"}
            aria-current={current === id ? "page" : undefined}
            onClick={() => go(path)}
        >
            {label}
        </Button>
    );

    return (
        <nav aria-label="Commercial Catalog sections" className="flex flex-wrap gap-2">
            {tab("features", "Features", commercialCatalogListPath())}
            {tab("modules", "Modules", commercialCatalogModulesListPath())}
            {tab("plans", "Plans", commercialCatalogPlansListPath())}
        </nav>
    );
};
