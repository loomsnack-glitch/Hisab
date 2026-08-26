import type {
    GoogleContactsOAuthCompleteJSON,
    GoogleContactsOAuthStartResponse,
    GoogleContactsSyncStatus,
    ServiceResponse,
} from "@repo/types";
import { api, handleApiError } from "../../api";

type GoogleContactsStatusResponse = ServiceResponse<GoogleContactsSyncStatus | null>;
type GoogleContactsOAuthStartApiResponse = ServiceResponse<GoogleContactsOAuthStartResponse | null>;

export const getGoogleContactsSyncStatus = async (
    organizationId: string,
): Promise<GoogleContactsStatusResponse> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/google-contacts`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const startGoogleContactsOAuth = async (
    organizationId: string,
): Promise<GoogleContactsOAuthStartApiResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/google-contacts/oauth/start`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const completeGoogleContactsOAuth = async (
    organizationId: string,
    result: GoogleContactsOAuthCompleteJSON,
): Promise<GoogleContactsStatusResponse> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/google-contacts/oauth/complete`,
            result,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const startGoogleContactsInitialSync = async (
    organizationId: string,
): Promise<GoogleContactsStatusResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/google-contacts/sync`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const replaceGoogleContactsOAuth = async (
    organizationId: string,
): Promise<GoogleContactsOAuthStartApiResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/google-contacts/oauth/replace`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const disconnectGoogleContacts = async (
    organizationId: string,
): Promise<GoogleContactsStatusResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/google-contacts/disconnect`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
