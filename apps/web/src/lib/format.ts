export const formatDateTime = (value: string | Date | null | undefined) => {
    if (!value) return "Never";

    return new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

export const formatCurrency = (value: number | string | null | undefined) => {
    const numericValue = Number(value ?? 0);

    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number.isFinite(numericValue) ? numericValue : 0);
};
