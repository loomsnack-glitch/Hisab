import { useEffect, useState } from "react";

import CommercialCatalogFeaturesPage, { type CommercialCatalogFeaturesPageProps } from "@/components/commercial-catalog-features-page";
import CommercialCatalogModulesPage, { type CommercialCatalogModulesPageProps } from "@/components/commercial-catalog-modules-page";
import CommercialCatalogPlansPage, { type CommercialCatalogPlansPageProps } from "@/components/commercial-catalog-plans-page";
import { CommercialCatalogSectionNav } from "@/components/commercial-catalog-ui";
import { parseCommercialCatalogPath, type CommercialCatalogLocation } from "@/lib/commercial-catalog-url";

export type CommercialCatalogPageProps =
    & CommercialCatalogFeaturesPageProps
    & CommercialCatalogModulesPageProps
    & CommercialCatalogPlansPageProps;

const CommercialCatalogPage = (props: CommercialCatalogPageProps) => {
    const [location, setLocation] = useState<CommercialCatalogLocation>(() =>
        typeof window === "undefined" ? { kind: "features" } : parseCommercialCatalogPath(window.location.pathname),
    );

    useEffect(() => {
        const syncLocation = () => setLocation(parseCommercialCatalogPath(window.location.pathname));
        window.addEventListener("popstate", syncLocation);
        return () => window.removeEventListener("popstate", syncLocation);
    }, []);

    const showNav = location.kind === "features" || location.kind === "modules" || location.kind === "plans";
    const currentSection = location.kind === "feature"
        ? "features"
        : location.kind === "module"
            ? "modules"
            : location.kind === "plan"
                ? "plans"
                : location.kind;

    return (
        <div className="space-y-6">
            {showNav ? <CommercialCatalogSectionNav current={currentSection} /> : null}
            {location.kind === "modules" || location.kind === "module" ? (
                <CommercialCatalogModulesPage {...props} />
            ) : location.kind === "plans" || location.kind === "plan" ? (
                <CommercialCatalogPlansPage {...props} />
            ) : (
                <CommercialCatalogFeaturesPage {...props} />
            )}
        </div>
    );
};

export default CommercialCatalogPage;
