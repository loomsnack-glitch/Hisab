const DEFAULT_GRAPH_BASE_URL = "https://graph.facebook.com";
const PLATFORM_PHONE_NUMBER_ID = "WHATSAPP_PLATFORM_PHONE_NUMBER_ID";
const PLATFORM_ACCESS_TOKEN = "WHATSAPP_PLATFORM_ACCESS_TOKEN";
const PLATFORM_WABA_ID = "WHATSAPP_PLATFORM_WABA_ID";
const PLATFORM_GRAPH_BASE_URL = "WHATSAPP_PLATFORM_GRAPH_BASE_URL";
const PLATFORM_GRAPH_VERSION = "WHATSAPP_PLATFORM_GRAPH_VERSION";
const PLATFORM_BILL_TEMPLATE = "WHATSAPP_PLATFORM_BILL_TEMPLATE_NAME";
const PLATFORM_DUE_TEMPLATE = "WHATSAPP_PLATFORM_DUE_TEMPLATE_NAME";
const PLATFORM_TEMPLATE_LANGUAGE = "WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE";
const LEGACY_API_URL = "WHATSAPP_API_URL";
const LEGACY_ACCESS_TOKEN = "WHATSAPP_API_TOKEN";

type Environment = Record<string, string | undefined>;

export type WhatsAppPlatformConfig = Readonly<{
  phoneNumberId: string;
  accessToken: string;
  wabaId: string;
  graphBaseUrl: string;
  graphVersion: string;
  apiUrl: string;
  templateLanguage: string;
  billTemplateName: string;
  dueTemplateName: string;
}>;

export type WhatsAppPlatformConfigResult =
  | { status: "configured"; config: WhatsAppPlatformConfig }
  | {
      status: "incomplete";
      missing: readonly string[];
      invalid: readonly string[];
    };

export type WhatsAppPlatformConfigHealth = Readonly<{
  status: WhatsAppPlatformConfigResult["status"];
  phoneNumberId: string | null;
  wabaId: string | null;
  graphBaseUrl: string | null;
  graphVersion: string | null;
  apiUrl: string | null;
  templateLanguage: string | null;
  billTemplateName: string | null;
  dueTemplateName: string | null;
  missing: readonly string[];
  invalid: readonly string[];
}>;

export class WhatsAppPlatformConfigurationError extends Error {
  readonly code = "whatsapp_platform_not_configured";
  readonly missing: readonly string[];
  readonly invalid: readonly string[];

  constructor(result: Extract<WhatsAppPlatformConfigResult, { status: "incomplete" }>) {
    super("Ganatri WhatsApp platform sender is not configured");
    this.name = "WhatsAppPlatformConfigurationError";
    this.missing = result.missing;
    this.invalid = result.invalid;
  }
}

const value = (environment: Environment, key: string): string | undefined => {
  const candidate = environment[key]?.trim();
  return candidate || undefined;
};

const parseLegacyApiUrl = (raw: string | undefined): {
  phoneNumberId?: string;
  graphBaseUrl?: string;
  graphVersion?: string;
  invalid: boolean;
} => {
  if (!raw) return { invalid: false };
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return { invalid: true };
    const segments = url.pathname.split("/").filter(Boolean);
    const messagesIndex = segments.lastIndexOf("messages");
    if (messagesIndex < 1 || messagesIndex !== segments.length - 1) {
      return { invalid: true };
    }
    const phoneNumberId = segments[messagesIndex - 1];
    const graphVersion = segments[messagesIndex - 2];
    if (!phoneNumberId || !graphVersion) return { invalid: true };
    return {
      phoneNumberId,
      graphBaseUrl: url.origin,
      graphVersion,
      invalid: false,
    };
  } catch {
    return { invalid: true };
  }
};

const normalizeVersion = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const normalized = raw.replace(/^v/i, "v");
  return /^v\d+\.\d+$/.test(normalized) ? normalized : undefined;
};

const validGraphBaseUrl = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
      return undefined;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
};

const validNumericId = (raw: string | undefined): string | undefined =>
  raw && /^\d{6,32}$/.test(raw) ? raw : undefined;

const validToken = (raw: string | undefined): string | undefined =>
  raw && raw.length >= 8 && raw.length <= 8_192 ? raw : undefined;

const validLanguage = (raw: string | undefined): string | undefined =>
  raw && /^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(raw) ? raw : undefined;

const validTemplateName = (raw: string | undefined): string | undefined =>
  raw && /^[a-z0-9_]{1,512}$/.test(raw) ? raw : undefined;

const unique = (items: string[]): string[] => [...new Set(items)];

export const readWhatsAppPlatformConfig = (
  environment: Environment = process.env,
): WhatsAppPlatformConfigResult => {
  const legacyApiUrl = value(environment, LEGACY_API_URL);
  const legacy = parseLegacyApiUrl(legacyApiUrl);
  const missing: string[] = [];
  const invalid: string[] = [];

  if (legacy.invalid) invalid.push(LEGACY_API_URL);

  const phoneNumberId = value(environment, PLATFORM_PHONE_NUMBER_ID) || legacy.phoneNumberId;
  const accessToken = value(environment, PLATFORM_ACCESS_TOKEN) || value(environment, LEGACY_ACCESS_TOKEN);
  const wabaId = value(environment, PLATFORM_WABA_ID);
  const graphBaseUrl = validGraphBaseUrl(
    value(environment, PLATFORM_GRAPH_BASE_URL) ||
      legacy.graphBaseUrl ||
      value(environment, "WHATSAPP_CLOUD_GRAPH_BASE_URL") ||
      DEFAULT_GRAPH_BASE_URL,
  );
  const graphVersionInput =
    value(environment, PLATFORM_GRAPH_VERSION) ||
    legacy.graphVersion ||
    value(environment, "WHATSAPP_CLOUD_GRAPH_VERSION");
  const graphVersion = normalizeVersion(graphVersionInput);
  const templateLanguageInput = value(environment, PLATFORM_TEMPLATE_LANGUAGE);
  const templateLanguage = validLanguage(templateLanguageInput);
  const billTemplateInput = value(environment, PLATFORM_BILL_TEMPLATE);
  const dueTemplateInput = value(environment, PLATFORM_DUE_TEMPLATE);
  const billTemplateName = validTemplateName(billTemplateInput);
  const dueTemplateName = validTemplateName(dueTemplateInput);

  if (!phoneNumberId) missing.push(PLATFORM_PHONE_NUMBER_ID);
  else if (!validNumericId(phoneNumberId)) invalid.push(PLATFORM_PHONE_NUMBER_ID);

  if (!accessToken) missing.push(PLATFORM_ACCESS_TOKEN);
  else if (!validToken(accessToken)) invalid.push(PLATFORM_ACCESS_TOKEN);

  if (!wabaId) missing.push(PLATFORM_WABA_ID);
  else if (!validNumericId(wabaId)) invalid.push(PLATFORM_WABA_ID);

  if (!graphBaseUrl) invalid.push(PLATFORM_GRAPH_BASE_URL);
  if (!graphVersion) {
    if (graphVersionInput) invalid.push(PLATFORM_GRAPH_VERSION);
    else missing.push(PLATFORM_GRAPH_VERSION);
  }
  if (!templateLanguage) {
    if (templateLanguageInput) invalid.push(PLATFORM_TEMPLATE_LANGUAGE);
    else missing.push(PLATFORM_TEMPLATE_LANGUAGE);
  }
  if (!billTemplateName) {
    if (billTemplateInput) invalid.push(PLATFORM_BILL_TEMPLATE);
    else missing.push(PLATFORM_BILL_TEMPLATE);
  }
  if (!dueTemplateName) {
    if (dueTemplateInput) invalid.push(PLATFORM_DUE_TEMPLATE);
    else missing.push(PLATFORM_DUE_TEMPLATE);
  }

  if (
    missing.length > 0 ||
    invalid.length > 0 ||
    !phoneNumberId ||
    !accessToken ||
    !wabaId ||
    !graphBaseUrl ||
    !graphVersion ||
    !templateLanguage ||
    !billTemplateName ||
    !dueTemplateName
  ) {
    return {
      status: "incomplete",
      missing: unique(missing),
      invalid: unique(invalid),
    };
  }

  return {
    status: "configured",
    config: {
      phoneNumberId,
      accessToken,
      wabaId,
      graphBaseUrl,
      graphVersion,
      apiUrl: `${graphBaseUrl}/${graphVersion}/${phoneNumberId}/messages`,
      templateLanguage,
      billTemplateName,
      dueTemplateName,
    },
  };
};

export const requireWhatsAppPlatformConfig = (
  environment: Environment = process.env,
): WhatsAppPlatformConfig => {
  const result = readWhatsAppPlatformConfig(environment);
  if (result.status === "incomplete") throw new WhatsAppPlatformConfigurationError(result);
  return result.config;
};

export const getWhatsAppPlatformConfigHealth = (
  environment: Environment = process.env,
): WhatsAppPlatformConfigHealth => {
  const result = readWhatsAppPlatformConfig(environment);
  if (result.status === "incomplete") {
    return {
      status: result.status,
      phoneNumberId: null,
      wabaId: null,
      graphBaseUrl: null,
      graphVersion: null,
      apiUrl: null,
      templateLanguage: null,
      billTemplateName: null,
      dueTemplateName: null,
      missing: result.missing,
      invalid: result.invalid,
    };
  }

  return {
    status: result.status,
    phoneNumberId: result.config.phoneNumberId,
    wabaId: result.config.wabaId,
    graphBaseUrl: result.config.graphBaseUrl,
    graphVersion: result.config.graphVersion,
    apiUrl: result.config.apiUrl,
    templateLanguage: result.config.templateLanguage,
    billTemplateName: result.config.billTemplateName,
    dueTemplateName: result.config.dueTemplateName,
    missing: [],
    invalid: [],
  };
};
