import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getPosSales } from "@repo/services";
import type { SalesListResponse } from "@repo/types";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { buildPosBillsQuery, posBillsKeys, unwrapPosSalesResponse, type PosBillsFilters } from "../lib/pos-bills-boundary";

export const usePosSales = (filters: PosBillsFilters) => {
    const session = usePosSessionSnapshot().session;
    const scope = session
        ? {
              organizationId: session.organization.id,
              storeId: session.store.id,
              deviceId: session.device.id,
          }
        : null;
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const query = useMemo(() => buildPosBillsQuery(filters, today), [
        filters.status,
        filters.customerId,
        filters.date,
        filters.paymentMethod,
        filters.paymentStatus,
        filters.search,
        todayKey,
    ]);
    const salesQuery = useInfiniteQuery({
        queryKey: posBillsKeys.list(scope, query),
        initialPageParam: null as string | null,
        queryFn: async ({ pageParam }) => {
            const response = await getPosSales(pageParam ? { ...query, cursor: pageParam } : query);
            return unwrapPosSalesResponse(response) satisfies SalesListResponse;
        },
        getNextPageParam: (lastPage) => lastPage.pageInfo.hasMore
            ? (lastPage.pageInfo.nextCursor ?? undefined)
            : undefined,
        enabled: Boolean(scope),
        retry: false,
    });

    return {
        sales: salesQuery.data?.pages.flatMap((page) => page.sales) ?? [],
        summary: salesQuery.data?.pages[0]?.summary ?? null,
        isPending: salesQuery.isPending,
        isError: salesQuery.isError,
        hasNextPage: Boolean(salesQuery.hasNextPage),
        isFetchingNextPage: salesQuery.isFetchingNextPage,
        retry: () => {
            void salesQuery.refetch();
        },
        loadMore: () => {
            void salesQuery.fetchNextPage();
        },
    };
};
