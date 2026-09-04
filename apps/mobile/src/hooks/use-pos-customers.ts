import { useQuery } from "@tanstack/react-query";
import { getPosCustomers } from "@repo/services";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { posCustomerKeys, unwrapCustomerResponse } from "../lib/pos-customer-boundary";

export const usePosCustomers = (search: string, enabled: boolean) => {
    const session = usePosSessionSnapshot().session;
    const scope = session
        ? {
              organizationId: session.organization.id,
              storeId: session.store.id,
              deviceId: session.device.id,
          }
        : null;
    const normalizedSearch = search.trim();
    const query = useQuery({
        queryKey: posCustomerKeys.list(scope, normalizedSearch),
        queryFn: async () => unwrapCustomerResponse(await getPosCustomers({
            search: normalizedSearch || undefined,
            status: "active",
            limit: 20,
        })),
        enabled: Boolean(scope) && enabled,
        retry: false,
        staleTime: 60 * 1000,
    });

    return {
        customers: query.data?.customers ?? [],
        isPending: query.isPending,
        isError: query.isError,
        retry: () => {
            void query.refetch();
        },
    };
};
