import { describe, expect, test } from "bun:test";

import {
    posSettingsPageContentClassName,
    posSettingsPageShellClassName,
} from "@/lib/pos-settings-page-layout";

describe("pos settings page layout", () => {
    test("uses a viewport-based scroll shell for mobile and desktop", () => {
        expect(posSettingsPageShellClassName).toContain("100dvh");
        expect(posSettingsPageShellClassName).toContain("--pos-header-height");
        expect(posSettingsPageShellClassName).toContain("--pos-mobile-nav-height");
        expect(posSettingsPageShellClassName).toContain("overflow-y-auto");
        expect(posSettingsPageShellClassName).toContain("touch-pan-y");
        expect(posSettingsPageContentClassName).toContain("p-4");
    });
});
