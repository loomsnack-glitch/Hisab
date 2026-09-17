import { WhatsAppCloudApiClient } from "./cloud-api/cloud-api.client";
import type { CloudTemplateComponent } from "./cloud-api/cloud-outbound";
import type { WhatsAppPlatformConfig } from "@/services/notifications/whatsapp-platform-config";

export type PlatformTemplateKind = "bill" | "due_reminder";

export const PLATFORM_TEMPLATE_VARIABLES: Record<PlatformTemplateKind, readonly string[]> = {
  bill: [
    "customer_name",
    "bill_number",
    "total",
    "paid",
    "balance_due",
    "store_name",
    "organization_name",
    "invoice_url",
  ],
  due_reminder: [
    "customer_name",
    "total_due",
    "bill_count",
    "store_name",
    "invoice_url",
  ],
};

export type PlatformProviderTemplate = Readonly<{
  name: string;
  language: string;
  category: string;
  status: string;
  components: unknown[];
}>;

export type PlatformTemplateHealth = Readonly<{
  kind: PlatformTemplateKind;
  name: string;
  language: string;
  category: "utility";
  status: "approved";
  components: unknown[];
}>;

export class WhatsAppPlatformTemplateUnavailableError extends Error {
  constructor() {
    super("Ganatri WhatsApp utility template is not approved or does not match its fixed contract");
    this.name = "WhatsAppPlatformTemplateUnavailableError";
  }
}

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
};

const providerTemplate = (value: Record<string, unknown>): PlatformProviderTemplate | null => {
  const name = asString(value.name);
  const language = typeof value.language === "string"
    ? asString(value.language)
    : value.language && typeof value.language === "object"
      ? asString((value.language as { code?: unknown }).code)
      : null;
  const category = asString(value.category);
  const status = asString(value.status);
  if (!name || !language || !category || !status || !Array.isArray(value.components)) return null;
  return { name, language, category: category.toLowerCase(), status: status.toLowerCase(), components: value.components };
};

const placeholderIndexes = (components: unknown[]): string[] => {
  const indexes = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== "string") return;
    for (const match of value.matchAll(/\{\{(\d+)\}\}/g)) {
      if (match[1]) indexes.add(match[1]);
    }
  };
  for (const component of components) {
    if (!component || typeof component !== "object" || Array.isArray(component)) continue;
    const record = component as Record<string, unknown>;
    add(record.text);
    if (Array.isArray(record.buttons)) {
      for (const button of record.buttons) {
        if (button && typeof button === "object" && !Array.isArray(button)) add((button as Record<string, unknown>).url);
      }
    }
  }
  return [...indexes].sort((left, right) => Number(left) - Number(right));
};

export const validatePlatformTemplate = (
  kind: PlatformTemplateKind,
  expectedName: string,
  expectedLanguage: string,
  raw: Record<string, unknown>,
): PlatformTemplateHealth | null => {
  const template = providerTemplate(raw);
  if (!template || template.name !== expectedName || template.language !== expectedLanguage) return null;
  if (template.category !== "utility" || template.status !== "approved") return null;
  const indexes = placeholderIndexes(template.components);
  const expectedIndexes = PLATFORM_TEMPLATE_VARIABLES[kind].map((_, index) => String(index + 1));
  if (indexes.length === 0 || indexes.some(index => !expectedIndexes.includes(index))) return null;
  if (JSON.stringify(indexes) !== JSON.stringify(indexes.map((_, index) => String(index + 1)))) return null;
  return {
    kind,
    name: template.name,
    language: template.language,
    category: "utility",
    status: "approved",
    components: template.components,
  };
};

export const resolvePlatformTemplate = async (
  kind: PlatformTemplateKind,
  config: WhatsAppPlatformConfig,
  provider: Pick<WhatsAppCloudApiClient, "getTemplates"> = new WhatsAppCloudApiClient({
    accessToken: config.accessToken,
    graphVersion: config.graphVersion,
    baseUrl: config.graphBaseUrl,
  }),
  expectedName = kind === "bill" ? config.billTemplateName : config.dueTemplateName,
): Promise<PlatformTemplateHealth> => {
  const templates = await provider.getTemplates(config.wabaId);
  const match = (templates.data ?? [])
    .map(value => (value && typeof value === "object" && !Array.isArray(value) ? validatePlatformTemplate(kind, expectedName, config.templateLanguage, value as Record<string, unknown>) : null))
    .find(Boolean);
  if (!match) throw new WhatsAppPlatformTemplateUnavailableError();
  return match;
};

const valueFor = (kind: PlatformTemplateKind, index: string, values: Record<string, string>): string => {
  const token = PLATFORM_TEMPLATE_VARIABLES[kind][Number(index) - 1];
  const value = token ? values[token]?.trim() : "";
  if (!value) throw new WhatsAppPlatformTemplateUnavailableError();
  return value;
};

export const buildPlatformTemplateComponents = (
  kind: PlatformTemplateKind,
  template: PlatformTemplateHealth,
  values: Record<string, string>,
): CloudTemplateComponent[] => {
  const result: CloudTemplateComponent[] = [];
  for (const component of template.components) {
    if (!component || typeof component !== "object" || Array.isArray(component)) continue;
    const record = component as Record<string, unknown>;
    const type = asString(record.type)?.toLowerCase();
    if (type === "body" || type === "header") {
      const format = asString(record.format)?.toLowerCase();
      const text = typeof record.text === "string" ? record.text : "";
      const indexes = [...text.matchAll(/\{\{(\d+)\}\}/g)].map(match => match[1]).filter((index): index is string => Boolean(index));
      if (indexes.length === 0) continue;
      if (type === "header" && format && format !== "text") throw new WhatsAppPlatformTemplateUnavailableError();
      result.push({ type, parameters: indexes.map(index => ({ type: "text", text: valueFor(kind, index, values) })) });
      continue;
    }
    if (type === "buttons" && Array.isArray(record.buttons)) {
      record.buttons.forEach((button, index) => {
        if (!button || typeof button !== "object" || Array.isArray(button)) return;
        const urlValue = (button as Record<string, unknown>).url;
        const url = typeof urlValue === "string" ? urlValue : "";
        const indexes = [...url.matchAll(/\{\{(\d+)\}\}/g)].map(match => match[1]).filter((value): value is string => Boolean(value));
        if (indexes.length > 0) {
          result.push({ type: "button", sub_type: "url", index: String(index), parameters: indexes.map(value => ({ type: "text", text: valueFor(kind, value, values) })) });
        }
      });
    }
  }
  return result;
};
