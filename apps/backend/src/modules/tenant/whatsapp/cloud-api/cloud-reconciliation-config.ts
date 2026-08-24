export const cloudReconciliationTimeoutSeconds = (): number => {
  const configured = Number(process.env.WHATSAPP_CLOUD_RECONCILIATION_TIMEOUT_SECONDS ?? 3_600);
  return Number.isInteger(configured) && configured >= 60 && configured <= 7 * 24 * 60 * 60
    ? configured
    : 3_600;
};
