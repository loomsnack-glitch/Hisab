import { describe, expect, test } from "bun:test";
import {
    isMetaCloudPhoneOnBizApp,
    isMetaCloudPhoneRegistered,
    metaCloudPhoneStatusLabel,
} from "./whatsapp-cloud-phone-status";

describe("Cloud phone registration status", () => {
    test("treats Meta CONNECTED as Registered and every other status as Not registered", () => {
        expect(isMetaCloudPhoneRegistered("CONNECTED")).toBe(true);
        expect(metaCloudPhoneStatusLabel("CONNECTED")).toBe("Registered");
        expect(isMetaCloudPhoneRegistered("DISCONNECTED")).toBe(false);
        expect(isMetaCloudPhoneRegistered("connected")).toBe(false);
        expect(isMetaCloudPhoneRegistered(null)).toBe(false);
        expect(metaCloudPhoneStatusLabel(null)).toBe("Not registered");
    });

    test("treats WhatsApp Business app coexistence as blocked for Cloud register", () => {
        expect(isMetaCloudPhoneOnBizApp(true)).toBe(true);
        expect(isMetaCloudPhoneOnBizApp(false)).toBe(false);
        expect(isMetaCloudPhoneOnBizApp(null)).toBe(false);
    });
});
