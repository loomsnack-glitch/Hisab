import axios from "axios";
import type { GetSignedURLForUploadJSON, GetSignedURLJSON, ServiceResponse } from "@repo/types";
import { api, handleApiError } from "../../api";

export const getSignedURL = async (params: GetSignedURLJSON): Promise<ServiceResponse<string>> => {
    try {
        const response = await api.get("/common/get-signed-url", { params });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getSignedURLForUpload = async (params: GetSignedURLForUploadJSON): Promise<ServiceResponse<string>> => {
    try {
        const response = await api.get("/common/get-signed-url-for-upload", { params });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const uploadFileToSignedURL = async (signedUrl: string, file: Blob | File): Promise<void> => {
    try {
        await axios.put(signedUrl, file);
    } catch (error) {
        throw handleApiError(error);
    }
};
