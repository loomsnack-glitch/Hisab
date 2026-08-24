export const cloudMediaUrlTtlSeconds = (): number => {
  const configured = Number(process.env.WHATSAPP_CLOUD_MEDIA_URL_TTL_SECONDS ?? 86_400);
  return Number.isInteger(configured) && configured >= 300 && configured <= 604_800
    ? configured
    : 86_400;
};
