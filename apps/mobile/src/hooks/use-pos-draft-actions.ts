import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateDraftSaleJSON, UpdateDraftSaleJSON } from "@repo/types";
import {
    createPosDraftSaleResponse,
    deletePosDraftSaleResponse,
    getPosDraftSaleResponse,
    updatePosDraftSaleResponse,
    type PosDraftSale,
} from "../lib/pos-draft-boundary";

export const posDraftKeys = {
    all: ["pos", "drafts"] as const,
    detail: (saleId: string) => [...posDraftKeys.all, saleId] as const,
};

type SaveInput = {
    draftSaleId: string | null;
    createPayload: CreateDraftSaleJSON;
    updatePayload: UpdateDraftSaleJSON;
};

export const usePosDraftActions = () => {
    const queryClient = useQueryClient();
    const saveMutation = useMutation<PosDraftSale, Error, SaveInput>({
        mutationFn: ({ draftSaleId, createPayload, updatePayload }) =>
            draftSaleId
                ? updatePosDraftSaleResponse(draftSaleId, updatePayload).then((response) => response.sale)
                : createPosDraftSaleResponse(createPayload).then((response) => response.sale),
        onSuccess: (sale) => {
            queryClient.setQueryData(posDraftKeys.detail(sale.id), sale);
        },
    });
    const deleteMutation = useMutation<string, Error, string>({
        mutationFn: async (saleId) => {
            await deletePosDraftSaleResponse(saleId);
            return saleId;
        },
        onSuccess: (saleId) => {
            queryClient.removeQueries({ queryKey: posDraftKeys.detail(saleId) });
        },
    });

    return {
        save: saveMutation.mutateAsync,
        savePending: saveMutation.isPending,
        saveError: saveMutation.error,
        load: getPosDraftSaleResponse,
        discard: deleteMutation.mutateAsync,
        discardPending: deleteMutation.isPending,
        discardError: deleteMutation.error,
    };
};
