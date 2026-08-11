import type {
    ServiceResponse,
    WhatsAppAccountStatusResponseDTO,
    WhatsAppCreateAccountJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

type WhatsAppResponse = ServiceResponse<WhatsAppAccountStatusResponseDTO | null>;
const accountPath = (organizationId: string, storeId: string) =>
    "/organizations/" + organizationId + "/stores/" + storeId + "/whatsapp/account";

export const getWhatsAppAccount = async (organizationId: string, storeId: string): Promise<WhatsAppResponse> => {
    try {
        const response = await api.get(accountPath(organizationId, storeId));
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createWhatsAppAccount = async (
    organizationId: string,
    storeId: string,
    data: WhatsAppCreateAccountJSON,
): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(accountPath(organizationId, storeId), data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const connectWhatsAppAccount = async (organizationId: string, storeId: string): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(accountPath(organizationId, storeId) + "/connect");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const disconnectWhatsAppAccount = async (organizationId: string, storeId: string): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(accountPath(organizationId, storeId) + "/disconnect");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
