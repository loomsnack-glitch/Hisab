import { useQuery } from "@tanstack/react-query";
import { getPosCategories, getPosProducts } from "@repo/services";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { posCatalogKeys, unwrapCatalogResponse } from "../lib/pos-catalog-boundary";

const CATALOG_ERROR_MESSAGE = "Unable to load the POS catalog";

export const usePosCatalog = () => {
    const session = usePosSessionSnapshot().session;
    const scope = session
        ? {
              organizationId: session.organization.id,
              storeId: session.store.id,
              deviceId: session.device.id,
          }
        : null;
    const enabled = Boolean(scope);

    const categoriesQuery = useQuery({
        queryKey: posCatalogKeys.categories(scope),
        queryFn: async () => unwrapCatalogResponse(await getPosCategories(), CATALOG_ERROR_MESSAGE),
        enabled,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    const productsQuery = useQuery({
        queryKey: posCatalogKeys.products(scope),
        queryFn: async () => unwrapCatalogResponse(await getPosProducts(), CATALOG_ERROR_MESSAGE),
        enabled,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    return {
        categories: categoriesQuery.data?.categories ?? [],
        products: productsQuery.data?.products ?? [],
        isPending: categoriesQuery.isPending || productsQuery.isPending,
        isError: categoriesQuery.isError || productsQuery.isError,
        isSuccess: categoriesQuery.isSuccess && productsQuery.isSuccess,
        retry: () => {
            void Promise.all([categoriesQuery.refetch(), productsQuery.refetch()]);
        },
    };
};
