export const safeRandomUUID = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    // Fallback using crypto.getRandomValues if available
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => {
            const num = Number(c);
            return (
                num ^
                (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (num / 4)))
            ).toString(16);
        });
    }

    // Fallback using Math.random
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
