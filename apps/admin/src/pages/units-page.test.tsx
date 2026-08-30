import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { UnitDTO } from "@repo/types";

import { unitKeys } from "@/lib/query-keys";
import UnitsPage from "@/pages/units-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const now = new Date("2026-08-30T12:00:00.000Z");

const kilogram: UnitDTO = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId,
    name: "kilogram",
    label: "kg",
    kind: "predefined",
    predefinedKey: "kilogram",
    status: "active",
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const crate: UnitDTO = {
    id: "22222222-2222-4222-8222-222222222222",
    organizationId,
    name: "Crate",
    label: "crt",
    kind: "custom",
    predefinedKey: null,
    status: "inactive",
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const renderUnitsPage = (
    result: "pending" | "success" | "error" | "empty" = "success",
    units: UnitDTO[] = [kilogram, crate],
) => {
    const queryClient = new QueryClient();
    if (result !== "pending") {
        queryClient.setQueryData(unitKeys.list(organizationId), {
            status: result === "error" ? "error" : "success",
            data: result === "error" ? null : { units: result === "empty" ? [] : units },
            message: result === "error" ? "Units could not be loaded right now." : "Units fetched successfully",
            code: result === "error" ? 500 : 200,
        });
    }

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/units`]}>
                <Routes>
                    <Route path="/organizations/:organizationId/units" element={<UnitsPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe("Admin Units page", () => {
    test("shows predefined and custom Units with availability and no delete command", () => {
        const markup = renderUnitsPage();

        expect(markup).toContain("data-testid=\"units-page\"");
        expect(markup).toContain("kilogram");
        expect(markup).toContain("kg");
        expect(markup).toContain("Standard");
        expect(markup).toContain("Crate");
        expect(markup).toContain("Custom");
        expect(markup).toContain("Add unit");
        expect(markup).toContain("Search units...");
        expect(markup).toContain("Availability");
        expect(markup).toContain("active");
        expect(markup).toContain("inactive");
        expect(markup).toContain("Edit");
        expect(markup).not.toContain("Delete");
    });

    test("shows a loading spinner while Units are fetched", () => {
        const markup = renderUnitsPage("pending");

        expect(markup).toContain("aria-label=\"Loading\"");
        expect(markup).not.toContain("data-testid=\"units-page\"");
    });

    test("shows an error state when Units cannot be loaded", () => {
        const markup = renderUnitsPage("error");

        expect(markup).toContain("Unable to load units");
        expect(markup).toContain("Units could not be loaded right now.");
        expect(markup).toContain("Try again");
    });

    test("shows an empty state with a create action", () => {
        const markup = renderUnitsPage("empty");

        expect(markup).toContain("No units yet");
        expect(markup).toContain("Add unit");
    });
});
