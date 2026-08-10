import { describe, expect, test } from "bun:test";

import { createDefaultDeviceValues } from "./device-defaults";

describe("device defaults", () => {
    test("uses the business and store context for readable defaults", () => {
        const values = createDefaultDeviceValues("Main Branch", 1);

        expect(values.name).toBe("Main Branch Device 1");
        expect(values.loginUsername).toBe("main_branch_1");
        expect(values.deviceSecret).toHaveLength(8);
    });

    test("keeps generated usernames within the schema limit", () => {
        const values = createDefaultDeviceValues("Long Store Name ".repeat(10), 12);

        expect(values.loginUsername).toHaveLength(64);
        expect(values.loginUsername).toMatch(/^[a-z0-9][a-z0-9_-]{1,63}$/);
    });
});
