import { useQuery } from "@tanstack/react-query";
import { getPosComboProducts, getPosProductAddOnAttachments } from "@repo/services";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { unwrapCatalogResponse, type PosCatalogScope } from "../lib/pos-catalog-boundary";

const CONFIGURATION_ERROR_MESSAGE = "Unable to load POS Product configuration";

export const posConfigurationKeys = {
    all: ["pos", "configuration"] as const,
    combos: (scope: PosCatalogScope | null) =>
        [...posConfigurationKeys.all, "combos", scope?.organizationId ?? null, scope?.storeId ?? null, scope?.deviceId ?? null] as const,
    addOns: (scope: PosCatalogScope | null) =>
        [...posConfigurationKeys.all, "add-ons", scope?.organizationId ?? null, scope?.storeId ?? null, scope?.deviceId ?? null] as const,
};

export const usePosConfiguration = () => {
    const session = usePosSessionSnapshot().session;
    const scope = session
        ? {
              organizationId: session.organization.id,
              storeId: session.store.id,
              deviceId: session.device.id,
          }
        : null;
    const enabled = Boolean(scope);
    const combosQuery = useQuery({
        queryKey: posConfigurationKeys.combos(scope),
        queryFn: async () => unwrapCatalogResponse(await getPosComboProducts(), CONFIGURATION_ERROR_MESSAGE),
        enabled,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });
    const addOnsQuery = useQuery({
        queryKey: posConfigurationKeys.addOns(scope),
        queryFn: async () => unwrapCatalogResponse(await getPosProductAddOnAttachments(), CONFIGURATION_ERROR_MESSAGE),
        enabled,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    return {
        combos: combosQuery.data?.combos ?? [],
        attachments: addOnsQuery.data?.attachments ?? [],
        isPending: combosQuery.isPending || addOnsQuery.isPending,
        isError: combosQuery.isError || addOnsQuery.isError,
        combosPending: combosQuery.isPending,
        combosError: combosQuery.isError,
        addOnsPending: addOnsQuery.isPending,
        addOnsError: addOnsQuery.isError,
        retry: () => {
            void Promise.all([combosQuery.refetch(), addOnsQuery.refetch()]);
        },
    };
};
