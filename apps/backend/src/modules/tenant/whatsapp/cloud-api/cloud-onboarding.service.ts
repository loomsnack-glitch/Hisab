import {
  STATUS_CODES,
  type ServiceResponse,
  type WhatsAppCloudOnboardingStateResponseDTO,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import { requireOrganizationFeatureEntitlement } from "@/modules/tenant/commercial-licensing/feature-entitlement-guard";
import {
  CloudOnboardingStateError,
  createCloudOnboardingState,
  verifyCloudOnboardingState,
} from "./cloud-onboarding";
import { createCloudOnboardingStateRecord } from "./cloud-onboarding.repository";

const onboardingStateSecret = (): string =>
  process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET?.trim() ?? "";

export const startCloudOnboarding = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<WhatsAppCloudOnboardingStateResponseDTO | null>> => {
  const organization = await organizationRepository.getOrganizationByIdForUser(
    organizationId,
    userId,
  );
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  const entitlementError = await requireOrganizationFeatureEntitlement(organizationId, "whatsapp");
  if (entitlementError) return entitlementError;

  try {
    const secret = onboardingStateSecret();
    const state = createCloudOnboardingState({
      organizationId,
      userId,
      secret,
    });
    const claims = verifyCloudOnboardingState({
      token: state.token,
      organizationId,
      userId,
      secret,
    });
    await createCloudOnboardingStateRecord({
      organizationId,
      userId,
      nonce: claims.nonce,
      expiresAt: state.expiresAt,
    });

    return {
      status: "success",
      message: "WhatsApp Cloud onboarding started",
      data: {
        state: state.token,
        expiresAt: state.expiresAt,
      },
      code: STATUS_CODES.CREATED,
    };
  } catch (error) {
    if (
      error instanceof CloudOnboardingStateError &&
      error.code === "invalid_configuration"
    ) {
      return {
        status: "error",
        message: "WhatsApp Cloud onboarding is not configured",
        data: null,
        code: STATUS_CODES.SERVICE_UNAVAILABLE,
      };
    }
    throw error;
  }
};
