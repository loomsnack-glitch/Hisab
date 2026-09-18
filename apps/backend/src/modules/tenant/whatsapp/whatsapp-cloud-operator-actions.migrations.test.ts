import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../../../../db/migrations/20260919130000_allow_campaign_stop_cloud_audit.sql", import.meta.url), "utf8");

describe("Cloud campaign stop audit migration", () => {
    test("allows campaign stop actions and protects rollback when records exist", () => {
        expect(migration).toContain("'campaign_stop'");
        expect(migration).toContain("Cannot remove campaign_stop audit actions while records exist");
    });
});
