import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPosCustomers } from "@repo/services";
import type { CustomerListQuery } from "@repo/types";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { buildPosCustomerDirectoryQuery, createPosCustomerResponse, posCustomerKeys, unwrapCustomerResponse, updatePosCustomerResponse } from "../lib/pos-customer-boundary";
import { posBillsKeys } from "../lib/pos-bills-boundary";

export const usePosCustomerDirectory = (filters: Pick<CustomerListQuery, "search" | "status" | "sort">) => {
    const session = usePosSessionSnapshot().session;
    const scope = session ? { organizationId: session.organization.id, storeId: session.store.id, deviceId: session.device.id } : null;
    const query = buildPosCustomerDirectoryQuery(filters);
    const list = useInfiniteQuery({
        queryKey: posCustomerKeys.directory(scope, query),
        initialPageParam: null as string | null,
        queryFn: async ({ pageParam }) => unwrapCustomerResponse(await getPosCustomers(pageParam ? { ...query, cursor: pageParam } : query)),
        getNextPageParam: (page) => page.pageInfo.hasMore ? page.pageInfo.nextCursor ?? undefined : undefined,
        enabled: Boolean(scope),
        retry: false,
    });
    const client = useQueryClient();
    const refreshCustomerData = () => {
        void client.invalidateQueries({ queryKey: posCustomerKeys.all });
        void client.invalidateQueries({ queryKey: posBillsKeys.all });
    };
    const create = useMutation({ mutationFn: createPosCustomerResponse, onSuccess: refreshCustomerData });
    const update = useMutation({ mutationFn: ({ customerId, payload }: Parameters<typeof updatePosCustomerResponse> extends [string, infer P] ? { customerId: string; payload: P } : never) => updatePosCustomerResponse(customerId, payload), onSuccess: refreshCustomerData });

    return {
        customers: list.data?.pages.flatMap((page) => page.customers) ?? [],
        isPending: list.isPending,
        isError: list.isError,
        hasNextPage: Boolean(list.hasNextPage),
        isFetchingNextPage: list.isFetchingNextPage,
        retry: () => { void list.refetch(); },
        loadMore: () => { void list.fetchNextPage(); },
        create: create.mutateAsync,
        update: ({ customerId, payload }: Parameters<typeof update.mutateAsync>[0]) => update.mutateAsync({ customerId, payload }),
        createPending: create.isPending,
        updatePending: update.isPending,
    };
};
