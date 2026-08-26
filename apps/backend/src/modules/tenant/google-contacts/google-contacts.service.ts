import {
  STATUS_CODES,
  type GoogleContactsOAuthStartResponse,
  type GoogleContactsSyncStatus,
  type ServiceResponse,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import {
  GoogleContactsCredentialError,
  type GoogleContactsCredentialVault,
} from "./google-contacts.credentials";
import { databaseGoogleContactsCredentialVault } from "./google-contacts.database-credentials";
import {
  completeGoogleContactsOAuthExchange,
  GoogleContactsOAuthResultError,
  verifyGoogleContactsOAuthResult,
} from "./google-contacts.oauth-exchange";
import {
  createGoogleOAuthProvider,
  GoogleContactsOAuthError,
  type GoogleOAuthProvider,
} from "./google-contacts.oauth";
import {
  createGoogleContactsOAuthState,
  GoogleContactsOAuthStateError,
  verifyGoogleContactsOAuthState,
  type GoogleContactsOAuthReplayStore,
} from "./google-contacts.oauth-state";
import {
  createGoogleContactsOAuthStateRecord,
  googleContactsOAuthReplayStore,
  hashGoogleContactsOAuthNonce,
} from "./google-contacts.oauth-state.repository";
import {
  beginGoogleContactsConnectionAttempt,
  completeGoogleContactsConnection,
  getGoogleContactsConnectionStatus,
  getGoogleContactsCredentialBinding,
  revertConnectingGoogleContactsConnection,
} from "./google-contacts.repository";
import { scheduleGoogleContactsInitialCatchUp } from "./google-contacts.outbox";

export type GoogleContactsServiceDependencies = {
  getOrganizationByIdForUser: (
    organizationId: string,
    userId: string,
  ) => Promise<{ id: string } | null>;
  createOAuthStateRecord: typeof createGoogleContactsOAuthStateRecord;
  replayStore: GoogleContactsOAuthReplayStore;
  getStatus: typeof getGoogleContactsConnectionStatus;
  getBinding: typeof getGoogleContactsCredentialBinding;
  beginAttempt: typeof beginGoogleContactsConnectionAttempt;
  completeConnection: typeof completeGoogleContactsConnection;
  revertConnecting: typeof revertConnectingGoogleContactsConnection;
  scheduleInitialCatchUp: typeof scheduleGoogleContactsInitialCatchUp;
  vault: GoogleContactsCredentialVault;
  oauth: GoogleOAuthProvider;
};

const defaultDependencies = (): GoogleContactsServiceDependencies => ({
  getOrganizationByIdForUser: organizationRepository.getOrganizationByIdForUser,
  createOAuthStateRecord: createGoogleContactsOAuthStateRecord,
  replayStore: googleContactsOAuthReplayStore,
  getStatus: getGoogleContactsConnectionStatus,
  getBinding: getGoogleContactsCredentialBinding,
  beginAttempt: beginGoogleContactsConnectionAttempt,
  completeConnection: completeGoogleContactsConnection,
  revertConnecting: revertConnectingGoogleContactsConnection,
  scheduleInitialCatchUp: scheduleGoogleContactsInitialCatchUp,
  vault: databaseGoogleContactsCredentialVault,
  oauth: createGoogleOAuthProvider(),
});

const oauthStateSecret = (): string =>
  process.env.GOOGLE_CONTACTS_OAUTH_STATE_SECRET?.trim() ?? "";

const organizationNotFound = (): ServiceResponse<null> => ({
  status: "error",
  message: "Organization not found",
  data: null,
  code: STATUS_CODES.NOT_FOUND,
});

const requireOrganization = async (
  deps: GoogleContactsServiceDependencies,
  userId: string,
  organizationId: string,
) => deps.getOrganizationByIdForUser(organizationId, userId);

const configurationUnavailable = (
  error: unknown,
): error is GoogleContactsOAuthStateError | GoogleContactsOAuthError | GoogleContactsCredentialError =>
  (error instanceof GoogleContactsOAuthStateError && error.code === "invalid_configuration") ||
  (error instanceof GoogleContactsOAuthError && error.code === "invalid_configuration") ||
  (error instanceof GoogleContactsCredentialError && error.code === "vault_unavailable");

const configurationError = (): ServiceResponse<null> => ({
  status: "error",
  message: "Google Contacts Synchronization is not configured",
  data: null,
  code: STATUS_CODES.SERVICE_UNAVAILABLE,
});

export const getGoogleContactsSyncStatusForOrganization = async (
  userId: string,
  organizationId: string,
  injected: Partial<GoogleContactsServiceDependencies> = {},
): Promise<ServiceResponse<GoogleContactsSyncStatus | null>> => {
  const deps = { ...defaultDependencies(), ...injected };
  const organization = await requireOrganization(deps, userId, organizationId);
  if (!organization) return organizationNotFound();

  return {
    status: "success",
    message: "Google Contacts Sync Status",
    data: await deps.getStatus(organizationId),
    code: STATUS_CODES.SUCCESS,
  };
};

export const startGoogleContactsOAuth = async (
  userId: string,
  organizationId: string,
  injected: Partial<GoogleContactsServiceDependencies> = {},
): Promise<ServiceResponse<GoogleContactsOAuthStartResponse | null>> => {
  const deps = { ...defaultDependencies(), ...injected };
  const organization = await requireOrganization(deps, userId, organizationId);
  if (!organization) return organizationNotFound();

  const current = await deps.getStatus(organizationId);
  if (current.connectionStatus === "connected") {
    return {
      status: "error",
      message: "Google Contacts is already connected",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  try {
    const secret = oauthStateSecret();
    const state = createGoogleContactsOAuthState({
      organizationId,
      userId,
      secret,
    });
    const claims = verifyGoogleContactsOAuthState({
      token: state.token,
      organizationId,
      userId,
      secret,
    });
    const authorizationUrl = deps.oauth.buildAuthorizationUrl(state.token);
    const attempt = await deps.beginAttempt({
      organizationId,
      createdBy: userId,
      oauthAttemptNonceHash: hashGoogleContactsOAuthNonce(claims.nonce),
    });
    if (!attempt.started) {
      return {
        status: "error",
        message: "Google Contacts is already connected",
        data: null,
        code: STATUS_CODES.CONFLICT,
      };
    }
    try {
      await deps.createOAuthStateRecord({
        organizationId,
        userId,
        nonce: claims.nonce,
        expiresAt: state.expiresAt,
      });
    } catch (error) {
      await deps.revertConnecting({
        organizationId,
        oauthAttemptNonceHash: hashGoogleContactsOAuthNonce(claims.nonce),
      }).catch(() => undefined);
      throw error;
    }
    return {
      status: "success",
      message: "Google Contacts authorization started",
      data: {
        authorizationUrl,
        expiresAt: state.expiresAt,
      },
      code: STATUS_CODES.CREATED,
    };
  } catch (error) {
    if (configurationUnavailable(error)) return configurationError();
    throw error;
  }
};

export const completeGoogleContactsOAuth = async (
  userId: string,
  organizationId: string,
  result: unknown,
  injected: Partial<GoogleContactsServiceDependencies> = {},
): Promise<ServiceResponse<GoogleContactsSyncStatus | null>> => {
  const deps = { ...defaultDependencies(), ...injected };
  const organization = await requireOrganization(deps, userId, organizationId);
  if (!organization) return organizationNotFound();

  const current = await deps.getStatus(organizationId);
  if (current.connectionStatus === "connected") {
    return {
      status: "error",
      message: "Google Contacts is already connected",
      data: current,
      code: STATUS_CODES.CONFLICT,
    };
  }
  if (current.connectionStatus !== "connecting") {
    return {
      status: "error",
      message: "Google Contacts authorization is no longer active",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  let oauthAttemptNonceHash: string | null = null;
  try {
    const secret = oauthStateSecret();
    const verified = verifyGoogleContactsOAuthResult({
      result,
      organizationId,
      userId,
      secret,
    });
    const verifiedAttemptNonceHash = hashGoogleContactsOAuthNonce(verified.claims.nonce);
    oauthAttemptNonceHash = verifiedAttemptNonceHash;
    const exchanged = await completeGoogleContactsOAuthExchange({
      result,
      organizationId,
      userId,
      secret,
      oauth: deps.oauth,
      replayStore: deps.replayStore,
    });
    const existingBinding = await deps.getBinding(organizationId);
    const credential = await deps.vault.store({
      organizationId,
      ownerKey: `google:${exchanged.identity.subject}`,
      payload: exchanged.credentials,
    });
    try {
      const status = await deps.completeConnection({
        organizationId,
        googleAccountEmail: exchanged.identity.email,
        googleAccountSubject: exchanged.identity.subject,
        credential,
        oauthAttemptNonceHash: verifiedAttemptNonceHash,
      });
      if (!status) {
        await deps.vault.revoke(credential).catch(() => undefined);
        return {
          status: "error",
          message: "Google Contacts authorization is no longer active",
          data: null,
          code: STATUS_CODES.CONFLICT,
        };
      }
      if (existingBinding) {
        await deps.vault.revoke(existingBinding).catch(() => undefined);
      }
      return {
        status: "success",
        message: "Google Contacts connected",
        data: status,
        code: STATUS_CODES.SUCCESS,
      };
    } catch (error) {
      await deps.vault.revoke(credential).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if (configurationUnavailable(error)) return configurationError();
    if (
      error instanceof GoogleContactsOAuthError &&
      error.code === "authorization_denied" &&
      oauthAttemptNonceHash
    ) {
      return {
        status: "success",
        message: "Google Contacts authorization was cancelled",
        data: await deps.revertConnecting({ organizationId, oauthAttemptNonceHash }),
        code: STATUS_CODES.SUCCESS,
      };
    }
    if (
      error instanceof GoogleContactsOAuthStateError ||
      error instanceof GoogleContactsOAuthResultError
    ) {
      return {
        status: "error",
        message: "Google Contacts authorization could not be completed",
        data: null,
        code: STATUS_CODES.BAD_REQUEST,
      };
    }
    if (error instanceof GoogleContactsOAuthError) {
      return {
        status: "error",
        message: "Google Contacts authorization could not be completed",
        data: null,
        code: STATUS_CODES.BAD_REQUEST,
      };
    }
    throw error;
  }
};

export const startGoogleContactsInitialSync = async (
  userId: string,
  organizationId: string,
  injected: Partial<GoogleContactsServiceDependencies> = {},
): Promise<ServiceResponse<GoogleContactsSyncStatus | null>> => {
  const deps = { ...defaultDependencies(), ...injected };
  const organization = await requireOrganization(deps, userId, organizationId);
  if (!organization) return organizationNotFound();

  const current = await deps.getStatus(organizationId);
  if (current.connectionStatus !== "connected") {
    return {
      status: "error",
      message: "Google Contacts is not connected",
      data: current,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const status = await deps.scheduleInitialCatchUp(organizationId);
  return {
    status: "success",
    message: "Google Contacts initial sync scheduled",
    data: status,
    code: 202,
  };
};

