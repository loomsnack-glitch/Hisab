export const authKeys = {
    me: ["auth", "me"] as const,
};

export const organizationKeys = {
    all: ["organizations"] as const,
    list: () => [...organizationKeys.all, "list"] as const,
    detail: (organizationId: string) => [...organizationKeys.all, "detail", organizationId] as const,
};

export const catalogKeys = {
    all: ["catalog"] as const,
    categories: (organizationId: string) => [...catalogKeys.all, "categories", organizationId] as const,
    products: (organizationId: string) => [...catalogKeys.all, "products", organizationId] as const,
};

export const billingKeys = {
    all: ["billing"] as const,
    organization: (organizationId: string) => [...billingKeys.all, "organization", organizationId] as const,
    customers: (organizationId: string) => [...billingKeys.organization(organizationId), "customers"] as const,
    sales: (organizationId: string, storeId: string) => [...billingKeys.organization(organizationId), "sales", storeId] as const,
    sale: (organizationId: string, storeId: string, saleId: string) =>
        [...billingKeys.sales(organizationId, storeId), "detail", saleId] as const,
};
