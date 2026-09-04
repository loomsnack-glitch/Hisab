import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateCustomerJSON } from "@repo/types";
import { createPosCustomerResponse, posCustomerKeys } from "../lib/pos-customer-boundary";

export const useCreatePosCustomer = () => {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: (payload: CreateCustomerJSON) => createPosCustomerResponse(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: posCustomerKeys.all });
        },
    });

    return {
        create: mutation.mutateAsync,
        isPending: mutation.isPending,
        error: mutation.error,
        reset: mutation.reset,
    };
};
