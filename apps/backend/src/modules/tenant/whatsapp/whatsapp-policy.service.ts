import {
  STATUS_CODES,
  type ServiceResponse,
  type WhatsAppSetStorePolicyJSON,
  type WhatsAppStorePolicyDTO,
  type WhatsAppStorePolicyResponseDTO,
  type WhatsAppStorePolicySenderDTO,
} from "@repo/types";
import * as organizationRepository from "../organization/organization.repository";
import { isStoreFeatureEntitled, requireStoreFeatureEntitlement } from "../commercial-licensing/feature-entitlement-guard";
import * as whatsappRepository from "./whatsapp.repository";
import * as policyRepository from "./whatsapp-policy.repository";

const allowedKindsFor = (mode: WhatsAppStorePolicyDTO["mode"]): WhatsAppStorePolicyDTO["allowedKinds"] => {
  if (mode === "disabled") return [];
  if (mode === "ganatri_utility") return ["bill", "due_reminder"];
  return ["bill", "due_reminder", "promotion"];
};

const errorResponse = <T>(message: string, code: typeof STATUS_CODES.NOT_FOUND | typeof STATUS_CODES.CONFLICT | typeof STATUS_CODES.FORBIDDEN): ServiceResponse<T | null> => ({
  status: "error",
  message,
  data: null,
  code,
});

const scopeStore = async (userId: string, organizationId: string, storeId: string) => {
  const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
  if (!organization) return errorResponse("Organization not found", STATUS_CODES.NOT_FOUND);
  const store = await organizationRepository.getStoreById(organizationId, storeId);
  if (!store) return errorResponse("Store not found", STATUS_CODES.NOT_FOUND);
  return { organization, store };
};

const senderForPolicy = async (
  organizationId: string,
  storeId: string,
  policy: Awaited<ReturnType<typeof policyRepository.getCurrentPolicy>>,
): Promise<WhatsAppStorePolicySenderDTO | null> => {
  if (!policy) return null;
  if (policy.mode === "disabled") return { kind: "none" };
  if (policy.mode === "ganatri_utility") {
    return { kind: "ganatri_utility", displayName: "Ganatri Utility" };
  }

  if (!policy.whatsappAccountId) return null;
  const account = await whatsappRepository.getAccountById(policy.whatsappAccountId);
  if (
    !account
    || account.organizationId !== organizationId
    || account.provider !== "cloud_api"
    || !account.assignedStoreIds.includes(storeId)
  ) {
    return null;
  }

  return {
    kind: "organization_cloud",
    whatsappAccountId: account.id,
    phoneNumber: account.phoneNumber,
    accountStatus: account.status,
    cloudStatus: account.cloudStatus ?? null,
  };
};

const buildPolicy = async (
  organizationId: string,
  storeId: string,
  policy: Awaited<ReturnType<typeof policyRepository.getCurrentPolicy>>,
): Promise<WhatsAppStorePolicyResponseDTO | null> => {
  if (!policy) return null;
  const entitlement = await isStoreFeatureEntitled(storeId, "whatsapp");
  const denial = entitlement ? null : await requireStoreFeatureEntitlement(storeId, "whatsapp");
  const sender = await senderForPolicy(organizationId, storeId, policy);
  if (!sender) return null;

  return {
    policy: {
      id: policy.id,
      organizationId,
      storeId,
      mode: policy.mode,
      sender,
      entitlement: {
        featureKey: "whatsapp",
        required: policy.mode !== "disabled",
        entitled: entitlement,
        reason: denial?.message ?? null,
      },
      allowedKinds: allowedKindsFor(policy.mode),
      version: policy.revision,
      effectiveFrom: policy.effectiveFrom,
      effectiveTo: policy.effectiveTo,
    },
  };
};

export const getStorePolicy = async (
  userId: string,
  organizationId: string,
  storeId: string,
): Promise<ServiceResponse<WhatsAppStorePolicyResponseDTO | null>> => {
  const scope = await scopeStore(userId, organizationId, storeId);
  if ("status" in scope) return scope;
  const policy = await policyRepository.getCurrentPolicy(organizationId, storeId);
  const response = await buildPolicy(organizationId, storeId, policy);
  return response
    ? { status: "success", message: "Store WhatsApp policy loaded", data: response, code: STATUS_CODES.SUCCESS }
    : errorResponse("Store WhatsApp policy is not initialized", STATUS_CODES.NOT_FOUND);
};

export const setStorePolicy = async (
  userId: string,
  organizationId: string,
  storeId: string,
  input: WhatsAppSetStorePolicyJSON,
): Promise<ServiceResponse<WhatsAppStorePolicyResponseDTO | null>> => {
  const scope = await scopeStore(userId, organizationId, storeId);
  if ("status" in scope) return scope;

  const accountId = input.mode === "organization_cloud" ? input.whatsappAccountId ?? null : null;
  if (input.mode !== "disabled") {
    const entitlementError = await requireStoreFeatureEntitlement(storeId, "whatsapp");
    if (entitlementError) return entitlementError;
  }

  if (input.mode === "organization_cloud") {
    const account = accountId ? await whatsappRepository.getAccountById(accountId) : null;
    if (
      !account
      || account.organizationId !== organizationId
      || account.provider !== "cloud_api"
      || !account.assignedStoreIds.includes(storeId)
    ) {
      return errorResponse("WhatsApp Cloud account must be linked to this Store", STATUS_CODES.CONFLICT);
    }
  }

  try {
    await policyRepository.replaceCurrentPolicy(
      organizationId,
      storeId,
      input.mode,
      accountId,
      userId,
    );
  } catch (error) {
    if (error instanceof policyRepository.StorePolicyAccountNotLinkedError) {
      return errorResponse(error.message, STATUS_CODES.CONFLICT);
    }
    throw error;
  }
  return getStorePolicy(userId, organizationId, storeId);
};

export { allowedKindsFor };
