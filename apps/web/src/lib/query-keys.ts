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
