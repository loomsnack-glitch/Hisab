import {
  WhatsAppCloudOnboardingResultSchema,
  type WhatsAppCloudOnboardingResultDTO,
} from "@repo/types";
import {
  verifyCloudOnboardingState,
  type CloudOnboardingStateClaims,
} from "./cloud-onboarding";

export class CloudOnboardingResultError extends Error {
  readonly code = "invalid_result" as const;

  constructor(message: string) {
    super(message);
    this.name = "CloudOnboardingResultError";
  }
}

export type VerifiedCloudOnboardingResult = WhatsAppCloudOnboardingResultDTO & {
  claims: CloudOnboardingStateClaims;
};

export const parseCloudOnboardingResult = (
  input: unknown,
): WhatsAppCloudOnboardingResultDTO => {
  const parsed = WhatsAppCloudOnboardingResultSchema.safeParse(input);
  if (!parsed.success) {
    throw new CloudOnboardingResultError(
      "WhatsApp Cloud onboarding result is invalid",
    );
  }
  return parsed.data;
};

export const verifyCloudOnboardingResult = (input: {
  result: unknown;
  organizationId: string;
  userId: string;
  secret: string;
  now?: () => number;
}): VerifiedCloudOnboardingResult => {
  const result = parseCloudOnboardingResult(input.result);
  const claims = verifyCloudOnboardingState({
    token: result.state,
    organizationId: input.organizationId,
    userId: input.userId,
    secret: input.secret,
    now: input.now,
  });

  return { ...result, claims };
};
