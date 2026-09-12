import type { BaseAuthResponse, ServiceResponse } from "@repo/types";

export const resolveAuthSession = (
    response: ServiceResponse<BaseAuthResponse | null>,
) => {
    if (response.status !== "success" || !response.data?.user || !response.data.token) {
        return null;
    }

    return {
        user: response.data.user,
        token: response.data.token,
    };
};
