import type {
    BaseAuthResponse,
    LoginAuthResponse,
    LoginJSON,
    RegisterAuthResponse,
    RegisterJSON,
    ServiceResponse,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const userAuthenticate = async (): Promise<ServiceResponse<BaseAuthResponse | null>> => {
    try {
        const response = await api.get("/auth");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const register = async (data: RegisterJSON): Promise<ServiceResponse<RegisterAuthResponse | null>> => {
    try {
        const response = await api.post("/auth/register", data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const userLogin = async (data: LoginJSON): Promise<ServiceResponse<LoginAuthResponse | null>> => {
    try {
        const response = await api.post("/auth/login", data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const userLogout = async (): Promise<ServiceResponse<null>> => {
    try {
        const response = await api.post("/auth/logout");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
