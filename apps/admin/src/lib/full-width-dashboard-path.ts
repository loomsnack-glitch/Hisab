const ORGANIZATION_CATALOG_PATH =
    /^\/organizations\/[^/]+\/(?:products|units|customers|money-accounts|vendors)(?:\/|$)/;

const STORE_CATALOG_PATH =
    /^\/organizations\/[^/]+\/workspaces\/[^/]+\/(?:products|add-ons|categories|tables|devices)(?:\/|$)/;

export const isFullWidthDashboardPath = (pathname: string): boolean => {
    if (pathname.includes("/billing")) {
        return true;
    }

    return ORGANIZATION_CATALOG_PATH.test(pathname) || STORE_CATALOG_PATH.test(pathname);
};
