export const cloudFeatureCallersEnabled = (): boolean =>
  process.env.WHATSAPP_CLOUD_CALLERS_ENABLED?.trim().toLowerCase() === "true";
