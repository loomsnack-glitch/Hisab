const ORGANIZATION_CATALOG_PATH =
    /^\/organizations\/[^/]+\/(?:products|units|customers|money-accounts|vendors|purchases|expenses|reports)(?:\/|$)/;

const STORE_CATALOG_PATH =
    /^\/organizations\/[^/]+\/workspaces\/[^/]+\/(?:products|add-ons|categories|tables|devices|settings|vendors|license|reports)(?:\/|$)/;

const APPEARANCE_PATH = /\/appearance(?:\/|$)/;

export const isFullWidthDashboardPath = (pathname: string): boolean => {
    if (pathname.includes("/billing")) {
        return true;
    }

    if (APPEARANCE_PATH.test(pathname)) {
        return true;
    }

    return ORGANIZATION_CATALOG_PATH.test(pathname) || STORE_CATALOG_PATH.test(pathname);
};
