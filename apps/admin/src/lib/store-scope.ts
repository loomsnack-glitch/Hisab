type StoreRef = { id: string; name: string };

export function isStoreInOrganization(storeId: string, stores: StoreRef[]): boolean {
    return stores.some((store) => store.id === storeId);
}

export function resolveNamedStoreInOrganization(
    storeId: string,
    stores: StoreRef[],
): StoreRef | null {
    return stores.find((store) => store.id === storeId) ?? null;
}
