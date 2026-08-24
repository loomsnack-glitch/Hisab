import {
  STATUS_CODES,
  type ServiceResponse,
  type WhatsAppCustomerConsentEventDTO,
  type WhatsAppRecordCustomerConsentJSON,
  type WhatsAppSetCustomerSuppressionJSON,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as repository from "./customer-consent.repository";

type ConsentRepository = Pick<typeof repository, "recordCustomerConsent" | "setCustomerSuppression" | "listCustomerConsentEvents">;
type ConsentServiceDependencies = ConsentRepository & {
  organizationAccess: (organizationId: string, userId: string) => Promise<boolean>;
};

const dependencies = (): ConsentServiceDependencies => ({
  recordCustomerConsent: repository.recordCustomerConsent,
  setCustomerSuppression: repository.setCustomerSuppression,
  listCustomerConsentEvents: repository.listCustomerConsentEvents,
  organizationAccess: async (organizationId, userId) => Boolean(await organizationRepository.getOrganizationByIdForUser(organizationId, userId)),
});

const notFound = (): ServiceResponse<WhatsAppCustomerConsentEventDTO | null> => ({
  status: "error",
  message: "Customer not found",
  data: null,
  code: STATUS_CODES.NOT_FOUND,
});

export const recordCustomerConsent = async (
  userId: string,
  organizationId: string,
  customerId: string,
  input: WhatsAppRecordCustomerConsentJSON,
  injected: Partial<ConsentServiceDependencies> = {},
): Promise<ServiceResponse<WhatsAppCustomerConsentEventDTO | null>> => {
  const deps = { ...dependencies(), ...injected };
  if (!await deps.organizationAccess(organizationId, userId)) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  try {
    const event = await deps.recordCustomerConsent(organizationId, customerId, userId, input);
    return event ? { status: "success", message: "Customer WhatsApp consent updated", data: event, code: STATUS_CODES.SUCCESS } : notFound();
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Customer WhatsApp consent could not be updated", data: null, code: STATUS_CODES.BAD_REQUEST };
  }
};

export const setCustomerSuppression = async (
  userId: string,
  organizationId: string,
  customerId: string,
  input: WhatsAppSetCustomerSuppressionJSON,
  injected: Partial<ConsentServiceDependencies> = {},
): Promise<ServiceResponse<WhatsAppCustomerConsentEventDTO | null>> => {
  const deps = { ...dependencies(), ...injected };
  if (!await deps.organizationAccess(organizationId, userId)) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  try {
    const event = await deps.setCustomerSuppression(organizationId, customerId, userId, input);
    return event ? { status: "success", message: "Customer WhatsApp suppression updated", data: event, code: STATUS_CODES.SUCCESS } : notFound();
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Customer WhatsApp suppression could not be updated", data: null, code: STATUS_CODES.BAD_REQUEST };
  }
};

export const listCustomerConsentEvents = async (
  userId: string,
  organizationId: string,
  customerId: string,
  injected: Partial<ConsentServiceDependencies> = {},
): Promise<ServiceResponse<{ events: WhatsAppCustomerConsentEventDTO[] } | null>> => {
  const deps = { ...dependencies(), ...injected };
  if (!await deps.organizationAccess(organizationId, userId)) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const events = await deps.listCustomerConsentEvents(organizationId, customerId);
  if (!events) return { status: "error", message: "Customer not found", data: null, code: STATUS_CODES.NOT_FOUND };
  return {
    status: "success",
    message: "Customer WhatsApp consent history fetched successfully",
    data: { events },
    code: STATUS_CODES.SUCCESS,
  };
};
