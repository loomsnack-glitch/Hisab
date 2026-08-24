import type { WhatsAppMessageTemplateKind } from "@repo/types";
import type { CloudTemplateComponent } from "./cloud-outbound";

type TemplateCategory = "marketing" | "utility" | "authentication" | "unknown";
type TemplateStatus = "approved" | "rejected" | "paused" | "disabled" | "pending" | "unknown";

export type CloudTemplateAdmissionInput = {
  intent: WhatsAppMessageTemplateKind;
  mode: "template" | "freeform";
  binding: { id: string; isActive: boolean; isDefault: boolean };
  asset: {
    id: string;
    version: number;
    name: string;
    languageCode: string;
    category: TemplateCategory;
    status: TemplateStatus;
    components: unknown[];
  };
  customer: {
    marketingOptedIn: boolean;
    utilityOptedIn: boolean;
    marketingOptedOut: boolean;
    whatsappSuppressed: boolean;
  };
  outboundComponents?: CloudTemplateComponent[];
  lastInboundAt?: string | null;
  now?: Date;
};

export type CloudTemplateAdmissionReason =
  | "binding_inactive"
  | "template_not_approved"
  | "template_category_mismatch"
  | "marketing_consent_required"
  | "utility_consent_required"
  | "customer_suppressed"
  | "template_variables_missing"
  | "freeform_window_expired";

export type CloudTemplateSendSnapshot = {
  bindingId: string;
  assetId: string;
  version: number;
  name: string;
  languageCode: string;
  category: TemplateCategory;
  intent: WhatsAppMessageTemplateKind;
  components: CloudTemplateComponent[];
};

export type CloudTemplateAdmissionResult =
  | { admitted: true; snapshot: CloudTemplateSendSnapshot }
  | { admitted: false; reason: CloudTemplateAdmissionReason; message: string };

const requiredParameters = (assetComponents: unknown[], outboundComponents: CloudTemplateAdmissionInput["outboundComponents"]): boolean => {
  if (!Array.isArray(outboundComponents)) return assetComponents.every(component => {
    if (!component || typeof component !== "object") return true;
    const text = (component as { text?: unknown }).text;
    return typeof text !== "string" || !/\{\{\d+\}\}/.test(text);
  });
  return assetComponents.every(component => {
    if (!component || typeof component !== "object") return true;
    const source = component as { type?: unknown; index?: unknown; text?: unknown };
    if (typeof source.text !== "string") return true;
    const required = new Set(source.text.match(/\{\{\d+\}\}/g) ?? []).size;
    if (required === 0) return true;
    const candidate = outboundComponents.find(item =>
      item.type.toLowerCase() === String(source.type ?? "body").toLowerCase()
      && (source.index == null || item.index === String(source.index)),
    );
    return (candidate?.parameters?.length ?? 0) >= required;
  });
};

const categoryFor = (intent: WhatsAppMessageTemplateKind): TemplateCategory => intent === "promotion" ? "marketing" : "utility";

export const admitCloudTemplateSend = (input: CloudTemplateAdmissionInput): CloudTemplateAdmissionResult => {
  if (input.customer.whatsappSuppressed) return { admitted: false, reason: "customer_suppressed", message: "WhatsApp messaging is suppressed for this customer" };
  if (!input.binding.isActive) return { admitted: false, reason: "binding_inactive", message: "The selected WhatsApp template binding is inactive" };
  if (input.mode === "template") {
    if (input.asset.status !== "approved") return { admitted: false, reason: "template_not_approved", message: "The selected WhatsApp template is not approved" };
    if (input.asset.category !== categoryFor(input.intent)) return { admitted: false, reason: "template_category_mismatch", message: "The selected WhatsApp template category does not match this message" };
    if (input.intent === "promotion" && (!input.customer.marketingOptedIn || input.customer.marketingOptedOut)) return { admitted: false, reason: "marketing_consent_required", message: "Marketing consent is required for this customer" };
    if (input.intent !== "promotion" && !input.customer.utilityOptedIn) return { admitted: false, reason: "utility_consent_required", message: "Utility WhatsApp consent is required for this customer" };
    if (!requiredParameters(input.asset.components, input.outboundComponents)) return { admitted: false, reason: "template_variables_missing", message: "Required WhatsApp template variables are missing" };
    return {
      admitted: true,
      snapshot: {
        bindingId: input.binding.id,
        assetId: input.asset.id,
        version: input.asset.version,
        name: input.asset.name,
        languageCode: input.asset.languageCode,
        category: input.asset.category,
        intent: input.intent,
        components: input.outboundComponents ?? [],
      },
    };
  }
  const lastInbound = input.lastInboundAt ? new Date(input.lastInboundAt).getTime() : Number.NaN;
  const now = (input.now ?? new Date()).getTime();
  if (!Number.isFinite(lastInbound) || now - lastInbound > 24 * 60 * 60 * 1_000 || lastInbound > now) return { admitted: false, reason: "freeform_window_expired", message: "A customer reply within the last 24 hours is required for free-form WhatsApp messaging" };
  return {
    admitted: true,
    snapshot: {
      bindingId: input.binding.id,
      assetId: input.asset.id,
      version: input.asset.version,
      name: input.asset.name,
      languageCode: input.asset.languageCode,
      category: input.asset.category,
      intent: input.intent,
      components: input.outboundComponents ?? [],
    },
  };
};
