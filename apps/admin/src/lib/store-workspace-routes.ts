const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getStoreWorkspacePath = (organizationId: string, storeId: string) =>
    `/organizations/${organizationId}/workspaces/${storeId}`;

export const getStoreProductsPath = (organizationId: string, storeId: string) =>
    `${getStoreWorkspacePath(organizationId, storeId)}/products`;

export const getStoreAddOnsPath = (organizationId: string, storeId: string) =>
    `${getStoreWorkspacePath(organizationId, storeId)}/add-ons`;

export const getStoreCategoriesPath = (organizationId: string, storeId: string) =>
    `${getStoreWorkspacePath(organizationId, storeId)}/categories`;

export const getStoreVendorsPath = (organizationId: string, storeId: string) =>
    `${getStoreWorkspacePath(organizationId, storeId)}/vendors`;

export const getStoreDevicesPath = (organizationId: string, storeId: string) =>
    `${getStoreWorkspacePath(organizationId, storeId)}/devices`;

export const getStoreSettingsPath = (organizationId: string, storeId: string) =>
    `${getStoreWorkspacePath(organizationId, storeId)}/settings`;

export const getStoreLicensePath = (organizationId: string, storeId: string) =>
    `${getStoreWorkspacePath(organizationId, storeId)}/license`;

export const getStoreBillingPath = (organizationId: string, storeId: string) =>
    `${getStoreWorkspacePath(organizationId, storeId)}/billing`;

export const getStoreTablesPath = (organizationId: string, storeId: string) =>
    `${getStoreWorkspacePath(organizationId, storeId)}/tables`;

export const getStoreAppearancePath = (organizationId: string, storeId: string) =>
    `${getStoreWorkspacePath(organizationId, storeId)}/appearance`;

export const parseStoreWorkspacePath = (
    pathname: string,
): { organizationId: string; storeId: string } | null => {
    const match = pathname.match(/^\/organizations\/([^/]+)\/workspaces\/([^/]+)(?:\/.*)?$/);
    if (!match) {
        return null;
    }

    const organizationId = match[1] ?? "";
    const storeId = match[2] ?? "";
    if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(storeId)) {
        return null;
    }

    return { organizationId, storeId };
};

export const isStoreWorkspacePath = (pathname: string) => parseStoreWorkspacePath(pathname) !== null;

export const isStoreWorkspaceNavActive = (pathname: string) =>
    /\/organizations\/[^/]+\/workspaces(\/|$)/.test(pathname);
