import type { RegisterAuthResponse, ServiceResponse } from "@repo/types";

export const resolveRegistrationSession = (
    response: ServiceResponse<RegisterAuthResponse | null>,
) => {
    if (response.status !== "success" || !response.data?.user || !response.data.token) {
        return null;
    }

    return {
        user: response.data.user,
        token: response.data.token,
    };
};
