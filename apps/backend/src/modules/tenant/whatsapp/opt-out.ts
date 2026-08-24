const OPT_OUT_KEYWORDS = new Set(["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

export const isWhatsAppOptOutKeyword = (body: string): boolean =>
  OPT_OUT_KEYWORDS.has(body.trim().replace(/[.!?]+$/g, "").trim().toUpperCase());
