import type {
    DeviceAuthResponse,
    DeviceLoginJSON,
    ServiceResponse,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const deviceAuthenticate = async (): Promise<ServiceResponse<DeviceAuthResponse | null>> => {
    try {
        const response = await api.get("/device-auth");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const deviceLogin = async (data: DeviceLoginJSON): Promise<ServiceResponse<DeviceAuthResponse | null>> => {
    try {
        const response = await api.post("/device-auth/login", data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const deviceLogout = async (): Promise<ServiceResponse<null>> => {
    try {
        const response = await api.post("/device-auth/logout");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
