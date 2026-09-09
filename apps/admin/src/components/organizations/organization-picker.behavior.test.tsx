import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { OrganizationDTO } from "@repo/types";

import { OrganizationPickerView } from "@/components/organizations/organization-picker";

const now = new Date("2026-09-06T00:00:00.000Z");

const panini: OrganizationDTO = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Panini House",
    username: "panini_house",
    tagline: null,
    createdBy: "11111111-1111-4111-8111-111111111111",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const adajan: OrganizationDTO = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Adajan",
    username: "adajan",
    tagline: null,
    createdBy: "11111111-1111-4111-8111-111111111111",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const renderPicker = (
    extras: {
        isManaging?: boolean;
        starredOrgId?: string;
        organizations?: OrganizationDTO[];
    } = {},
) =>
    renderToStaticMarkup(
        <MemoryRouter>
            <OrganizationPickerView
                organizations={extras.organizations ?? [panini, adajan]}
                starredOrgId={extras.starredOrgId ?? ""}
                isManaging={extras.isManaging ?? false}
                addOrganization={
                    <button type="button" aria-label="Add organization">
                        Add organization
                    </button>
                }
                renderOrganizationAction={(organization, tile) => tile}
                onToggleStar={() => undefined}
                onToggleManaging={() => undefined}
            />
        </MemoryRouter>,
    );

describe("Organization picker", () => {
    test("shows existing organizations so the user can select or add one", () => {
        const markup = renderPicker({ starredOrgId: panini.id });

        expect(markup).toContain("Choose an organization");
        expect(markup).toContain("Panini House");
        expect(markup).toContain("Adajan");
        expect(markup).toContain(`href="/organizations/${panini.id}/products"`);
        expect(markup).toContain(`href="/organizations/${adajan.id}/products"`);
        expect(markup).toContain('aria-label="Add organization"');
        expect(markup).toContain("Manage organizations");
        expect(markup).toContain('title="Default organization"');
    });

    test("lets the user edit organizations from manage mode", () => {
        const markup = renderPicker({ isManaging: true });

        expect(markup).toContain("Done");
        expect(markup).not.toContain(`href="/organizations/${panini.id}/products"`);
        expect(markup).toContain("Edit Panini House");
    });
});
