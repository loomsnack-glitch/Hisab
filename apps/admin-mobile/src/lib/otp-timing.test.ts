import { describe, expect, it } from "bun:test";
import {
    createOtpTiming,
    formatOtpCountdown,
    getRemainingSeconds,
    OTP_EXPIRY_MS,
    OTP_RESEND_COOLDOWN_MS,
} from "./otp-timing";

describe("Admin OTP timing", () => {
    it("starts a five-minute challenge and a separate 30-second resend cooldown", () => {
        const issuedAt = 1_000_000;

        expect(createOtpTiming(issuedAt)).toEqual({
            expiresAt: issuedAt + OTP_EXPIRY_MS,
            resendAvailableAt: issuedAt + OTP_RESEND_COOLDOWN_MS,
        });
        expect(getRemainingSeconds(issuedAt + OTP_EXPIRY_MS, issuedAt)).toBe(300);
        expect(getRemainingSeconds(issuedAt + OTP_RESEND_COOLDOWN_MS, issuedAt)).toBe(30);
    });

    it("clamps expired deadlines and formats the visible countdown", () => {
        expect(getRemainingSeconds(1_000, 1_001)).toBe(0);
        expect(formatOtpCountdown(299)).toBe("4:59");
        expect(formatOtpCountdown(0)).toBe("0:00");
    });
});
