import {
  consumeCloudOnboardingState,
  type CloudOnboardingReplayStore,
} from "./cloud-onboarding";
import {
  verifyCloudOnboardingResult,
  type VerifiedCloudOnboardingResult,
} from "./cloud-onboarding-result";

const MAX_ACCESS_TOKEN_LENGTH = 8_192;

export type CloudOnboardingTokenExchange = {
  exchange: (authorizationValue: string) => Promise<unknown>;
};

export class CloudOnboardingExchangeError extends Error {
  readonly code: "exchange_failed" | "invalid_provider_token";

  constructor(
    code: CloudOnboardingExchangeError["code"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CloudOnboardingExchangeError";
    this.code = code;
  }
}

export type CompletedCloudOnboardingExchange = VerifiedCloudOnboardingResult & {
  accessToken: string;
};

const requireAccessToken = (value: unknown): string => {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > MAX_ACCESS_TOKEN_LENGTH
  ) {
    throw new CloudOnboardingExchangeError(
      "invalid_provider_token",
      "WhatsApp Cloud provider token is invalid",
    );
  }
  return value.trim();
};

export const completeCloudOnboardingExchange = async (input: {
  result: unknown;
  organizationId: string;
  userId: string;
  secret: string;
  exchange: CloudOnboardingTokenExchange;
  replayStore: CloudOnboardingReplayStore;
  now?: () => number;
}): Promise<CompletedCloudOnboardingExchange> => {
  const result = verifyCloudOnboardingResult({
    result: input.result,
    organizationId: input.organizationId,
    userId: input.userId,
    secret: input.secret,
    now: input.now,
  });

  let accessToken: string;
  try {
    accessToken = requireAccessToken(
      await input.exchange.exchange(result.code),
    );
  } catch (error) {
    if (error instanceof CloudOnboardingExchangeError) throw error;
    throw new CloudOnboardingExchangeError(
      "exchange_failed",
      "WhatsApp Cloud authorization exchange failed",
    );
  }

  await consumeCloudOnboardingState(
    {
      token: result.state,
      organizationId: input.organizationId,
      userId: input.userId,
      secret: input.secret,
      now: input.now,
    },
    input.replayStore,
  );

  return { ...result, accessToken };
};
