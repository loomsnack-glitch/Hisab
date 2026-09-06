import { useQuery, useQueryClient } from "@tanstack/react-query";
import { completePosKitchenKot, getPosKitchenKots } from "@repo/services";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { unwrapPosKitchenKotsResponse } from "../lib/pos-kot-boundary";

export const posKitchenKeys = {
    all: ["pos", "kitchen"] as const,
    list: (scope: { organizationId: string; storeId: string; deviceId: string } | null) => [...posKitchenKeys.all, scope] as const,
};

export const usePosKitchen = () => {
    const session = usePosSessionSnapshot().session;
    const queryClient = useQueryClient();
    const scope = session
        ? { organizationId: session.organization.id, storeId: session.store.id, deviceId: session.device.id }
        : null;
    const enabled = Boolean(scope && session?.store.kotSystemEnabled);
    const query = useQuery({
        queryKey: posKitchenKeys.list(scope),
        queryFn: async () => unwrapPosKitchenKotsResponse(await getPosKitchenKots()),
        enabled,
        retry: false,
    });

    const complete = async (kotId: string) => {
        const response = await completePosKitchenKot(kotId);
        if (response.status !== "success") {
            throw new Error(response.message || "Unable to complete POS KOT");
        }
        await queryClient.invalidateQueries({ queryKey: posKitchenKeys.all });
    };

    return {
        kots: query.data?.kots ?? [],
        isPending: query.isPending,
        isError: query.isError,
        retry: () => {
            void query.refetch();
        },
        complete,
    };
};
