import type {
    OwnerAuthResponse,
    OwnerLoginJSON,
    OwnerLoginSVC,
    PlatformEntryResponse,
    ServiceResponse,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const ownerLogin = async (data: OwnerLoginJSON): Promise<ServiceResponse<OwnerAuthResponse | null>> => {
    try {
        const response = await api.post("/platform/auth/login", data as OwnerLoginSVC);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
export const ownerAuthenticate = async (): Promise<ServiceResponse<OwnerAuthResponse | null>> => {
    try {
        const response = await api.get("/platform/auth");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformEntry = async (): Promise<ServiceResponse<PlatformEntryResponse | null>> => {
    try {
        const response = await api.get("/platform/entry");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const ownerLogout = async (): Promise<ServiceResponse<null>> => {
    try {
        const response = await api.post("/platform/auth/logout");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
