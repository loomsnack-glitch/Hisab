export const authKeys = {
  me: ["auth", "me"] as const,
};

export const deviceAuthKeys = {
  me: ["device-auth", "me"] as const,
};

export const organizationKeys = {
  all: ["organizations"] as const,
  list: () => [...organizationKeys.all, "list"] as const,
  usernameAvailability: (username: string) =>
    [...organizationKeys.all, "username-availability", username] as const,
  detail: (organizationId: string) =>
    [...organizationKeys.all, "detail", organizationId] as const,
  catalogSettings: (organizationId: string) =>
    [...organizationKeys.all, "catalog-settings", organizationId] as const,
};

export const catalogKeys = {
  all: ["catalog"] as const,
  categories: (organizationId: string) =>
    [...catalogKeys.all, "categories", organizationId] as const,
  products: (organizationId: string) =>
    [...catalogKeys.all, "products", organizationId] as const,
  combos: (organizationId: string) =>
    [...catalogKeys.products(organizationId), "combos"] as const,
  addOns: (organizationId: string) =>
    [...catalogKeys.all, "add-ons", organizationId] as const,
  productAttachments: (organizationId: string, productId: string) =>
    [
      ...catalogKeys.all,
      "product-attachments",
      organizationId,
      productId,
    ] as const,
  selectableProductAttachments: (organizationId: string) =>
    [
      ...catalogKeys.all,
      "selectable-product-attachments",
      organizationId,
    ] as const,
};

export const billingKeys = {
  all: ["billing"] as const,
  organization: (organizationId: string) =>
    [...billingKeys.all, "organization", organizationId] as const,
  customers: (organizationId: string, filters?: Record<string, unknown>) =>
    [
      ...billingKeys.organization(organizationId),
      "customers",
      filters ?? {},
    ] as const,
  customerLedger: (organizationId: string, customerId: string) =>
    [...billingKeys.customers(organizationId), "ledger", customerId] as const,
  sales: (
    organizationId: string,
    storeId: string,
    filters?: Record<string, unknown>,
  ) =>
    [
      ...billingKeys.organization(organizationId),
      "sales",
      storeId,
      filters ?? {},
    ] as const,
  productSales: (organizationId: string, filters?: Record<string, unknown>) =>
    [
      ...billingKeys.organization(organizationId),
      "product-sales-summary",
      filters ?? {},
    ] as const,
  sale: (organizationId: string, storeId: string, saleId: string) =>
    [...billingKeys.sales(organizationId, storeId), "detail", saleId] as const,
  saleNumberSettings: (organizationId: string, storeId: string) =>
    [
      ...billingKeys.organization(organizationId),
      "sale-number-settings",
      storeId,
    ] as const,
  posProductSales: (filters?: Record<string, unknown>) =>
    [...billingKeys.all, "pos-product-sales-summary", filters ?? {}] as const,
};

export const purchaseKeys = {
  all: ["purchases"] as const,
  store: (organizationId: string, storeId: string) =>
    [...purchaseKeys.all, organizationId, storeId] as const,
  list: (
    organizationId: string,
    storeId: string,
    filters?: Record<string, unknown>,
  ) =>
    [
      ...purchaseKeys.store(organizationId, storeId),
      "list",
      filters ?? {},
    ] as const,
  detail: (organizationId: string, storeId: string, purchaseId: string) =>
    [
      ...purchaseKeys.store(organizationId, storeId),
      "detail",
      purchaseId,
    ] as const,
  summary: (organizationId: string, storeId: string) =>
    [...purchaseKeys.store(organizationId, storeId), "summary"] as const,
  posList: (filters?: Record<string, unknown>) =>
    [...purchaseKeys.all, "pos", "list", filters ?? {}] as const,
  posDetail: (purchaseId: string) =>
    [...purchaseKeys.all, "pos", "detail", purchaseId] as const,
  posSummary: () => [...purchaseKeys.all, "pos", "summary"] as const,
};

export const whatsappKeys = {
  all: ["whatsapp"] as const,
  account: (organizationId: string, storeId: string) =>
    [...whatsappKeys.all, "account", organizationId, storeId] as const,
};
