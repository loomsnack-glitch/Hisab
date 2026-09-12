const ORGANIZATION_CATALOG_PATH =
    /^\/organizations\/[^/]+\/(?:products|units)(?:\/|$)/;

const STORE_CATALOG_PATH =
    /^\/organizations\/[^/]+\/workspaces\/[^/]+\/(?:products|add-ons|categories|tables)(?:\/|$)/;

export const isFullWidthDashboardPath = (pathname: string): boolean => {
    if (pathname.includes("/billing")) {
        return true;
    }

    return ORGANIZATION_CATALOG_PATH.test(pathname) || STORE_CATALOG_PATH.test(pathname);
};
