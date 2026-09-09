import { describe, expect, test } from "bun:test";

import {
    getStoreCategoriesPath,
    getStoreDevicesPath,
    getStoreLicensePath,
    getStoreProductsPath,
    getStoreSettingsPath,
    getStoreVendorsPath,
    getStoreWorkspacePath,
    isStoreWorkspaceNavActive,
    isStoreWorkspacePath,
    parseStoreWorkspacePath,
} from "./store-workspace-routes";
import { getOrganizationWorkspacePath } from "./default-org-path";

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
        expect(getStoreCategoriesPath(organizationId, storeId)).toBe(
            `/organizations/${organizationId}/workspaces/${storeId}/categories`,
        );
        expect(getStoreVendorsPath(organizationId, storeId)).toBe(
            `/organizations/${organizationId}/workspaces/${storeId}/vendors`,
        );
        expect(getStoreDevicesPath(organizationId, storeId)).toBe(
            `/organizations/${organizationId}/workspaces/${storeId}/devices`,
        );
        expect(getStoreSettingsPath(organizationId, storeId)).toBe(
            `/organizations/${organizationId}/workspaces/${storeId}/settings`,
        );
        expect(getStoreLicensePath(organizationId, storeId)).toBe(
            `/organizations/${organizationId}/workspaces/${storeId}/license`,
        );
    });

    test("reads the selected Store from the Store workspace URL", () => {
        expect(parseStoreWorkspacePath(`/organizations/${organizationId}/workspaces/${storeId}`)).toEqual({
            organizationId,
            storeId,
        });
        expect(parseStoreWorkspacePath(getStoreVendorsPath(organizationId, storeId))).toEqual({
            organizationId,
            storeId,
        });
        expect(parseStoreWorkspacePath(getStoreDevicesPath(organizationId, storeId))).toEqual({
            organizationId,
            storeId,
        });
        expect(parseStoreWorkspacePath(getStoreSettingsPath(organizationId, storeId))).toEqual({
            organizationId,
            storeId,
        });
        expect(parseStoreWorkspacePath(getStoreLicensePath(organizationId, storeId))).toEqual({
            organizationId,
            storeId,
        });
        expect(isStoreWorkspacePath(`/organizations/${organizationId}/workspaces/${storeId}`)).toBe(true);
        expect(isStoreWorkspacePath(getStoreProductsPath(organizationId, storeId))).toBe(true);
        expect(isStoreWorkspaceNavActive(`/organizations/${organizationId}/workspaces/${storeId}`)).toBe(true);
        expect(isStoreWorkspaceNavActive(`/organizations/${organizationId}/workspaces/${otherStoreId}`)).toBe(true);
    });

    test("does not treat Organization workspace URLs as a Store workspace", () => {
        expect(isStoreWorkspacePath(`/organizations/${organizationId}/products`)).toBe(false);
        expect(parseStoreWorkspacePath(`/organizations/${organizationId}/workspaces`)).toBeNull();
    });

    test("keeps Organization and Store workspace routes distinct", () => {
        expect(getOrganizationWorkspacePath(organizationId)).toBe(`/organizations/${organizationId}/products`);
        expect(isStoreWorkspaceNavActive(getOrganizationWorkspacePath(organizationId))).toBe(false);
    });
});
