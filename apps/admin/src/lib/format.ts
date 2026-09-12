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

export const formatWhatsAppTimestamp = (value: string | Date | null | undefined) => {
    if (!value) return "No messages yet";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const hours = date.getHours();
    const hour = String(hours % 12 || 12).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()} ${hour}:${minute} ${hours >= 12 ? "PM" : "AM"}`;
};

export const formatWhatsAppDayLabel = (value: string | Date | null | undefined) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (left: Date, right: Date) =>
        left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();

    if (sameDay(date, today)) return "Today";
    if (sameDay(date, yesterday)) return "Yesterday";
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export {
    formatCurrency,
    formatDiscountPercentage,
    getAverageBillPerOrder,
    getDiscountPercentage,
} from "@repo/ui/lib/money";
