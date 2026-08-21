import {
  STATUS_CODES,
  type ServiceResponse,
  type WhatsAppMessageTemplateKind,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import { getCloudTemplateBindingSnapshot } from "./cloud-template.repository";
import { admitCloudTemplateSend, type CloudTemplateAdmissionInput } from "./cloud-template-admission";
import * as consentRepository from "./customer-consent.repository";
import { createCloudTemplateOutbox, type CloudTemplateOutboxRecord } from "./cloud-template-outbox.repository";

type CloudTemplateSendDependencies = {
  organizationAccess: (organizationId: string, userId: string) => Promise<boolean>;
  getBinding: typeof getCloudTemplateBindingSnapshot;
  getCustomer: typeof consentRepository.getCustomerMessagingState;
  enqueue: typeof createCloudTemplateOutbox;
};

const dependencies = (): CloudTemplateSendDependencies => ({
  organizationAccess: async (organizationId, userId) => Boolean(await organizationRepository.getOrganizationByIdForUser(organizationId, userId)),
  getBinding: getCloudTemplateBindingSnapshot,
  getCustomer: consentRepository.getCustomerMessagingState,
  enqueue: createCloudTemplateOutbox,
});

export const enqueueCloudTemplateSend = async (
  userId: string,
  organizationId: string,
  input: {
    storeId: string;
    accountId: string;
    customerId: string;
    bindingId: string;
    idempotencyKey: string;
    campaignKey?: string | null;
    intent: WhatsAppMessageTemplateKind;
    mode?: "template" | "freeform";
    outboundComponents?: CloudTemplateAdmissionInput["outboundComponents"];
    lastInboundAt?: string | null;
  },
  injected: Partial<CloudTemplateSendDependencies> = {},
): Promise<ServiceResponse<CloudTemplateOutboxRecord | null>> => {
  const deps = { ...dependencies(), ...injected };
  if (!await deps.organizationAccess(organizationId, userId)) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  const binding = await deps.getBinding(organizationId, input.bindingId);
  const customer = await deps.getCustomer(organizationId, input.customerId);
  if (!binding || !customer || !customer.phone) return { status: "error", message: "Template binding or customer not found", data: null, code: STATUS_CODES.NOT_FOUND };
  const admission = admitCloudTemplateSend({
    intent: input.intent,
    mode: input.mode ?? "template",
    binding: binding.binding,
    asset: binding.asset,
    customer,
    outboundComponents: input.outboundComponents,
    lastInboundAt: input.lastInboundAt,
  });
  if (!admission.admitted) return { status: "error", message: admission.message, data: null, code: STATUS_CODES.CONFLICT };
  try {
    const queued = await deps.enqueue({
      organizationId,
      storeId: input.storeId,
      accountId: input.accountId,
      customerId: input.customerId,
      customerPhone: customer.phone,
      customerName: customer.name,
      intent: input.intent,
      snapshot: admission.snapshot,
      messageId: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      campaignKey: input.campaignKey,
    });
    return { status: "success", message: "Cloud WhatsApp template queued", data: queued, code: STATUS_CODES.CREATED };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Cloud WhatsApp template could not be queued", data: null, code: STATUS_CODES.CONFLICT };
  }
};
