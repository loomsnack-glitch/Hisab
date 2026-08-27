export const authKeys = {
  me: ["auth", "me"] as const,
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
  invoiceAppearance: (organizationId: string, storeId: string) =>
    [...organizationKeys.all, "invoice-appearance", organizationId, storeId] as const,
};

export const serviceTableKeys = {
  all: ["service-tables"] as const,
  store: (organizationId: string, storeId: string) =>
    [...serviceTableKeys.all, organizationId, storeId] as const,
  pos: (organizationId: string, storeId: string) =>
    [...serviceTableKeys.all, "pos", organizationId, storeId] as const,
};

export const serviceAreaKeys = {
  all: ["service-areas"] as const,
  store: (organizationId: string, storeId: string) =>
    [...serviceAreaKeys.all, organizationId, storeId] as const,
  pos: (organizationId: string, storeId: string) =>
    [...serviceAreaKeys.all, "pos", organizationId, storeId] as const,
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
  labelTemplates: (organizationId: string) =>
    [...catalogKeys.all, "label-templates", organizationId] as const,
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
  accounts: (organizationId: string) =>
    [...whatsappKeys.all, "accounts", organizationId] as const,
  cloudAccounts: (organizationId: string) =>
    [...whatsappKeys.all, "cloud-accounts", organizationId] as const,
  cloudTemplates: (organizationId: string, accountId: string) =>
    [...whatsappKeys.all, "cloud-templates", organizationId, accountId] as const,
  publicInvoiceTemplateConfig: (organizationId: string) =>
    [...whatsappKeys.all, "public-invoice-template-config", organizationId] as const,
  cloudSafety: (organizationId: string) =>
    [...whatsappKeys.all, "cloud-safety", organizationId] as const,
  cloudOutbox: (organizationId: string) =>
    [...whatsappKeys.all, "cloud-outbox", organizationId] as const,
  organizationAccount: (organizationId: string, accountId: string) =>
    [...whatsappKeys.all, "organization-account", organizationId, accountId] as const,
  account: (organizationId: string, storeId: string) =>
    [...whatsappKeys.all, "account", organizationId, storeId] as const,
  conversations: (organizationId: string, storeId: string) =>
    [...whatsappKeys.all, "conversations", organizationId, storeId] as const,
  conversation: (organizationId: string, storeId: string, conversationId: string) =>
    [...whatsappKeys.conversations(organizationId, storeId), conversationId] as const,
  invoice: (organizationId: string, storeId: string, saleId: string) =>
    [...whatsappKeys.all, "invoice", organizationId, storeId, saleId] as const,
  posInvoice: (saleId: string) => [...whatsappKeys.all, "pos-invoice", saleId] as const,
  dueReminder: (organizationId: string, storeId: string, saleId: string) =>
    [...whatsappKeys.all, "due-reminder", organizationId, storeId, saleId] as const,
  posDueReminder: (saleId: string) => [...whatsappKeys.all, "pos-due-reminder", saleId] as const,
  templates: (organizationId: string, storeId: string, kind: string) =>
    [...whatsappKeys.all, "templates", organizationId, storeId, kind] as const,
  promotions: (organizationId: string, storeId: string, days = 30, page = 1) =>
    [...whatsappKeys.all, "promotions", organizationId, storeId, days, page] as const,
  posTemplates: (kind: string) => [...whatsappKeys.all, "pos-templates", kind] as const,
  posAccount: () => [...whatsappKeys.all, "pos-account"] as const,
};
