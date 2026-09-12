import type { LoginAuthResponse, ServiceResponse } from "@repo/types";

export const resolveLoginSession = (
    response: ServiceResponse<LoginAuthResponse | null>,
) => {
    if (response.status !== "success" || !response.data?.user || !response.data.token) {
        return null;
    }

    return {
        user: response.data.user,
        token: response.data.token,
    };
};
