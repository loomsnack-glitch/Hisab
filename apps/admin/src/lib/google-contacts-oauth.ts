import type {
    GoogleContactsOAuthCompleteJSON,
    GoogleContactsSyncStatus,
    ServiceResponse,
} from "@repo/types";

export const GOOGLE_CONTACTS_OAUTH_ORGANIZATION_STORAGE_KEY =
    "ganatri.googleContacts.oauth.organizationId";

export const googleContactsSettingsPath = (organizationId: string) =>
    `/organizations/${organizationId}/settings`;

export const rememberGoogleContactsOAuthOrganization = (organizationId: string) => {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(GOOGLE_CONTACTS_OAUTH_ORGANIZATION_STORAGE_KEY, organizationId);
};

export const readGoogleContactsOAuthOrganization = (): string | null => {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage.getItem(GOOGLE_CONTACTS_OAUTH_ORGANIZATION_STORAGE_KEY);
};

export const clearGoogleContactsOAuthOrganization = () => {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.removeItem(GOOGLE_CONTACTS_OAUTH_ORGANIZATION_STORAGE_KEY);
};

export const googleContactsOAuthResultFromSearch = (
    searchParams: URLSearchParams,
): GoogleContactsOAuthCompleteJSON | null => {
    const state = searchParams.get("state")?.trim() ?? "";
    const code = searchParams.get("code")?.trim() ?? "";
    const error = searchParams.get("error")?.trim() ?? "";
    if (!state) return null;
    if (error) return { state, error };
    if (code) return { state, code };
    return null;
};

export const settleGoogleContactsOAuthCallback = async (input: {
    organizationId: string | null;
    searchParams: URLSearchParams;
    completeOAuth: (
        organizationId: string,
        result: GoogleContactsOAuthCompleteJSON,
    ) => Promise<ServiceResponse<GoogleContactsSyncStatus | null>>;
}): Promise<{ ok: true; organizationId: string } | { ok: false; message: string }> => {
    const organizationId = input.organizationId?.trim() || null;
    const result = googleContactsOAuthResultFromSearch(input.searchParams);
    if (!organizationId || !result) {
        return {
            ok: false,
            message: "Google Contacts authorization could not be completed",
        };
    }

    try {
        const response = await input.completeOAuth(organizationId, result);
        if (response.status === "success") {
            clearGoogleContactsOAuthOrganization();
            return { ok: true, organizationId };
        }
        return {
            ok: false,
            message: response.message || "Google Contacts authorization could not be completed",
        };
    } catch (error) {
        return {
            ok: false,
            message:
                error instanceof Error && error.message
                    ? error.message
                    : "Google Contacts authorization could not be completed",
        };
    }
};
