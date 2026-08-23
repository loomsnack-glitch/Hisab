import type { StoreMessageLink } from "../modules/organization/organization.type";
import type { WhatsAppMessageTemplateKind } from "./whatsapp.type";

export type WhatsAppTemplateToken = {
  name: string;
  label: string;
  description: string;
};

export type WhatsAppTemplateValidation = {
  tokens: string[];
  unknownTokens: string[];
};

export type WhatsAppTemplateValues = Record<string, string | null | undefined>;

export const WHATSAPP_TEMPLATE_TOKENS: Record<
  WhatsAppMessageTemplateKind,
  readonly WhatsAppTemplateToken[]
> = {
  bill: [
    { name: "customer_name", label: "Customer name", description: "The customer's name" },
    { name: "bill_number", label: "Bill number", description: "The Sale number" },
    { name: "total", label: "Total", description: "The Sale total" },
    { name: "paid", label: "Paid", description: "The amount already paid" },
    { name: "balance_due", label: "Balance due", description: "The remaining amount due" },
    { name: "store_name", label: "Store name", description: "The Store name" },
    { name: "organization_name", label: "Organization name", description: "The Organization name" },
  ],
  due_reminder: [
    { name: "customer_name", label: "Customer name", description: "The customer's name" },
    { name: "total_due", label: "Total due", description: "The customer's outstanding balance" },
    { name: "bill_count", label: "Bill count", description: "The number of due Sales" },
    { name: "store_name", label: "Store name", description: "The Store name" },
  ],
  promotion: [
    { name: "customer_name", label: "Customer name", description: "The customer's name" },
    { name: "store_name", label: "Store name", description: "The Store name" },
  ],
};

export const WHATSAPP_DEFAULT_TEMPLATE_BODIES: Partial<
  Record<WhatsAppMessageTemplateKind, string>
> = {
  bill: `Hello {{customer_name}},

Thank you for shopping with {{organization_name}}.

Your bill is attached for your reference.

Bill number: {{bill_number}}
Total amount: {{total}}
Paid: {{paid}}
Balance due: {{balance_due}}

Please keep this invoice for your records.
Regards from {{organization_name}}.
Thank you for shopping with us.`,
  due_reminder: `Hello {{customer_name}},

This is a friendly reminder from {{store_name}}.
Your total outstanding balance is {{total_due}}.
Number of bills: {{bill_count}}

Please contact us if you have already made the payment.
Thank you for your attention.`,
  promotion: `Hello {{customer_name}},

We have an offer for you from {{store_name}}.
Please check the offer details and contact us for assistance.

Thank you for choosing {{store_name}}. We look forward to serving you.`,
};

const TEMPLATE_TOKEN_PATTERN = /{{\s*([^{}]+?)\s*}}/g;
const normalizeToken = (token: string): string => token.trim().toLowerCase();
const unique = (values: string[]): string[] => [...new Set(values)];

export const whatsappLinkToken = (key: string): string => `link_${key}`;

export const getWhatsAppTemplateTokenNames = (template: string): string[] => {
  const tokens: string[] = [];
  for (const match of template.matchAll(TEMPLATE_TOKEN_PATTERN)) {
    if (match[1]) tokens.push(normalizeToken(match[1]));
  }
  return unique(tokens);
};

export const validateWhatsAppTemplate = (
  kind: WhatsAppMessageTemplateKind,
  template: string,
  links: StoreMessageLink[] = [],
): WhatsAppTemplateValidation => {
  const tokens = getWhatsAppTemplateTokenNames(template);
  const allowed = new Set(WHATSAPP_TEMPLATE_TOKENS[kind].map((token) => token.name));
  const activeLinkTokens = new Set(
    links.filter((link) => link.isActive).map((link) => whatsappLinkToken(link.key)),
  );
  return {
    tokens,
    unknownTokens: tokens.filter((token) => !allowed.has(token) && !activeLinkTokens.has(token)),
  };
};

const linkValues = (links: StoreMessageLink[]): WhatsAppTemplateValues =>
  Object.fromEntries(
    links
      .filter((link) => link.isActive)
      .map((link) => [whatsappLinkToken(link.key), link.url]),
  );

export const renderWhatsAppTemplate = (
  kind: WhatsAppMessageTemplateKind,
  template: string | null | undefined,
  values: WhatsAppTemplateValues,
  links: StoreMessageLink[] = [],
): string => {
  const source = template?.trim() || WHATSAPP_DEFAULT_TEMPLATE_BODIES[kind] || "";
  const valuesWithLinks = { ...values, ...linkValues(links) };
  return source
    .replace(TEMPLATE_TOKEN_PATTERN, (_, token: string) => valuesWithLinks[normalizeToken(token)] ?? "")
    .trim();
};

export const renderWhatsAppMessage = (input: {
  kind: WhatsAppMessageTemplateKind;
  template?: string | null;
  values: WhatsAppTemplateValues;
  links?: StoreMessageLink[];
}): string =>
  renderWhatsAppTemplate(input.kind, input.template, input.values, input.links ?? []);
