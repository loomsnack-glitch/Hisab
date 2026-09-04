import { describe, expect, it } from "bun:test";
import { POS_BUTTON_VARIANTS, POS_STATUS_TONES } from "./pos-ui-boundary";

describe("POS UI foundation", () => {
    it("keeps the approved button variants small", () => {
        expect(POS_BUTTON_VARIANTS).toEqual(["primary", "secondary", "destructive"]);
    });

    it("keeps status tones semantic", () => {
        expect(POS_STATUS_TONES).toEqual(["neutral", "success", "warning", "danger"]);
    });
});
