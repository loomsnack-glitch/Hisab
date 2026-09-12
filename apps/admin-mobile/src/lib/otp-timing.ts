export const OTP_EXPIRY_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

export const createOtpTiming = (issuedAt: number) => ({
    expiresAt: issuedAt + OTP_EXPIRY_MS,
    resendAvailableAt: issuedAt + OTP_RESEND_COOLDOWN_MS,
});

export const getRemainingSeconds = (deadline: number, now: number) =>
    Math.max(0, Math.ceil((deadline - now) / 1000));

export const formatOtpCountdown = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
};
