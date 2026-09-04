export const commercialAccessDeniedMessage =
  "Review commercial access in Ganatri Admin to purchase or renew access.";

export const isCommercialAccessDeniedMessage = (message: string | null | undefined) =>
  Boolean(message?.includes(commercialAccessDeniedMessage));

export const isCommercialAccessDeniedError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return isCommercialAccessDeniedMessage(error.message);
};
