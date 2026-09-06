import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type {
    StoreDTO,
    StoreVendorAvailabilityResponseDTO,
    StoreVendorItemOfferingResponseDTO,
    StoreWithDevicesDTO,
    VendorDTO,
    VendorItemDTO,
} from "@repo/types";

import { organizationKeys, vendorKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/format";
import { getStoreVendorsPath } from "@/lib/store-workspace-routes";
import StoreVendorAvailabilitiesPage from "@/pages/store-vendor-availabilities-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const adajanId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const vesuId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const vendorId = "11111111-1111-4111-8111-111111111111";
const vendorItemId = "44444444-4444-4444-8444-444444444444";
const availabilityId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const offeringId = "eeeeeeee-ffff-4aaa-8bbb-cccccccccccc";
const now = new Date("2026-09-06T00:00:00.000Z");
const createdBy = "11111111-1111-4111-8111-111111111111";

const adajan: StoreWithDevicesDTO = {
    id: adajanId,
    organizationId,
    name: "Adajan",
    address: "Ring Road",
    reviewPlatform: null,
    reviewLink: null,
    socialMediaName: null,
    socialMediaLink: null,
    whatsappLinks: [],
    kotSystemEnabled: false,
    tableManagementEnabled: false,
    moneyAccountTrackingEnabled: false,
    devices: [],
    createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const vendor: VendorDTO = {
    id: vendorId,
    organizationId,
    name: "Fresh Farms",
    description: "Daily produce supplier",
    status: "active",
    createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const tomato: VendorItemDTO = {
    id: vendorItemId,
    organizationId,
    vendorId,
    name: "Tomato",
    unitId: "33333333-3333-4333-8333-333333333333",
    defaultPurchasePrice: 40.5,
    status: "active",
    createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const availability: StoreVendorAvailabilityResponseDTO = {
    id: availabilityId,
    organizationId,
    storeId: adajanId,
    vendorId,
    status: "active",
    createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    vendor,
};

const offering: StoreVendorItemOfferingResponseDTO = {
    id: offeringId,
    organizationId,
    storeId: adajanId,
    vendorId,
    vendorItemId,
    defaultPurchasePrice: 38,
    createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    vendorItem: tomato,
};

const organizationResponse = {
    status: "success" as const,
    data: {
        organization: {
            id: organizationId,
            name: "Panini House",
            username: "panini_house",
            tagline: null,
            createdBy,
            updatedBy: null,
            createdAt: now,
            updatedAt: now,
            stores: [adajan],
        },
    },
    message: "Organization fetched successfully",
    code: 200,
};

const storeResponse = (store: StoreDTO) => ({
    status: "success" as const,
    data: { store },
    message: "Store fetched successfully",
    code: 200,
});

const renderVendors = (availabilityOverride?: Partial<StoreVendorAvailabilityResponseDTO>) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(organizationKeys.detail(organizationId), organizationResponse);
    queryClient.setQueryData(organizationKeys.store(organizationId, adajanId), storeResponse(adajan));
    queryClient.setQueryData(vendorKeys.storeAvailabilities(organizationId, adajanId), {
        status: "success",
        data: { availabilities: [{ ...availability, ...availabilityOverride }] },
        message: "Store Vendor Availabilities fetched successfully",
        code: 200,
    });
    queryClient.setQueryData(vendorKeys.storeItemOfferings(organizationId, adajanId), {
        status: "success",
        data: { offerings: [offering] },
        message: "Store Vendor Item Offerings fetched successfully",
        code: 200,
    });

    const router = createMemoryRouter(
        [
            {
                path: "/organizations/:organizationId/workspaces/:storeId/vendors",
                element: <StoreVendorAvailabilitiesPage />,
            },
        ],
        { initialEntries: [getStoreVendorsPath(organizationId, adajanId)] },
    );

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
};

describe("Store Vendors page", () => {
    test("lists every Organization Vendor with this Store's default purchase prices", () => {
        const markup = renderVendors();

        expect(markup).toContain("Vendors");
        expect(markup).toContain("Fresh Farms");
        expect(markup).toContain("Tomato");
        expect(markup).toContain(formatCurrency(38));
        expect(markup).toContain("Deactivate");
        expect(markup).toContain("Edit default");
        expect(markup).not.toContain("Assign vendor");
        expect(markup).not.toContain("Unassign");
        expect(markup).not.toContain("Add vendor");
        expect(markup).not.toContain("Create vendor");
        expect(markup).not.toContain("Add vendor item");
        expect(markup).not.toContain("Create vendor item");
        expect(markup).not.toContain(vesuId);
        expect(markup).not.toContain(formatCurrency(40.5));
    });

    test("keeps an inactive Store Vendor visible with its Store default purchase prices", () => {
        const markup = renderVendors({ status: "inactive" });

        expect(markup).toContain("Fresh Farms");
        expect(markup).toContain("Tomato");
        expect(markup).toContain(formatCurrency(38));
        expect(markup).toContain("Activate");
        expect(markup).not.toContain("Unassign");
        expect(markup).not.toContain("Assign vendor");
    });

    test("registers a Store workspace vendors route without replacing Organization vendor routes", () => {
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");

        expect(appSource).toContain(
            'path="/organizations/:organizationId/workspaces/:storeId/vendors"',
        );
        expect(appSource).toContain('path="/organizations/:organizationId/workspaces/:storeId"');
        expect(appSource).toContain('path="/organizations/:organizationId/vendors"');
    });

    test("does not expose assign, unassign, or delete Store Vendor Availability client APIs", () => {
        const clientSource = readFileSync(
            join(
                import.meta.dir,
                "../../../../packages/services/src/modules/tenant/vendors.service.ts",
            ),
            "utf8",
        );

        expect(clientSource).toContain("updateStoreVendorAvailability");
        expect(clientSource).not.toContain("assignStoreVendorAvailability");
        expect(clientSource).not.toContain("unassignStoreVendorAvailability");
        expect(clientSource).not.toContain("deleteStoreVendorAvailability");
    });
});
