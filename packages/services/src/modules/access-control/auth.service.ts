import type {
    BaseAuthResponse,
    LoginAuthResponse,
    LoginFormJSON,
    LoginJSON,
    RegisterAuthResponse,
    RegisterFormJSON,
    RegisterJSON,
    ServiceResponse,
} from "@repo/types";
import { toIndianInternationalPhone } from "@repo/types";
import { api, handleApiError } from "../../api";

const withInternationalPhone = <T extends { phone: string }>(data: T): T & { phone: string } => ({
    ...data,
    phone: toIndianInternationalPhone(data.phone),
});

export const userAuthenticate = async (): Promise<ServiceResponse<BaseAuthResponse | null>> => {
    try {
        const response = await api.get("/auth");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const register = async (data: RegisterFormJSON): Promise<ServiceResponse<RegisterAuthResponse | null>> => {
    try {
        const response = await api.post("/auth/register", withInternationalPhone(data) as RegisterJSON);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const userLogin = async (data: LoginFormJSON): Promise<ServiceResponse<LoginAuthResponse | null>> => {
    try {
        const response = await api.post("/auth/login", withInternationalPhone(data) as LoginJSON);
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
