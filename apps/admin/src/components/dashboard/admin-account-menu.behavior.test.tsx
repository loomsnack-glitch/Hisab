import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { AdminAccountMenu, AdminAccountMenuPanel } from "@/components/dashboard/admin-account-menu";

const user = {
    firstName: "Dev",
    lastName: "Jariwala",
    phone: "+9144444444444",
    salutation: "mr.",
};

describe("Admin account menu", () => {
    test("shows the user avatar on the organization picker so they can log out", () => {
        const trigger = renderToStaticMarkup(
            <MemoryRouter>
                <AdminAccountMenu user={user} organization={null} onLogout={() => undefined} />
            </MemoryRouter>,
        );
        const panel = renderToStaticMarkup(
            <MemoryRouter>
                <AdminAccountMenuPanel user={user} organization={null} onLogout={() => undefined} />
            </MemoryRouter>,
        );

        expect(trigger).toContain('aria-label="Mr. Dev Jariwala"');
        expect(panel).toContain("Mr. Dev Jariwala");
        expect(panel).toContain("Logout");
        expect(panel).not.toContain('href="/organizations"');
        expect(panel).not.toContain("Panini House");
    });

    test("shows the selected organization avatar and a way back to the picker", () => {
        const organization = { id: "org-1", name: "Panini House" };
        const trigger = renderToStaticMarkup(
            <MemoryRouter>
                <AdminAccountMenu user={user} organization={organization} onLogout={() => undefined} />
            </MemoryRouter>,
        );
        const panel = renderToStaticMarkup(
            <MemoryRouter>
                <AdminAccountMenuPanel user={user} organization={organization} onLogout={() => undefined} />
            </MemoryRouter>,
        );

        expect(trigger).toContain('aria-label="Panini House"');
        expect(panel).toContain("Panini House");
        expect(panel).toContain('href="/organizations"');
        expect(panel).toContain("Organizations");
        expect(panel).toContain("Logout");
    });
});
