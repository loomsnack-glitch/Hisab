import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import PosMobileBottomNav from "@/components/pos/pos-mobile-bottom-nav";
import PosSidebar from "@/components/pos/pos-sidebar";

describe("POS navigation visibility", () => {
    test("omits Tables from the sidebar and mobile nav when Table Management is disabled", () => {
        const enabledSidebar = renderToStaticMarkup(
            <MemoryRouter>
                <PosSidebar isCollapsed={false} onToggle={() => {}} tableManagementEnabled kotSystemEnabled />
            </MemoryRouter>,
        );
        const disabledSidebar = renderToStaticMarkup(
            <MemoryRouter>
                <PosSidebar isCollapsed={false} onToggle={() => {}} tableManagementEnabled={false} kotSystemEnabled />
            </MemoryRouter>,
        );
        const enabledMobileNav = renderToStaticMarkup(
            <MemoryRouter>
                <PosMobileBottomNav tableManagementEnabled kotSystemEnabled />
            </MemoryRouter>,
        );
        const disabledMobileNav = renderToStaticMarkup(
            <MemoryRouter>
                <PosMobileBottomNav tableManagementEnabled={false} kotSystemEnabled />
            </MemoryRouter>,
        );

        expect(enabledSidebar).toContain('href="/tables"');
        expect(enabledSidebar).toContain("Tables");
        expect(disabledSidebar).not.toContain('href="/tables"');
        expect(disabledSidebar).not.toContain("Tables");
        expect(enabledMobileNav).toContain('href="/tables"');
        expect(enabledMobileNav).toContain("Tables");
        expect(disabledMobileNav).not.toContain('href="/tables"');
        expect(disabledMobileNav).not.toContain("Tables");
    });

    test("omits KOT from the sidebar and mobile nav when the KOT System is disabled", () => {
        const enabledSidebar = renderToStaticMarkup(
            <MemoryRouter>
                <PosSidebar isCollapsed={false} onToggle={() => {}} tableManagementEnabled kotSystemEnabled />
            </MemoryRouter>,
        );
        const disabledSidebar = renderToStaticMarkup(
            <MemoryRouter>
                <PosSidebar isCollapsed={false} onToggle={() => {}} tableManagementEnabled kotSystemEnabled={false} />
            </MemoryRouter>,
        );

        expect(enabledSidebar).toContain('href="/kots"');
        expect(enabledSidebar).toContain("KOT");
        expect(disabledSidebar).not.toContain('href="/kots"');
        expect(disabledSidebar).not.toContain("KOT");
    });
});
