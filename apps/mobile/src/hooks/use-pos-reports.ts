import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPosProductSalesSummary, getPosSales } from "@repo/services";
import type { SalesListResponse } from "@repo/types";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import {
    buildPosReportsQueries,
    getAverageSaleValue,
    posReportsKeys,
    unwrapPosProductSalesResponse,
    type PosReportsDateFilter,
} from "../lib/pos-reports-boundary";
import { unwrapPosSalesResponse } from "../lib/pos-bills-boundary";

export const usePosReports = (date: PosReportsDateFilter) => {
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
    const queries = useMemo(() => buildPosReportsQueries(date, today), [date, todayKey]);

    const salesQuery = useQuery({
        queryKey: posReportsKeys.sales(scope, queries.sales),
        queryFn: async () => {
            const response = await getPosSales(queries.sales);
            return unwrapPosSalesResponse(response) satisfies SalesListResponse;
        },
        enabled: Boolean(scope),
        retry: false,
    });
    const productsQuery = useQuery({
        queryKey: posReportsKeys.products(scope, queries.products),
        queryFn: async () => unwrapPosProductSalesResponse(await getPosProductSalesSummary(queries.products)),
        enabled: Boolean(scope),
        retry: false,
    });

    return {
        summary: salesQuery.data?.summary ?? null,
        averageSaleValue: getAverageSaleValue(salesQuery.data?.summary ?? null),
        products: productsQuery.data?.products ?? [],
        isPending: salesQuery.isPending || productsQuery.isPending,
        isError: salesQuery.isError || productsQuery.isError,
        retry: () => {
            void Promise.all([salesQuery.refetch(), productsQuery.refetch()]);
        },
    };
};
