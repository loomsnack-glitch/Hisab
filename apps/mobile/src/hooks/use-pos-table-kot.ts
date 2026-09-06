import * as Crypto from "expo-crypto";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPosTableKot } from "@repo/services";
import type { PosCartCustomer, PosCartItem } from "../lib/pos-cart-boundary";
import { buildPosTableKotPayload, unwrapPosTableKotResponse } from "../lib/pos-kot-boundary";
import type { PosServiceMode } from "../lib/pos-service-mode-boundary";
import { posTablesKeys } from "./use-pos-tables";

export const usePosTableKot = () => {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({
            tableId,
            items,
            customer,
            serviceMode,
            requestId,
        }: {
            tableId: string;
            items: readonly PosCartItem[];
            customer: PosCartCustomer | null;
            serviceMode: PosServiceMode;
            requestId: string;
        }) => unwrapPosTableKotResponse(await createPosTableKot(tableId, buildPosTableKotPayload({ items, customer, serviceMode, requestId }))),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: posTablesKeys.all });
        },
    });

    return {
        send: mutation.mutateAsync,
        pending: mutation.isPending,
        error: mutation.error,
        createRequestId: () => Crypto.randomUUID(),
    };
};
