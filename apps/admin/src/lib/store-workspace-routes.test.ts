import { describe, expect, test } from "bun:test";

import {
    getStoreProductsPath,
    getStoreWorkspacePath,
    isStoreWorkspaceNavActive,
    isStoreWorkspacePath,
    parseStoreWorkspacePath,
} from "./store-workspace-routes";
import { getOrganizationWorkspacePath } from "./default-org-path";
import { getStoreDetailPath, getStoreListPath, isStoresNavActive } from "./store-routes";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const otherStoreId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("store workspace routes", () => {
    test("builds a refresh-safe Store workspace URL for a Store in the Organization", () => {
        expect(getStoreWorkspacePath(organizationId, storeId)).toBe(
            `/organizations/${organizationId}/workspaces/${storeId}`,
        );
        expect(getStoreWorkspacePath(organizationId, otherStoreId)).toBe(
            `/organizations/${organizationId}/workspaces/${otherStoreId}`,
        );
        expect(getStoreProductsPath(organizationId, storeId)).toBe(
            `/organizations/${organizationId}/workspaces/${storeId}/products`,
        );
    });

    test("reads the selected Store from the Store workspace URL", () => {
        expect(parseStoreWorkspacePath(`/organizations/${organizationId}/workspaces/${storeId}`)).toEqual({
            organizationId,
            storeId,
        });
        expect(parseStoreWorkspacePath(getStoreProductsPath(organizationId, storeId))).toEqual({
            organizationId,
            storeId,
        });
        expect(isStoreWorkspacePath(`/organizations/${organizationId}/workspaces/${storeId}`)).toBe(true);
        expect(isStoreWorkspacePath(getStoreProductsPath(organizationId, storeId))).toBe(true);
        expect(isStoreWorkspaceNavActive(`/organizations/${organizationId}/workspaces/${storeId}`)).toBe(true);
        expect(isStoreWorkspaceNavActive(`/organizations/${organizationId}/workspaces/${otherStoreId}`)).toBe(true);
    });

    test("does not treat Organization store management URLs as a Store workspace", () => {
        expect(isStoreWorkspacePath(getStoreListPath(organizationId))).toBe(false);
        expect(isStoreWorkspacePath(getStoreDetailPath(organizationId, storeId))).toBe(false);
        expect(isStoreWorkspacePath(getStoreDetailPath(organizationId, storeId, "settings"))).toBe(false);
        expect(isStoreWorkspacePath(`/organizations/${organizationId}/products`)).toBe(false);
        expect(parseStoreWorkspacePath(getStoreDetailPath(organizationId, storeId))).toBeNull();
        expect(parseStoreWorkspacePath(`/organizations/${organizationId}/workspaces`)).toBeNull();
    });

    test("keeps Organization workspace and store-detail routes distinct from Store workspace", () => {
        expect(getOrganizationWorkspacePath(organizationId)).toBe(`/organizations/${organizationId}/stores`);
        expect(isStoresNavActive(getStoreListPath(organizationId))).toBe(true);
        expect(isStoresNavActive(getStoreDetailPath(organizationId, storeId))).toBe(true);
        expect(isStoresNavActive(getStoreWorkspacePath(organizationId, storeId))).toBe(false);
        expect(isStoreWorkspaceNavActive(getStoreListPath(organizationId))).toBe(false);
        expect(isStoreWorkspaceNavActive(getStoreDetailPath(organizationId, storeId))).toBe(false);
    });
});
