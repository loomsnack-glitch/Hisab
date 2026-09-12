import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clearAuthToken, userLogout } from "@repo/services";
import { adminAuthKeys } from "../lib/auth-keys";
import { useAdminAuthActions } from "../store/auth.store";

const clearLocalAdminSession = async (
    queryClient: ReturnType<typeof useQueryClient>,
    clearSession: () => void,
) => {
    try {
        await clearAuthToken();
    } finally {
        clearSession();
        queryClient.removeQueries({ queryKey: adminAuthKeys.all });
    }
};

export const useAdminLogout = () => {
    const queryClient = useQueryClient();
    const { startLogout, clearSession } = useAdminAuthActions();

    return useMutation({
        mutationFn: userLogout,
        onMutate: () => {
            startLogout();
        },
        onSettled: async () => {
            await clearLocalAdminSession(queryClient, clearSession);
        },
    });
};
