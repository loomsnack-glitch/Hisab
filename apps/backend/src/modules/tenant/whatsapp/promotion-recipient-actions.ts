export const META_HEALTHY_ENGAGEMENT_FAILURE_CODE = "131049";
export const META_HEALTHY_ENGAGEMENT_RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const promotionRecipientResendAvailableAt = (
  failureCode: unknown,
  updatedAt: unknown,
): string | null => {
  if (String(failureCode ?? "") !== META_HEALTHY_ENGAGEMENT_FAILURE_CODE) return null;
  const failedAt = new Date(String(updatedAt ?? "")).getTime();
  if (!Number.isFinite(failedAt)) return null;
  return new Date(failedAt + META_HEALTHY_ENGAGEMENT_RESEND_COOLDOWN_MS).toISOString();
};

export const promotionRecipientResendIsBlocked = (
  failureCode: unknown,
  updatedAt: unknown,
  now = Date.now(),
): boolean => {
  const availableAt = promotionRecipientResendAvailableAt(failureCode, updatedAt);
  return availableAt !== null && new Date(availableAt).getTime() > now;
};
