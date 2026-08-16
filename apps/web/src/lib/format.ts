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

export const getAverageBillPerOrder = (
    salesTotal: number | string | null | undefined,
    completedCount: number | string | null | undefined,
) => {
    const total = Number(salesTotal ?? 0);
    const count = Number(completedCount ?? 0);

    if (!Number.isFinite(total) || !Number.isFinite(count) || count <= 0) {
        return 0;
    }

    return total / count;
};

export const getDiscountPercentage = (
    discount: number | string | null | undefined,
    base: number | string | null | undefined,
) => {
    const discountAmount = Number(discount ?? 0);
    const baseAmount = Number(base ?? 0);

    if (!Number.isFinite(discountAmount) || !Number.isFinite(baseAmount) || discountAmount <= 0 || baseAmount <= 0) {
        return null;
    }

    return Math.min(100, Math.round((discountAmount / baseAmount) * 1000) / 10);
};

export const formatDiscountPercentage = (
    discount: number | string | null | undefined,
    base: number | string | null | undefined,
) => {
    const percentage = getDiscountPercentage(discount, base);
    return percentage === null
        ? null
        : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(percentage)}%`;
};
