import { describe, expect, test } from "bun:test";

import { isStoreInOrganization, resolveNamedStoreInOrganization } from "./store-scope";

const adajan = { id: "store-adajan", name: "Adajan" };
const vesu = { id: "store-vesu", name: "Vesu" };
const stores = [adajan, vesu];
const foreignStoreId = "store-ahmedabad";

describe("store scope", () => {
    test("recognizes Stores that belong to the current Organization", () => {
        expect(isStoreInOrganization(adajan.id, stores)).toBe(true);
        expect(isStoreInOrganization(vesu.id, stores)).toBe(true);
        expect(isStoreInOrganization(foreignStoreId, stores)).toBe(false);
        expect(isStoreInOrganization(adajan.id, [])).toBe(false);
    });

    test("refuses to name a Store that does not belong to the current Organization", () => {
        expect(resolveNamedStoreInOrganization(adajan.id, stores)).toEqual(adajan);
        expect(resolveNamedStoreInOrganization(foreignStoreId, stores)).toBeNull();
        expect(resolveNamedStoreInOrganization(adajan.id, [vesu])).toBeNull();
    });
});
