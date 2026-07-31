export const formatLongDate = (value: Date = new Date()) => {
    return value.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

export const formatDateOnly = (value: string | Date | null | undefined) => {
    if (!value) return "—";

    const text = String(value);
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    if (dateOnlyMatch) {
        return `${dateOnlyMatch[3]}/${dateOnlyMatch[2]}/${dateOnlyMatch[1]}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

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
