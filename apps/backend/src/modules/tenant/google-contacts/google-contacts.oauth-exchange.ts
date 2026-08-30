import {
  GoogleContactsOAuthCompleteSchema,
  type GoogleContactsOAuthCompleteJSON,
} from "@repo/types";
import {
  consumeGoogleContactsOAuthState,
  verifyGoogleContactsOAuthState,
  GoogleContactsOAuthStateError,
  type GoogleContactsOAuthReplayStore,
  type GoogleContactsOAuthStateClaims,
} from "./google-contacts.oauth-state";
import {
  GoogleContactsOAuthError,
  type GoogleAccountIdentity,
  type GoogleOAuthProvider,
} from "./google-contacts.oauth";
import type { GoogleContactsCredentialPayload } from "./google-contacts.credentials";

export class GoogleContactsOAuthResultError extends Error {
  readonly code = "invalid_result" as const;

  constructor(message: string) {
    super(message);
    this.name = "GoogleContactsOAuthResultError";
  }
}

export type VerifiedGoogleContactsOAuthResult = GoogleContactsOAuthCompleteJSON & {
  claims: GoogleContactsOAuthStateClaims;
};

export const parseGoogleContactsOAuthResult = (
  input: unknown,
): GoogleContactsOAuthCompleteJSON => {
  const parsed = GoogleContactsOAuthCompleteSchema.safeParse(input);
  if (!parsed.success) {
    throw new GoogleContactsOAuthResultError(
      "Google Contacts OAuth result is invalid",
    );
  }
  return parsed.data;
};

export const verifyGoogleContactsOAuthResult = (input: {
  result: unknown;
  organizationId: string;
  userId: string;
  secret: string;
  now?: () => number;
}): VerifiedGoogleContactsOAuthResult => {
  const result = parseGoogleContactsOAuthResult(input.result);
  const claims = verifyGoogleContactsOAuthState({
    token: result.state,
    organizationId: input.organizationId,
    userId: input.userId,
    secret: input.secret,
    now: input.now,
  });
  return { ...result, claims };
};

export type CompletedGoogleContactsOAuthExchange = {
  claims: GoogleContactsOAuthStateClaims;
  credentials: GoogleContactsCredentialPayload;
  identity: GoogleAccountIdentity;
};

export const completeGoogleContactsOAuthExchange = async (input: {
  result: unknown;
  organizationId: string;
  userId: string;
  secret: string;
  oauth: Pick<GoogleOAuthProvider, "exchangeAuthorizationCode" | "getAccountIdentity">;
  replayStore: GoogleContactsOAuthReplayStore;
  now?: () => number;
}): Promise<CompletedGoogleContactsOAuthExchange> => {
  const result = verifyGoogleContactsOAuthResult(input);
  if ("error" in result) {
    await consumeGoogleContactsOAuthState(
      {
        token: result.state,
        organizationId: input.organizationId,
        userId: input.userId,
        secret: input.secret,
        now: input.now,
      },
      input.replayStore,
    );
    throw new GoogleContactsOAuthError(
      "authorization_denied",
      "Google Contacts authorization was denied",
    );
  }

  let credentials: GoogleContactsCredentialPayload;
  let identity: GoogleAccountIdentity;
  try {
    credentials = await input.oauth.exchangeAuthorizationCode(result.code);
    identity = await input.oauth.getAccountIdentity(credentials.accessToken);
  } catch (error) {
    if (error instanceof GoogleContactsOAuthError) throw error;
    throw new GoogleContactsOAuthError(
      "exchange_failed",
      "Google Contacts authorization exchange failed",
    );
  }

  await consumeGoogleContactsOAuthState(
    {
      token: result.state,
      organizationId: input.organizationId,
      userId: input.userId,
      secret: input.secret,
      now: input.now,
    },
    input.replayStore,
  );

  return { claims: result.claims, credentials, identity };
};

export { GoogleContactsOAuthStateError };
