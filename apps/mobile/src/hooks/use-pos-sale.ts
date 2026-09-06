import { useQuery } from "@tanstack/react-query";
import { getPosSale } from "@repo/services";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { posSaleKeys, unwrapPosSaleResponse } from "../lib/pos-sale-detail-boundary";

export const usePosSale = (saleId: string) => {
    const session = usePosSessionSnapshot().session;
    const scope = session ? {
        organizationId: session.organization.id,
        storeId: session.store.id,
        deviceId: session.device.id,
    } : null;
    const query = useQuery({
        queryKey: posSaleKeys.detail(scope, saleId),
        queryFn: async () => unwrapPosSaleResponse(await getPosSale(saleId)),
        enabled: Boolean(scope) && Boolean(saleId),
        retry: false,
    });

    return {
        sale: query.isError ? null : query.data ?? null,
        isPending: query.isPending,
        isError: query.isError,
        retry: () => { void query.refetch(); },
    };
};
