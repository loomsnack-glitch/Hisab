export const commercialAccessDeniedMessage =
    "Review commercial access in Ganatri Admin to purchase or renew access.";

export const isCommercialAccessDeniedMessage = (message: string | null | undefined) =>
    Boolean(message?.includes(commercialAccessDeniedMessage));

export const errorCode = (error: unknown): number | null =>
    typeof error === "object" && error !== null && "code" in error && typeof error.code === "number"
        ? error.code
        : null;

type QueryLike = {
    isError: boolean;
    error: unknown;
    data?: { status?: string; code?: number; message?: string } | null;
};

export const queryErrorCode = (query: QueryLike): number | null =>
    errorCode(query.error) ?? (query.data?.status === "error" ? query.data.code ?? null : null);

export const queryErrorMessage = (query: QueryLike): string | undefined =>
    (query.error as { message?: string })?.message
    ?? (query.data?.status === "error" ? query.data.message : undefined);

export const isQueryCommercialAccessDenied = (query: QueryLike) =>
    queryErrorCode(query) === 403 && isCommercialAccessDeniedMessage(queryErrorMessage(query));
